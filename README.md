# NovoApp

**QR no Expo Go SDK 58 e celular real:** siga [EXPO-GO-AGENT.md](EXPO-GO-AGENT.md). Use `npm run expo:lan -- --host IP-DO-WIFI` ou `npm run expo:tunnel -- --api https://SUA-API`. O lançador verifica a API e gera o QR em `.expo/expo-go/`.

**Atualização de segurança:** leia [SECURITY-UPGRADE.md](SECURITY-UPGRADE.md) antes de iniciar ou publicar esta revisão. Inclui migração do banco, sessões revogáveis, MFA administrativo e novos clientes Expo.

**Testes locais por enquanto:** MFA administrativo dispensado em `NODE_ENV=development` (padrão `MFA_REQUIRED=false`). Login com email e senha permanece obrigatório. Produção exige MFA e recusa essa dispensa; veja [a configuração](SECURITY-UPGRADE.md#testes-locais-com-mfa-temporariamente-dispensado).

Projeto CineQuebrada com frontend Expo/React Native e backend Node.js/Express com persistencia em MySQL. O formulario publico registra pedidos de inscricao para analise da equipe.

## Estrutura

```text
novoapp/
|-- app/                    # frontend Expo ja existente
|-- backend/                # backend Node.js/Express
|   |-- config/
|   |-- controllers/
|   |-- models/
|   |-- routes/
|   |-- middlewares/
|   |-- .env
|   |-- Dockerfile
|   `-- server.js
|-- setup.ps1              # verifica e prepara Windows + Minikube
|-- backend-*.yaml         # manifests do backend
|-- mysql-*.yaml           # manifests do MySQL
`-- README.md
```

## Backend

Tecnologias utilizadas:

- Node.js com Express
- Sequelize
- MySQL
- bcrypt

### Endpoint principal

`POST /participantes` recebe uma inscricao publica e cria o registro com status `pendente`.

```json
{
  "nome": "Maria da Silva",
  "dataNascimento": "2012-08-14",
  "email": "maria@email.com",
  "celular": "11999990000",
  "cep": "01000-000",
  "bairro": "Centro",
  "logradouro": "Rua das Flores",
  "numero": "123",
  "responsavelNome": "Ana da Silva",
  "responsavelTelefone": "11988887777",
  "atividadeInteresse": "Capoeira"
}
```

O endpoint legado `POST /cadastro` responde `410 Gone`. Contas internas não podem ser criadas publicamente.

### Acesso interno

- `POST /auth/login`: autentica por email e senha e cria uma sessão revogável de até 8 horas (2 horas de inatividade); web usa cookie HttpOnly e aplicativos usam Bearer no SecureStore.
- `GET /auth/me`: valida a sessão e retorna o perfil, sem campos de senha.
- `GET /admin/participantes`: consulta protegida somente para administrador, pois inclui dados pessoais de participantes.
- `PATCH /admin/participantes/:id/status`: somente administrador.
- `POST /admin/educadores`: somente administrador; cria conta de acesso para educador com senha de pelo menos 12 caracteres.
- `GET /admin/cadastros/atividades`, `GET /admin/cadastros/atividades/:id`, `POST /admin/cadastros/atividades`, `PUT /admin/cadastros/atividades/:id` e `PATCH /admin/cadastros/atividades/:id`: cadastro administrativo com nome, descrição e campo `ativa`.
- `GET /admin/cadastros/salas`, `GET /admin/cadastros/salas/:id`, `POST /admin/cadastros/salas`, `PUT /admin/cadastros/salas/:id` e `PATCH /admin/cadastros/salas/:id`: cadastro administrativo com nome/identificação e campo `ativa`.
- `GET /admin/cadastros/educadores`, `GET /admin/cadastros/educadores/:id`, `POST /admin/cadastros/educadores`, `PUT /admin/cadastros/educadores/:id` e `PATCH /admin/cadastros/educadores/:id`: cadastro de equipe com nome, email, contato e campo `ativo`.

Os cadastros em `/admin/cadastros` aceitam consulta de administrador e educador autenticados; criação, edição e alteração de situação ficam restritas ao administrador. Educadores veem somente nome e situação dos registros de equipe. Use `PATCH` com `{ "ativa": false }` para atividades/salas ou `{ "ativo": false }` para educadores para inativar sem excluir. Nomes de atividades e salas, e emails de educadores, são únicos no banco. O app oferece a tela **Cadastros** na área administrativa da equipe e apresenta erros de campo retornados pelo servidor.

### Turmas administrativas

Todas as rotas `/admin/turmas` exigem sessão autenticada de equipe. Administradores e educadores podem consultar (`GET /admin/turmas` e `GET /admin/turmas/:id`); somente administradores podem criar (`POST /admin/turmas`), editar (`PUT /admin/turmas/:id`) e alterar situação (`PATCH /admin/turmas/:id`). O PATCH recebe `{ "ativa": false }` para inativar e `true` para reativar.

Criação e edição recebem `nome` (2–120 caracteres), `atividadeId`, `educadorId` e `salaId` como inteiros positivos; `ativa` é opcional na criação/edição e assume `true` por padrão. Exemplo: `{ "nome": "Capoeira · manhã", "atividadeId": 1, "educadorId": 2, "salaId": 1 }`. O servidor valida que cada vínculo existe e está ativo (`Atividade.ativa`, `Educador.ativo`, `Sala.ativa`), além de validar formato e presença dos campos. A resposta de listagem/consulta inclui `atividade`, `educador` e `sala` com `id` e `nome`. As chaves estrangeiras não permitem apagar os registros vinculados enquanto houver turmas; use inativação para preservar o histórico. A interface administrativa **Turmas** oferece seleção dos cadastros ativos existentes e não cria registros de exemplo.

A aba **Equipe** do app oferece login e saída. No iOS/Android, o token fica em `expo-secure-store`; no navegador, usa cookie HttpOnly e não armazena credenciais em localStorage/sessionStorage. `POST /participantes` continua público para inscrições.

## Variaveis de ambiente

Arquivo: [backend/.env](C:/Users/vitoo/OneDrive/Área%20de%20Trabalho/TESTE/novoapp/backend/.env)

```env
PORT=3001
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua-senha-local-do-mysql
DB_NAME=cadastrodb
SESSION_SECRET=segredo-aleatorio-com-pelo-menos-32-caracteres
```

Mantenha `SESSION_SECRET` fora do repositório e use pelo menos 32 caracteres aleatórios. PowerShell pode gerar um valor com: `$bytes = New-Object byte[] 48; [Security.Cryptography.RandomNumberGenerator]::Fill($bytes); [Convert]::ToBase64String($bytes)`. Não registre o segredo em logs.

O backend falha na inicialização se faltar uma variável de banco ou se `SESSION_SECRET` tiver menos de 32 caracteres. O corpo JSON da API é limitado a 32 KB. Em produção, configure `NODE_ENV=production` no ambiente do container. Configure WEB_ORIGINS com as origens HTTPS exatas e MFA_ENCRYPTION_KEY em produção; veja SECURITY-UPGRADE.md para cookies/CSRF e migração.

### Primeiro administrador

Com o MySQL disponível e as variáveis de conexão configuradas, rode uma vez no PowerShell, dentro de `backend`. O script recusa a criação quando já existe um administrador e gera hash bcrypt. Nenhuma senha fixa é usada ou armazenada no repositório:

```powershell
$env:ADMIN_NAME = Read-Host "Nome do administrador"
$env:ADMIN_EMAIL = Read-Host "Email do administrador"
$secure = Read-Host "Senha inicial (mínimo 12 caracteres)" -AsSecureString
$env:ADMIN_PASSWORD = [Net.NetworkCredential]::new("", $secure).Password
npm run bootstrap-admin
Remove-Item Env:ADMIN_NAME, Env:ADMIN_EMAIL, Env:ADMIN_PASSWORD
```

Depois entre no app. Administradores criam educadores por `POST /admin/educadores`, com `Authorization: Bearer <token>`. Para Kubernetes, substitua os valores de exemplo nos manifests de Secret por valores próprios antes de aplicar. `backend-secret.yaml` precisa de `SESSION_SECRET`; não versione credenciais reais.

## Pre-requisitos no Windows

## GitHub

O workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) executa o lint e a checagem TypeScript do app, testes de autenticação, bundles e auditoria de dependências, além de testes de segurança do backend com MySQL descartável, em pushes e pull requests para `main`.

Para publicar este projeto em um repositório GitHub novo, crie um repositório vazio no GitHub e execute na pasta `novoapp`:

```powershell
git init
git add .
git commit -m "Configura projeto e CI"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git push -u origin main
```

Troque a URL pelo endereço do seu repositório. O arquivo `backend/.env` está ignorado pelo Git; mantenha credenciais reais fora do repositório e substitua os valores de exemplo nos manifests Kubernetes antes de usá-los.

O script [setup.ps1](C:/Users/vitoo/OneDrive/Área%20de%20Trabalho/TESTE/novoapp/setup.ps1) faz:

- verificacao do Windows 10 ou superior
- validacao de virtualizacao
- verificacao de Node.js
- verificacao de Docker Desktop
- verificacao de Minikube
- verificacao de kubectl
- tentativa de instalacao via `winget` quando possivel
- validacao do Docker em execucao
- inicializacao do Minikube com driver Docker
- configuracao do Docker do Minikube
- validacao do cluster com `kubectl get nodes`
- instalacao das dependencias do backend com `npm install`

Links oficiais usados pelo script quando houver instalacao manual:

- Node.js: [nodejs.org](https://nodejs.org/en/download)
- Docker Desktop: [docker.com](https://www.docker.com/products/docker-desktop/)
- Minikube: [minikube.sigs.k8s.io](https://minikube.sigs.k8s.io/docs/start/)
- kubectl: [kubernetes.io](https://kubernetes.io/docs/tasks/tools/install-kubectl-windows/)

## Como executar

### 1. Preparar o ambiente Windows

No PowerShell, dentro da pasta do projeto:

```powershell
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```

### 2. Build da imagem dentro do Minikube

Depois que o script configurar o `docker-env` do Minikube:

```powershell
cd .\backend
docker build -t cadastro-backend:latest .
cd ..
```

### 3. Aplicar os manifests Kubernetes

```powershell
kubectl apply -f .
```

### 4. Verificar os recursos

```powershell
kubectl get pods
kubectl get services
```

### 5. Expor o backend

```powershell
minikube service backend-service
```

## Execucao local do backend sem Kubernetes

Se voce ja tiver um MySQL local rodando com as mesmas credenciais do `.env`:

```powershell
cd .\backend
npm install
npm start
```

Health check:

```text
GET http://localhost:3001/health
```

Login interno:

```text
POST http://localhost:3001/auth/login
```

Inscricao publica:

```text
POST http://localhost:3001/participantes
```

Para testar em celular físico, siga [EXPO-GO-AGENT.md](EXPO-GO-AGENT.md). O lançador LAN usa o IP do computador e verifica a API antes de gerar o QR. O fallback `10.0.2.2:3001` fica restrito ao emulador Android; aparelhos físicos recusam esse endereço.

## Teste rapido da API

## Observacoes de arquitetura

- O backend tenta reconectar ao MySQL durante a inicializacao para tolerar o tempo de subida do banco no Kubernetes.
- As sessões são revalidadas contra o usuário atual em cada requisição autenticada; bloquear ou mudar o papel da conta revoga o acesso sem aguardar o token expirar. Alterações em atividades, salas, educadores e turmas são exclusivas de administrador; educadores só consultam as próprias turmas e não recebem email/contato dos demais educadores nas consultas de cadastro.
- Respostas de erro não incluem mensagem interna do driver, SQL, valores rejeitados ou corpo da requisição. Logs registram método, caminho e classe do erro, sem conteúdo pessoal da inscrição.
- Há uma migração aditiva de autenticação; execute `npm run migrate`. Em produção, a inicialização verifica a migração e não modifica o schema. O sincronismo de desenvolvimento não usa `force` ou `alter`. Faça backup antes de qualquer mudança de schema e não use opções destrutivas de sincronização. As colunas legadas `Participante.ativo`, `analisado_em` e `analisado_por_id` continuam sendo acrescentadas de forma aditiva quando ausentes.
- Senhas são armazenadas como hash bcrypt e nunca retornadas pela API.
- Usuários existentes sem papel ficam bloqueados após a sincronização, sem privilégios automáticos.
- O campo `email` e unico no banco.
- As inscricoes publicas sao armazenadas na tabela `Participante` com status inicial `pendente`; nao representam matricula confirmada.
- Matriculas sao registros administrativos separados da inscricao de interesse. Apenas participantes aprovados e ativos podem ser matriculados em turmas ativas; a API de matriculas exige o papel `administrador`.
- A regra de duplicidade permite no maximo uma matricula com situacao `ativa` para o mesmo par participante/turma. Matriculas encerradas permanecem no historico; uma nova matricula pode ser criada depois do encerramento. A reativacao tambem verifica a regra de duplicidade e a elegibilidade atual.
- A entidade `Matricula` possui os campos `id`, `participanteId`, `turmaId`, `situacao` (`ativa` ou `encerrada`), `matriculadaEm`, `encerradaEm`, `createdAt` e `updatedAt`. As chaves estrangeiras usam as colunas `participante_id` e `turma_id`; a data de encerramento fica nula enquanto ativa.
- Endpoints administrativos: `GET /admin/matriculas` (filtros opcionais `participanteId`, `turmaId`, `situacao`), `POST /admin/matriculas` (`participanteId`, `turmaId`) e `PATCH /admin/matriculas/:id/situacao` (`situacao`).
- Frequência: `GET /chamadas/turmas` lista as turmas disponíveis para o usuário autenticado; `GET /chamadas?turmaId=ID&data=AAAA-MM-DD` carrega a chamada e as matrículas ativas; `PUT /chamadas` recebe `{ turmaId, dataAula, presencas: [{ matriculaId, situacao }] }`. Educadores só acessam turmas cujo educador cadastrado tem o mesmo e-mail da conta autenticada; administradores podem acessar todas. O servidor confere turma autorizada, data válida e a correspondência integral com as matrículas ativas de participantes aprovados e ativos.
- Histórico de frequência (RF08): `GET /chamadas/participantes` lista participantes com matrícula nas turmas acessíveis; `GET /chamadas/historico?turmaId=ID` ou `?participanteId=ID` consulta o histórico, aceitando `de=AAAA-MM-DD` e `ate=AAAA-MM-DD` opcionais (inclusivos). Pode combinar turma e participante e deve informar ao menos um deles. A resposta inclui data, atividade, turma, participante, situação e totais. Educadores só consultam registros das próprias turmas; administradores consultam todas as turmas. A tela **Histórico de frequência** fica na área da equipe.
- O histórico consulta somente presenças associadas a chamadas e limita a consulta por turma/participante, autorização e intervalo de datas no banco; não carrega todas as chamadas da ONG. Os totais contam marcações `presente` e `ausente` existentes no resultado filtrado. Chamadas ainda não salvas não aparecem e não são computadas como faltas; portanto os totais descrevem apenas registros já gravados, não um fechamento oficial de frequência. Consultar não altera chamadas nem presenças. Intervalos devem usar `AAAA-MM-DD`, com data inicial anterior ou igual à final.
- Uma chamada por turma e data: a restrição única no banco impede duplicidade mesmo em gravações simultâneas. `PUT` cria quando não existe e atualiza a chamada existente quando a pessoa tem permissão para aquela turma; em duplicidade concorrente retorna HTTP 409 para recarregar e editar o registro existente. A atualização substitui as marcações em uma transação.
- A frequência registra somente `presente` ou `ausente`; não foi incluída outra situação. A tela só exibe confirmação de gravação depois de resposta de sucesso do backend e limpa a chamada carregada se o salvamento falhar.
- O service do backend usa `NodePort` para facilitar o acesso com `minikube service backend-service`.
- O backend usa `mysql-service` como host no Kubernetes, conforme exigido.

## Arquivos principais

- [backend/server.js](C:/Users/vitoo/OneDrive/Área%20de%20Trabalho/TESTE/novoapp/backend/server.js)
- [backend/app.js](C:/Users/vitoo/OneDrive/Área%20de%20Trabalho/TESTE/novoapp/backend/app.js)
- [backend/controllers/cadastroController.js](C:/Users/vitoo/OneDrive/Área%20de%20Trabalho/TESTE/novoapp/backend/controllers/cadastroController.js)
- [backend/models/usuario.js](C:/Users/vitoo/OneDrive/Área%20de%20Trabalho/TESTE/novoapp/backend/models/usuario.js)
- [backend/models/participante.js](C:/Users/vitoo/OneDrive/Área%20de%20Trabalho/TESTE/novoapp/backend/models/participante.js)
- [setup.ps1](C:/Users/vitoo/OneDrive/Área%20de%20Trabalho/TESTE/novoapp/setup.ps1)

## Validação com a equipe da ONG

Este roteiro prepara uma validação local. Não representa aprovação da ONG nem publicação/implantação. Os comandos de Kubernetes e GitHub acima são referências existentes; não os execute como parte da validação sem antes substituir os placeholders e confirmar o ambiente de destino.

### Ambiente local reproduzível (Windows/PowerShell)

Pré-requisitos: Node.js 22.23.1 (alinhado ao CI e Docker), npm, Docker Desktop em execução e Expo Go ou um emulador instalado. O MySQL deste roteiro roda em container local; não é necessário Minikube para validar o app.

1. Na raiz `novoapp`, instale dependências travadas pelo lockfile:

   ```powershell
   npm ci
   Push-Location .\backend
   npm ci
   Pop-Location
   ```

2. Inicie um banco descartável de desenvolvimento. A senha abaixo é apenas um valor local de exemplo; não a reutilize fora desta máquina. O volume nomeado preserva o banco entre reinícios. Para reiniciar uma instância já criada: `docker start novoapp-mysql`.

   ```powershell
   docker run --name novoapp-mysql -e MYSQL_ROOT_PASSWORD=local-only-change-me -e MYSQL_DATABASE=cadastrodb -p 3306:3306 -v novoapp-mysql-data:/var/lib/mysql -d mysql:8.0
   ```

   Aguarde o MySQL aceitar conexões:

   ```powershell
   do { Start-Sleep -Seconds 2; docker exec novoapp-mysql mysqladmin ping -h 127.0.0.1 --silent } until ($LASTEXITCODE -eq 0)
   ```

3. Crie a configuração local ignorada pelo Git:

   ```powershell
   Copy-Item .\backend\.env.example .\backend\.env
   ```

   Edite `backend/.env`, ajuste `DB_PASSWORD` para o valor local usado acima e substitua `SESSION_SECRET` por um valor aleatório local de pelo menos 32 caracteres. Para gerar um segredo no PowerShell sem fixá-lo no projeto:

   ```powershell
   $bytes = New-Object byte[] 48
   [Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
   [Convert]::ToBase64String($bytes)
   ```

   Cole o resultado somente no `backend/.env` local. Não o compartilhe nem o comite. O exemplo já inclui as chaves obrigatórias `PORT`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` e `SESSION_SECRET`.

4. Em um PowerShell, inicie a API:

   ```powershell
   Push-Location .\backend
   npm start
   ```

   Aguarde a mensagem de conexão ao MySQL e consulte `http://localhost:3001/ready`; deve responder HTTP 200 após conferir banco e migração. Mantenha essa janela aberta.

5. Em outro PowerShell na raiz, inicie o Expo:

   ```powershell
   npx expo start
   ```

   Use `a` para abrir no emulador Android ou `i` no simulador iOS em macOS. Para celular físico, use `npm run expo:lan -- --host IP-DO-WIFI` e siga [EXPO-GO-AGENT.md](EXPO-GO-AGENT.md), incluindo a validação da API pelo telefone. Se alterar `EXPO_PUBLIC_API_URL`, reinicie o Expo com `--clear` para incorporar a variável.

6. Para criar o primeiro usuário administrador de validação, use o procedimento **Primeiro administrador** acima, na mesma janela/configuração do backend e com valores de teste fornecidos pela equipe. A API não cria credenciais iniciais automaticamente. Não cadastre dados pessoais reais sem autorização e combinação prévia sobre ambiente, retenção e descarte.

Para encerrar, pare API/Expo com Ctrl+C. O banco pode ser parado com `docker stop novoapp-mysql`. Não remova o volume se precisar preservar dados de validação; qualquer limpeza de dados deve ser combinada com a equipe.

### Endereço da API no app

Em desenvolvimento, `services/api.ts` usa `EXPO_PUBLIC_API_URL` quando definida. Sem ela, usa o IP privado do manifesto Expo na LAN; no web, o hostname da página. Os fallbacks locais só são usados em emuladores/simuladores sem host LAN. `EXPO_PUBLIC_API_PORT` permite alterar a porta padrão 3001. Em builds publicados, `EXPO_PUBLIC_API_URL` HTTPS é obrigatória. Essas variáveis são públicas e embutidas no bundle: nunca coloque segredos nelas.

- **Emulador Android padrão:** quando não há host LAN no manifesto, `10.0.2.2` aponta para o computador hospedeiro.
- **Simulador iOS:** quando não há host LAN, `localhost` aponta para o computador do simulador.
- **Celular físico na mesma rede:** execute `npm run expo:lan -- --host IP-DO-WIFI`; o script fixa o IP correto e verifica API/banco. Libere somente as portas necessárias para a sub-rede privada, se autorizado. Valide `/ready` também no telefone.
- **Celular físico em outra rede:** execute `npm run expo:tunnel -- --api https://SUA-API`. O túnel do Expo entrega o aplicativo; a API precisa de sua própria URL HTTPS pública.
- **Web em dispositivo/navegador:** configure `WEB_ORIGINS` no backend com a origem exata aprovada. Localhost/127.0.0.1 são aceitos automaticamente apenas em desenvolvimento.

O endereço HTTP e os defaults são para desenvolvimento local. Uma publicação requer endereço HTTPS e configuração de acesso aprovada; nenhum endpoint de produção foi fornecido ou configurado nesta revisão.

### Roteiro de fluxos para validação

Para o passo a passo detalhado, incluindo preparação dos registros de teste e resultados esperados, consulte o [Guia de testes das implementações recentes](GUIA_TESTES_IMPLEMENTACOES.md).

Use contas e registros fictícios combinados para o teste, em banco local isolado. Registre resultado, plataforma, papel da conta e passos para reproduzir falhas; não interprete dados criados como dados reais da ONG.

1. **Login e sessão:** login de administrador e educador, perfil, saída, persistência do token em Android/iOS e comportamento no navegador; confirme bloqueio de rotas administrativas para educador.
2. **Inscrição:** envio válido, validações de campos, requisitos de responsável para menor, confirmação e criação com status pendente; confira erros de rede/API.
3. **Análise:** listar e filtrar pendentes, aprovar/recusar, editar dados e inativar participante; verificar permissões de papel.
4. **Cadastros:** consultar/criar/editar/inativar atividades, salas e educadores; validar unicidade, erros de formulário e o que educadores podem consultar.
5. **Turmas e matrícula:** relacionar somente cadastros ativos, criar/editar/inativar turma; matricular participante aprovado/ativo, impedir duplicidade ativa, encerrar e consultar matrícula.
6. **Chamada:** selecionar turma/data, carregar matrículas elegíveis, marcar presente/ausente, salvar, reabrir/editar a mesma chamada e verificar restrições do educador às próprias turmas.
7. **Histórico:** consultar por turma e participante, aplicar datas inclusivas, conferir registros/totais, autorização do educador e mensagem de período sem chamada salva.

### Configuração de produção e segredos: revisão estática

- `backend/.env` é ignorado pelo Git e não está listado como arquivo rastreado. O `.env.example` contém nomes de variáveis e placeholders, sem credenciais de produção. Não imprima nem copie valores do `.env` local para registros ou documentação.
- `backend-secret.yaml` e `mysql-secret.yaml` contêm apenas strings `REPLACE_WITH_...`; são placeholders e não devem ser aplicados sem substituição local segura. Secrets Kubernetes em YAML não são, por si só, um cofre de segredos. Gere credenciais próprias fora do Git e use o mecanismo de segredos aprovado para o ambiente futuro.
- O backend exige `SESSION_SECRET` com pelo menos 32 caracteres e variáveis de conexão MySQL. O Deployment Minikube é explicitamente de desenvolvimento; o Dockerfile usa `NODE_ENV=production` e exige configuração própria; o app Expo não possui `eas.json`, perfis de build ou URL de API de produção nesta árvore. Não há domínio, TLS/ingress, pipeline de publicação móvel, política de backup/restore ou procedimento de migração formal configurados aqui.
- `backend/Dockerfile` usa Node 20 Alpine e instala dependências; o manifest MySQL usa a tag `mysql:8.0`. Imagens, versões, atualização e armazenamento precisam de política para um ambiente publicado.
- CORS permite WEB_ORIGINS exatas e localhost/127.0.0.1 apenas em desenvolvimento; o endpoint público de inscrição é intencionalmente aberto e recebe dados pessoais. Antes de qualquer exposição externa, a ONG precisa revisar domínio, TLS, acesso, privacidade, retenção, backup, monitoramento e resposta a incidentes.
- Em desenvolvimento, a inicialização chama `sequelize.sync()` e aplica a migração aditiva; em produção, exige `npm run migrate` prévio. A documentação do projeto registra alterações aditivas de schema; isso não substitui ensaio de migração e backup/restore antes de dados persistentes.

Esta é uma leitura dos arquivos locais, não uma auditoria de segurança nem uma validação do ambiente remoto.

### Decisões a confirmar com a ONG

- Quais plataformas/dispositivos e versões serão usados na validação; quem fornece as contas fictícias e aprova os resultados.
- Campos e regras do formulário, atividades oferecidas, elegibilidade, papéis e permissões, especialmente o que cada educador pode ver/editar.
- Se chamada incompleta deve ser permitida e como interpretar faltas: hoje o histórico conta somente marcações salvas e não considera aula sem chamada como ausência.
- Se `presente`/`ausente`, uma chamada por turma/data, encerramento/reativação de matrícula e filtros atuais correspondem ao processo da equipe.
- Ambiente futuro de publicação, domínio/HTTPS, provedor, responsáveis por segredos, backup, retenção/exclusão de dados pessoais, suporte e processo de atualização. Nenhuma dessas escolhas foi fornecida ou aprovada.

### Verificações locais executadas

Executadas nesta cópia em 15/11/2026; são verificações estáticas e não substituem o roteiro funcional com a ONG:

- `npm run lint` — passou sem erros; reportou 7 avisos ESLint (imports duplicados, expressão sem efeito, dependências de hooks e variáveis não usadas).
- `npx tsc --noEmit` — passou, sem erros.
- `node --check` em todos os arquivos `.js` do backend fora de `node_modules` — passou, sem erros de sintaxe.
- Não há script de testes automatizados nos `package.json`; não foram executados testes de integração/fluxos com banco. Não houve publicação nem implantação.
