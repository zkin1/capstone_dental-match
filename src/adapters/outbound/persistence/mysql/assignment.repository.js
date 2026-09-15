const { decideUpdate } = require('../../../../domain/assignments/assignment.policy');

const SELECT_ASSIGNMENTS = `
  SELECT a.id, a.id_paciente, a.id_estudiante, a.fecha_asignacion, a.fecha_cita,
         a.estado, a.especialidad_asignada, a.dia_semana_asignado,
         a.hora_inicio_asignada, a.hora_fin_asignada, a.score_compatibilidad,
         a.factores_matching, a.observaciones_sistema, a.observaciones_estudiante,
         p.nombre_completo AS paciente_nombre, p.telefono AS paciente_telefono,
         p.email AS paciente_email, p.prioridad, p.nivel_dolor,
         e.nombre_completo AS estudiante_nombre, e.codigo_estudiante
    FROM asignaciones a
    JOIN pacientes p ON p.id = a.id_paciente
    JOIN estudiantes_odontologia e ON e.id = a.id_estudiante`;

class AssignmentRepository {
  constructor(database) {
    this.database = database;
  }

  async listMine(studentCode) {
    const db = await this.database.getConnection();
    const [students] = await db.execute(
      "SELECT id, nombre_completo, codigo_estudiante FROM estudiantes_odontologia WHERE codigo_estudiante = ? AND estado = 'activo'",
      [studentCode],
    );
    if (!students.length) return null;
    const [rows] = await db.execute(
      `${SELECT_ASSIGNMENTS} WHERE a.id_estudiante = ? ORDER BY a.fecha_asignacion DESC`,
      [students[0].id],
    );
    return { student: students[0], rows };
  }

  async list() {
    const db = await this.database.getConnection();
    const [rows] = await db.execute(`${SELECT_ASSIGNMENTS} ORDER BY a.fecha_asignacion DESC LIMIT 500`);
    return rows;
  }

  async getStats() {
    const db = await this.database.getConnection();
    const [rows] = await db.execute('SELECT estado, COUNT(*) AS cantidad FROM asignaciones GROUP BY estado');
    return rows;
  }

  async update(id, input, user) {
    return this.database.transaction(async connection => {
      const [rows] = await connection.execute(
        `SELECT a.*, e.codigo_estudiante
           FROM asignaciones a
           JOIN estudiantes_odontologia e ON e.id = a.id_estudiante
          WHERE a.id = ? FOR UPDATE`,
        [id],
      );
      const decision = decideUpdate(rows[0], input, user);
      if (!decision.ok) return decision;

      const updates = [];
      const values = [];
      if (decision.nextState !== rows[0].estado) {
        updates.push('estado = ?', 'active_patient_id = ?');
        values.push(decision.nextState, decision.isActive ? rows[0].id_paciente : null);
        if (decision.nextState === 'contactado') updates.push('fecha_contacto = COALESCE(fecha_contacto, NOW())');
        if (decision.nextState === 'en_tratamiento') updates.push('fecha_inicio_tratamiento = COALESCE(fecha_inicio_tratamiento, NOW())');
        if (decision.nextState === 'completado') updates.push('fecha_completado = NOW()');
        if (decision.nextState === 'cancelado') updates.push('fecha_cancelacion = NOW()');
      }
      if (decision.observation !== undefined) {
        updates.push('observaciones_estudiante = ?');
        values.push(decision.observation);
      }
      values.push(id);
      await connection.execute(
        `UPDATE asignaciones SET ${updates.join(', ')}, fecha_actualizacion = NOW() WHERE id = ?`, values,
      );

      if (decision.nextState !== rows[0].estado && ['completado', 'cancelado'].includes(decision.nextState)) {
        await connection.execute(
          `UPDATE estudiantes_odontologia
              SET casos_activos = GREATEST(casos_activos - 1, 0),
                  casos_completados = casos_completados + ?
            WHERE id = ?`,
          [decision.nextState === 'completado' ? 1 : 0, rows[0].id_estudiante],
        );
        await connection.execute(
          'UPDATE pacientes SET estado = ?, estudiante_asignado = NULL WHERE id = ?',
          [decision.nextState === 'completado' ? 'completado' : 'pendiente', rows[0].id_paciente],
        );
      }
      return { ok: true, message: 'Asignación actualizada' };
    });
  }
}

module.exports = AssignmentRepository;
