const dotenv = require("dotenv");
const app = require("./app");
const { connectWithRetry } = require("./config/database");
const { syncDatabase } = require("./models");

dotenv.config();

const PORT = process.env.PORT || 3001;

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error("JWT_SECRET deve ser configurado com pelo menos 32 caracteres.");
  process.exit(1);
}

const startServer = async () => {
  try {
    await connectWithRetry();
    await syncDatabase();

    app.listen(PORT, () => {
      console.log(`Servidor backend em execucao na porta ${PORT}.`);
    });
  } catch (error) {
    console.error("Falha ao iniciar o backend:", error.name || "Erro");
    process.exit(1);
  }
};

startServer();
