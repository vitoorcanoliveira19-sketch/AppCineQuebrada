# NovoApp

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

- `POST /auth/login`: autentica por email e senha e devolve JWT válido por 8 horas.
- `GET /auth/me`: valida a sessão e retorna o perfil, sem campos de senha.
- `GET /admin/participantes`: consulta protegida para administrador e educador.
- `PATCH /admin/participantes/:id/status`: somente administrador.
- `POST /admin/educadores`: somente administrador; cria conta de acesso para educador com senha de pelo menos 12 caracteres.
- `GET /admin/cadastros/atividades`, `GET /admin/cadastros/atividades/:id`, `POST /admin/cadastros/atividades`, `PUT /admin/cadastros/atividades/:id` e `PATCH /admin/cadastros/atividades/:id`: cadastro administrativo com nome, descrição e campo `ativa`.
- `GET /admin/cadastros/salas`, `GET /admin/cadastros/salas/:id`, `POST /admin/cadastros/salas`, `PUT /admin/cadastros/salas/:id` e `PATCH /admin/cadastros/salas/:id`: cadastro administrativo com nome/identificação e campo `ativa`.
- `GET /admin/cadastros/educadores`, `GET /admin/cadastros/educadores/:id`, `POST /admin/cadastros/educadores`, `PUT /admin/cadastros/educadores/:id` e `PATCH /admin/cadastros/educadores/:id`: cadastro de equipe com nome, email, contato e campo `ativo`.

Os cadastros em `/admin/cadastros` aceitam consulta de administrador e educador autenticados; criação, edição e alteração de situação ficam restritas ao administrador. Use `PATCH` com `{ "ativa": false }` para atividades/salas ou `{ "ativo": false }` para educadores para inativar sem excluir. Nomes de atividades e salas, e emails de educadores, são únicos no banco. O app oferece a tela **Cadastros** na área administrativa da equipe e apresenta erros de campo retornados pelo servidor.

### Turmas administrativas

Todas as rotas `/admin/turmas` exigem JWT de equipe. Administradores e educadores podem consultar (`GET /admin/turmas` e `GET /admin/turmas/:id`); somente administradores podem criar (`POST /admin/turmas`), editar (`PUT /admin/turmas/:id`) e alterar situação (`PATCH /admin/turmas/:id`). O PATCH recebe `{ "ativa": false }` para inativar e `true` para reativar.

Criação e edição recebem `nome` (2–120 caracteres), `atividadeId`, `educadorId` e `salaId` como inteiros positivos; `ativa` é opcional na criação/edição e assume `true` por padrão. Exemplo: `{ "nome": "Capoeira · manhã", "atividadeId": 1, "educadorId": 2, "salaId": 1 }`. O servidor valida que cada vínculo existe e está ativo (`Atividade.ativa`, `Educador.ativo`, `Sala.ativa`), além de validar formato e presença dos campos. A resposta de listagem/consulta inclui `atividade`, `educador` e `sala` com `id` e `nome`. As chaves estrangeiras não permitem apagar os registros vinculados enquanto houver turmas; use inativação para preservar o histórico. A interface administrativa **Turmas** oferece seleção dos cadastros ativos existentes e não cria registros de exemplo.

A aba **Equipe** do app oferece login e saída. No iOS/Android, o token fica em `expo-secure-store`; no navegador, não é persistido. `POST /participantes` continua público para inscrições.

## Variaveis de ambiente

Arquivo: [backend/.env](C:/Users/vitoo/OneDrive/Área%20de%20Trabalho/TESTE/novoapp/backend/.env)

```env
PORT=3001
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua-senha-local-do-mysql
DB_NAME=cadastrodb
JWT_SECRET=segredo-aleatorio-com-pelo-menos-32-caracteres
```

Mantenha `JWT_SECRET` fora do repositório e use pelo menos 32 caracteres aleatórios. PowerShell pode gerar um valor com: `$bytes = New-Object byte[] 48; [Security.Cryptography.RandomNumberGenerator]::Fill($bytes); [Convert]::ToBase64String($bytes)`. Não registre o segredo em logs.

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

Depois entre no app. Administradores criam educadores por `POST /admin/educadores`, com `Authorization: Bearer <token>`. Para Kubernetes, substitua os valores de exemplo nos manifests de Secret por valores próprios antes de aplicar. `backend-secret.yaml` precisa de `JWT_SECRET`; não versione credenciais reais.

## Pre-requisitos no Windows

## GitHub

O workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) executa o lint e a checagem TypeScript do app, além de verificar a sintaxe JavaScript do backend, em pushes e pull requests para `main`.

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

No emulador Android, o app usa `10.0.2.2:3001`; no navegador e no simulador iOS, usa `localhost:3001`. Para testar em um celular fisico, configure `EXPO_PUBLIC_API_URL` no ambiente do Expo com o IP local do computador, por exemplo `http://192.168.0.10:3001`.

## Teste rapido da API

## Observacoes de arquitetura

- O backend tenta reconectar ao MySQL durante a inicializacao para tolerar o tempo de subida do banco no Kubernetes.
- Senhas são armazenadas como hash bcrypt e nunca retornadas pela API.
- Usuários existentes sem papel ficam bloqueados após a sincronização, sem privilégios automáticos.
- O campo `email` e unico no banco.
- As inscricoes publicas sao armazenadas na tabela `Participante` com status inicial `pendente`; nao representam matricula confirmada.
- O service do backend usa `NodePort` para facilitar o acesso com `minikube service backend-service`.
- O backend usa `mysql-service` como host no Kubernetes, conforme exigido.

## Arquivos principais

- [backend/server.js](C:/Users/vitoo/OneDrive/Área%20de%20Trabalho/TESTE/novoapp/backend/server.js)
- [backend/app.js](C:/Users/vitoo/OneDrive/Área%20de%20Trabalho/TESTE/novoapp/backend/app.js)
- [backend/controllers/cadastroController.js](C:/Users/vitoo/OneDrive/Área%20de%20Trabalho/TESTE/novoapp/backend/controllers/cadastroController.js)
- [backend/models/usuario.js](C:/Users/vitoo/OneDrive/Área%20de%20Trabalho/TESTE/novoapp/backend/models/usuario.js)
- [backend/models/participante.js](C:/Users/vitoo/OneDrive/Área%20de%20Trabalho/TESTE/novoapp/backend/models/participante.js)
- [setup.ps1](C:/Users/vitoo/OneDrive/Área%20de%20Trabalho/TESTE/novoapp/setup.ps1)
