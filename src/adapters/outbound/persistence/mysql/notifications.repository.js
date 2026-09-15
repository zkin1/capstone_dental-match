class NotificationsRepository {
  constructor(database) {
    this.database = database;
  }

  async list(limit) {
    const db = await this.database.getConnection();
    const [rows] = await db.execute(
      `SELECT id, id_asignacion, id_estudiante, id_paciente, email_destino,
              tipo_notificacion, asunto, mensaje, estado, fecha_envio,
              fecha_creacion, intentos_envio, error_envio
         FROM notificaciones_email
        ORDER BY fecha_creacion DESC
        LIMIT ?`,
      [limit],
    );
    return rows;
  }
}

module.exports = NotificationsRepository;
