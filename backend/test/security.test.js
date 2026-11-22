const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const crypto = require("node:crypto");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");

let models, app, server, base, adminConnection, fixture, passwordHash;
const dbName = "security_test_" + process.pid;
process.env.NODE_ENV = "test";
process.env.DB_HOST = process.env.TEST_DB_HOST || "127.0.0.1";
process.env.DB_PORT = process.env.TEST_DB_PORT || "3306";
process.env.DB_USER = process.env.TEST_DB_USER || "root";
process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD || "test-password";
process.env.DB_NAME = dbName;
process.env.SESSION_SECRET = crypto.randomBytes(48).toString("base64");
process.env.MFA_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
const password = "Synthetic-test-password";
const origin = "http://localhost:8081";

async function request(path, { method = "GET", token, cookie, csrf, body, origin: requestOrigin, headers = {} } = {}) {
  const response = await fetch(base + path, { method, headers: {
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: "Bearer " + token } : {}),
    ...(cookie ? { Cookie: cookie } : {}), ...(csrf ? { "X-CSRF-Token": csrf } : {}),
    ...(requestOrigin ? { Origin: requestOrigin } : {}), ...headers,
  }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, body: await response.json().catch(() => ({})), headers: response.headers };
}
async function login(email, web = false) {
  return request("/auth/login", { method: "POST", body: { email, senha: password, cliente: web ? "web" : "native" }, ...(web ? { origin } : {}) });
}
async function adminToken() {
  const result = await login("admin@example.invalid");
  assert.equal(result.status, 200);
  await models.Sessao.update({ mfaVerificada: true }, { where: { id: require("../services/sessions").hash(result.body.token) } });
  return result.body.token;
}
before(async () => {
  assert.match(dbName, /^security_test_[0-9]+$/);
  assert.ok(["localhost", "127.0.0.1"].includes(process.env.DB_HOST), "Tests may only create/drop local disposable databases");
  adminConnection = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER, password: process.env.DB_PASSWORD });
  await adminConnection.query("CREATE DATABASE " + dbName);
  models = require("../models");
  await models.syncDatabase();
  app = require("../app");
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = "http://127.0.0.1:" + server.address().port;
  passwordHash = await bcrypt.hash(password, 10);
});
beforeEach(async () => {
  const { sequelize, Usuario, Educador, Participante, Atividade, Sala, Turma, Matricula, Chamada, Presenca, Sessao, LimiteAcesso } = models;
  await sequelize.transaction(async transaction => {
    for (const model of [Sessao, LimiteAcesso, Presenca, Chamada, Matricula, Turma, Usuario, Educador, Participante, Atividade, Sala]) await model.destroy({ where: {}, transaction });
  });
  const e1 = await Educador.create({ nome: "Educator A", email: "profile-a@example.invalid", contato: "11999999999" });
  const e2 = await Educador.create({ nome: "Educator B", email: "profile-b@example.invalid", contato: "11999999999" });
  const inactive = await Educador.create({ nome: "Inactive", email: "inactive-profile@example.invalid", contato: "11999999999", ativo: false });
  const user = (nome, email, extra) => Usuario.create({ nome, email, senha: passwordHash, papel: "educador", ...extra });
  const admin = await user("Admin", "admin@example.invalid", { papel: "administrador" });
  const a = await user("Educator A", "a@example.invalid", { educadorId: e1.id });
  const b = await user("Educator B", "b@example.invalid", { educadorId: e2.id });
  await user("Unlinked", "unlinked@example.invalid", {});
  await user("Inactive", "inactive@example.invalid", { educadorId: inactive.id });
  const atividade = await Atividade.create({ nome: "Ballet" });
  const sala = await Sala.create({ nome: "Sala A" });
  const t1 = await Turma.create({ nome: "Class A", atividadeId: atividade.id, salaId: sala.id, educadorId: e1.id });
  const t2 = await Turma.create({ nome: "Class B", atividadeId: atividade.id, salaId: sala.id, educadorId: e2.id });
  const p1 = await Participante.create({ nome: "Person A", email: "person-a@example.invalid", cep: "01001000", status: "aprovado" });
  const p2 = await Participante.create({ nome: "Person B", email: "person-b@example.invalid", cep: "01001000", status: "aprovado" });
  const m1 = await Matricula.create({ participanteId: p1.id, turmaId: t1.id });
  const m2 = await Matricula.create({ participanteId: p2.id, turmaId: t2.id });
  for (const [turma, matricula] of [[t1,m1], [t2,m2]]) {
    const chamada = await Chamada.create({ turmaId: turma.id, dataAula: "2026-11-01" });
    await Presenca.create({ chamadaId: chamada.id, matriculaId: matricula.id, situacao: "presente" });
  }
  fixture = { admin, a, b, e1, e2, t1, t2, p1, p2, m1, m2 };
});
after(async () => {
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  if (models) await models.sequelize.close();
  if (adminConnection) { await adminConnection.query("DROP DATABASE " + dbName); await adminConnection.end(); }
});

test("anonymous access fails and public internal-account signup stays disabled", async () => {
  for (const path of ["/admin/participantes", "/admin/turmas", "/admin/matriculas", "/chamadas/turmas", "/auth/me"]) assert.equal((await request(path)).status, 401, path);
  assert.equal((await request("/cadastro", { method: "POST", body: {} })).status, 410);
});
test("legacy bcrypt hashes authenticate; staff role checks prevent privilege escalation", async () => {
  const result = await login("a@example.invalid"); assert.equal(result.status, 200);
  assert.equal(await bcrypt.compare(password, passwordHash), true);
  assert.equal(result.body.token.length, 43);
  const token = result.body.token;
  assert.equal((await request("/admin/participantes", { token })).status, 403);
  assert.equal((await request("/admin/educadores", { token, method: "POST", body: {} })).status, 403);
  assert.equal((await request("/admin/turmas", { token, method: "POST", body: {} })).status, 403);
});
test("educator scope uses a stable link and cannot be widened by class or participant filters", async () => {
  const token = (await login("a@example.invalid")).body.token;
  await fixture.e1.update({ email: "changed@example.invalid" });
  const own = await request("/chamadas/turmas", { token });
  assert.deepEqual(own.body.dados.map(t => t.id), [fixture.t1.id]);
  const foreign = await request("/chamadas/historico?turmaId=" + fixture.t2.id, { token });
  assert.equal(foreign.status, 200); assert.deepEqual(foreign.body.dados.registros, []);
  const participant = await request("/chamadas/historico?participanteId=" + fixture.p2.id, { token });
  assert.equal(participant.status, 200); assert.deepEqual(participant.body.dados.registros, []);
  assert.equal((await request("/admin/turmas/" + fixture.t2.id, { token })).status, 404);
  assert.equal((await request("/chamadas?turmaId=" + fixture.t2.id + "&data=2026-11-01", { token })).status, 404);
  assert.equal((await request("/chamadas", { token, method: "PUT", body: { turmaId: fixture.t2.id, dataAula: "2026-11-01", presencas: [] } })).status, 404);
});
test("unlinked and inactive educator profiles deny every class/history/attendance path", async () => {
  for (const email of ["unlinked@example.invalid", "inactive@example.invalid"]) {
    const token = (await login(email)).body.token;
    for (const path of ["/chamadas/turmas", "/chamadas/participantes", "/admin/turmas", "/admin/turmas/" + fixture.t1.id,
      "/chamadas/historico?turmaId=" + fixture.t1.id, "/chamadas/historico?participanteId=" + fixture.p1.id,
      "/chamadas?turmaId=" + fixture.t1.id + "&data=2026-11-01"]) assert.equal((await request(path, { token })).status, 403, email + path);
    assert.equal((await request("/chamadas", { token, method: "PUT", body: { turmaId: fixture.t1.id, dataAula: "2026-11-01", presencas: [] } })).status, 403);
  }
});
test("admin participant history works against actual SQL and phone edits accept Brazilian formats", async () => {
  const token = await adminToken();
  const history = await request("/chamadas/historico?participanteId=" + fixture.p1.id, { token });
  assert.equal(history.status, 200); assert.equal(history.body.dados.registros.length, 1);
  assert.equal(history.body.dados.registros[0].participanteId, fixture.p1.id);
  for (const celular of ["11999999999", "(11) 99999-9999", "+55 (11) 99999-9999"]) {
    assert.equal((await request("/admin/participantes/" + fixture.p1.id, { token, method: "PUT", body: { celular } })).status, 200);
  }
});
test("attendance saves, updates and enrollment closure preserve history", async () => {
  const token = (await login("a@example.invalid")).body.token;
  const payload = { turmaId: fixture.t1.id, dataAula: "2026-11-02", presencas: [{ matriculaId: fixture.m1.id, situacao: "ausente" }] };
  assert.equal((await request("/chamadas", { token, method: "PUT", body: payload })).status, 201);
  payload.presencas[0].situacao = "presente";
  assert.equal((await request("/chamadas", { token, method: "PUT", body: payload })).status, 200);
  await fixture.m1.update({ situacao: "encerrada" });
  const result = await request("/chamadas/historico?participanteId=" + fixture.p1.id, { token });
  assert.equal(result.status, 200); assert.equal(result.body.dados.registros.length, 2);
});
test("web login exposes no bearer token and cookie mutations require CSRF; logout invalidates copied cookie", async () => {
  const result = await login("a@example.invalid", true);
  assert.equal(result.status, 200); assert.equal(result.body.token, undefined);
  const setCookie = result.headers.get("set-cookie");
  assert.match(setCookie, /HttpOnly/i); assert.match(setCookie, /SameSite=Lax/i);
  const cookie = setCookie.split(";")[0];
  const me = await request("/auth/me", { cookie, origin });
  assert.equal(me.status, 200); assert.ok(me.body.csrfToken);
  assert.equal((await request("/auth/logout", { cookie, origin, method: "POST", body: {} })).status, 403);
  assert.equal((await request("/auth/logout", { cookie, origin, csrf: result.body.csrfToken, method: "POST", body: {} })).status, 200);
  assert.equal((await request("/auth/me", { cookie, origin })).status, 401);
});
test("native logout invalidates copied bearer; expiry, idle expiry and tampering fail", async () => {
  let token = (await login("a@example.invalid")).body.token;
  const record = await models.Sessao.findByPk(require("../services/sessions").hash(token));
  assert.notEqual(record.id, token);
  await record.update({ vistaEm: new Date(Date.now() - 3*3600000) });
  assert.equal((await request("/auth/me", { token })).status, 401);
  token = (await login("a@example.invalid")).body.token;
  await models.Sessao.update({ expiraEm: new Date(Date.now() - 1000) }, { where: { id: require("../services/sessions").hash(token) } });
  assert.equal((await request("/auth/me", { token })).status, 401);
  token = (await login("a@example.invalid")).body.token;
  assert.equal((await request("/auth/logout", { token, method: "POST" })).status, 200);
  assert.equal((await request("/auth/me", { token })).status, 401);
  assert.equal((await request("/auth/me", { token: "a".repeat(43) })).status, 401);
  assert.equal((await request("/auth/me", { token: "legacy.jwt.token" })).status, 401);
});
test("password changes revoke every device and enforce bcrypt's UTF-8 byte boundary", async () => {
  const first = (await login("a@example.invalid")).body.token;
  const second = (await login("a@example.invalid")).body.token;
  assert.equal((await request("/auth/senha", { token: first, method: "POST", body: { senhaAtual: password, novaSenha: "🔒".repeat(20) } })).status, 400);
  assert.equal((await request("/auth/senha", { token: first, method: "POST", body: { senhaAtual: "incorrect", novaSenha: "Changed-password-123" } })).status, 401);
  assert.equal((await request("/auth/senha", { token: first, method: "POST", body: { senhaAtual: password, novaSenha: "Changed-password-123" } })).status, 200);
  for (const token of [first,second]) assert.equal((await request("/auth/me", { token })).status, 401);
  assert.equal((await login("a@example.invalid")).status, 401);
  const changed = await models.Usuario.findByPk(fixture.a.id);
  assert.equal(bcrypt.getRounds(changed.senha), 12);
  assert.equal(await bcrypt.compare("Changed-password-123", changed.senha), true);
});
test("account blocking revokes sessions and reactivation never restores old sessions", async () => {
  const token = (await login("a@example.invalid")).body.token;
  const admin = await adminToken();
  const url = "/admin/usuarios/" + fixture.a.id + "/ativo";
  assert.equal((await request(url, { token: admin, method: "PATCH", body: { ativo: false } })).status, 200);
  assert.equal((await request("/auth/me", { token })).status, 401);
  assert.equal((await login("a@example.invalid")).status, 401);
  assert.equal((await request(url, { token: admin, method: "PATCH", body: { ativo: true } })).status, 200);
  assert.equal((await request("/auth/me", { token })).status, 401);
  assert.equal((await login("a@example.invalid")).status, 200);
  assert.equal((await request("/admin/usuarios/" + fixture.admin.id + "/ativo", { token: admin, method: "PATCH", body: { ativo: false } })).status, 409);
});
test("admin MFA gates access, encrypts the secret and recovery codes are single-use under concurrency", async () => {
  const first = await login("admin@example.invalid");
  const token = first.body.token;
  assert.equal(first.body.precisaMfa, true); assert.equal(first.body.configurarMfa, true);
  assert.equal((await request("/admin/participantes", { token })).status, 403);
  const setup = await request("/auth/mfa/configurar", { token, method: "POST" });
  assert.equal(setup.status, 200); assert.ok(setup.body.segredo);
  const reopened = await Promise.all([1,2].map(() => request("/auth/mfa/configurar", { token, method: "POST" })));
  assert.ok(reopened.every(result => result.body.segredo === setup.body.segredo));
  const otp = require("../services/mfa").totp(setup.body.segredo, "admin@example.invalid");
  const confirm = await request("/auth/mfa/confirmar", { token, method: "POST", body: { codigo: otp.generate() } });
  assert.equal(confirm.status, 200); assert.equal(confirm.body.codigosRecuperacao.length, 10);
  assert.equal((await request("/admin/participantes", { token })).status, 200);
  const user = await models.Usuario.findByPk(fixture.admin.id);
  assert.notEqual(user.mfaSecret, setup.body.segredo);
  assert.ok(!JSON.stringify(user.mfaRecoveryCodes).includes(confirm.body.codigosRecuperacao[0]));
  const second = (await login("admin@example.invalid")).body.token;
  assert.equal((await request("/auth/mfa/verificar", { token: second, method: "POST", body: { codigo: otp.generate() } })).status, 401, "TOTP replay rejected");
  const recoveryBody = { codigo: confirm.body.codigosRecuperacao[0] };
  const attempts = await Promise.all([1,2].map(() => request("/auth/mfa/verificar", { token: second, method: "POST", body: recoveryBody })));
  assert.deepEqual(attempts.map(r => r.status).sort(), [200,401]);
  assert.equal((await request("/admin/participantes", { token: second })).status, 200);
});
test("untrusted origins, missing CSRF, JSON corruption and oversized payloads fail safely", async () => {
  assert.equal((await request("/auth/login", { method: "POST", origin: "https://attacker.invalid", body: { email: "a@example.invalid", senha: password } })).status, 403);
  const malformed = await fetch(base + "/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
  assert.equal(malformed.status, 400); assert.ok(!(await malformed.text()).includes("SyntaxError"));
  const oversized = await request("/participantes", { method: "POST", body: { nome: "a".repeat(33000) } });
  assert.equal(oversized.status, 413);
});
test("shared rate-limit counters enforce account and registration budgets", async () => {
  for (let i=0;i<10;i++) assert.equal((await request("/auth/login", { method: "POST", body: { email: "absent@example.invalid", senha: "wrong" } })).status, 401);
  const limited = await request("/auth/login", { method: "POST", body: { email: "absent@example.invalid", senha: "wrong" } });
  assert.equal(limited.status, 429); assert.ok(Number(limited.headers.get("retry-after")) > 0);
  const form = { nome: "Synthetic Adult", dataNascimento: "1990-01-01", celular: "11999999999", email: "signup@example.invalid",
    cep: "01001000", bairro: "Centro", logradouro: "Rua Teste", numero: "1", atividadeInteresse: "Ballet", status: "aprovado", papel: "administrador" };
  for (let i=0;i<5;i++) {
    const result = await request("/participantes", { method: "POST", body: form });
    assert.equal(result.status, 201); assert.equal(result.body.dados.status, "pendente");
  }
  assert.equal((await request("/participantes", { method: "POST", body: form })).status, 429);
  const rows = await models.LimiteAcesso.findAll();
  assert.ok(rows.every(row => /^[a-f0-9]{64}$/.test(row.chave)));
});
test("security migration is idempotent and only links unambiguous legacy educators once", async () => {
  await models.sequelize.query("DELETE FROM Migracao");
  await models.Usuario.update({ educadorId: null }, { where: { id: fixture.a.id } });
  await fixture.e1.update({ email: "a@example.invalid" });
  const { migrar } = require("../migrations/security");
  await migrar(models); await migrar(models);
  assert.equal((await models.Usuario.findByPk(fixture.a.id)).educadorId, fixture.e1.id);
  await fixture.e1.update({ email: "changed-again@example.invalid" });
  await migrar(models);
  assert.equal((await models.Usuario.findByPk(fixture.a.id)).educadorId, fixture.e1.id);
});

test("rate-limit budgets remain exact under concurrent requests", async () => {
  const route = "/__test/concurrent-" + Date.now();
  app.get(route, require("../middlewares/rateLimit").limitar("concurrent-test", 5), (_req, res) => res.json({ sucesso: true }));
  const responses = await Promise.all(Array.from({ length: 15 }, () => request(route)));
  assert.equal(responses.filter(r => r.status === 200).length, 5);
  assert.equal(responses.filter(r => r.status === 429).length, 10);
});
test("production web cookies use Secure and the __Host prefix; configuration rejects insecure origins", async () => {
  const oldOrigin = process.env.WEB_ORIGINS;
  try {
    process.env.NODE_ENV = "production";
    process.env.WEB_ORIGINS = "http://insecure.invalid";
    assert.throws(() => require("../config/security").validateSecurityConfig(), /HTTPS/);
    process.env.WEB_ORIGINS = "https://ngo.example.invalid";
    require("../config/security").validateSecurityConfig();
    const result = await request("/auth/login", { method: "POST", origin: process.env.WEB_ORIGINS, body: { email: "a@example.invalid", senha: password, cliente: "web" } });
    assert.equal(result.status, 200);
    assert.match(result.headers.get("set-cookie"), /^__Host-cinequebrada=/);
    assert.match(result.headers.get("set-cookie"), /; Secure/);
    assert.equal(result.body.token, undefined);
  } finally { process.env.NODE_ENV = "test"; if (oldOrigin === undefined) delete process.env.WEB_ORIGINS; else process.env.WEB_ORIGINS = oldOrigin; }
});
test("operator password recovery preserves MFA and invalidates existing sessions", async () => {
  const { execFile } = require("node:child_process");
  const { promisify } = require("node:util");
  const token = (await login("a@example.invalid")).body.token;
  await promisify(execFile)(process.execPath, ["scripts/reset-educator-password.js"], {
    cwd: require("node:path").resolve(__dirname, ".."),
    env: { ...process.env, RESET_EMAIL: "a@example.invalid", RESET_PASSWORD: "Recovered-password-123" },
  });
  assert.equal((await request("/auth/me", { token })).status, 401);
  assert.equal((await request("/auth/login", { method: "POST", body: { email: "a@example.invalid", senha: "Recovered-password-123" } })).status, 200);
});
test("staff management lists only safe fields and creates explicitly linked educator accounts", async () => {
  const token = await adminToken();
  const listado = await request("/admin/usuarios", { token });
  assert.equal(listado.status, 200);
  assert.ok(listado.body.dados.every(u => !("senha" in u) && !("mfaSecret" in u) && !("mfaRecoveryCodes" in u)));
  const educador = await models.Educador.create({ nome: "New Educator", email: "new-profile@example.invalid", contato: "11999999999" });
  const create = await request("/admin/educadores", { token, method: "POST", body: { nome: "New Educator", email: "new-login@example.invalid", senha: "New-test-password", educadorId: educador.id } });
  assert.equal(create.status, 201); assert.equal(create.body.dados.educadorId, educador.id);
  assert.equal((await request("/admin/educadores", { token, method: "POST", body: { nome: "Duplicate Educator", email: "duplicate@example.invalid", senha: "New-test-password", educadorId: educador.id } })).status, 409);
});
test("minor registrations require guardian details and reject impossible birth dates", async () => {
  const form = { nome: "Synthetic Minor", dataNascimento: "2015-01-01", celular: "11999999999", email: "minor@example.invalid",
    cep: "01001000", bairro: "Centro", logradouro: "Rua Teste", numero: "1", atividadeInteresse: "Ballet" };
  assert.equal((await request("/participantes", { method: "POST", body: form })).status, 400);
  form.responsavelNome = "Synthetic Guardian"; form.responsavelTelefone = "11988888888";
  assert.equal((await request("/participantes", { method: "POST", body: form })).status, 201);
  form.dataNascimento = "2015-02-31";
  assert.equal((await request("/participantes", { method: "POST", body: form })).status, 400);
});

test("migration upgrades a legacy user table additively without losing accounts or educator links", async () => {
  const { Sequelize } = require("sequelize");
  const legacyName = dbName + "_legacy";
  assert.match(legacyName, /^security_test_[0-9]+_legacy$/);
  await adminConnection.query("CREATE DATABASE " + legacyName);
  const legacy = new Sequelize(legacyName, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT), dialect: "mysql", logging: false,
    define: { freezeTableName: true, timestamps: true },
  });
  try {
    const copyAttributes = model => Object.fromEntries(Object.entries(model.rawAttributes).map(([key,value]) => [key, { ...value }]));
    const usuarioAttributes = copyAttributes(models.Usuario);
    const Educador = legacy.define("Educador", copyAttributes(models.Educador));
    const Usuario = legacy.define("Usuario", usuarioAttributes);
    const oldColumns = { ...usuarioAttributes };
    for (const field of ["educadorId", "authVersion", "mfaSecret", "mfaLastCounter", "mfaRecoveryCodes"]) delete oldColumns[field];
    await legacy.getQueryInterface().createTable("Educador", Educador.rawAttributes);
    await legacy.getQueryInterface().createTable("Usuario", oldColumns);
    const educator = await Educador.create({ nome: "Legacy educator", email: "legacy@example.invalid", contato: "11999999999" });
    await legacy.query("INSERT INTO Usuario (nome, email, senha, papel, createdAt, updatedAt) VALUES (:nome, :email, :senha, 'educador', NOW(), NOW())", {
      replacements: { nome: "Legacy account", email: "legacy@example.invalid", senha: passwordHash },
    });
    await require("../migrations/security").migrar({ sequelize: legacy, Usuario, Educador });
    const account = await Usuario.findOne();
    assert.equal(account.email, "legacy@example.invalid");
    assert.equal(account.senha, passwordHash);
    assert.equal(account.educadorId, educator.id);
    assert.equal(account.authVersion, 0);
    assert.equal(account.mfaSecret, null);
  } finally {
    await legacy.close(); await adminConnection.query("DROP DATABASE " + legacyName);
  }
});

test("administrator password recovery never removes the configured second factor", async () => {
  const encrypted = require("../services/mfa").encrypt(new (require("otpauth").Secret)({ size: 20 }).base32);
  await fixture.admin.update({ mfaSecret: encrypted, mfaRecoveryCodes: ["synthetic-recovery-hmac"] });
  const token = await adminToken();
  const { promisify } = require("node:util");
  await promisify(require("node:child_process").execFile)(process.execPath, ["scripts/reset-staff-password.js"], {
    cwd: require("node:path").resolve(__dirname, ".."),
    env: { ...process.env, RESET_EMAIL: "admin@example.invalid", RESET_PASSWORD: "Recovered-admin-password" },
  });
  const updated = await models.Usuario.findByPk(fixture.admin.id);
  assert.equal(updated.mfaSecret, encrypted);
  assert.deepEqual(updated.mfaRecoveryCodes, ["synthetic-recovery-hmac"]);
  assert.equal((await request("/auth/me", { token })).status, 401);
  const login = await request("/auth/login", { method: "POST", body: { email: "admin@example.invalid", senha: "Recovered-admin-password" } });
  assert.equal(login.status, 200); assert.equal(login.body.precisaMfa, true); assert.equal(login.body.configurarMfa, false);
  assert.equal((await request("/admin/participantes", { token: login.body.token })).status, 403);
});
