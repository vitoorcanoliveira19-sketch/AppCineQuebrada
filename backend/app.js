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

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (/^https?:\/\/localhost(?::\d+)?$/.test(origin) || /^https?:\/\/127\.0\.0\.1(?::\d+)?$/.test(origin))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
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

app.use("/", cadastroRoutes);
app.use("/", participanteRoutes);
app.use("/", authRoutes);
app.use("/", cadastrosAdminRoutes);
app.use("/", turmaRoutes);
app.use("/", matriculaRoutes);
app.use("/", chamadaRoutes);
app.use(errorHandler);

module.exports = app;
