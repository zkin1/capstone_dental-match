class PatientRepository {
  constructor(database) {
    this.database = database;
  }

  async createFromIntake(patient, answers, preCategory) {
    const db = await this.database.getConnection();
    const [result] = await db.execute(
      `INSERT INTO pacientes
       (nombre_completo, edad, telefono, email, ciudad, sintomas_seleccionados,
        respuestas_cuestionario, pre_categorizacion_ia, fecha_pre_categorizacion,
        nivel_dolor, prioridad, estado, activo, consentimiento_datos, fecha_consentimiento)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, 'Moderada', 'pendiente', 1, 1, NOW())`,
      [
        patient.nombre_completo, patient.edad, patient.telefono, patient.email, patient.ciudad,
        JSON.stringify(answers), JSON.stringify(answers), JSON.stringify(preCategory),
        Math.max(0, Math.min(10, Number(answers.intensidad_dolor) || 0)),
      ],
    );
    return result.insertId;
  }

  async list() {
    const db = await this.database.getConnection();
    const [rows] = await db.execute(
      `SELECT p.id, p.nombre_completo, p.edad, p.telefono, p.email, p.ciudad,
              p.tipo_tratamiento_inferido, p.nivel_dolor, p.prioridad, p.estado,
              p.fecha_registro, a.id AS asignacion_id,
              e.nombre_completo AS estudiante_nombre, e.codigo_estudiante AS estudiante_codigo
         FROM pacientes p
         LEFT JOIN asignaciones a ON a.id_paciente = p.id
          AND a.estado IN ('asignado', 'notificado', 'contactado', 'en_tratamiento')
         LEFT JOIN estudiantes_odontologia e ON e.id = a.id_estudiante
        WHERE p.activo = 1
        ORDER BY p.fecha_registro DESC
        LIMIT 200`,
    );
    return rows;
  }

  async getStats() {
    const db = await this.database.getConnection();
    const [rows] = await db.execute(
      `SELECT COUNT(*) AS total,
              SUM(estado = 'pendiente') AS pendientes,
              SUM(estado = 'asignado') AS asignados,
              SUM(estado = 'completado') AS completados
         FROM pacientes WHERE activo = 1`,
    );
    return rows[0];
  }

  async create(patient) {
    const db = await this.database.getConnection();
    const [result] = await db.execute(
      `INSERT INTO pacientes
       (nombre_completo, edad, telefono, email, ciudad, sintomas_seleccionados,
        nivel_dolor, dias_disponibles, horario_preferencia, tipo_tratamiento_inferido,
        prioridad, estado, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', 1)`,
      [
        patient.nombre_completo, patient.edad, patient.telefono, patient.email, patient.ciudad,
        JSON.stringify({ descripcion: patient.description }), patient.pain,
        patient.availableDays ? JSON.stringify(patient.availableDays) : null,
        patient.preferredHours, patient.specialty, patient.priority,
      ],
    );
    return { id: result.insertId, estado: 'pendiente' };
  }

  async update(id, changes) {
    const entries = Object.entries(changes);
    const db = await this.database.getConnection();
    const [result] = await db.execute(
      `UPDATE pacientes SET ${entries.map(([key]) => `${key} = ?`).join(', ')} WHERE id = ? AND activo = 1`,
      [...entries.map(([, value]) => value), id],
    );
    return result.affectedRows > 0;
  }

  async deactivate(id) {
    return this.database.transaction(async connection => {
      const [assignments] = await connection.execute(
        "SELECT id, id_estudiante FROM asignaciones WHERE id_paciente = ? AND estado IN ('asignado', 'notificado', 'contactado', 'en_tratamiento') FOR UPDATE",
        [id],
      );
      await connection.execute(
        "UPDATE asignaciones SET estado = 'cancelado', active_patient_id = NULL, motivo_cancelacion = 'Paciente desactivado' WHERE id_paciente = ? AND estado IN ('asignado', 'notificado', 'contactado', 'en_tratamiento')",
        [id],
      );
      for (const assignment of assignments) {
        await connection.execute(
          'UPDATE estudiantes_odontologia SET casos_activos = GREATEST(0, casos_activos - 1) WHERE id = ?',
          [assignment.id_estudiante],
        );
      }
      const [result] = await connection.execute(
        "UPDATE pacientes SET activo = 0, estado = 'cancelado', estudiante_asignado = NULL WHERE id = ? AND activo = 1",
        [id],
      );
      return result.affectedRows > 0;
    });
  }
}

module.exports = PatientRepository;
