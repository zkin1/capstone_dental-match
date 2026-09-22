#!/usr/bin/env node
require('dotenv').config();

const mysql = require('mysql2/promise');
const database = require('../src/infrastructure/database/connection');
const MigrationManager = require('../src/infrastructure/database/migrationManager');

const TABLES = [
  {
    name: 'users',
    columns: [
      'id',
      'email',
      'password',
      'nombre_completo',
      'role',
      'permissions',
      'codigo_estudiante',
      'telefono',
      'status',
      'refresh_token_hash',
      'last_login',
      'created_at',
      'updated_at',
    ],
  },
  {
    name: 'estudiantes_odontologia',
    columns: [
      'id',
      'codigo_estudiante',
      'nombre_completo',
      'año_carrera',
      'telefono',
      'email',
      'universidad',
      'ciudad',
      'casos_completados',
      'casos_necesarios',
      'casos_activos',
      'estado',
      'fecha_registro',
      'fecha_actualizacion',
    ],
  },
  {
    name: 'pacientes',
    columns: [
      'id',
      'nombre_completo',
      'edad',
      'telefono',
      'email',
      'ciudad',
      'sintomas_seleccionados',
      'respuestas_cuestionario',
      'pre_categorizacion_ia',
      'fecha_pre_categorizacion',
      'nivel_dolor',
      'dias_disponibles',
      'horario_preferencia',
      'tipo_tratamiento_inferido',
      'prioridad',
      'consentimiento_datos',
      'fecha_consentimiento',
      'estado',
      'activo',
      'fecha_registro',
      'fecha_actualizacion',
    ],
  },
  {
    name: 'especialidades_estudiante',
    columns: [
      'id',
      'id_estudiante',
      'especialidad',
      'clinica',
      'dia_semana',
      'hora_inicio',
      'hora_fin',
      'capacidad_pacientes',
      'activo',
      'fecha_creacion',
      'fecha_actualizacion',
    ],
  },
  {
    name: 'asignaciones',
    columns: [
      'id',
      'id_paciente',
      'id_estudiante',
      'id_especialidad_estudiante',
      'fecha_asignacion',
      'fecha_cita',
      'estado',
      'especialidad_asignada',
      'dia_semana_asignado',
      'hora_inicio_asignada',
      'hora_fin_asignada',
      'score_compatibilidad',
      'factores_matching',
      'observaciones_sistema',
      'observaciones_estudiante',
      'fecha_contacto',
      'fecha_inicio_tratamiento',
      'fecha_completado',
      'fecha_cancelacion',
      'motivo_cancelacion',
      'fecha_actualizacion',
    ],
  },
  {
    name: 'notificaciones_email',
    columns: [
      'id',
      'id_asignacion',
      'id_estudiante',
      'id_paciente',
      'email_destino',
      'tipo_notificacion',
      'asunto',
      'mensaje',
      'estado',
      'intentos_envio',
      'error_envio',
      'fecha_envio',
      'fecha_creacion',
    ],
  },
];

function sourceConfig() {
  if (process.env.MYSQL_SOURCE_URL) return process.env.MYSQL_SOURCE_URL;
  const required = ['MYSQL_SOURCE_HOST', 'MYSQL_SOURCE_DATABASE', 'MYSQL_SOURCE_USER'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Faltan variables del origen MySQL: ${missing.join(', ')}`);
  }
  return {
    host: process.env.MYSQL_SOURCE_HOST,
    port: Number(process.env.MYSQL_SOURCE_PORT) || 3306,
    database: process.env.MYSQL_SOURCE_DATABASE,
    user: process.env.MYSQL_SOURCE_USER,
    password: process.env.MYSQL_SOURCE_PASSWORD || '',
    charset: 'utf8mb4',
    dateStrings: true,
  };
}

function quotePostgres(identifier) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

async function sourceMetadata(source) {
  const [columns] = await source.query(
    `SELECT table_name, column_name, column_type, is_nullable, column_default,
            column_key, extra
       FROM information_schema.columns
      WHERE table_schema = DATABASE()
      ORDER BY table_name, ordinal_position`,
  );
  const byTable = new Map();
  for (const column of columns) {
    const tableName = column.table_name || column.TABLE_NAME;
    const normalized = {
      name: column.column_name || column.COLUMN_NAME,
      type: column.column_type || column.COLUMN_TYPE,
      nullable: (column.is_nullable || column.IS_NULLABLE) === 'YES',
      default: column.column_default ?? column.COLUMN_DEFAULT,
      key: column.column_key || column.COLUMN_KEY || '',
      extra: column.extra || column.EXTRA || '',
    };
    if (!byTable.has(tableName)) byTable.set(tableName, []);
    byTable.get(tableName).push(normalized);
  }
  return byTable;
}

async function exactCount(source, table) {
  const [rows] = await source.query('SELECT COUNT(*) AS total FROM ??', [table]);
  return Number(rows[0].total);
}

async function printInventory(source) {
  const metadata = await sourceMetadata(source);
  console.log('INVENTARIO MYSQL (solo lectura)');
  console.log(`Base: ${process.env.MYSQL_SOURCE_DATABASE || 'definida en MYSQL_SOURCE_URL'}`);
  for (const [table, columns] of metadata) {
    const count = await exactCount(source, table);
    console.log(`\n${table} · ${count} filas`);
    for (const column of columns) {
      const flags = [column.nullable ? 'NULL' : 'NOT NULL', column.key, column.extra].filter(Boolean).join(' · ');
      console.log(`  - ${column.name}: ${column.type} · ${flags}`);
    }
  }

  console.log('\nALCANCE DE LA COPIA');
  for (const spec of TABLES) {
    const sourceColumns = new Set((metadata.get(spec.name) || []).map((column) => column.name));
    const ignored = [...sourceColumns].filter((column) => !spec.columns.includes(column));
    console.log(
      `- ${spec.name}: ${spec.columns.length} columnas conservadas${ignored.length ? `; se omiten ${ignored.join(', ')}` : ''}`,
    );
  }
  const copiedTables = new Set(TABLES.map((table) => table.name));
  const ignoredTables = [...metadata.keys()].filter((table) => !copiedTables.has(table));
  if (ignoredTables.length) console.log(`- Tablas no copiadas: ${ignoredTables.join(', ')}`);
}

function normalizeRow(table, row) {
  const normalized = { ...row };
  if (table === 'users' && normalized.permissions == null) normalized.permissions = '[]';
  if (table === 'asignaciones' && normalized.factores_matching == null) normalized.factores_matching = '{}';
  for (const column of ['activo', 'consentimiento_datos']) {
    if (normalized[column] != null) normalized[column] = Boolean(normalized[column]);
  }
  return normalized;
}

async function assertSourceCompatible(source) {
  const metadata = await sourceMetadata(source);
  const errors = [];
  for (const spec of TABLES) {
    const columns = new Set((metadata.get(spec.name) || []).map((column) => column.name));
    if (!columns.size) {
      errors.push(`falta la tabla ${spec.name}`);
      continue;
    }
    const missing = spec.columns.filter((column) => !columns.has(column));
    if (missing.length) errors.push(`${spec.name} no tiene: ${missing.join(', ')}`);
  }
  if (errors.length) throw new Error(`El origen no coincide con el esquema esperado:\n- ${errors.join('\n- ')}`);

  const patientColumns = new Set(metadata.get('pacientes').map((column) => column.name));
  if (patientColumns.has('estudiante_asignado')) {
    const [unrepresented] = await source.query(`
      SELECT p.id
        FROM pacientes p
       WHERE p.estudiante_asignado IS NOT NULL
         AND NOT EXISTS (
           SELECT 1
             FROM asignaciones a
            WHERE a.id_paciente = p.id
              AND a.id_estudiante = p.estudiante_asignado
              AND a.estado IN ('asignado', 'notificado', 'contactado', 'en_tratamiento')
         )
       LIMIT 1
    `);
    if (unrepresented.length) {
      errors.push('pacientes.estudiante_asignado contiene una relación que no está representada en asignaciones');
    }
  }

  const assignmentColumns = new Set(metadata.get('asignaciones').map((column) => column.name));
  if (assignmentColumns.has('active_patient_id')) {
    const [inconsistent] = await source.query(`
      SELECT id
        FROM asignaciones
       WHERE NOT (
         active_patient_id <=> IF(
           estado IN ('asignado', 'notificado', 'contactado', 'en_tratamiento'),
           id_paciente,
           NULL
         )
       )
       LIMIT 1
    `);
    if (inconsistent.length) errors.push('asignaciones.active_patient_id no coincide con el estado de la asignación');
  }

  const [duplicateActive] = await source.query(`
    SELECT id_paciente
      FROM asignaciones
     WHERE estado IN ('asignado', 'notificado', 'contactado', 'en_tratamiento')
     GROUP BY id_paciente
    HAVING COUNT(*) > 1
     LIMIT 1
  `);
  if (duplicateActive.length) errors.push('existe un paciente con más de una asignación activa');

  const [invalidPatient] = await source.query('SELECT id FROM pacientes WHERE edad NOT BETWEEN 1 AND 120 LIMIT 1');
  if (invalidPatient.length) errors.push('existe un paciente con edad fuera del rango 1 a 120');

  const [invalidAssignment] = await source.query(`
    SELECT id
      FROM asignaciones
     WHERE fecha_cita IS NULL OR score_compatibilidad NOT BETWEEN 0 AND 1
     LIMIT 1
  `);
  if (invalidAssignment.length) errors.push('existe una asignación sin fecha o con score fuera del rango 0 a 1');

  if (errors.length) throw new Error(`El origen contiene conflictos que requieren revisión:\n- ${errors.join('\n- ')}`);
}

async function assertTargetEmpty(client) {
  for (const spec of TABLES) {
    const result = await client.query(`SELECT COUNT(*) AS total FROM ${quotePostgres(spec.name)}`);
    if (Number(result.rows[0].total) > 0) {
      throw new Error(`El destino ya contiene datos en ${spec.name}; no se sobrescribió nada`);
    }
  }
}

async function copyTable(source, target, spec) {
  const escapedColumns = spec.columns.map(() => '??').join(', ');
  const [sourceRows] = await source.query(`SELECT ${escapedColumns} FROM ?? ORDER BY ??`, [
    ...spec.columns,
    spec.name,
    'id',
  ]);
  const targetColumns = spec.columns.map(quotePostgres).join(', ');
  const valuesSql = spec.columns.map((_, index) => `$${index + 1}`).join(', ');

  for (const sourceRow of sourceRows) {
    const row = normalizeRow(spec.name, sourceRow);
    await target.query(
      `INSERT INTO ${quotePostgres(spec.name)} (${targetColumns}) VALUES (${valuesSql})`,
      spec.columns.map((column) => row[column]),
    );
  }
  return sourceRows.length;
}

async function resetIdentity(target, table) {
  const qualifiedTable = `${database.databaseSchema()}.${table}`;
  const sequence = await target.query('SELECT pg_get_serial_sequence($1, $2) AS name', [qualifiedTable, 'id']);
  if (!sequence.rows[0].name) return;
  await target.query(
    `SELECT setval($1::regclass, COALESCE(MAX(id), 1), MAX(id) IS NOT NULL)
       FROM ${quotePostgres(table)}`,
    [sequence.rows[0].name],
  );
}

async function migrate(source) {
  await assertSourceCompatible(source);
  await database.initialize();
  const pool = await database.getConnection();
  const manager = new MigrationManager(pool);
  await manager.initialize();
  await manager.migrate();

  const target = await database.getPoolConnection();
  await source.beginTransaction();
  try {
    await target.query('BEGIN');
    await assertTargetEmpty(target);

    console.log('COPIA MYSQL -> POSTGRESQL');
    for (const spec of TABLES) {
      const copied = await copyTable(source, target, spec);
      await resetIdentity(target, spec.name);
      const verified = await target.query(`SELECT COUNT(*) AS total FROM ${quotePostgres(spec.name)}`);
      if (Number(verified.rows[0].total) !== copied) {
        throw new Error(
          `La verificación de ${spec.name} no coincide (${copied} origen / ${verified.rows[0].total} destino)`,
        );
      }
      console.log(`- ${spec.name}: ${copied} filas copiadas y verificadas`);
    }

    await target.query('COMMIT');
    await source.commit();
    console.log('Migración completada. El origen MySQL no fue modificado.');
  } catch (error) {
    await target.query('ROLLBACK');
    await source.rollback();
    throw error;
  } finally {
    target.release();
  }
}

async function main() {
  const command = process.argv[2] || 'inventory';
  if (!['inventory', 'migrate'].includes(command)) {
    throw new Error('Uso: node scripts/migrate-mysql-to-postgres.js inventory|migrate');
  }

  const source = await mysql.createConnection(sourceConfig());
  try {
    if (command === 'inventory') await printInventory(source);
    else await migrate(source);
  } finally {
    await source.end();
    await database.closePool();
  }
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
