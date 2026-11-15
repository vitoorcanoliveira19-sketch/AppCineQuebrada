const dotenv = require("dotenv");
const app = require("./app");
const { connectWithRetry } = require("./config/database");
const { syncDatabase } = require("./models");

dotenv.config();

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    await connectWithRetry();
    await syncDatabase();

    app.listen(PORT, () => {
      console.log(`Servidor backend em execucao na porta ${PORT}.`);
    });
  } catch (error) {
    console.error("Falha ao iniciar o backend:", error.message);
    process.exit(1);
  }
};

startServer();
