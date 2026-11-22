const { connectWithRetry, sequelize } = require("../config/database");
const { Participante, Educador, syncDatabase } = require("../models");

const educadores = [
  { nome: "Marina Costa (Teste)", email: "marina.costa@validacao.example", contato: "(11) 90000-0101" },
  { nome: "Rafael Nunes (Teste)", email: "rafael.nunes@validacao.example", contato: "(11) 90000-0102" },
  { nome: "Bianca Alves (Teste)", email: "bianca.alves@validacao.example", contato: "(11) 90000-0103" },
];

const participantes = [
  ["Ana Clara Souza (Teste)", "ana.clara@alunos.validacao.example", "2013-04-12", "Capoeira", "aprovado"],
  ["Bruno Martins (Teste)", "bruno.martins@alunos.validacao.example", "2011-09-23", "Fitdance", "pendente"],
  ["Camila Oliveira (Teste)", "camila.oliveira@alunos.validacao.example", "2015-01-08", "Ballet", "aprovado"],
  ["Daniel Ferreira (Teste)", "daniel.ferreira@alunos.validacao.example", "2009-06-17", "Capoeira", "recusado"],
  ["Elisa Rodrigues (Teste)", "elisa.rodrigues@alunos.validacao.example", "2012-11-02", "Horta Orgânica", "pendente"],
  ["Felipe Gomes (Teste)", "felipe.gomes@alunos.validacao.example", "2014-02-26", "Cine Quebrada", "aprovado"],
  ["Gabriela Lima (Teste)", "gabriela.lima@alunos.validacao.example", "2010-08-14", "Fitdance", "pendente"],
  ["Heitor Barros (Teste)", "heitor.barros@alunos.validacao.example", "2016-05-30", "Ballet", "aprovado"],
  ["Isabela Rocha (Teste)", "isabela.rocha@alunos.validacao.example", "2013-12-05", "Capoeira", "pendente"],
  ["João Pedro Santos (Teste)", "joao.pedro@alunos.validacao.example", "2011-03-19", "Horta Orgânica", "recusado"],
  ["Larissa Mendes (Teste)", "larissa.mendes@alunos.validacao.example", "2015-07-21", "Cine Quebrada", "aprovado"],
  ["Miguel Azevedo (Teste)", "miguel.azevedo@alunos.validacao.example", "2012-10-11", "Fitdance", "pendente"],
].map(([nome, email, dataNascimento, atividadeInteresse, status], index) => ({
  nome,
  email,
  dataNascimento,
  celular: `(11) 90000-${String(2000 + index).slice(-4)}`,
  cep: "00000-000",
  bairro: "Bairro de Teste",
  logradouro: `Rua Fictícia ${index + 1}`,
  numero: String(index + 1),
  genero: "Não informado",
  responsavelNome: "Responsável Fictício",
  responsavelTelefone: "(11) 90000-0000",
  atividadeInteresse,
  status,
  ativo: true,
}));

async function main() {
  await connectWithRetry();
  await syncDatabase();
  let educadoresCriados = 0;
  let participantesCriados = 0;
  for (const dados of educadores) {
    const [, criado] = await Educador.findOrCreate({ where: { email: dados.email }, defaults: dados });
    if (criado) educadoresCriados += 1;
  }
  for (const dados of participantes) {
    const [, criado] = await Participante.findOrCreate({ where: { email: dados.email }, defaults: dados });
    if (criado) participantesCriados += 1;
  }
  console.log(`Carga de validação concluída: ${participantesCriados} alunos e ${educadoresCriados} educadores adicionados.`);
}

main().catch((error) => {
  console.error(`Falha ao criar dados de validação: ${error.message}`);
  process.exitCode = 1;
}).finally(() => sequelize.close());
