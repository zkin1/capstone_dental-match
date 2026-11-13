const { ACTIVE_ASSIGNMENT_STATES, parseJson } = require('../../../../domain/common');
const { appendEvent } = require('./case-history');
const {
  ConflictError,
  NotFoundError,
} = require('../../../../shared/errors/AppError');
const { CLINICS, nextDateFor, REVIEW_REQUIRED_REASON } = require('../../../../domain/matching/scoring');

function placeholders(start, values) {
  return values.map((_, index) => `$${start + index}`).join(', ');
}

class MatchingRepository {
  constructor(database) {
    this.database = database;
  }

  matchPatient(patientId, categorize, selectCandidate) {
    return this.allocate(patientId, categorize, selectCandidate);
  }

  async allocate(patientId, categorize, selectCandidate, options = {}) {
    return this.database.transaction(async (db) => {
      await db.query(
        "SELECT pg_advisory_xact_lock(hashtext('dental_match_allocation'))"
      );
      const patient = (
        await db.query(
          'SELECT * FROM pacientes WHERE id=$1 AND activo=TRUE FOR UPDATE',
          [patientId]
        )
      ).rows[0];
      if (!patient)
        return {
          success: false,
          reason: 'Paciente no disponible para asignación',
        };
      const active = (
        await db.query(
          'SELECT * FROM asignaciones WHERE id_paciente=$1 AND estado=ANY($2::text[]) FOR UPDATE',
          [patientId, ACTIVE_ASSIGNMENT_STATES]
        )
      ).rows[0];
      if (options.assignmentId) {
        if (
          !active ||
          String(active.id) !== String(options.assignmentId) ||
          active.estado === 'derivacion_pendiente'
        ) {
          throw new ConflictError(
            'Solo se puede reasignar una asignación activa sin derivación pendiente'
          );
        }
      } else if (active || patient.estado !== 'pendiente') {
        return {
          success: false,
          reason: 'Paciente no disponible para asignación',
        };
      }
      const category = categorize(patient);
      const suggestion = categorize({
        ...patient,
        precalificacion_validada: null,
      });
      await db.query(
        `UPDATE pacientes SET tipo_tratamiento_inferido=$1,prioridad=$2,nivel_dolor=$3,
        precalificacion_sugerida=COALESCE(precalificacion_sugerida,$5::jsonb),fecha_actualizacion=CURRENT_TIMESTAMP WHERE id=$4`,
        [
          category.specialty,
          category.priority,
          category.pain,
          patientId,
          JSON.stringify(suggestion),
        ]
      );
      const pending = async (reason) => {
        if (patient.estado === 'pendiente')
          await this.recordPending(db, patientId, reason);
        return { success: false, reason, category };
      };
      if (category.redFlag && !category.validated) return pending(REVIEW_REQUIRED_REASON);
      const candidates = await this.availableCandidates(
        db,
        patient,
        category,
        active?.id_estudiante
      );
      let preferredStudentId;
      if (patient.derivacion_id && !options.manual) {
        const referral = await db.query(
          "SELECT propuesta FROM derivaciones WHERE id=$1 AND estado='aprobada' AND id_asignacion_destino IS NULL",
          [patient.derivacion_id]
        );
        preferredStudentId = parseJson(referral.rows[0]?.propuesta)?.receptor?.id;
      }
      const eligible = candidates.filter((candidate) =>
        (!options.manual || String(candidate.id_especialidad_estudiante) === String(options.scheduleId)) &&
        (!preferredStudentId || String(candidate.id_estudiante) === String(preferredStudentId))
      );
      const selected = selectCandidate(patient, eligible, category);
      if (!selected)
        return pending(preferredStudentId
          ? 'El receptor propuesto ya no está disponible. El caso quedó pendiente de receptor.'
          : 'No hay estudiantes con especialidad, ciudad, clínica, horario y capacidad compatibles');
      if (active) {
        await db.query(
          "UPDATE asignaciones SET estado='cancelado',motivo_cancelacion=$1,fecha_cancelacion=CURRENT_TIMESTAMP,fecha_actualizacion=CURRENT_TIMESTAMP WHERE id=$2",
          [`Reasignación manual: ${options.reason}`, active.id]
        );
        await db.query(
          'UPDATE estudiantes_odontologia SET casos_activos=GREATEST(0,casos_activos-1),fecha_actualizacion=CURRENT_TIMESTAMP WHERE id=$1',
          [active.id_estudiante]
        );
        await appendEvent(
          db,
          patientId,
          active.id,
          options.user,
          'reasignacion_origen',
          active.estado,
          'cancelado',
          options.reason
        );
      }
      if (preferredStudentId)
        selected.factors.motivo_reparto = 'Receptor propuesto por el estudiante y aprobado por coordinación';
      if (options.manual)
        selected.factors = {
          ...selected.factors,
          manual: true,
          motivo_manual: options.reason,
        };
      return this.createAssignment(
        db,
        patient,
        selected,
        category,
        options.user,
        options.reason
      );
    });
  }

  async createAssignment(db, patient, selected, category, user, reason) {
    const insert = await db.query(
      `INSERT INTO asignaciones
      (id_paciente,id_estudiante,id_especialidad_estudiante,fecha_cita,estado,especialidad_asignada,
       dia_semana_asignado,hora_inicio_asignada,hora_fin_asignada,score_compatibilidad,factores_matching,observaciones_sistema)
      VALUES ($1,$2,$3,$4,'asignado',$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [
        patient.id,
        selected.id_estudiante,
        selected.id_especialidad_estudiante,
        selected.fecha_cita,
        selected.especialidad,
        selected.dia_semana,
        selected.hora_inicio,
        selected.hora_fin,
        selected.score,
        JSON.stringify(selected.factors),
        reason || category.reason,
      ]
    );
    const assignmentId = insert.rows[0].id;
    await db.query(
      "UPDATE pacientes SET estado='asignado',ultimo_motivo_matching=NULL,ultimo_matching_en=NULL,fecha_actualizacion=CURRENT_TIMESTAMP WHERE id=$1",
      [patient.id]
    );
    await db.query(
      `UPDATE estudiantes_odontologia SET casos_activos=(SELECT COUNT(*) FROM asignaciones
      WHERE id_estudiante=$1 AND estado=ANY($2::text[])),fecha_actualizacion=CURRENT_TIMESTAMP WHERE id=$1`,
      [selected.id_estudiante, ACTIVE_ASSIGNMENT_STATES]
    );
    if (patient.derivacion_id) {
      await db.query(
        'UPDATE derivaciones SET id_asignacion_destino=$1 WHERE id=$2 AND id_asignacion_destino IS NULL',
        [assignmentId, patient.derivacion_id]
      );
    }
    await appendEvent(
      db,
      patient.id,
      assignmentId,
      user,
      'asignacion',
      null,
      'asignado',
      reason || category.reason,
      { estudiante: selected.nombre_completo, factores: selected.factors }
    );
    for (const notification of [
      {
        email: patient.email,
        type: 'asignacion_paciente',
        subject: 'Tu caso fue asignado',
      },
      {
        email: selected.email,
        type: 'asignacion_estudiante',
        subject: 'Tienes un nuevo caso asignado',
      },
    ]) {
      if (!notification.email) continue;
      await db.query(
        `INSERT INTO notificaciones_email
        (id_asignacion,id_estudiante,id_paciente,email_destino,tipo_notificacion,asunto,mensaje,estado)
        VALUES ($1,$2,$3,$4,$5,$6,$7,'pendiente')`,
        [
          assignmentId,
          selected.id_estudiante,
          patient.id,
          notification.email,
          notification.type,
          notification.subject,
          `Dental Match: el caso CASO-${String(patient.id).padStart(6, '0')} tiene una nueva asignación. Estudiante: ${selected.nombre_completo}. Cita propuesta: ${selected.fecha_cita}, ${selected.dia_semana} ${selected.hora_inicio}-${selected.hora_fin}. Coordina y confirma la atención con el estudiante.`,
        ]
      );
    }
    return {
      success: true,
      assignmentId,
      paciente: patient.nombre_completo,
      estudiante: selected.nombre_completo,
      codigo_estudiante: selected.codigo_estudiante,
      especialidad: selected.especialidad,
      clinica: selected.clinica,
      fecha_cita: selected.fecha_cita,
      horario: `${selected.dia_semana} ${selected.hora_inicio}-${selected.hora_fin}`,
      score: selected.score,
      factors: selected.factors,
    };
  }

  async availableCandidates(db, patient, category, excludedStudent) {
    const clinic = Number(patient.edad) < 18 ? CLINICS.child : CLINICS.adult;
    const result = await db.query(
      `SELECT e.id AS id_estudiante,e.codigo_estudiante,e.nombre_completo,e.email,e.ciudad,
      e.año_carrera,e.casos_completados,e.casos_necesarios,
      (SELECT COUNT(*) FROM asignaciones a WHERE a.id_estudiante=e.id AND a.estado=ANY($4::text[])) AS casos_activos,
      (SELECT COUNT(DISTINCT d.id_paciente) FROM derivaciones d WHERE d.id_estudiante_origen=e.id AND d.estado='aprobada') AS derivaciones_aprobadas,
      ee.id AS id_especialidad_estudiante,ee.especialidad,ee.clinica,ee.dia_semana,ee.hora_inicio,ee.hora_fin,ee.capacidad_pacientes
      FROM estudiantes_odontologia e
      JOIN users u ON u.codigo_estudiante=e.codigo_estudiante AND u.role='student' AND u.status='active'
      JOIN especialidades_estudiante ee ON ee.id_estudiante=e.id AND ee.activo=TRUE
      WHERE e.estado='activo' AND ee.especialidad=$1 AND ee.clinica=$2 AND e.ciudad=$3
        AND ($5::bigint IS NULL OR e.id<>$5)
        AND NOT EXISTS (SELECT 1 FROM derivaciones d WHERE d.id_paciente=$6 AND d.id_estudiante_origen=e.id AND d.estado='aprobada')
      ORDER BY e.id,ee.id FOR UPDATE OF e,ee`,
      [
        category.specialty,
        clinic,
        patient.ciudad,
        ACTIVE_ASSIGNMENT_STATES,
        excludedStudent || null,
        patient.id,
      ]
    );
    const available = [];
    const availabilityByStudent = new Map();
    for (const candidate of result.rows) {
      if (!availabilityByStudent.has(candidate.id_estudiante)) {
        const load = await db.query(
          'SELECT COUNT(*) AS total FROM asignaciones WHERE id_estudiante=$1 AND estado=ANY($2::text[])',
          [candidate.id_estudiante, ACTIVE_ASSIGNMENT_STATES]
        );
        const absences = await db.query(
          'SELECT fecha::text FROM ausencias_estudiante WHERE id_estudiante=$1 AND fecha>=CURRENT_DATE',
          [candidate.id_estudiante]
        );
        availabilityByStudent.set(candidate.id_estudiante, {
          load: Number(load.rows[0].total),
          blocked: new Set(absences.rows.map(row => row.fecha)),
        });
      }
      const { load, blocked } = availabilityByStudent.get(candidate.id_estudiante);
      candidate.casos_activos = load;
      if (load >= Number(candidate.casos_necesarios)) continue;
      let weeksLater = 0;
      let date = nextDateFor(candidate.dia_semana);
      while (blocked.has(date)) date = nextDateFor(candidate.dia_semana, ++weeksLater);
      const count = await db.query(
        `SELECT COUNT(*) AS total FROM asignaciones WHERE id_estudiante=$1 AND fecha_cita=$2
        AND hora_inicio_asignada < $4::time AND hora_fin_asignada > $3::time AND estado=ANY($5::text[])`,
        [
          candidate.id_estudiante,
          date,
          candidate.hora_inicio,
          candidate.hora_fin,
          ACTIVE_ASSIGNMENT_STATES,
        ]
      );
      if (
        Number(count.rows[0].total) < Number(candidate.capacidad_pacientes || 1)
      )
        available.push({ ...candidate, fecha_cita: date });
    }
    return available;
  }

  async candidates(patientId, categorize, selectCandidate, assignmentId) {
    return this.database.transaction(async (db) => {
      const patient = (
        await db.query(
          'SELECT * FROM pacientes WHERE id=$1 AND activo=TRUE FOR UPDATE',
          [patientId]
        )
      ).rows[0];
      if (!patient) throw new NotFoundError('Paciente', patientId);
      let excluded = null;
      if (assignmentId) {
        const assignment = (
          await db.query(
            'SELECT * FROM asignaciones WHERE id=$1 AND id_paciente=$2',
            [assignmentId, patientId]
          )
        ).rows[0];
        if (
          !assignment ||
          !ACTIVE_ASSIGNMENT_STATES.includes(assignment.estado) ||
          assignment.estado === 'derivacion_pendiente'
        ) {
          throw new ConflictError('Asignación no disponible para reasignar');
        }
        excluded = assignment.id_estudiante;
      }
      const category = categorize(patient);
      if (category.redFlag && !category.validated) return [];
      const candidates = await this.availableCandidates(
        db,
        patient,
        category,
        excluded
      );
      return candidates
        .map((c) => selectCandidate(patient, [c], category))
        .filter(Boolean);
    });
  }

  async listPendingIds() {
    const db = await this.database.getConnection();
    const statesSql = placeholders(1, ACTIVE_ASSIGNMENT_STATES);
    return (
      await db.query(
        `SELECT p.id,p.nombre_completo
         FROM pacientes p
        WHERE p.activo = TRUE AND p.estado = 'pendiente' AND p.edad IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM asignaciones a
             WHERE a.id_paciente = p.id AND a.estado IN (${statesSql})
          )
        ORDER BY p.ultimo_matching_en ASC NULLS FIRST, CASE p.prioridad
          WHEN 'Muy Alta' THEN 1 WHEN 'Alta' THEN 2 WHEN 'Moderada' THEN 3 ELSE 4
        END, p.fecha_registro ASC, p.id
        LIMIT 50`,
        ACTIVE_ASSIGNMENT_STATES
      )
    ).rows;
  }

  recordPending(db, id, reason) {
    return db.query(
      "UPDATE pacientes SET ultimo_matching_en=CURRENT_TIMESTAMP,ultimo_motivo_matching=$2 WHERE id=$1 AND activo AND estado='pendiente'",
      [id, reason]
    );
  }

  async recordFailure(id, reason) {
    await this.recordPending(await this.database.getConnection(), id, reason);
  }

  async withMatchingLock(work) {
    const lockConnection = await this.database.getPoolConnection();
    try {
      const lock = await lockConnection.query(
        "SELECT pg_try_advisory_lock(hashtext('dental_matching_run')) AS acquired"
      );
      if (!lock.rows[0].acquired)
        return { success: false, reason: 'Ya hay un matching en ejecución' };
      return await work();
    } finally {
      try {
        await lockConnection.query(
          "SELECT pg_advisory_unlock(hashtext('dental_matching_run'))"
        );
      } finally {
        lockConnection.release();
      }
    }
  }

  async getStats() {
    const db = await this.database.getConnection();
    const result = await db.query(
      `SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE estado NOT IN ('completado', 'cancelado', 'derivado')) AS activas,
              COUNT(*) FILTER (WHERE estado = 'completado') AS completadas,
              AVG(score_compatibilidad) AS score_promedio
         FROM asignaciones`
    );
    return result.rows[0];
  }
}

module.exports = MatchingRepository;
