const { ACTIVE_ASSIGNMENT_STATES } = require('../../../../domain/common');
const { CLINICS, nextDateFor } = require('../../../../domain/matching/scoring');

function placeholders(start, values) {
  return values.map((_, index) => `$${start + index}`).join(', ');
}

class MatchingRepository {
  constructor(database) {
    this.database = database;
  }

  async matchPatient(patientId, categorize, selectCandidate) {
    return this.database.transaction(async (connection) => {
      const statesSql = placeholders(2, ACTIVE_ASSIGNMENT_STATES);
      const patients = await connection.query(
        `SELECT * FROM pacientes
          WHERE id = $1 AND activo = TRUE AND estado = 'pendiente'
            AND NOT EXISTS (
              SELECT 1 FROM asignaciones a
               WHERE a.id_paciente = pacientes.id AND a.estado IN (${statesSql})
            )
          FOR UPDATE`,
        [patientId, ...ACTIVE_ASSIGNMENT_STATES],
      );
      const patient = patients.rows[0];
      if (!patient)
        return {
          success: false,
          reason: 'Paciente no disponible para asignación',
        };

      const category = categorize(patient);
      await connection.query(
        `UPDATE pacientes
            SET tipo_tratamiento_inferido = $1, prioridad = $2, nivel_dolor = $3,
                fecha_actualizacion = CURRENT_TIMESTAMP
          WHERE id = $4`,
        [category.specialty, category.priority, category.pain, patient.id],
      );

      const candidates = await this.availableCandidates(connection, patient, category);
      const selected = selectCandidate(patient, candidates, category);
      if (!selected) {
        return {
          success: false,
          reason: 'No hay estudiantes con especialidad, clínica y horario compatibles',
          category,
        };
      }

      const insert = await connection.query(
        `INSERT INTO asignaciones
         (id_paciente, id_estudiante, id_especialidad_estudiante, fecha_cita, estado,
          especialidad_asignada, dia_semana_asignado, hora_inicio_asignada, hora_fin_asignada,
          score_compatibilidad, factores_matching, observaciones_sistema)
         VALUES ($1, $2, $3, $4, 'asignado', $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
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
          `Asignación ponderada: ${category.reason}`,
        ],
      );
      const assignmentId = insert.rows[0].id;

      await connection.query(
        `UPDATE pacientes
            SET estado = 'asignado', fecha_actualizacion = CURRENT_TIMESTAMP
          WHERE id = $1`,
        [patient.id],
      );
      const loadUpdate = await connection.query(
        `UPDATE estudiantes_odontologia
            SET casos_activos = casos_activos + 1, fecha_actualizacion = CURRENT_TIMESTAMP
          WHERE id = $1 AND casos_activos < casos_necesarios`,
        [selected.id_estudiante],
      );
      if (!loadUpdate.rowCount) throw new Error('La capacidad del estudiante cambió durante la asignación');

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
        await connection.query(
          `INSERT INTO notificaciones_email
           (id_asignacion, id_estudiante, id_paciente, email_destino, tipo_notificacion, asunto, estado)
           VALUES ($1, $2, $3, $4, $5, $6, 'pendiente')`,
          [
            assignmentId,
            selected.id_estudiante,
            patient.id,
            notification.email,
            notification.type,
            notification.subject,
          ],
        );
      }

      return {
        success: true,
        assignmentId,
        paciente: patient.nombre_completo,
        estudiante: selected.nombre_completo,
        codigo_estudiante: selected.codigo_estudiante,
        especialidad: selected.especialidad,
        fecha_cita: selected.fecha_cita,
        horario: `${selected.dia_semana} ${selected.hora_inicio}-${selected.hora_fin}`,
        score: selected.score,
        factors: selected.factors,
      };
    });
  }

  async availableCandidates(connection, patient, category) {
    const clinic = Number(patient.edad) < 18 ? CLINICS.child : CLINICS.adult;
    const result = await connection.query(
      `SELECT e.id AS id_estudiante, e.codigo_estudiante, e.nombre_completo,
              e.email, e.año_carrera, e.casos_activos, e.casos_completados, e.casos_necesarios,
              ee.id AS id_especialidad_estudiante, ee.especialidad, ee.clinica,
              ee.dia_semana, ee.hora_inicio, ee.hora_fin, ee.capacidad_pacientes
         FROM estudiantes_odontologia e
         JOIN especialidades_estudiante ee ON ee.id_estudiante = e.id AND ee.activo = TRUE
        WHERE e.estado = 'activo'
          AND e.casos_activos < e.casos_necesarios
          AND ee.especialidad = $1
          AND ee.clinica = $2
        ORDER BY e.casos_activos ASC, e.id ASC, ee.dia_semana ASC, ee.hora_inicio ASC
        FOR UPDATE OF e, ee`,
      [category.specialty, clinic],
    );

    const available = [];
    for (const candidate of result.rows) {
      const fechaCita = nextDateFor(candidate.dia_semana);
      const statesSql = placeholders(4, ACTIVE_ASSIGNMENT_STATES);
      const count = await connection.query(
        `SELECT COUNT(*) AS total
           FROM asignaciones
          WHERE id_estudiante = $1 AND fecha_cita = $2 AND hora_inicio_asignada = $3
            AND estado IN (${statesSql})`,
        [candidate.id_estudiante, fechaCita, candidate.hora_inicio, ...ACTIVE_ASSIGNMENT_STATES],
      );
      if (Number(count.rows[0].total) < Number(candidate.capacidad_pacientes || 1)) {
        available.push({ ...candidate, fecha_cita: fechaCita });
      }
    }
    return available;
  }

  async listPendingIds() {
    const db = await this.database.getConnection();
    const statesSql = placeholders(1, ACTIVE_ASSIGNMENT_STATES);
    return (
      await db.query(
        `SELECT p.id
         FROM pacientes p
        WHERE p.activo = TRUE AND p.estado = 'pendiente' AND p.edad IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM asignaciones a
             WHERE a.id_paciente = p.id AND a.estado IN (${statesSql})
          )
        ORDER BY CASE p.prioridad
          WHEN 'Muy Alta' THEN 1 WHEN 'Alta' THEN 2 WHEN 'Moderada' THEN 3 ELSE 4
        END, p.fecha_registro ASC
        LIMIT 50`,
        ACTIVE_ASSIGNMENT_STATES,
      )
    ).rows;
  }

  async listPending() {
    const db = await this.database.getConnection();
    return (
      await db.query(
        "SELECT id, nombre_completo, prioridad, tipo_tratamiento_inferido, fecha_registro FROM pacientes WHERE activo = TRUE AND estado = 'pendiente' ORDER BY fecha_registro",
      )
    ).rows;
  }

  async withMatchingLock(work) {
    const lockConnection = await this.database.getPoolConnection();
    try {
      const lock = await lockConnection.query(
        "SELECT pg_try_advisory_lock(hashtext('dental_matching_run')) AS acquired",
      );
      if (!lock.rows[0].acquired) return { success: false, reason: 'Ya hay un matching en ejecución' };
      return await work();
    } finally {
      try {
        await lockConnection.query("SELECT pg_advisory_unlock(hashtext('dental_matching_run'))");
      } finally {
        lockConnection.release();
      }
    }
  }

  async getStats() {
    const db = await this.database.getConnection();
    const result = await db.query(
      `SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE estado NOT IN ('completado', 'cancelado')) AS activas,
              COUNT(*) FILTER (WHERE estado = 'completado') AS completadas,
              AVG(score_compatibilidad) AS score_promedio
         FROM asignaciones`,
    );
    return result.rows[0];
  }
}

module.exports = MatchingRepository;
