const { sequelize, syncDatabase } = require("../models");
syncDatabase().catch(error => { console.error("Falha na migração:", error.name); process.exitCode = 1; }).finally(() => sequelize.close());
