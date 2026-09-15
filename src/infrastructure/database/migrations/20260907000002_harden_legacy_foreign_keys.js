async function foreignKeyExists(db, table, constraint) {
  const [rows] = await db.execute(
    'SELECT 1 FROM information_schema.table_constraints WHERE constraint_schema = DATABASE() AND table_name = ? AND constraint_name = ? AND constraint_type = \'FOREIGN KEY\' LIMIT 1',
    [table, constraint],
  );
  return rows.length > 0;
}

async function indexExists(db, table, index) {
  const [rows] = await db.execute(
    'SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ? LIMIT 1',
    [table, index],
  );
  return rows.length > 0;
}

module.exports = {
  async up(db) {
    if (!await foreignKeyExists(db, 'asignaciones', 'fk_asignaciones_especialidad')) {
      const [invalidSpecialties] = await db.query(`SELECT a.id FROM asignaciones a
        LEFT JOIN especialidades_estudiante ee ON ee.id = a.id_especialidad_estudiante
        WHERE a.id_especialidad_estudiante IS NOT NULL AND ee.id IS NULL LIMIT 1`);
      if (invalidSpecialties.length) throw new Error('Hay asignaciones con especialidad de estudiante inexistente');
      await db.query(`ALTER TABLE asignaciones
        ADD CONSTRAINT fk_asignaciones_especialidad FOREIGN KEY (id_especialidad_estudiante)
        REFERENCES especialidades_estudiante(id) ON DELETE SET NULL`);
    }

    if (!await indexExists(db, 'notificaciones_email', 'idx_notificaciones_asignacion')) {
      await db.query('CREATE INDEX idx_notificaciones_asignacion ON notificaciones_email (id_asignacion)');
    }
    if (!await foreignKeyExists(db, 'notificaciones_email', 'fk_notificaciones_asignacion')) {
      await db.query(`ALTER TABLE notificaciones_email
        ADD CONSTRAINT fk_notificaciones_asignacion FOREIGN KEY (id_asignacion)
        REFERENCES asignaciones(id)`);
    }
  },
};
