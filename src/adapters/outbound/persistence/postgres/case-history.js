const { NotFoundError } = require('../../../../shared/errors/AppError');

async function appendEvent(
  db,
  patientId,
  assignmentId,
  user,
  type,
  from,
  to,
  note,
  data = {}
) {
  await db.query(
    `INSERT INTO historial_paciente
    (id_paciente,id_asignacion,id_usuario,responsable,rol,tipo,estado_anterior,estado_nuevo,nota,datos)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      patientId,
      assignmentId || null,
      user?.id || null,
      user?.nombre_completo || 'Sistema',
      user?.role || 'system',
      type,
      from || null,
      to || null,
      note || null,
      JSON.stringify(data),
    ]
  );
}

async function lockAssignment(db, id) {
  await db.query(
    "SELECT pg_advisory_xact_lock(hashtext('dental_match_allocation'))"
  );
  const lookup = await db.query(
    'SELECT id_paciente FROM asignaciones WHERE id=$1',
    [id]
  );
  if (!lookup.rows[0]) throw new NotFoundError('Asignación', id);
  await db.query('SELECT id FROM pacientes WHERE id=$1 FOR UPDATE', [
    lookup.rows[0].id_paciente,
  ]);
  const result = await db.query(
    `SELECT a.*,e.codigo_estudiante FROM asignaciones a
    JOIN estudiantes_odontologia e ON e.id=a.id_estudiante WHERE a.id=$1 FOR UPDATE OF a`,
    [id]
  );
  return result.rows[0];
}

module.exports = { appendEvent, lockAssignment };
