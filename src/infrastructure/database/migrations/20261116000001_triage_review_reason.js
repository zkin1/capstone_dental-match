const { scorePatientCategory } = require('../../../domain/matching/scoring');

module.exports = {
  async up(db) {
    await db.query('ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS motivo_revision_triaje TEXT');
    let cursor = 0;
    let size;
    do {
      const { rows } = await db.query(
        `SELECT id, edad, nivel_dolor, prioridad, tipo_tratamiento_inferido,
                respuestas_cuestionario, sintomas_seleccionados, pre_categorizacion_ia
           FROM pacientes WHERE id > $1 ORDER BY id LIMIT 500`,
        [cursor]
      );
      size = rows.length;
      if (!size) break;
      const reasons = rows.map(patient => scorePatientCategory(patient).reviewReason);
      await db.query(
        `UPDATE pacientes p SET motivo_revision_triaje=r.reason
           FROM unnest($1::bigint[], $2::text[]) AS r(id, reason)
          WHERE p.id=r.id AND p.motivo_revision_triaje IS DISTINCT FROM r.reason`,
        [rows.map(patient => patient.id), reasons]
      );
      cursor = rows[rows.length - 1].id;
    } while (size === 500);
  },
};
