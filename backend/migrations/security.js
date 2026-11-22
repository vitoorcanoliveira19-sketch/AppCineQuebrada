const VERSION = "001-security-sessions-educator-link";
async function migrar({ sequelize, Usuario, Educador }) {
  const qi = sequelize.getQueryInterface();
  await sequelize.query("CREATE TABLE IF NOT EXISTS Migracao (nome VARCHAR(100) PRIMARY KEY)");
  const [aplicadas] = await sequelize.query("SELECT nome FROM Migracao WHERE nome = :nome", { replacements: { nome: VERSION } });
  if (aplicadas.length) return;
  const columns = await qi.describeTable("Usuario");
  for (const field of ["educadorId", "authVersion", "mfaSecret", "mfaLastCounter", "mfaRecoveryCodes"]) {
    const definition = Usuario.rawAttributes[field];
    if (!columns[definition.field]) await qi.addColumn("Usuario", definition.field, definition);
  }
  const indices = await qi.showIndex("Usuario");
  if (!indices.some(index => index.unique && index.fields.some(field => field.attribute === "educador_id"))) {
    await qi.addIndex("Usuario", ["educador_id"], { unique: true, name: "usuario_educador_unico" });
  }
  const profiles = await Educador.findAll();
  const contas = await Usuario.findAll({ where: { papel: "educador", educadorId: null } });
  const assigned = new Set((await Usuario.findAll({ attributes: ["educadorId"] })).map(u => u.educadorId).filter(Boolean));
  for (const conta of contas) {
    const matches = profiles.filter(p => p.email.trim().toLowerCase() === conta.email.trim().toLowerCase());
    if (matches.length === 1 && !assigned.has(matches[0].id)) {
      await conta.update({ educadorId: matches[0].id }); assigned.add(matches[0].id);
    }
  }
  await sequelize.query("INSERT INTO Migracao (nome) VALUES (:nome)", { replacements: { nome: VERSION } });
}
async function verificar(sequelize) {
  try {
    const [rows] = await sequelize.query("SELECT nome FROM Migracao WHERE nome = :nome", { replacements: { nome: VERSION } });
    if (!rows.length) throw new Error("migration");
    await sequelize.query("SELECT id FROM Sessao LIMIT 0");
    await sequelize.query("SELECT chave FROM LimiteAcesso LIMIT 0");
  } catch { throw new Error("Execute npm run migrate com a credencial de migração antes de iniciar o backend."); }
}
module.exports = { migrar, verificar };
