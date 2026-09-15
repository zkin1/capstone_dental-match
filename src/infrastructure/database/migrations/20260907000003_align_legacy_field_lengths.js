module.exports = {
  async up(db) {
    await db.query('ALTER TABLE estudiantes_odontologia MODIFY email VARCHAR(255) NOT NULL');
    await db.query('ALTER TABLE estudiantes_odontologia MODIFY universidad VARCHAR(150) NULL');
    await db.query('ALTER TABLE pacientes MODIFY email VARCHAR(255) NULL');
    await db.query('ALTER TABLE notificaciones_email MODIFY email_destino VARCHAR(255) NOT NULL');
  },
};

