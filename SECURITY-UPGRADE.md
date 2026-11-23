# Segurança: etapas 1 a 3

Base atualizada de `main`: `68c2816`. Estas mudanças implementam autorização, atualização de runtime/dependências e ciclo de vida das sessões. Também incluem limites de tentativas para login, senha e inscrições. O MFA foi removido por solicitação do responsável; a autenticação usa email e senha em todos os ambientes.

## Atualização de uma instalação existente

1. Use Node.js 22.23.1. Faça backup do banco antes da atualização e ensaie a migração numa cópia sem dados reais.
2. Execute `npm ci` na raiz e em `backend`. Configure as variáveis abaixo sem versionar valores reais.
3. Com a aplicação parada, execute `npm run migrate` em `backend` usando a credencial de migração. A migração cria as tabelas de sessão/limites, acrescenta o vínculo de educador e retira os campos antigos do autenticador. Ela preserva usuários, senhas, cadastros, matrículas e chamadas.
4. Confira os vínculos de educadores. O preenchimento inicial usa apenas correspondências únicas de email normalizado. Contas sem correspondência permanecem sem acesso às turmas. Depois da migração, emails deixam de determinar autorização.
5. Inicie o backend. Em produção ele verifica a migração e não executa sincronização de schema automaticamente.
6. Publique os clientes atualizados. JWTs antigos deixam de ser aceitos: todos precisam entrar novamente. O login administrativo segue direto para a equipe após validar email e senha, inclusive em produção.

O backend continua aceitando `Authorization: Bearer <token>` nos aplicativos, mas o token agora é aleatório e revogável no servidor. A resposta web não contém token de autenticação. Clientes móveis antigos podem usar a resposta nativa para educadores, mas o aplicativo deve ser atualizado para o login sem autenticador e a revogação correta no logout. Distribua uma nova compilação nativa após atualizar o Expo; uma atualização somente de JavaScript não atualiza os módulos nativos.

## Configuração

| Variável | Finalidade |
| --- | --- |
| `SESSION_SECRET` | Segredo aleatório com pelo menos 32 caracteres para HMAC de CSRF e limites. `JWT_SECRET` é aceito temporariamente como nome legado. |
| `WEB_ORIGINS` | Origens exatas separadas por vírgula, por exemplo `https://ong.example.org`. HTTPS obrigatório em produção. |
| `NODE_ENV` | `production` na hospedagem. O manifesto Minikube continua explicitamente de desenvolvimento. |
| `TRUST_PROXY` | Opcional: endereços/sub-redes exatos dos proxies confiáveis. Não use confiança irrestrita nem exponha a porta interna diretamente. |
| `DB_PORT` | Porta do MySQL; padrão 3306. As demais variáveis de banco continuam necessárias. |
| `EXPO_PUBLIC_API_URL` | Endereço HTTPS público da API, embutido nos builds publicados. Nunca contém segredos. |

Gere SESSION_SECRET com `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64'))"`. Guarde o valor no gerenciador de segredos da hospedagem e fora do Git. Não há chave de criptografia de autenticador a configurar. A rotação de SESSION_SECRET precisa de procedimento próprio para revogar sessões e atualizar os HMACs de CSRF/limites.

**Domínios:** o site e a API devem ficar na mesma origem ou no mesmo site HTTPS para o cookie SameSite=Lax. É possível usar proxy de `/api` ou subdomínio da própria ONG. O prefixo precisa ser encaminhado corretamente para as rotas existentes. Hospedar frontend/API em sites diferentes exige rever a arquitetura de cookies; simplesmente ampliar CORS não resolve SameSite. Não usar localhost como API de um build publicado.

## Comportamento das sessões

- Validade máxima de oito horas; expiração por duas horas sem atividade autenticada. O horário de atividade é atualizado no servidor.
- Cookie web `__Host-cinequebrada` em produção: Secure, HttpOnly, SameSite=Lax e Path=/. Em desenvolvimento o cookie não exige HTTPS.
- O navegador não guarda credenciais em localStorage/sessionStorage. Remove apenas o token legado, quando presente. Após recarregar a página, `GET /auth/me` restaura o perfil e o CSRF em memória.
- Aplicativos usam SecureStore e Bearer. Apenas hashes SHA-256 dos tokens são armazenados no banco.
- `POST /auth/logout` revoga a sessão no banco. Troca/redefinição de senha e bloqueio revogam todas as sessões.
- Se logout falhar por falta de rede, a interface mostra o erro em vez de afirmar que houve revogação.
- `GET /auth/me` restaura o perfil e o CSRF, sem estado de autenticação por segundo fator.

## Remoção do autenticador em instalações existentes

O MFA foi removido integralmente: não há rotas para configurar/verificar fatores, dependência TOTP, etapa de autenticador na interface ou configuração capaz de exigi-lo. A rota `/seguranca` mantém apenas a troca de senha. Isso vale para todas as contas e ambientes, inclusive produção.

1. Pare a API antiga e faça o backup previsto acima.
2. Atualize o código e execute `npm ci` na raiz e em `backend`.
3. Dentro de `backend`, execute `npm run migrate`. A migração `002-remove-mfa` remove `mfa_secret`, `mfa_last_counter` e `mfa_recovery_codes` de Usuario, e `mfa_verificada` e `mfa_pendente` de Sessao. Ela pode ser repetida e não modifica emails, senhas, papéis, vínculos, registros ou validade das sessões.
4. Reinicie a API. Em produção, a inicialização exige que essa migração já tenha sido aplicada; em desenvolvimento, o início também aplica as migrações.
5. Reinicie Metro com `--clear` e recarregue o Expo Go/navegador para retirar a tela antiga do cache. Para os comandos completos de QR, siga EXPO-GO-AGENT.md.

Variáveis antigas `MFA_REQUIRED` e `MFA_ENCRYPTION_KEY` deixaram de ser lidas e podem ser removidas do ambiente. Elas não reativam o autenticador nem impedem a inicialização. Uma conta que tinha um fator cadastrado ou uma sessão pendente passa a usar apenas email e senha; não precisa ser recriada nem ter a senha redefinida por esse motivo.

## Recuperação de senha

Para senha esquecida, o operador com acesso autorizado ao servidor pode executar, em `backend`:

```powershell
$env:RESET_EMAIL = Read-Host "Email da conta"
$senha = Read-Host "Nova senha" -AsSecureString
$env:RESET_PASSWORD = [Net.NetworkCredential]::new("", $senha).Password
npm run reset-staff-password
Remove-Item Env:RESET_EMAIL, Env:RESET_PASSWORD
```

O comando redefine a senha e revoga todas as sessões. `reset-educator-password` continua disponível e só aceita educadores. Não há envio de email de recuperação: nenhum provedor de email foi configurado.

## Contas e vínculos

A área administrativa oferece **Gerenciar contas de acesso**. Primeiro cadastre a pessoa em **Cadastros → Educadores**; depois crie a conta selecionando esse educador. O vínculo é único e permanece estável mesmo que o email de contato ou de acesso mude.

Bloquear a conta encerra as sessões atuais; reativar exige perfil de educador ativo e novo login. Não é permitido bloquear a própria conta administrativa por essa rota. Inativar o perfil de educador nega acesso às turmas; use o bloqueio da conta para desligamento completo.

Para corrigir um vínculo legado com acesso autorizado ao servidor:

```powershell
$env:USER_EMAIL = Read-Host "Email da conta"
$env:EDUCADOR_ID = Read-Host "ID do cadastro de educador"
npm run link-educator
Remove-Item Env:USER_EMAIL, Env:EDUCADOR_ID
```

A correção revoga as sessões dessa conta e não altera cadastros de participantes.

## Limites e testes

Limites por janela fixa de 15 minutos: 10 tentativas por conta e 100 por IP no login, 10 tentativas de troca de senha por usuário e 5 inscrições públicas por IP. Contadores HMAC ficam no MySQL e são compartilhados entre processos. Exceder retorna 429 e Retry-After, sem bloqueio permanente de conta. Ajuste após observar o uso real, especialmente redes comunitárias compartilhadas. Proteção na borda/hospedagem continua pendente.

```powershell
# Raiz: autenticação do cliente, lint, tipos e bundles
npm test
npm run lint
npm run typecheck
$env:EXPO_PUBLIC_API_URL = "https://api.example.invalid" # somente compilação de teste
npx expo export --platform all
Remove-Item Env:EXPO_PUBLIC_API_URL

# Backend: MySQL local descartável, nunca banco real
$env:TEST_DB_HOST = "127.0.0.1"
$env:TEST_DB_PORT = "3306"
$env:TEST_DB_USER = "usuario-de-teste"
$env:TEST_DB_PASSWORD = "senha-do-banco-descartavel"
npm test --prefix backend
```

Os testes criam e removem apenas bancos locais com prefixo `security_test_`. Cobrem autorização, login por senha em todos os ambientes, remoção de campos legados do autenticador, CSRF/cookies, expiração/revogação, recuperação operacional, concorrência dos limites, inscrições de menores, atualização de telefone, histórico/chamadas e migração aditiva do schema anterior. O CI usa MySQL 8.0. A execução local foi feita com MariaDB 11.4.9 compatível com o driver mysql2; isso não substitui a execução CI com MySQL antes de publicar.

## Dependências e limites desta entrega

A atualização do Expo é incremental (54 → 55 → 56 → 57 → 58), incluindo adaptações de navegação, tema e tipos. Docker e CI usam Node 22.23.1; o backend instala com npm ci e roda sem root.

A exceção moderada de uuid herdado de Sequelize está documentada em [SECURITY-EXCEPTIONS.md](SECURITY-EXCEPTIONS.md). Não execute npm audit fix --force para aplicar o downgrade sugerido de Sequelize.

Builds de bundles não equivalem a testes em aparelhos nem a APK/IPA assinados. Login, recarga de sessão e navegação por Voltar foram exercitados em Chromium com o Metro de desenvolvimento, API e banco descartáveis; veja SECURITY-VALIDATION.md para os resultados atuais. A homologação em aparelhos Android/iPhone e no domínio real, a escolha da hospedagem, TLS/firewall reais, backups/restauração, política de privacidade e proteção de main continuam nas próximas etapas do plano.

Os overrides de minimatch atualizam apenas os consumidores inspecionados (fingerprint/TypeScript-ESLint e nodemon) para uma API compatível e corrigida. O frontend terminou com zero alertas npm; o backend mantém somente a exceção moderada documentada acima.
