const { parseJson } = require('../../../../domain/common');
const { scorePatientCategory } = require('../../../../domain/matching/scoring');
const { canRefer } = require('../../../../domain/assignments/referral.policy');
const {
  NotFoundError,
  AuthorizationError,
  ConflictError,
} = require('../../../../shared/errors/AppError');
const { appendEvent, lockAssignment } = require('./case-history');

class CaseRepository {
  constructor(database) {
    this.database = database;
  }

  async detail(id, user, byAssignment = false) {
    const db = await this.database.getConnection();
    let assignment = null;
    if (byAssignment) {
      assignment = (
        await db.query(
          `SELECT a.*,e.nombre_completo AS estudiante_nombre,e.codigo_estudiante
        FROM asignaciones a JOIN estudiantes_odontologia e ON e.id=a.id_estudiante WHERE a.id=$1`,
          [id]
        )
      ).rows[0];
      if (!assignment) throw new NotFoundError('Asignación', id);
      if (
        user.role === 'student' &&
        assignment.codigo_estudiante !== user.codigo_estudiante
      ) {
        throw new AuthorizationError(
          'Solo puedes consultar tus casos asignados'
        );
      }
      id = assignment.id_paciente;
    } else if (user.role === 'student') {
      throw new AuthorizationError();
    }
    const patient = (
      await db.query('SELECT * FROM pacientes WHERE id=$1', [id])
    ).rows[0];
    if (!patient) throw new NotFoundError('Paciente', id);
    const history = await db.query(
      'SELECT * FROM historial_paciente WHERE id_paciente=$1 ORDER BY fecha,id',
      [id]
    );
    const referrals = await db.query(
      `SELECT d.*,e.nombre_completo AS estudiante_origen,
      u.nombre_completo AS revisor FROM derivaciones d
      JOIN estudiantes_odontologia e ON e.id=d.id_estudiante_origen
      LEFT JOIN users u ON u.id=d.id_revisor WHERE d.id_paciente=$1 ORDER BY d.fecha_creacion,d.id`,
      [id]
    );
    const assignments = await db.query(
      `SELECT a.id,a.estado,a.fecha_asignacion,a.especialidad_asignada,
      e.nombre_completo AS estudiante_nombre FROM asignaciones a
      JOIN estudiantes_odontologia e ON e.id=a.id_estudiante WHERE a.id_paciente=$1 ORDER BY a.id`,
      [id]
    );
    // Compute the suggestion without replacing it with the staff's validated decision.
    const suggestion =
      parseJson(patient.precalificacion_sugerida) ||
      scorePatientCategory({ ...patient, precalificacion_validada: null });
    return {
      paciente: patient,
      asignacion: assignment,
      sugerencia: suggestion,
      validacion: parseJson(patient.precalificacion_validada),
      historial: history.rows,
      derivaciones: referrals.rows,
      asignaciones: assignments.rows,
    };
  }

  async qualify(patientId, qualification, user) {
    return this.database.transaction(async (db) => {
      const patient = (
        await db.query(
          'SELECT * FROM pacientes WHERE id=$1 AND activo=TRUE FOR UPDATE',
          [patientId]
        )
      ).rows[0];
      if (!patient) throw new NotFoundError('Paciente', patientId);
      if (
        (
          await db.query(
            "SELECT id FROM derivaciones WHERE id_paciente=$1 AND estado='pendiente'",
            [patientId]
          )
        ).rows.length
      ) {
        throw new ConflictError(
          'Revisa la derivación pendiente para confirmar o corregir su clasificación'
        );
      }
      const validated = {
        ...qualification,
        reviewer: user.nombre_completo,
        reviewedAt: new Date().toISOString(),
      };
      await db.query(
        `UPDATE pacientes SET precalificacion_validada=$1,tipo_tratamiento_inferido=$2,
        precalificacion_sugerida=COALESCE(precalificacion_sugerida,$5::jsonb),
        prioridad=$3,fecha_actualizacion=CURRENT_TIMESTAMP WHERE id=$4`,
        [
          JSON.stringify(validated),
          qualification.specialty,
          qualification.priority,
          patientId,
          JSON.stringify(
            scorePatientCategory({ ...patient, precalificacion_validada: null })
          ),
        ]
      );
      await appendEvent(
        db,
        patientId,
        null,
        user,
        'precalificacion_validada',
        null,
        null,
        qualification.reason,
        { anterior: patient.precalificacion_validada, validacion: validated }
      );
      return validated;
    });
  }

  async propose(assignmentId, qualification, user) {
    return this.database.transaction(async (db) => {
      const assignment = await lockAssignment(db, assignmentId);
      canRefer(assignment, user);
      const previous = await db.query(
        `SELECT id FROM derivaciones WHERE id_paciente=$1
        AND id_estudiante_origen=$2 AND estado='aprobada'`,
        [assignment.id_paciente, assignment.id_estudiante]
      );
      if (previous.rows.length)
        throw new ConflictError('Este estudiante ya derivó este paciente');
      const result = await db.query(
        `INSERT INTO derivaciones
        (id_paciente,id_asignacion_origen,id_estudiante_origen,estado_anterior,propuesta,id_solicitante)
        VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [
          assignment.id_paciente,
          assignmentId,
          assignment.id_estudiante,
          assignment.estado,
          JSON.stringify(qualification),
          user.id,
        ]
      );
      await db.query(
        "UPDATE asignaciones SET estado='derivacion_pendiente',fecha_actualizacion=CURRENT_TIMESTAMP WHERE id=$1",
        [assignmentId]
      );
      await appendEvent(
        db,
        assignment.id_paciente,
        assignmentId,
        user,
        'derivacion_solicitada',
        assignment.estado,
        'derivacion_pendiente',
        qualification.reason,
        { derivacion_id: result.rows[0].id, propuesta: qualification }
      );
      return result.rows[0];
    });
  }

  async listReferrals() {
    const db = await this.database.getConnection();
    return (
      await db.query(`SELECT d.*,p.nombre_completo AS paciente_nombre,
      e.nombre_completo AS estudiante_origen FROM derivaciones d JOIN pacientes p ON p.id=d.id_paciente
      JOIN estudiantes_odontologia e ON e.id=d.id_estudiante_origen
      ORDER BY CASE d.estado WHEN 'pendiente' THEN 0 ELSE 1 END,d.fecha_creacion DESC LIMIT 500`)
    ).rows;
  }

  async review(referralId, decision, qualification, reason, user) {
    return this.database.transaction(async (db) => {
      const lookup = (
        await db.query(
          'SELECT id_asignacion_origen FROM derivaciones WHERE id=$1',
          [referralId]
        )
      ).rows[0];
      if (!lookup) throw new NotFoundError('Derivación', referralId);
      const assignment = await lockAssignment(db, lookup.id_asignacion_origen);
      const referral = (
        await db.query('SELECT * FROM derivaciones WHERE id=$1 FOR UPDATE', [
          referralId,
        ])
      ).rows[0];
      if (
        referral.estado !== 'pendiente' ||
        assignment.estado !== 'derivacion_pendiente'
      ) {
        throw new ConflictError(
          'La derivación ya fue revisada o su asignación fue cerrada'
        );
      }
      const approved = decision === 'aprobada';
      const nextState = approved ? 'derivado' : referral.estado_anterior;
      const validated = approved
        ? {
            ...qualification,
            reviewer: user.nombre_completo,
            reviewedAt: new Date().toISOString(),
            referralId,
          }
        : null;
      await db.query(
        `UPDATE derivaciones SET estado=$1,validacion=$2,id_revisor=$3,
        motivo_revision=$4,fecha_revision=CURRENT_TIMESTAMP WHERE id=$5`,
        [
          decision,
          validated ? JSON.stringify(validated) : null,
          user.id,
          reason,
          referralId,
        ]
      );
      await db.query(
        'UPDATE asignaciones SET estado=$1,fecha_actualizacion=CURRENT_TIMESTAMP WHERE id=$2',
        [nextState, assignment.id]
      );
      if (approved) {
        await db.query(
          `UPDATE estudiantes_odontologia SET casos_activos=GREATEST(0,casos_activos-1),
          fecha_actualizacion=CURRENT_TIMESTAMP WHERE id=$1`,
          [assignment.id_estudiante]
        );
        await db.query(
          `UPDATE pacientes SET estado='pendiente',precalificacion_validada=$1,
          derivacion_id=$2,tipo_tratamiento_inferido=$3,prioridad=$4,fecha_actualizacion=CURRENT_TIMESTAMP WHERE id=$5`,
          [
            JSON.stringify(validated),
            referralId,
            qualification.specialty,
            qualification.priority,
            referral.id_paciente,
          ]
        );
      }
      await appendEvent(
        db,
        referral.id_paciente,
        assignment.id,
        user,
        approved ? 'derivacion_aprobada' : 'derivacion_rechazada',
        'derivacion_pendiente',
        nextState,
        reason,
        { derivacion_id: referralId, validacion: validated }
      );
      return { id_paciente: referral.id_paciente, estado: decision };
    });
  }
}

module.exports = CaseRepository;
