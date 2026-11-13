module.exports = {
  async up(db) {
    await db.query(`
      CREATE TABLE IF NOT EXISTS ausencias_estudiante (
        id_estudiante BIGINT NOT NULL REFERENCES estudiantes_odontologia(id) ON DELETE CASCADE,
        fecha DATE NOT NULL,
        PRIMARY KEY (id_estudiante, fecha)
      )
    `);
  },
};
