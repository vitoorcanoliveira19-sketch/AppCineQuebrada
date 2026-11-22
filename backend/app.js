const express = require("express");
const cadastroRoutes = require("./routes/cadastroRoutes");
const errorHandler = require("./middlewares/errorHandler");
const participanteRoutes = require("./routes/participanteRoutes");
const authRoutes = require("./routes/authRoutes");
const cadastrosAdminRoutes = require("./routes/cadastrosAdminRoutes");
const turmaRoutes = require("./routes/turmaRoutes");
const matriculaRoutes = require("./routes/matriculaRoutes");
const chamadaRoutes = require("./routes/chamadaRoutes");

const app = express();

const { originAllowed } = require("./config/security");
app.disable("x-powered-by");
if (process.env.TRUST_PROXY) app.set("trust proxy", process.env.TRUST_PROXY.split(",").map(v => v.trim()));
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Vary", "Origin");
    if (!originAllowed(origin)) return res.status(403).json({ sucesso: false, mensagem: "Origem não permitida." });
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-CSRF-Token");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: "32kb" }));

app.get("/health", (req, res) => {
  res.status(200).json({
    sucesso: true,
    mensagem: "API em execucao.",
  });
});

app.get("/ready", async (_req, res) => {
  try {
    const { sequelize } = require("./models");
    await sequelize.authenticate();
    await require("./migrations/security").verificar(sequelize);
    return res.json({ sucesso: true, mensagem: "API e banco prontos." });
  } catch {
    return res.status(503).json({ sucesso: false, mensagem: "API ainda não está pronta. Confira banco e migração no servidor." });
  }
});

app.use("/", cadastroRoutes);
app.use("/participantes", require("./middlewares/rateLimit").inscricao);
app.use("/", participanteRoutes);
app.use("/", authRoutes);
app.use("/", cadastrosAdminRoutes);
app.use("/", turmaRoutes);
app.use("/", matriculaRoutes);
app.use("/", chamadaRoutes);
app.use(errorHandler);

module.exports = app;
