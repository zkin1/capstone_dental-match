async function columnExists(db, table, column) {
  const [rows] = await db.execute(
    'SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? LIMIT 1',
    [table, column],
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

async function foreignKeyExists(db, table, constraint) {
  const [rows] = await db.execute(
    'SELECT 1 FROM information_schema.table_constraints WHERE constraint_schema = DATABASE() AND table_name = ? AND constraint_name = ? AND constraint_type = \'FOREIGN KEY\' LIMIT 1',
    [table, constraint],
  );
  return rows.length > 0;
}

async function addColumn(db, table, column, definition) {
  if (!await columnExists(db, table, column)) {
    await db.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }
}

async function addIndex(db, table, name, expression, unique = false) {
  if (!await indexExists(db, table, name)) {
    await db.query(`CREATE ${unique ? 'UNIQUE ' : ''}INDEX \`${name}\` ON \`${table}\` (${expression})`);
  }
}

async function createUsers(db) {
  await db.query(`CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(150) NOT NULL,
    role ENUM('admin','coordinator','student') NOT NULL DEFAULT 'coordinator',
    permissions JSON NULL,
    codigo_estudiante VARCHAR(20) NULL UNIQUE,
    telefono VARCHAR(20) NULL,
    status ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active',
    refresh_token_hash CHAR(64) NULL,
    last_login DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_role_status (role, status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await addColumn(db, 'users', 'codigo_estudiante', 'VARCHAR(20) NULL');
  await addColumn(db, 'users', 'telefono', 'VARCHAR(20) NULL');
  await addColumn(db, 'users', 'refresh_token_hash', 'CHAR(64) NULL');
  await db.query("UPDATE users SET role = 'coordinator' WHERE role NOT IN ('admin','coordinator','student')");
  await db.query("ALTER TABLE users MODIFY role ENUM('admin','coordinator','student') NOT NULL DEFAULT 'coordinator'");
  await addIndex(db, 'users', 'idx_users_codigo_estudiante', '`codigo_estudiante`');
  const [duplicateCodes] = await db.query(`SELECT codigo_estudiante FROM users
    WHERE codigo_estudiante IS NOT NULL GROUP BY codigo_estudiante HAVING COUNT(*) > 1 LIMIT 1`);
  if (duplicateCodes.length) throw new Error('Hay cuentas duplicadas para un código de estudiante');
  await addIndex(db, 'users', 'uq_users_codigo_estudiante', '`codigo_estudiante`', true);
}

async function createStudents(db) {
  await db.query(`CREATE TABLE IF NOT EXISTS estudiantes_odontologia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo_estudiante VARCHAR(20) NOT NULL UNIQUE,
    nombre_completo VARCHAR(150) NOT NULL,
    \`año_carrera\` ENUM('4to','5to') NOT NULL,
    telefono VARCHAR(20) NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    universidad VARCHAR(150) NULL,
    ciudad ENUM('Metropolitana','Valparaíso','Concepción') NOT NULL,
    casos_completados INT NOT NULL DEFAULT 0,
    casos_necesarios INT NOT NULL DEFAULT 10,
    casos_activos INT NOT NULL DEFAULT 0,
    estado ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_estudiantes_estado_carga (estado, casos_activos, casos_necesarios)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await db.query("UPDATE estudiantes_odontologia SET estado = 'inactivo' WHERE estado NOT IN ('activo','inactivo')");
  await db.query("ALTER TABLE estudiantes_odontologia MODIFY estado ENUM('activo','inactivo') NOT NULL DEFAULT 'activo'");
}

async function createPatients(db) {
  await db.query(`CREATE TABLE IF NOT EXISTS pacientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(150) NOT NULL,
    edad TINYINT UNSIGNED NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    email VARCHAR(255) NULL,
    ciudad ENUM('Metropolitana','Valparaíso','Concepción') NOT NULL,
    sintomas_seleccionados JSON NULL,
    respuestas_cuestionario JSON NULL,
    pre_categorizacion_ia JSON NULL,
    fecha_pre_categorizacion DATETIME NULL,
    nivel_dolor TINYINT UNSIGNED NOT NULL DEFAULT 0,
    dias_disponibles JSON NULL,
    horario_preferencia VARCHAR(100) NULL,
    tipo_tratamiento_inferido VARCHAR(100) NULL,
    prioridad ENUM('Baja','Moderada','Alta','Muy Alta') NOT NULL DEFAULT 'Moderada',
    consentimiento_datos BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_consentimiento DATETIME NULL,
    estado ENUM('pendiente','asignado','completado','cancelado') NOT NULL DEFAULT 'pendiente',
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    estudiante_asignado INT NULL,
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_pacientes_cola (activo, estado, prioridad, fecha_registro),
    INDEX idx_pacientes_especialidad (tipo_tratamiento_inferido),
    CONSTRAINT fk_pacientes_estudiante FOREIGN KEY (estudiante_asignado)
      REFERENCES estudiantes_odontologia(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await addColumn(db, 'pacientes', 'respuestas_cuestionario', 'JSON NULL');
  await addColumn(db, 'pacientes', 'pre_categorizacion_ia', 'JSON NULL');
  await addColumn(db, 'pacientes', 'fecha_pre_categorizacion', 'DATETIME NULL');
  await addColumn(db, 'pacientes', 'consentimiento_datos', 'BOOLEAN NOT NULL DEFAULT FALSE');
  await addColumn(db, 'pacientes', 'fecha_consentimiento', 'DATETIME NULL');

  const [emailIndexes] = await db.execute(
    `SELECT DISTINCT index_name FROM information_schema.statistics
      WHERE table_schema = DATABASE() AND table_name = 'pacientes'
        AND column_name = 'email' AND non_unique = 0 AND index_name <> 'PRIMARY'`,
  );
  for (const index of emailIndexes) {
    const indexName = index.index_name || index.INDEX_NAME;
    if (indexName) await db.query(`ALTER TABLE pacientes DROP INDEX \`${indexName}\``);
  }
}

async function createSpecialties(db) {
  await db.query(`CREATE TABLE IF NOT EXISTS especialidades_estudiante (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_estudiante INT NOT NULL,
    especialidad VARCHAR(100) NOT NULL,
    clinica ENUM('Clínica para el Niño y Adolescente','Clínica Integral Adulto y Gerontología') NOT NULL,
    dia_semana ENUM('lunes','martes','miercoles','jueves','viernes','sabado') NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    capacidad_pacientes SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_especialidad_horario (id_estudiante, especialidad, dia_semana, hora_inicio, hora_fin),
    INDEX idx_especialidades_match (especialidad, clinica, activo),
    CONSTRAINT fk_especialidades_estudiante FOREIGN KEY (id_estudiante)
      REFERENCES estudiantes_odontologia(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  if (await indexExists(db, 'especialidades_estudiante', 'unique_estudiante_horario')) {
    await db.query('ALTER TABLE especialidades_estudiante DROP INDEX unique_estudiante_horario');
  }
  await addIndex(
    db,
    'especialidades_estudiante',
    'uq_especialidad_horario',
    '`id_estudiante`, `especialidad`, `dia_semana`, `hora_inicio`, `hora_fin`',
    true,
  );
  await addIndex(db, 'especialidades_estudiante', 'idx_especialidades_match', '`especialidad`, `clinica`, `activo`');
}

async function createAssignments(db) {
  await db.query(`CREATE TABLE IF NOT EXISTS asignaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_paciente INT NOT NULL,
    id_estudiante INT NOT NULL,
    id_especialidad_estudiante INT NULL,
    fecha_asignacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_cita DATE NOT NULL,
    estado ENUM('asignado','notificado','contactado','en_tratamiento','completado','cancelado') NOT NULL DEFAULT 'asignado',
    especialidad_asignada VARCHAR(100) NOT NULL,
    dia_semana_asignado VARCHAR(20) NOT NULL,
    hora_inicio_asignada TIME NOT NULL,
    hora_fin_asignada TIME NOT NULL,
    score_compatibilidad DECIMAL(5,4) NOT NULL,
    factores_matching JSON NOT NULL,
    observaciones_sistema TEXT NULL,
    observaciones_estudiante TEXT NULL,
    fecha_contacto DATETIME NULL,
    fecha_inicio_tratamiento DATETIME NULL,
    fecha_completado DATETIME NULL,
    fecha_cancelacion DATETIME NULL,
    motivo_cancelacion TEXT NULL,
    fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    active_patient_id INT NULL,
    UNIQUE KEY uq_asignacion_activa_paciente (active_patient_id),
    INDEX idx_asignaciones_estudiante_fecha (id_estudiante, fecha_cita, hora_inicio_asignada, estado),
    INDEX idx_asignaciones_estado (estado),
    CONSTRAINT fk_asignaciones_paciente FOREIGN KEY (id_paciente) REFERENCES pacientes(id),
    CONSTRAINT fk_asignaciones_estudiante FOREIGN KEY (id_estudiante) REFERENCES estudiantes_odontologia(id),
    CONSTRAINT fk_asignaciones_especialidad FOREIGN KEY (id_especialidad_estudiante)
      REFERENCES especialidades_estudiante(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await addColumn(db, 'asignaciones', 'id_especialidad_estudiante', 'INT NULL');
  await addColumn(db, 'asignaciones', 'fecha_cita', 'DATE NULL');
  await addColumn(db, 'asignaciones', 'factores_matching', 'JSON NULL');
  await addColumn(db, 'asignaciones', 'fecha_contacto', 'DATETIME NULL');
  await addColumn(db, 'asignaciones', 'fecha_completado', 'DATETIME NULL');
  await addColumn(db, 'asignaciones', 'fecha_cancelacion', 'DATETIME NULL');
  if (await columnExists(db, 'asignaciones', 'codigo_acceso')) {
    await db.query('ALTER TABLE asignaciones MODIFY codigo_acceso VARCHAR(32) NULL');
  }
  await db.query("UPDATE asignaciones SET estado = 'completado' WHERE estado = 'atendido'");
  await db.query("UPDATE asignaciones SET estado = 'cancelado' WHERE estado = 'abandono'");
  await db.query("ALTER TABLE asignaciones MODIFY estado ENUM('asignado','notificado','contactado','en_tratamiento','completado','cancelado') NOT NULL DEFAULT 'asignado'");
  await db.query('UPDATE asignaciones SET score_compatibilidad = 0 WHERE score_compatibilidad IS NULL');
  await db.query('ALTER TABLE asignaciones MODIFY score_compatibilidad DECIMAL(5,4) NOT NULL');

  // El schema antiguo enlazaba codigo_acceso con una tabla que ya no participa
  // en el BFF. MySQL no puede reconstruir esta tabla con esa FK al añadir la
  // columna generada que protege una asignación activa por paciente.
  if (await foreignKeyExists(db, 'asignaciones', 'asignaciones_codigo_acceso_fkey')) {
    await db.query('ALTER TABLE asignaciones DROP FOREIGN KEY asignaciones_codigo_acceso_fkey');
  }

  await addColumn(db, 'asignaciones', 'active_patient_id', 'INT NULL');
  const [duplicates] = await db.query(`SELECT id_paciente FROM asignaciones
    WHERE estado IN ('asignado','notificado','contactado','en_tratamiento')
    GROUP BY id_paciente HAVING COUNT(*) > 1 LIMIT 1`);
  if (duplicates.length) throw new Error('Hay pacientes con más de una asignación activa; resuélvelos antes de migrar');
  await db.query(`UPDATE asignaciones SET active_patient_id = CASE
    WHEN estado IN ('asignado','notificado','contactado','en_tratamiento') THEN id_paciente
    ELSE NULL END`);
  await addIndex(db, 'asignaciones', 'uq_asignacion_activa_paciente', '`active_patient_id`', true);
  await addIndex(db, 'asignaciones', 'idx_asignaciones_estudiante_fecha', '`id_estudiante`, `fecha_cita`, `hora_inicio_asignada`, `estado`');
}

async function createNotifications(db) {
  await db.query(`CREATE TABLE IF NOT EXISTS notificaciones_email (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_asignacion INT NULL,
    id_estudiante INT NULL,
    id_paciente INT NULL,
    email_destino VARCHAR(255) NOT NULL,
    tipo_notificacion VARCHAR(50) NOT NULL,
    asunto VARCHAR(200) NOT NULL,
    mensaje TEXT NULL,
    estado ENUM('pendiente','enviado','fallido') NOT NULL DEFAULT 'pendiente',
    intentos_envio SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    error_envio TEXT NULL,
    fecha_envio DATETIME NULL,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notificaciones_cola (estado, fecha_creacion),
    CONSTRAINT fk_notificaciones_asignacion FOREIGN KEY (id_asignacion) REFERENCES asignaciones(id),
    CONSTRAINT fk_notificaciones_estudiante FOREIGN KEY (id_estudiante) REFERENCES estudiantes_odontologia(id) ON DELETE SET NULL,
    CONSTRAINT fk_notificaciones_paciente FOREIGN KEY (id_paciente) REFERENCES pacientes(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await addColumn(db, 'notificaciones_email', 'id_asignacion', 'INT NULL');
  await addColumn(db, 'notificaciones_email', 'estado', "ENUM('pendiente','enviado','fallido') NOT NULL DEFAULT 'pendiente'");
  if (await columnExists(db, 'notificaciones_email', 'enviado')) {
    await db.query("UPDATE notificaciones_email SET estado = IF(enviado = 1, 'enviado', 'pendiente')");
  }
  await db.query('ALTER TABLE notificaciones_email MODIFY tipo_notificacion VARCHAR(50) NOT NULL');
  await db.query('ALTER TABLE notificaciones_email MODIFY mensaje TEXT NULL');
  await addIndex(db, 'notificaciones_email', 'idx_notificaciones_cola', '`estado`, `fecha_creacion`');
}

module.exports = {
  async up(db) {
    await createUsers(db);
    await createStudents(db);
    await createPatients(db);
    await createSpecialties(db);
    await createAssignments(db);
    await createNotifications(db);
  },
};
