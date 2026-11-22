const { Sequelize } = require("sequelize");
const dotenv = require("dotenv");

dotenv.config();

for (const chave of ["DB_NAME", "DB_USER", "DB_PASSWORD", "DB_HOST"]) {
  if (!process.env[chave]) throw new Error(`Variável obrigatória ausente: ${chave}`);
}

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    dialect: "mysql",
    logging: false,
    define: {
      freezeTableName: true,
      timestamps: true,
    },
  }
);

const connectWithRetry = async (retries = 10, delayInMs = 5000) => {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await sequelize.authenticate();
      console.log("Conexao com MySQL estabelecida com sucesso.");
      return;
    } catch (error) {
      console.error(`Tentativa ${attempt}/${retries} de conexao com MySQL falhou: ${error.name || "Erro"}`);

      if (attempt === retries) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, delayInMs));
    }
  }
};

module.exports = {
  sequelize,
  connectWithRetry,
};
