class DashboardRepository {
  constructor(database) {
    this.database = database;
  }

  async getStats() {
    const db = await this.database.getConnection();
    const [patients, students, assignments] = await Promise.all([
      db.query(
        `SELECT COUNT(*) AS total,
                COUNT(*) FILTER (WHERE estado = 'pendiente') AS pendientes
           FROM pacientes WHERE activo = TRUE`,
      ),
      db.query(
        `SELECT COUNT(*) AS total,
                COUNT(*) FILTER (WHERE estado = 'activo') AS activos
           FROM estudiantes_odontologia`,
      ),
      db.query(
        `SELECT COUNT(*) AS total,
                COUNT(*) FILTER (WHERE estado NOT IN ('completado', 'cancelado')) AS activas,
                AVG(score_compatibilidad) AS score_promedio
           FROM asignaciones`,
      ),
    ]);

    return {
      pacientes: Number(patients.rows[0].total) || 0,
      pacientesPendientes: Number(patients.rows[0].pendientes) || 0,
      estudiantes: Number(students.rows[0].activos) || 0,
      asignaciones: Number(assignments.rows[0].total) || 0,
      asignacionesActivas: Number(assignments.rows[0].activas) || 0,
      scorePromedio: Math.round((Number(assignments.rows[0].score_promedio) || 0) * 100),
    };
  }
}

module.exports = DashboardRepository;
