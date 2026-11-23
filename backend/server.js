const dotenv = require("dotenv");
const app = require("./app");
const { connectWithRetry } = require("./config/database");
const { syncDatabase } = require("./models");

dotenv.config();

const PORT = process.env.PORT || 3001;
const BIND_HOST = process.env.BIND_HOST || "0.0.0.0";

const { validateSecurityConfig, mfaRequired } = require("./config/security");
validateSecurityConfig();

const startServer = async () => {
  try {
    await connectWithRetry();
    if (process.env.NODE_ENV === "production") await require("./migrations/security").verificar(require("./models").sequelize);
    else await syncDatabase();
    await require("./services/sessions").limparExpiradas();

    app.listen(PORT, BIND_HOST, () => {
      console.log(`Servidor backend em execucao na porta ${PORT}.`);
      console.log(mfaRequired() ? "MFA administrativo: obrigatório." : "MFA administrativo: desabilitado temporariamente para testes locais (development).");
    });
  } catch (error) {
    console.error("Falha ao iniciar o backend:", error.name || "Erro");
    process.exit(1);
  }
};

startServer();
