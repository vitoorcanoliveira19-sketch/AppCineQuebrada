const dotenv = require("dotenv");
const app = require("./app");
const { connectWithRetry } = require("./config/database");
const { syncDatabase } = require("./models");

dotenv.config();

const PORT = process.env.PORT || 3001;

require("./config/security").validateSecurityConfig();

const startServer = async () => {
  try {
    await connectWithRetry();
    if (process.env.NODE_ENV === "production") await require("./migrations/security").verificar(require("./models").sequelize);
    else await syncDatabase();
    await require("./services/sessions").limparExpiradas();

    app.listen(PORT, () => {
      console.log(`Servidor backend em execucao na porta ${PORT}.`);
    });
  } catch (error) {
    console.error("Falha ao iniciar o backend:", error.name || "Erro");
    process.exit(1);
  }
};

startServer();
