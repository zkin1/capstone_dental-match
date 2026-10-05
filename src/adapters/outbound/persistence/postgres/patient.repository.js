const { appendEvent } = require('./case-history');
const { ConflictError } = require('../../../../shared/errors/AppError');

class PatientRepository {
  constructor(database) {
    this.database = database;
  }

  async createFromIntake(patient, answers, preCategory) {
    return this.database.transaction(async (db) => {
      const result = await db.query(
        `INSERT INTO pacientes
       (nombre_completo, edad, telefono, email, ciudad, sintomas_seleccionados,
        respuestas_cuestionario, pre_categorizacion_ia, fecha_pre_categorizacion,
        nivel_dolor, prioridad, estado, activo, consentimiento_datos, fecha_consentimiento)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP,
               $9, 'Moderada', 'pendiente', TRUE, TRUE, CURRENT_TIMESTAMP)
       RETURNING id`,
        [
          patient.nombre_completo,
          patient.edad,
          patient.telefono,
          patient.email,
          patient.ciudad,
          JSON.stringify(answers),
          JSON.stringify(answers),
          JSON.stringify(preCategory),
          Math.max(0, Math.min(10, Number(answers.intensidad_dolor) || 0)),
        ]
      );
      await appendEvent(
        db,
        result.rows[0].id,
        null,
        null,
        'caso_registrado',
        null,
        'pendiente',
        'Registro público con consentimiento'
      );
      return result.rows[0].id;
    });
  }

  async list() {
    const db = await this.database.getConnection();
    return (
      await db.query(
        `SELECT p.id, p.nombre_completo, p.edad, p.telefono, p.email, p.ciudad,
              p.tipo_tratamiento_inferido, p.nivel_dolor, p.prioridad, p.estado,
              p.fecha_registro, a.id AS asignacion_id,
              e.nombre_completo AS estudiante_nombre, e.codigo_estudiante AS estudiante_codigo
         FROM pacientes p
         LEFT JOIN asignaciones a ON a.id_paciente = p.id
          AND a.estado IN ('asignado', 'notificado', 'contactado', 'en_tratamiento', 'derivacion_pendiente')
         LEFT JOIN estudiantes_odontologia e ON e.id = a.id_estudiante
        WHERE p.activo = TRUE
        ORDER BY p.fecha_registro DESC
        LIMIT 200`
      )
    ).rows;
  }

  async getStats() {
    const db = await this.database.getConnection();
    const result = await db.query(
      `SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE estado = 'pendiente') AS pendientes,
              COUNT(*) FILTER (WHERE estado = 'asignado') AS asignados,
              COUNT(*) FILTER (WHERE estado = 'completado') AS completados
         FROM pacientes WHERE activo = TRUE`
    );
    return result.rows[0];
  }

  async create(patient, user) {
    return this.database.transaction(async (db) => {
      const result = await db.query(
        `INSERT INTO pacientes
       (nombre_completo, edad, telefono, email, ciudad, sintomas_seleccionados,
        nivel_dolor, dias_disponibles, horario_preferencia, tipo_tratamiento_inferido,
        prioridad, estado, activo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pendiente', TRUE)
       RETURNING id, estado`,
        [
          patient.nombre_completo,
          patient.edad,
          patient.telefono,
          patient.email,
          patient.ciudad,
          JSON.stringify({ descripcion: patient.description }),
          patient.pain,
          patient.availableDays ? JSON.stringify(patient.availableDays) : null,
          patient.preferredHours,
          patient.specialty,
          patient.priority,
        ]
      );
      await appendEvent(
        db,
        result.rows[0].id,
        null,
        user,
        'caso_registrado',
        null,
        'pendiente',
        'Caso registrado por el personal'
      );
      return result.rows[0];
    });
  }

  async update(id, changes, user) {
    const entries = Object.entries(changes);
    const values = entries.map(([, value]) => value);
    const assignments = entries.map(([key], index) => `${key} = $${index + 1}`);
    values.push(id);

    return this.database.transaction(async (db) => {
      const patient = (
        await db.query(
          'SELECT * FROM pacientes WHERE id=$1 AND activo=TRUE FOR UPDATE',
          [id]
        )
      ).rows[0];
      if (!patient) return false;
      if (
        patient.precalificacion_validada &&
        ('tipo_tratamiento_inferido' in changes || 'prioridad' in changes)
      ) {
        // Forms also submit unchanged values; only a clinical change requires the review form.
        if (
          (changes.tipo_tratamiento_inferido !== undefined &&
            changes.tipo_tratamiento_inferido !==
              patient.tipo_tratamiento_inferido) ||
          (changes.prioridad !== undefined &&
            changes.prioridad !== patient.prioridad)
        ) {
          throw new ConflictError(
            'Corrige la clasificación desde Revisar precalificación'
          );
        }
      }
      const result = await db.query(
        `UPDATE pacientes
          SET ${assignments.join(', ')}, fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id = $${values.length} AND activo = TRUE`,
        values
      );
      await appendEvent(
        db,
        id,
        null,
        user,
        'datos_actualizados',
        null,
        null,
        'Datos del paciente actualizados',
        { cambios: changes }
      );
      return result.rowCount > 0;
    });
  }

  async deactivate(id, user) {
    return this.database.transaction(async (connection) => {
      await connection.query(
        "SELECT pg_advisory_xact_lock(hashtext('dental_match_allocation'))"
      );
      const patient = (
        await connection.query(
          'SELECT id,estado FROM pacientes WHERE id=$1 AND activo=TRUE FOR UPDATE',
          [id]
        )
      ).rows[0];
      if (!patient) return false;
      const assignments = await connection.query(
        "SELECT id, id_estudiante, estado FROM asignaciones WHERE id_paciente = $1 AND estado IN ('asignado', 'notificado', 'contactado', 'en_tratamiento', 'derivacion_pendiente') FOR UPDATE",
        [id]
      );
      await connection.query(
        `UPDATE asignaciones
            SET estado = 'cancelado', motivo_cancelacion = 'Paciente desactivado',
                fecha_cancelacion = CURRENT_TIMESTAMP, fecha_actualizacion = CURRENT_TIMESTAMP
          WHERE id_paciente = $1
            AND estado IN ('asignado', 'notificado', 'contactado', 'en_tratamiento', 'derivacion_pendiente')`,
        [id]
      );
      for (const assignment of assignments.rows) {
        await appendEvent(
          connection,
          id,
          assignment.id,
          user,
          'paciente_desactivado',
          assignment.estado,
          'cancelado',
          'Paciente desactivado'
        );
        await connection.query(
          `UPDATE estudiantes_odontologia
              SET casos_activos = GREATEST(0, casos_activos - 1),
                  fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE id = $1`,
          [assignment.id_estudiante]
        );
      }
      if (!assignments.rows.length)
        await appendEvent(
          connection,
          id,
          null,
          user,
          'paciente_desactivado',
          patient.estado,
          'cancelado',
          'Paciente desactivado'
        );
      await connection.query(
        `UPDATE derivaciones SET estado='rechazada',id_revisor=$1,motivo_revision='Paciente desactivado',
        fecha_revision=CURRENT_TIMESTAMP WHERE id_paciente=$2 AND estado='pendiente'`,
        [user?.id || null, id]
      );
      const result = await connection.query(
        `UPDATE pacientes
            SET activo = FALSE, estado = 'cancelado', fecha_actualizacion = CURRENT_TIMESTAMP
          WHERE id = $1 AND activo = TRUE`,
        [id]
      );
      return result.rowCount > 0;
    });
  }
}

module.exports = PatientRepository;
