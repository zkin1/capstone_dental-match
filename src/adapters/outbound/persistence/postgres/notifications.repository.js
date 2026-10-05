const crypto = require('crypto');
const {
  ConflictError,
  NotFoundError,
} = require('../../../../shared/errors/AppError');
const { appendEvent } = require('./case-history');

class NotificationsRepository {
  constructor(database) {
    this.database = database;
  }

  async list(limit) {
    const db = await this.database.getConnection();
    return (
      await db.query(
        `SELECT id, id_asignacion, id_estudiante, id_paciente, email_destino,
              tipo_notificacion, asunto, mensaje, estado, fecha_envio,
              fecha_creacion, intentos_envio, error_envio, proximo_intento, envio_incierto, fecha_reclamo
         FROM notificaciones_email
        ORDER BY fecha_creacion DESC
        LIMIT $1`,
        [limit]
      )
    ).rows;
  }

  async claim(id, manual = false) {
    return this.database.transaction(async (db) => {
      const result = await db.query(
        `SELECT * FROM notificaciones_email WHERE
        ($1::bigint IS NULL OR id=$1) AND (estado IN ('pendiente','fallido') OR
        (estado='enviando' AND fecha_reclamo < CURRENT_TIMESTAMP-INTERVAL '5 minutes'))
        AND ($2::boolean OR (intentos_envio < 5 AND proximo_intento <= CURRENT_TIMESTAMP))
        ORDER BY fecha_creacion,id LIMIT 1 FOR UPDATE SKIP LOCKED`,
        [id || null, manual]
      );
      const notification = result.rows[0];
      if (!notification) {
        if (id) {
          const existing = (
            await db.query('SELECT id FROM notificaciones_email WHERE id=$1', [
              id,
            ])
          ).rows[0];
          if (!existing) throw new NotFoundError('Notificación', id);
          throw new ConflictError(
            'La notificación ya está enviada o hay un envío en curso'
          );
        }
        return null;
      }
      const uncertain =
        notification.envio_incierto || notification.estado === 'enviando';
      if (notification.id_asignacion) {
        const assignment = (
          await db.query('SELECT estado FROM asignaciones WHERE id=$1', [
            notification.id_asignacion,
          ])
        ).rows[0];
        if (
          !assignment ||
          ['cancelado', 'completado', 'derivado'].includes(assignment.estado)
        ) {
          await db.query(
            `UPDATE notificaciones_email SET estado='fallido',proximo_intento=NULL,
            error_envio='Asignación cerrada; aviso omitido' WHERE id=$1`,
            [notification.id]
          );
          return {
            blocked: true,
            reason:
              'La asignación ya fue cerrada; este aviso no corresponde enviarlo',
          };
        }
      }
      if (
        uncertain &&
        notification.primer_intento &&
        Date.now() - new Date(notification.primer_intento).getTime() >
          23 * 3600000
      ) {
        await db.query(
          `UPDATE notificaciones_email SET estado='fallido',envio_incierto=TRUE,proximo_intento=NULL,
          error_envio='Envío incierto fuera de la ventana de idempotencia; revisar en el proveedor antes de reenviar' WHERE id=$1`,
          [notification.id]
        );
        return {
          blocked: true,
          reason:
            'Revisa el envío en el proveedor antes de reenviar: venció la ventana segura',
        };
      }
      const token = crypto.randomUUID();
      await db.query(
        `UPDATE notificaciones_email SET estado='enviando',claim_token=$1,fecha_reclamo=CURRENT_TIMESTAMP,
        primer_intento=COALESCE(primer_intento,CURRENT_TIMESTAMP),intentos_envio=intentos_envio+1,envio_incierto=$2 WHERE id=$3`,
        [token, uncertain, notification.id]
      );
      return {
        ...notification,
        claim_token: token,
        intentos_envio: Number(notification.intentos_envio) + 1,
        envio_incierto: uncertain,
      };
    });
  }

  async freezePayload(notification, payload) {
    const db = await this.database.getConnection();
    const result = await db.query(
      `UPDATE notificaciones_email SET payload_envio=COALESCE(payload_envio,$1)
      WHERE id=$2 AND claim_token=$3 AND estado='enviando' RETURNING payload_envio`,
      [JSON.stringify(payload), notification.id, notification.claim_token]
    );
    if (!result.rows[0])
      throw new ConflictError('El envío fue reclamado por otro proceso');
    return result.rows[0].payload_envio;
  }

  async finish(notification, providerId, error, user) {
    return this.database.transaction(async (db) => {
      const delay = Math.min(60, 2 ** notification.intentos_envio);
      const result = await db.query(
        `UPDATE notificaciones_email SET estado=$1::varchar,proveedor_id=$2,error_envio=$3,
        fecha_envio=CASE WHEN $1::text='enviado' THEN CURRENT_TIMESTAMP ELSE fecha_envio END,
        envio_incierto=$4,proximo_intento=CASE WHEN $1::text='fallido' THEN CURRENT_TIMESTAMP+($5*INTERVAL '1 minute') ELSE NULL END,
        claim_token=NULL WHERE id=$6 AND claim_token=$7 AND estado='enviando' RETURNING id`,
        [
          error ? 'fallido' : 'enviado',
          providerId || null,
          error?.message?.slice(0, 2000) || null,
          Boolean(error && (error.uncertain || notification.envio_incierto)),
          delay,
          notification.id,
          notification.claim_token,
        ]
      );
      if (!result.rows[0])
        throw new ConflictError('El envío cambió de responsable');
      if (notification.id_paciente)
        await appendEvent(
          db,
          notification.id_paciente,
          notification.id_asignacion,
          user,
          error ? 'notificacion_fallida' : 'notificacion_enviada',
          null,
          null,
          error
            ? 'El correo no pudo confirmarse'
            : 'Correo aceptado por el proveedor',
          {
            notificacion_id: notification.id,
            intento: notification.intentos_envio,
          }
        );
    });
  }
}

module.exports = NotificationsRepository;
