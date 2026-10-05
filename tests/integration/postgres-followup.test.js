// Opt-in: only accepts an explicitly supplied local PostgreSQL URL, creates and drops its own schema.
const { Pool } = require("pg");
const request = require("supertest");
const crypto = require("crypto");
const schema = `capstone_verify_${process.pid}_${crypto.randomBytes(4).toString("hex")}`;
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl && process.env.npm_lifecycle_event === "test:postgres")
  throw new Error(
    "Define TEST_DATABASE_URL con una base PostgreSQL local de prueba",
  );
if (
  testUrl &&
  !["127.0.0.1", "localhost", "[::1]"].includes(new URL(testUrl).hostname)
) {
  throw new Error("TEST_DATABASE_URL debe apuntar a PostgreSQL local");
}
const pool = testUrl
  ? new Pool({
      connectionString: testUrl,
      max: 8,
      options: `-c search_path=${schema},public`,
    })
  : null;
const mockDatabase = {
  databaseSchema: () => schema,
  getConnection: async () => pool,
  getPoolConnection: () => pool.connect(),
  executeQuery: async (sql, values) => pool.query(sql, values),
  transaction: async (work) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
  performHealthCheck: async () => ({ status: "healthy" }),
};
jest.mock("../../src/infrastructure/database/connection", () => mockDatabase);
const MigrationManager = require("../../src/infrastructure/database/migrationManager");
const MatchingRepository = require("../../src/adapters/outbound/persistence/postgres/matching.repository");
const CaseRepository = require("../../src/adapters/outbound/persistence/postgres/case.repository");
const AssignmentRepository = require("../../src/adapters/outbound/persistence/postgres/assignment.repository");
const PatientRepository = require("../../src/adapters/outbound/persistence/postgres/patient.repository");
const NotificationsRepository = require("../../src/adapters/outbound/persistence/postgres/notifications.repository");
const UserRepository = require("../../src/adapters/outbound/persistence/postgres/auth.repository");
const {
  createMatchingService,
} = require("../../src/application/matching/matching.service");
const {
  CaseService,
} = require("../../src/application/assignments/case.service");
const {
  generateToken,
} = require("../../src/adapters/outbound/security/jwt.adapter");
const app = require("../../src/infrastructure/http/app");
const matching = createMatchingService(new MatchingRepository(mockDatabase));
const cases = new CaseRepository(mockDatabase);
const caseService = new CaseService(cases, matching);
const assignments = new AssignmentRepository(mockDatabase);
const users = new UserRepository();
const qualification = {
  specialty: "Endodoncia",
  priority: "Alta",
  treatment: "Evaluación endodóntica",
  reason: "Dolor persistente después de revisar el caso",
};
let admin, student1, student2, student3;
const run = testUrl ? describe : describe.skip;
run("seguimiento con PostgreSQL real", () => {
  beforeAll(async () => {
    await pool.query(`CREATE SCHEMA ${schema}`);
    const manager = new MigrationManager(pool);
    await manager.initialize();
    await manager.migrate();
    admin = (
      await pool.query(
        "INSERT INTO users(email,password,nombre_completo,role) VALUES ('admin@example.test','hash','Admin Demo','admin') RETURNING *",
      )
    ).rows[0];
    async function createStudent(n) {
      const code = `EST-2026-${String(n).padStart(6, "0")}`;
      const student = (
        await pool.query(
          `INSERT INTO estudiantes_odontologia
        (codigo_estudiante,nombre_completo,año_carrera,email,ciudad,casos_necesarios)
        VALUES ($1,$2,'5to',$3,'Metropolitana',10) RETURNING *`,
          [code, `Estudiante ${n}`, `estudiante${n}@example.test`],
        )
      ).rows[0];
      const user = (
        await pool.query(
          `INSERT INTO users(email,password,nombre_completo,role,codigo_estudiante)
        VALUES ($1,'hash',$2,'student',$3) RETURNING *`,
          [student.email, student.nombre_completo, code],
        )
      ).rows[0];
      const schedules = [];
      for (const specialty of [
        "Operatoria Dental",
        "Endodoncia",
        "Periodoncia",
      ]) {
        schedules.push(
          (
            await pool.query(
              `INSERT INTO especialidades_estudiante
          (id_estudiante,especialidad,clinica,dia_semana,hora_inicio,hora_fin,capacidad_pacientes)
          VALUES ($1,$2,'Clínica Integral Adulto y Gerontología','lunes','08:00','12:00',10) RETURNING *`,
              [student.id, specialty],
            )
          ).rows[0],
        );
      }
      return { ...student, user, schedules };
    }
    student1 = await createStudent(1);
    student2 = await createStudent(2);
    student3 = await createStudent(3);
  });
  afterAll(async () => {
    if (pool) {
      try {
        await pool.query(`DROP SCHEMA ${schema} CASCADE`);
      } finally {
        await pool.end();
      }
    }
  });
  async function patient(name = "Paciente Demo") {
    return (
      await pool.query(
        `INSERT INTO pacientes(nombre_completo,edad,telefono,email,ciudad,
      tipo_tratamiento_inferido,nivel_dolor,respuestas_cuestionario) VALUES ($1,30,'912345678',
      'paciente@example.test','Metropolitana','Operatoria Dental',4,'{"descripcion":"Dolor al masticar"}') RETURNING *`,
        [name],
      )
    ).rows[0];
  }
  async function assignTo(p, s) {
    return matching.manual(
      p.id,
      {
        id_especialidad_estudiante: s.schedules[0].id,
        motivo: "Asignación manual para seguimiento",
      },
      admin,
    );
  }
  test("migraciones quedan registradas y una segunda ejecución no modifica datos", async () => {
    const manager = new MigrationManager(pool);
    expect((await manager.migrate()).executed).toBe(0);
    expect((await manager.status()).pending).toHaveLength(0);
  });
  test("dos peticiones simultáneas crean una sola asignación activa", async () => {
    const p = await patient();
    const results = await Promise.all([
      matching.matchPatient(p.id),
      matching.matchPatient(p.id),
    ]);
    expect(results.filter((r) => r.success)).toHaveLength(1);
    expect(
      Number(
        (
          await pool.query(
            "SELECT COUNT(*) AS n FROM asignaciones WHERE id_paciente=$1",
            [p.id],
          )
        ).rows[0].n,
      ),
    ).toBe(1);
  });
  test("estudiante ve contacto y solo su caso; las notas son inmutables y tienen responsable", async () => {
    const p = await patient("Paciente con historial");
    const assignment = await assignTo(p, student1);
    await assignments.update(
      assignment.assignmentId,
      {
        estado: "contactado",
        observaciones_estudiante: "Se contactó por teléfono",
      },
      student1.user,
    );
    await assignments.update(
      assignment.assignmentId,
      { observaciones_estudiante: "Se revisó el caso presencialmente" },
      student1.user,
    );
    const detail = await cases.detail(
      assignment.assignmentId,
      student1.user,
      true,
    );
    expect(detail.paciente.email).toBe("paciente@example.test");
    expect(detail.historial.map((h) => h.nota)).toEqual(
      expect.arrayContaining([
        "Se contactó por teléfono",
        "Se revisó el caso presencialmente",
      ]),
    );
    expect(detail.historial.at(-1)).toMatchObject({
      responsable: "Estudiante 1",
      rol: "student",
    });
    await expect(
      cases.detail(assignment.assignmentId, student2.user, true),
    ).rejects.toMatchObject({ statusCode: 403 });
    await expect(
      pool.query("UPDATE historial_paciente SET nota=$1 WHERE id=$2", [
        "borrar",
        detail.historial[0].id,
      ]),
    ).rejects.toThrow("solo permite agregar");
    const response = await request(app)
      .get(`/api/asignaciones/${assignment.assignmentId}/detalle`)
      .set("Authorization", `Bearer ${generateToken(student2.user)}`);
    expect(response.status).toBe(403);
  });
  test("E2E HTTP: personal asigna, estudiante deriva y personal aprueba con historial", async () => {
    const adminToken = generateToken(admin);
    const studentToken = generateToken(student1.user);
    const receiverToken = generateToken(student2.user);
    const created = await request(app)
      .post("/api/pacientes")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        nombre_completo: "Paciente E2E Sintético",
        edad: 34,
        telefono: "900000001",
        email: `paciente-${schema}@example.test`,
        ciudad: "Metropolitana",
        descripcion_caso: "Dolor al masticar en un molar",
        nivel_dolor: 5,
        tipo_tratamiento_inferido: "Operatoria Dental",
        prioridad: "Moderada",
      });
    expect(created.status).toBe(201);
    const patientId = created.body.data.id;

    const initialSchedule = student1.schedules.find(
      (schedule) => schedule.especialidad === "Operatoria Dental",
    );
    const initialAssignment = await request(app)
      .post(`/api/matching/manual/${patientId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        id_especialidad_estudiante: initialSchedule.id,
        motivo: "Asignación inicial de prueba E2E",
      });
    expect(initialAssignment.status).toBe(201);
    const assignmentId = initialAssignment.body.data.assignmentId;

    const studentCase = await request(app)
      .get(`/api/asignaciones/${assignmentId}/detalle`)
      .set("Authorization", `Bearer ${studentToken}`);
    expect(studentCase.status).toBe(200);
    expect(studentCase.body.data.paciente).toMatchObject({
      email: `paciente-${schema}@example.test`,
      nombre_completo: "Paciente E2E Sintético",
    });

    const updated = await request(app)
      .put(`/api/asignaciones/${assignmentId}`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        estado: "contactado",
        observaciones_estudiante: "Revisé el caso y contacté al paciente.",
      });
    expect(updated.status).toBe(200);

    const proposed = await request(app)
      .post(`/api/asignaciones/${assignmentId}/derivacion`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send(qualification);
    expect(proposed.status).toBe(201);
    const referralId = proposed.body.data.id;

    const reviewQueue = await request(app)
      .get("/api/derivaciones")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(reviewQueue.status).toBe(200);
    expect(reviewQueue.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: referralId, estado: "pendiente" }),
      ]),
    );

    const approved = await request(app)
      .post(`/api/derivaciones/${referralId}/revision`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        ...qualification,
        estado: "aprobada",
        motivo_revision: "Tratamiento confirmado tras revisar el caso E2E",
      });
    expect(approved.status).toBe(200);
    expect(approved.body.data.matching.success).toBe(true);
    const destinationAssignmentId = approved.body.data.matching.assignmentId;

    const receiverCase = await request(app)
      .get(`/api/asignaciones/${destinationAssignmentId}/detalle`)
      .set("Authorization", `Bearer ${receiverToken}`);
    expect(receiverCase.status).toBe(200);
    expect(receiverCase.body.data.asignacion.estudiante_nombre).toBe(
      "Estudiante 2",
    );
    expect(receiverCase.body.data.validacion).toMatchObject({
      specialty: "Endodoncia",
      priority: "Alta",
      treatment: "Evaluación endodóntica",
    });

    const finalCase = await request(app)
      .get(`/api/pacientes/${patientId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(finalCase.status).toBe(200);
    expect(finalCase.body.data.historial.map((event) => event.tipo)).toEqual(
      expect.arrayContaining([
        "caso_registrado",
        "asignacion",
        "estado",
        "derivacion_solicitada",
        "derivacion_aprobada",
      ]),
    );
    expect(
      finalCase.body.data.historial.find(
        (event) => event.tipo === "derivacion_aprobada",
      ),
    ).toMatchObject({ responsable: "Admin Demo", rol: "admin" });
    expect(
      finalCase.body.data.asignaciones.find(
        (assignment) => assignment.id === destinationAssignmentId,
      ).estudiante_nombre,
    ).toBe("Estudiante 2");
  });
  test("rechazar restaura el estado y conserva el cupo; aprobar libera una vez y crea receptor", async () => {
    const p = await patient("Paciente derivado");
    const a = await assignTo(p, student1);
    await assignments.update(
      a.assignmentId,
      { estado: "contactado" },
      student1.user,
    );
    let referral = await cases.propose(
      a.assignmentId,
      qualification,
      student1.user,
    );
    const load = Number(
      (
        await pool.query(
          "SELECT casos_activos FROM estudiantes_odontologia WHERE id=$1",
          [student1.id],
        )
      ).rows[0].casos_activos,
    );
    await caseService.review(
      referral.id,
      {
        estado: "rechazada",
        motivo_revision: "Falta revisar radiografía antes de derivar",
      },
      admin,
    );
    expect(
      (
        await pool.query("SELECT estado FROM asignaciones WHERE id=$1", [
          a.assignmentId,
        ])
      ).rows[0].estado,
    ).toBe("contactado");
    expect(
      Number(
        (
          await pool.query(
            "SELECT casos_activos FROM estudiantes_odontologia WHERE id=$1",
            [student1.id],
          )
        ).rows[0].casos_activos,
      ),
    ).toBe(load);
    referral = await cases.propose(
      a.assignmentId,
      qualification,
      student1.user,
    );
    const result = await caseService.review(
      referral.id,
      {
        ...qualification,
        estado: "aprobada",
        motivo_revision: "Tratamiento confirmado tras revisar el caso",
      },
      admin,
    );
    expect(result.matching.success).toBe(true);
    const row = (
      await pool.query("SELECT * FROM derivaciones WHERE id=$1", [referral.id])
    ).rows[0];
    expect(row.id_asignacion_destino).not.toBeNull();
    const destination = (
      await pool.query("SELECT * FROM asignaciones WHERE id=$1", [
        row.id_asignacion_destino,
      ])
    ).rows[0];
    expect(destination.id_estudiante).not.toBe(student1.id);
    expect(destination.factores_matching.politica).toBe(
      "menor_carga_y_derivaciones_aprobadas",
    );
    expect(
      Number(
        (
          await pool.query(
            "SELECT casos_activos FROM estudiantes_odontologia WHERE id=$1",
            [student1.id],
          )
        ).rows[0].casos_activos,
      ),
    ).toBe(load - 1);
    await expect(
      caseService.review(
        referral.id,
        {
          ...qualification,
          estado: "aprobada",
          motivo_revision: "Intento de aprobación duplicada",
        },
        admin,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
    const candidates = await matching.candidates(p.id);
    expect(candidates.some((c) => c.id_estudiante === student1.id)).toBe(false);
  });
  test("aprobar sin especialidad compatible conserva el caso pendiente y la clasificación validada", async () => {
    const p = await patient("Sin receptor");
    const a = await assignTo(p, student1);
    await assignments.update(
      a.assignmentId,
      { estado: "contactado" },
      student1.user,
    );
    const proposed = {
      ...qualification,
      specialty: "Ortodoncia",
      treatment: "Evaluación de ortodoncia",
    };
    const referral = await cases.propose(
      a.assignmentId,
      proposed,
      student1.user,
    );
    const result = await caseService.review(
      referral.id,
      {
        ...proposed,
        estado: "aprobada",
        motivo_revision: "Evaluación confirma necesidad de ortodoncia",
      },
      admin,
    );
    expect(result.matching.success).toBe(false);
    const stored = (
      await pool.query("SELECT * FROM pacientes WHERE id=$1", [p.id])
    ).rows[0];
    expect(stored.estado).toBe("pendiente");
    expect(stored.precalificacion_validada.specialty).toBe("Ortodoncia");
  });
  test("reasignación manual conserva el historial y actualiza ambas cargas", async () => {
    const p = await patient("Reasignación");
    const a = await assignTo(p, student1);
    const sourceLoad = Number(
      (
        await pool.query(
          "SELECT casos_activos FROM estudiantes_odontologia WHERE id=$1",
          [student1.id],
        )
      ).rows[0].casos_activos,
    );
    const result = await matching.manual(
      p.id,
      {
        id_asignacion: a.assignmentId,
        id_especialidad_estudiante: student3.schedules[0].id,
        motivo: "Cambio de estudiante por disponibilidad",
      },
      admin,
    );
    expect(result.success).toBe(true);
    const detail = await cases.detail(p.id, admin);
    expect(detail.asignaciones).toHaveLength(2);
    expect(detail.historial.some((h) => h.tipo === "reasignacion_origen")).toBe(
      true,
    );
    expect(
      Number(
        (
          await pool.query(
            "SELECT casos_activos FROM estudiantes_odontologia WHERE id=$1",
            [student1.id],
          )
        ).rows[0].casos_activos,
      ),
    ).toBe(sourceLoad - 1);
  });
  test("la precalificación confirmada prevalece aunque el cuestionario indique otra especialidad", async () => {
    const p = await patient("Clasificación corregida");
    await cases.qualify(p.id, qualification, admin);
    const result = await matching.matchPatient(p.id);
    expect(result.especialidad).toBe("Endodoncia");
    const detail = await cases.detail(p.id, admin);
    expect(detail.validacion.reviewer).toBe(admin.nombre_completo);
    expect(detail.sugerencia.specialty).toBe("Operatoria Dental");
  });
  test("sin cupo no crea asignación manual y las cargas coinciden con los casos activos reales", async () => {
    const p = await patient("Sobrecupo");
    const count = Number(
      (
        await pool.query(
          "SELECT COUNT(*) AS n FROM asignaciones WHERE id_estudiante=$1 AND estado IN ('asignado','notificado','contactado','en_tratamiento','derivacion_pendiente')",
          [student3.id],
        )
      ).rows[0].n,
    );
    await pool.query(
      "UPDATE estudiantes_odontologia SET casos_necesarios=$1 WHERE id=$2",
      [Math.max(1, count), student3.id],
    );
    expect((await assignTo(p, student3)).success).toBe(false);
    await pool.query(
      "UPDATE estudiantes_odontologia SET casos_necesarios=10 WHERE id=$1",
      [student3.id],
    );
    const mismatches =
      await pool.query(`SELECT e.id FROM estudiantes_odontologia e WHERE e.casos_activos<>(SELECT COUNT(*) FROM asignaciones a
      WHERE a.id_estudiante=e.id AND a.estado IN ('asignado','notificado','contactado','en_tratamiento','derivacion_pendiente'))`);
    expect(mismatches.rows).toHaveLength(0);
  });
  test("desactivar paciente cierra propuestas pendientes y conserva eventos", async () => {
    const p = await patient("Desactivado");
    const a = await assignTo(p, student1);
    await assignments.update(
      a.assignmentId,
      { estado: "contactado" },
      student1.user,
    );
    const referral = await cases.propose(
      a.assignmentId,
      qualification,
      student1.user,
    );
    expect(
      await new PatientRepository(mockDatabase).deactivate(p.id, admin),
    ).toBe(true);
    expect(
      (
        await pool.query("SELECT estado FROM derivaciones WHERE id=$1", [
          referral.id,
        ])
      ).rows[0].estado,
    ).toBe("rechazada");
    const detail = await cases.detail(p.id, admin);
    expect(detail.historial.at(-1).tipo).toBe("paciente_desactivado");
  });
  test("cuentas: último administrador protegido, estudiante requiere perfil, permisos vigentes", async () => {
    await expect(
      users.manageAccount(admin.id, {
        role: "coordinator",
        status: "active",
        nombre_completo: admin.nombre_completo,
        permissions: [],
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
    await expect(
      users.manageAccount(admin.id, {
        role: "student",
        status: "active",
        nombre_completo: admin.nombre_completo,
        permissions: [],
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
    const token = generateToken(student2.user);
    await users.manageAccount(student2.user.id, {
      role: "student",
      status: "suspended",
      nombre_completo: "Estudiante 2",
      permissions: ["assignments:own"],
    });
    expect(
      (
        await request(app)
          .get("/api/asignaciones/mias")
          .set("Authorization", `Bearer ${token}`)
      ).status,
    ).toBe(401);
    await users.manageAccount(student2.user.id, {
      role: "student",
      status: "active",
      nombre_completo: "Estudiante 2",
      permissions: ["assignments:own"],
    });
    expect(
      (
        await request(app)
          .get("/api/users")
          .set("Authorization", `Bearer ${token}`)
      ).status,
    ).toBe(403);
    const accounts = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${generateToken(admin)}`);
    expect(accounts.status).toBe(200);
    expect(
      accounts.body.data.some(
        (u) => "password" in u || "refresh_token_hash" in u,
      ),
    ).toBe(false);
  });
  test("cola: reclamo exclusivo, payload estable y confirmación antes de marcar enviado", async () => {
    const p = await patient("Notificación");
    const a = await assignTo(p, student1);
    const id = (
      await pool.query(
        "SELECT id FROM notificaciones_email WHERE id_asignacion=$1 LIMIT 1",
        [a.assignmentId],
      )
    ).rows[0].id;
    const repo = new NotificationsRepository(mockDatabase);
    const claims = await Promise.allSettled([
      repo.claim(id, true),
      repo.claim(id, true),
    ]);
    expect(claims.filter((c) => c.status === "fulfilled")).toHaveLength(1);
    const notification = claims.find((c) => c.status === "fulfilled").value;
    expect(
      await repo.freezePayload(notification, { text: "Aviso inicial" }),
    ).toEqual({ text: "Aviso inicial" });
    expect(
      await repo.freezePayload(notification, { text: "No reemplazar" }),
    ).toEqual({ text: "Aviso inicial" });
    await repo.finish(notification, "mock-provider-1", null, admin);
    expect(
      (
        await pool.query(
          "SELECT estado FROM notificaciones_email WHERE id=$1",
          [id],
        )
      ).rows[0].estado,
    ).toBe("enviado");
    await expect(repo.claim(id, true)).rejects.toMatchObject({
      statusCode: 409,
    });
  });
  test("cola: conserva el fallo, permite reintentar y recupera un reclamo vencido", async () => {
    const id = (
      await pool.query(`INSERT INTO notificaciones_email(email_destino,tipo_notificacion,asunto)
      VALUES ('demo@example.test','prueba','Aviso de prueba') RETURNING id`)
    ).rows[0].id;
    const repo = new NotificationsRepository(mockDatabase);
    let notification = await repo.claim(id, true);
    const failure = new Error("Fallo simulado");
    failure.uncertain = true;
    await repo.finish(notification, null, failure, admin);
    expect(
      (
        await pool.query(
          "SELECT estado FROM notificaciones_email WHERE id=$1",
          [id],
        )
      ).rows[0].estado,
    ).toBe("fallido");
    notification = await repo.claim(id, true);
    expect(notification.intentos_envio).toBe(2);
    await pool.query(
      "UPDATE notificaciones_email SET fecha_reclamo=CURRENT_TIMESTAMP-INTERVAL '6 minutes' WHERE id=$1",
      [id],
    );
    const recovered = await repo.claim(id, true);
    expect(recovered.claim_token).not.toBe(notification.claim_token);
    await expect(
      repo.finish(notification, "old-result", null, admin),
    ).rejects.toMatchObject({ statusCode: 409 });
    await repo.finish(recovered, "mock-retry", null, admin);
    expect(
      (
        await pool.query(
          "SELECT intentos_envio FROM notificaciones_email WHERE id=$1",
          [id],
        )
      ).rows[0].intentos_envio,
    ).toBe(3);
  });
  test("cola: los errores inciertos antiguos y los avisos de asignaciones cerradas quedan bloqueados", async () => {
    const repo = new NotificationsRepository(mockDatabase);
    const row = (
      await pool.query(`INSERT INTO notificaciones_email(email_destino,tipo_notificacion,asunto,estado,envio_incierto,primer_intento)
      VALUES ('demo@example.test','prueba','Prueba','fallido',TRUE,CURRENT_TIMESTAMP-INTERVAL '25 hours') RETURNING id`)
    ).rows[0];
    expect((await repo.claim(row.id, true)).blocked).toBe(true);
    const p = await patient();
    const a = await assignTo(p, student1);
    await assignments.update(a.assignmentId, { estado: "cancelado" }, admin);
    const id = (
      await pool.query(
        "SELECT id FROM notificaciones_email WHERE id_asignacion=$1 LIMIT 1",
        [a.assignmentId],
      )
    ).rows[0].id;
    expect((await repo.claim(id, true)).blocked).toBe(true);
  });
  test("dos revisiones concurrentes aprueban una vez y no duplican el receptor", async () => {
    const p = await patient("Aprobación concurrente");
    const a = await assignTo(p, student1);
    await assignments.update(
      a.assignmentId,
      { estado: "contactado" },
      student1.user,
    );
    const referral = await cases.propose(
      a.assignmentId,
      qualification,
      student1.user,
    );
    const input = {
      ...qualification,
      estado: "aprobada",
      motivo_revision: "Caso revisado y confirmado por el personal",
    };
    const results = await Promise.allSettled([
      caseService.review(referral.id, input, admin),
      caseService.review(referral.id, input, admin),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    const count = await pool.query(
      "SELECT COUNT(*) AS n FROM asignaciones WHERE id_paciente=$1 AND estado IN ('asignado','contactado','en_tratamiento','notificado','derivacion_pendiente')",
      [p.id],
    );
    expect(Number(count.rows[0].n)).toBe(1);
    await expect(
      pool.query(
        `INSERT INTO derivaciones(id_paciente,id_asignacion_origen,id_estudiante_origen,estado_anterior,propuesta,estado)
      VALUES ($1,$2,$3,'contactado',$4,'aprobada')`,
        [p.id, a.assignmentId, student1.id, JSON.stringify(qualification)],
      ),
    ).rejects.toMatchObject({ code: "23505" });
  });
  test("API: derivar requiere propiedad; aprobar y gestionar cuentas requiere personal autorizado", async () => {
    const p = await patient("Permisos API");
    const a = await assignTo(p, student1);
    await assignments.update(
      a.assignmentId,
      { estado: "contactado" },
      student1.user,
    );
    const ownToken = generateToken(student1.user),
      otherToken = generateToken(student2.user);
    expect(
      (
        await request(app)
          .post(`/api/asignaciones/${a.assignmentId}/derivacion`)
          .set("Authorization", `Bearer ${otherToken}`)
          .send(qualification)
      ).status,
    ).toBe(403);
    const proposed = await request(app)
      .post(`/api/asignaciones/${a.assignmentId}/derivacion`)
      .set("Authorization", `Bearer ${ownToken}`)
      .send(qualification);
    expect(proposed.status).toBe(201);
    expect(
      (
        await request(app)
          .post(`/api/derivaciones/${proposed.body.data.id}/revision`)
          .set("Authorization", `Bearer ${ownToken}`)
          .send({
            ...qualification,
            estado: "aprobada",
            motivo_revision: "Aprobación indebida del estudiante",
          })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .post(`/api/matching/manual/${p.id}`)
          .set("Authorization", `Bearer ${ownToken}`)
          .send({})
      ).status,
    ).toBe(403);
    const coord = (
      await pool.query(
        "INSERT INTO users(email,password,nombre_completo,role) VALUES ('coord@example.cl','hash','Coordinador Demo','coordinator') RETURNING *",
      )
    ).rows[0];
    expect(
      (
        await request(app)
          .get("/api/users")
          .set("Authorization", `Bearer ${generateToken(coord)}`)
      ).status,
    ).toBe(403);
    // An old admin JWT cannot retain staff access after the account is demoted.
    const promoted = await users.manageAccount(student3.user.id, {
      role: "admin",
      status: "active",
      nombre_completo: "Estudiante 3",
      permissions: [],
    });
    const oldAdminToken = generateToken(promoted);
    await users.manageAccount(promoted.id, {
      role: "student",
      status: "active",
      nombre_completo: "Estudiante 3",
      permissions: [],
    });
    expect(
      (
        await request(app)
          .get("/api/users")
          .set("Authorization", `Bearer ${oldAdminToken}`)
      ).status,
    ).toBe(403);
  });
  test("API: el alta continúa con fallback cuando la IA responde con AbortError", async () => {
    const original = global.fetch;
    jest.spyOn(console, "warn").mockImplementation(() => {});
    const abort = new Error("timeout");
    abort.name = "AbortError";
    global.fetch = jest.fn().mockRejectedValue(abort);
    try {
      const result = await request(app)
        .post("/api/pacientes/intake")
        .send({
          nombre_completo: "Paciente con fallback",
          edad: 30,
          telefono: "912345678",
          ciudad: "Metropolitana",
          consentimiento_datos: true,
          respuestas: { intensidad_dolor: 4 },
        });
      expect(result.status).toBe(201);
      expect(result.body.data.id).toBeTruthy();
      expect(result.body.data.preCategorizacion.intensidad_dolor).toBe(4);
      expect(
        (
          await pool.query("SELECT COUNT(*) AS n FROM pacientes WHERE id=$1", [
            result.body.data.id,
          ])
        ).rows[0].n,
      ).toBe("1");
    } finally {
      global.fetch = original;
    }
  });
});
