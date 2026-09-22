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
    const students = await db.query(
      "SELECT id, nombre_completo, codigo_estudiante FROM estudiantes_odontologia WHERE codigo_estudiante = $1 AND estado = 'activo'",
      [studentCode],
    );
    if (!students.rows.length) return null;
    const result = await db.query(`${SELECT_ASSIGNMENTS} WHERE a.id_estudiante = $1 ORDER BY a.fecha_asignacion DESC`, [
      students.rows[0].id,
    ]);
    return { student: students.rows[0], rows: result.rows };
  }

  async list() {
    const db = await this.database.getConnection();
    return (await db.query(`${SELECT_ASSIGNMENTS} ORDER BY a.fecha_asignacion DESC LIMIT 500`)).rows;
  }

  async getStats() {
    const db = await this.database.getConnection();
    return (await db.query('SELECT estado, COUNT(*) AS cantidad FROM asignaciones GROUP BY estado')).rows;
  }

  async update(id, input, user) {
    return this.database.transaction(async (connection) => {
      const result = await connection.query(
        `SELECT a.*, e.codigo_estudiante
           FROM asignaciones a
           JOIN estudiantes_odontologia e ON e.id = a.id_estudiante
          WHERE a.id = $1 FOR UPDATE`,
        [id],
      );
      const assignment = result.rows[0];
      const decision = decideUpdate(assignment, input, user);
      if (!decision.ok) return decision;

      const updates = [];
      const values = [];
      const add = (field, value) => {
        values.push(value);
        updates.push(`${field} = $${values.length}`);
      };

      if (decision.nextState !== assignment.estado) {
        add('estado', decision.nextState);
        if (decision.nextState === 'contactado')
          updates.push('fecha_contacto = COALESCE(fecha_contacto, CURRENT_TIMESTAMP)');
        if (decision.nextState === 'en_tratamiento')
          updates.push('fecha_inicio_tratamiento = COALESCE(fecha_inicio_tratamiento, CURRENT_TIMESTAMP)');
        if (decision.nextState === 'completado') updates.push('fecha_completado = CURRENT_TIMESTAMP');
        if (decision.nextState === 'cancelado') updates.push('fecha_cancelacion = CURRENT_TIMESTAMP');
      }
      if (decision.observation !== undefined) add('observaciones_estudiante', decision.observation);

      values.push(id);
      await connection.query(
        `UPDATE asignaciones
            SET ${updates.join(', ')}, fecha_actualizacion = CURRENT_TIMESTAMP
          WHERE id = $${values.length}`,
        values,
      );

      if (decision.nextState !== assignment.estado && ['completado', 'cancelado'].includes(decision.nextState)) {
        await connection.query(
          `UPDATE estudiantes_odontologia
              SET casos_activos = GREATEST(casos_activos - 1, 0),
                  casos_completados = casos_completados + $1,
                  fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE id = $2`,
          [decision.nextState === 'completado' ? 1 : 0, assignment.id_estudiante],
        );
        await connection.query(
          'UPDATE pacientes SET estado = $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = $2',
          [decision.nextState === 'completado' ? 'completado' : 'pendiente', assignment.id_paciente],
        );
      }
      return { ok: true, message: 'Asignación actualizada' };
    });
  }
}

module.exports = AssignmentRepository;
