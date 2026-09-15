const { ACTIVE_ASSIGNMENT_STATES } = require('../../../../domain/common');
const { CLINICS, nextDateFor } = require('../../../../domain/matching/scoring');

class MatchingRepository {
  constructor(database) {
    this.database = database;
    this.activeStatesSql = ACTIVE_ASSIGNMENT_STATES.map(() => '?').join(', ');
  }

  async matchPatient(patientId, categorize, selectCandidate) {
    return this.database.transaction(async connection => {
      const [patients] = await connection.execute(
        `SELECT * FROM pacientes
          WHERE id = ? AND activo = 1 AND estado = 'pendiente'
            AND NOT EXISTS (
              SELECT 1 FROM asignaciones a
               WHERE a.id_paciente = pacientes.id AND a.estado IN (${this.activeStatesSql})
            )
          FOR UPDATE`,
        [patientId, ...ACTIVE_ASSIGNMENT_STATES],
      );
      const patient = patients[0];
      if (!patient) return { success: false, reason: 'Paciente no disponible para asignación' };

      const category = categorize(patient);
      await connection.execute(
        'UPDATE pacientes SET tipo_tratamiento_inferido = ?, prioridad = ?, nivel_dolor = ? WHERE id = ?',
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

      const [insert] = await connection.execute(
        `INSERT INTO asignaciones
         (id_paciente, active_patient_id, id_estudiante, id_especialidad_estudiante, fecha_cita, estado,
          especialidad_asignada, dia_semana_asignado, hora_inicio_asignada, hora_fin_asignada,
          score_compatibilidad, factores_matching, observaciones_sistema)
         VALUES (?, ?, ?, ?, ?, 'asignado', ?, ?, ?, ?, ?, ?, ?)`,
        [
          patient.id, patient.id, selected.id_estudiante, selected.id_especialidad_estudiante,
          selected.fecha_cita, selected.especialidad, selected.dia_semana, selected.hora_inicio,
          selected.hora_fin, selected.score, JSON.stringify(selected.factors),
          `Asignación ponderada: ${category.reason}`,
        ],
      );
      await connection.execute(
        "UPDATE pacientes SET estado = 'asignado', estudiante_asignado = ? WHERE id = ?",
        [selected.id_estudiante, patient.id],
      );
      const [loadUpdate] = await connection.execute(
        'UPDATE estudiantes_odontologia SET casos_activos = casos_activos + 1 WHERE id = ? AND casos_activos < casos_necesarios',
        [selected.id_estudiante],
      );
      if (!loadUpdate.affectedRows) throw new Error('La capacidad del estudiante cambió durante la asignación');

      for (const notification of [
        { email: patient.email, type: 'asignacion_paciente', subject: 'Tu caso fue asignado' },
        { email: selected.email, type: 'asignacion_estudiante', subject: 'Tienes un nuevo caso asignado' },
      ]) {
        if (!notification.email) continue;
        await connection.execute(
          `INSERT INTO notificaciones_email
           (id_asignacion, id_estudiante, id_paciente, email_destino, tipo_notificacion, asunto, estado)
           VALUES (?, ?, ?, ?, ?, ?, 'pendiente')`,
          [insert.insertId, selected.id_estudiante, patient.id, notification.email, notification.type, notification.subject],
        );
      }

      return {
        success: true,
        assignmentId: insert.insertId,
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
    const [rows] = await connection.execute(
      `SELECT e.id AS id_estudiante, e.codigo_estudiante, e.nombre_completo,
              e.email, e.año_carrera, e.casos_activos, e.casos_completados, e.casos_necesarios,
              ee.id AS id_especialidad_estudiante, ee.especialidad, ee.clinica,
              ee.dia_semana, ee.hora_inicio, ee.hora_fin, ee.capacidad_pacientes
         FROM estudiantes_odontologia e
         JOIN especialidades_estudiante ee ON ee.id_estudiante = e.id AND ee.activo = 1
        WHERE e.estado = 'activo'
          AND e.casos_activos < e.casos_necesarios
          AND ee.especialidad = ?
          AND ee.clinica = ?
        ORDER BY e.casos_activos ASC, e.id ASC, ee.dia_semana ASC, ee.hora_inicio ASC
        FOR UPDATE`,
      [category.specialty, clinic],
    );

    const available = [];
    // ponytail: esta consulta por candidato es suficiente para la demo; agruparla cuando haya cientos de horarios.
    for (const candidate of rows) {
      const fechaCita = nextDateFor(candidate.dia_semana);
      const [count] = await connection.execute(
        `SELECT COUNT(*) AS total
           FROM asignaciones
          WHERE id_estudiante = ? AND fecha_cita = ? AND hora_inicio_asignada = ?
            AND estado IN (${this.activeStatesSql})`,
        [candidate.id_estudiante, fechaCita, candidate.hora_inicio, ...ACTIVE_ASSIGNMENT_STATES],
      );
      if (Number(count[0].total) < Number(candidate.capacidad_pacientes || 1)) {
        available.push({ ...candidate, fecha_cita: fechaCita });
      }
    }
    return available;
  }

  async listPendingIds() {
    const db = await this.database.getConnection();
    const [rows] = await db.execute(
      `SELECT p.id
         FROM pacientes p
        WHERE p.activo = 1 AND p.estado = 'pendiente' AND p.edad IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM asignaciones a
             WHERE a.id_paciente = p.id AND a.estado IN (${this.activeStatesSql})
          )
        ORDER BY FIELD(p.prioridad, 'Muy Alta', 'Alta', 'Moderada', 'Baja'), p.fecha_registro ASC
        LIMIT 50`,
      ACTIVE_ASSIGNMENT_STATES,
    );
    return rows;
  }

  async listPending() {
    const db = await this.database.getConnection();
    const [rows] = await db.execute(
      "SELECT id, nombre_completo, prioridad, tipo_tratamiento_inferido, fecha_registro FROM pacientes WHERE activo = 1 AND estado = 'pendiente' ORDER BY fecha_registro",
    );
    return rows;
  }

  async withMatchingLock(work) {
    const lockConnection = await this.database.getPoolConnection();
    try {
      const [lock] = await lockConnection.query("SELECT GET_LOCK('dental_matching_run', 0) AS acquired");
      if (!lock[0].acquired) return { success: false, reason: 'Ya hay un matching en ejecución' };
      return await work();
    } finally {
      try {
        await lockConnection.query("SELECT RELEASE_LOCK('dental_matching_run')");
      } finally {
        lockConnection.release();
      }
    }
  }

  async getStats() {
    const db = await this.database.getConnection();
    const [rows] = await db.execute(
      `SELECT COUNT(*) AS total,
              SUM(estado NOT IN ('completado', 'cancelado')) AS activas,
              SUM(estado = 'completado') AS completadas,
              AVG(score_compatibilidad) AS score_promedio
         FROM asignaciones`,
    );
    return rows[0];
  }
}

module.exports = MatchingRepository;
