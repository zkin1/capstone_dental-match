class DashboardRepository {
  constructor(database) {
    this.database = database;
  }

  async getStats() {
    const db = await this.database.getConnection();
    const [[patients], [students], [assignments]] = await Promise.all([
      db.execute(
        `SELECT COUNT(*) AS total, SUM(estado = 'pendiente') AS pendientes
           FROM pacientes WHERE activo = 1`,
      ),
      db.execute(
        `SELECT COUNT(*) AS total, SUM(estado = 'activo') AS activos
           FROM estudiantes_odontologia`,
      ),
      db.execute(
        `SELECT COUNT(*) AS total,
                SUM(estado NOT IN ('completado', 'cancelado')) AS activas,
                AVG(score_compatibilidad) AS score_promedio
           FROM asignaciones`,
      ),
    ]);

    return {
      pacientes: Number(patients[0].total) || 0,
      pacientesPendientes: Number(patients[0].pendientes) || 0,
      estudiantes: Number(students[0].activos) || 0,
      asignaciones: Number(assignments[0].total) || 0,
      asignacionesActivas: Number(assignments[0].activas) || 0,
      scorePromedio: Math.round((Number(assignments[0].score_promedio) || 0) * 100),
    };
  }
}

module.exports = DashboardRepository;
