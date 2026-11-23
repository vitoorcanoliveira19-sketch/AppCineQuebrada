const VERSION = "002-remove-mfa";

async function migrar(sequelize) {
  const [aplicadas] = await sequelize.query("SELECT nome FROM Migracao WHERE nome = :nome", { replacements: { nome: VERSION } });
  if (aplicadas.length) return;
  const qi = sequelize.getQueryInterface();
  const tables = await qi.showAllTables();
  // Retire only the removed feature's columns. Accounts, passwords and sessions survive.
  for (const [table, fields] of Object.entries({
    Usuario: ["mfa_secret", "mfa_last_counter", "mfa_recovery_codes"],
    Sessao: ["mfa_verificada", "mfa_pendente"],
  })) {
    const actualTable = tables.includes(table) ? table : tables.find(name => name.toLowerCase() === table.toLowerCase());
    if (!actualTable) continue;
    const columns = await qi.describeTable(actualTable);
    for (const field of fields) if (columns[field]) await qi.removeColumn(actualTable, field);
  }
  await sequelize.query("INSERT INTO Migracao (nome) VALUES (:nome)", { replacements: { nome: VERSION } });
}

module.exports = { VERSION, migrar };
