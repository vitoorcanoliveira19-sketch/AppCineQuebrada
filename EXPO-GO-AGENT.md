# Entrega por QR Code — Expo Go SDK 58 em celular real

Este é o procedimento para um agente disponibilizar uma sessão de desenvolvimento do CineQuebrada. Há dois serviços independentes: **Metro/Expo**, que entrega o aplicativo ao Expo Go, e **API/Express**, que atende cadastro, login e chamada. Ambos precisam ser alcançáveis pelo celular.

A versão alvo é o **SDK 58**; o número de versão comercial do aplicativo Expo Go pode ser diferente. Um QR de desenvolvimento depende dos processos em execução e não é uma publicação permanente da ONG.

## 1. Preparar e conferir o ambiente

Na raiz real do repositório AppCineQuebrada:

~~~powershell
node --version
npm ci
npm ci --prefix backend
npx expo install --check
npm test
npm run typecheck
npm run lint
~~~

Use Node 22.23.1 conforme .nvmrc e SDK 58 conforme package.json. Não faça upgrade/downgrade de SDK para contornar um aplicativo Expo Go incompatível. Confirme o suporte ao SDK 58 no próprio Expo Go antes de começar.

Instalação oficial para [Android físico, SDK 58](https://expo.dev/go?sdkVersion=58&platform=android&device=true) e [iPhone físico, SDK 58](https://expo.dev/go?sdkVersion=58&platform=ios&device=true). Se a versão instalada não aceitar o SDK, use o canal oficial indicado pela Expo para esse aparelho; não entregue um QR como se já fosse compatível.

No iPhone, o Expo CLI e o Expo Go devem estar autenticados na mesma conta Expo:

~~~powershell
npx expo whoami
npx expo login
~~~

O proprietário faz a autenticação interativa quando necessária; não pedir que envie senha/token por chat nem armazená-los no projeto. [Procedimento oficial para abrir o projeto em dispositivo real](https://docs.expo.dev/get-started/start-developing/).

## 2. Preparar o backend

Use uma base de demonstração ou o ambiente expressamente designado para o teste. Configure backend/.env a partir de backend/.env.example e siga SECURITY-UPGRADE.md para migração, segredos e contas.

**Login atual:** email e senha em todos os ambientes. O MFA foi removido por solicitação do responsável; não há token de autenticador nem variável para reativá-lo. Para instalações antigas, execute a migração descrita em SECURITY-UPGRADE.md antes de iniciar a API. Ela remove somente os campos antigos do autenticador e preserva contas, senhas e dados do projeto.

~~~powershell
# Executar os comandos do backend dentro da pasta backend
Set-Location backend
npm ci
npm run migrate
npm start
~~~

Mantenha esse terminal aberto. BIND_HOST=0.0.0.0 permite o acesso pela rede; PORT normalmente é 3001. O frontend nunca deve receber DB_PASSWORD ou SESSION_SECRET.

Não sobrescrever um .env existente, recriar o banco ou executar seed sobre dados reais. seed:validation é opcional, só para demonstração, e recusa NODE_ENV=production. Um educador precisa de cadastro ativo e vínculo com sua conta; criar só a conta não dá acesso às turmas.

Confira:

| URL relativa da API | Resultado |
| --- | --- |
| /health | HTTP 200, JSON com sucesso: true |
| /ready | HTTP 200, JSON com sucesso: true; banco e migração acessíveis |
| /auth/me, sem credencial | HTTP 401, JSON com sucesso: false |

/health sozinho não comprova que o banco está pronto. /ready deve dar 503 quando houver falha. Não retire as proteções para transformar uma falha em sucesso.

## 3. Escolher o modo de acesso

| Modo | Metro acessível por | API acessível por | Quando usar |
| --- | --- | --- | --- |
| LAN | IP do computador, normalmente porta 8081 | IP da LAN:3001 ou API HTTPS | Computador e celular na mesma rede, sem isolamento entre clientes |
| Túnel | URL pública temporária fornecida pelo Expo | **Outra URL HTTPS pública da API** | Celular em 4G/5G, outra casa ou Wi-Fi com restrições |

Em um celular, localhost é o próprio celular. 10.0.2.2 é um atalho do emulador Android, não o endereço do PC para um celular real. Um backend em 192.168.x.x não passa a funcionar pelo 4G porque o Metro ganhou um túnel.

O app usa EXPO_PUBLIC_API_URL quando informada. Em desenvolvimento LAN, também consegue aproveitar hostUri do manifesto Expo Go. Só em emuladores/simuladores permanece o fallback local. Em aparelho físico, endereços locais de emulador são recusados e o túnel exige uma API explícita. Builds publicados continuam exigindo HTTPS.

## 4. Mesmo Wi-Fi: LAN

Descubra o IPv4 da interface usada pelo computador na rede do celular. No Windows:

~~~powershell
Get-NetIPConfiguration |
  Select-Object InterfaceAlias, IPv4Address, IPv4DefaultGateway
~~~

Compare com o endereço/rede Wi-Fi exibidos nas configurações do celular. Não escolher VMware, WSL, Docker, Radmin ou VPN como se fossem a rede do telefone. Havendo mais de uma interface válida, o script exige escolha explícita.

Na raiz, substitua o IP de exemplo pelo endereço real dessa interface:

~~~powershell
npm run expo:check -- --mode lan --host 192.168.1.20
npm run expo:lan -- --host 192.168.1.20 --clear
~~~

Com API em outra porta:

~~~powershell
npm run expo:lan -- --host 192.168.1.20 --api-port 3100
~~~

Com API HTTPS já hospedada:

~~~powershell
npm run expo:lan -- --host 192.168.1.20 --api https://api.sua-ong.org
~~~

O script verifica a API real, fixa REACT_NATIVE_PACKAGER_HOSTNAME, inicia o Expo com --go --lan e obtém o link real por /_expo/open. Não constrói um QR de localhost nem deduz uma URL a partir de texto do terminal.

**Antes de escanear:** abra http://IP-DO-PC:3001/ready no navegador do celular. Só continue quando aparecer JSON com sucesso: true. Isso confirma um caminho de rede a partir do aparelho, não apenas um teste feito pelo computador.

Se a LAN falhar, confira firewall, rede convidada, isolamento de clientes e permissão de rede local no iPhone. Libere somente as portas necessárias na rede privada e para a sub-rede local, se autorizado. Não desative o firewall nem publique MySQL. Se a rede isolar clientes, use o modo túnel.

## 5. Redes diferentes: API HTTPS + túnel do Expo

Primeiro forneça uma API HTTPS que o telefone alcance fora da LAN. Pode ser um ambiente hospedado, com banco privado e configuração conforme SECURITY-UPGRADE.md.

Para uma demonstração temporária **com dados fictícios**, uma alternativa é publicar somente o backend por um Quick Tunnel do Cloudflare, após instalar cloudflared pela [documentação oficial](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/):

~~~powershell
cloudflared tunnel --url http://127.0.0.1:3001
~~~

Mantenha esse processo aberto e copie a URL HTTPS .trycloudflare.com retornada. Ela muda ao reiniciar e não tem garantia de disponibilidade. Não adicione uma tela de login HTML na frente dos endpoints nativos: a API deve continuar retornando JSON e exigindo suas próprias credenciais. Não exponha um backend com dados reais como teste improvisado.

Teste /ready nessa URL a partir do celular **com o Wi-Fi desligado**. Depois, na raiz:

~~~powershell
npm run expo:check -- --mode tunnel --api https://URL-PUBLICA-DA-API
npm run expo:tunnel -- --api https://URL-PUBLICA-DA-API --clear
~~~

O segundo comando inicia o túnel **do Metro**, distinto do túnel **da API**. O SDK 58 instalado neste repositório oferece o provedor Expo e usa porta 8081 nesse fluxo. Confirme login Expo e disponibilidade do serviço se a inicialização falhar. O comando start:offline não serve para essa entrega.

Se usar um provedor de túnel alternativo manualmente, mantenha --go, API HTTPS e validações iguais; não invente o endereço do QR. Verifique a ajuda do CLI instalado. Referência geral: [Expo CLI](https://docs.expo.dev/more/expo-cli/).

## 6. Entregar o QR correto

O lançador exibe o link e cria arquivos ignorados pelo Git:

- .expo/expo-go/qr.svg — imagem do QR;
- .expo/expo-go/session.html — página local para exibir a imagem ou abrir o link;
- .expo/expo-go/session.json — modo, endereços, SDK, horário, PID do Metro e estado da sessão.

O link precisa usar exp:// ou exps:// e apontar para a sessão Expo Go. Não substituir pelo endereço do site web, /health ou por um esquema customizado de development build.

Mostre qr.svg/session.html ao usuário ou entregue o link impresso. Um caminho local HTML não vira um site público sozinho. O QR do terminal também pode ser usado. Se o usuário já está no próprio telefone, entregue também o link clicável.

Mantenha computador acordado, Metro, backend/banco e eventuais túneis ativos. Ao encerrar, avise que o QR deixou de funcionar. Não finalizar processos de outros projetos para liberar portas. A sessão JSON passa a stopped ao encerramento normal; arquivos antigos não são prova de que um servidor continua disponível.

## 7. Homologação obrigatória no aparelho

Use um aparelho físico, não Android Studio, navegador do PC ou apenas um simulador. Registre modelo/OS, SDK aceito pelo Expo Go, data, modo de rede e as operações realmente observadas.

1. No telefone, validar /ready e o QR na mesma condição de rede da entrega.
2. Abrir o app pelo Expo Go e conferir que o SDK 58 é aceito.
3. Enviar uma inscrição fictícia; conferir a resposta e o registro pendente na API.
4. Entrar com um educador de teste vinculado; consultar suas turmas e salvar uma chamada fictícia.
5. Entrar como administrador de teste com email e senha; confirmar acesso direto à equipe, sem tela de autenticador. Abrir os menus, recarregar uma rota interna e testar Voltar, inclusive quando ela não tiver histórico anterior.
6. Sair e confirmar que a sessão anterior não volta a autorizar operações.
7. Para afirmar suporte fora da LAN, repetir com o Wi-Fi do celular desligado. Sucesso na mesma rede não comprova o 4G/5G.

Sem acesso ao celular, entregar as verificações técnicas e marcar a homologação física como **pendente**, indicando a ação mínima que falta. Nunca afirmar que um teste físico foi realizado porque um QR foi gerado. session.json começa com physicalDeviceTest: pending por esse motivo.

## 8. Diagnóstico e correções

| Sintoma | Verificação / ação |
| --- | --- |
| QR abre, mas cadastro/login falha | Validar a API a partir do celular, /ready, porta, URL embutida e conexão MySQL |
| Endereço contém localhost/10.0.2.2 no aparelho | Corrigir EXPO_PUBLIC_API_URL ou reiniciar pelo lançador LAN; não trocar o IP do banco no frontend |
| API antiga responde 404 em /ready | Atualizar o backend deste projeto antes de disponibilizar a sessão |
| QR continua apontando ao IP antigo | Parar o Metro correto, conferir variáveis da sessão e reiniciar com --clear |
| Várias placas de rede | Passar --host explicitamente; comparar com a rede do telefone |
| SDK incompatível | Instalar Expo Go que suporte SDK 58; não mascarar o erro alterando sdkVersion no manifesto |
| iPhone pede conta | Confirmar a mesma conta no CLI/Expo Go e permissão de rede local |
| 401 sem login | Esperado para /auth/me; validar login pelo fluxo normal |
| Cliente ainda pede autenticador | Atualizar API e frontend para a revisão atual, executar migração, reiniciar a API e o Metro com --clear e recarregar o app; o código atual não usa MFA |
| 403 nas operações da equipe | Conferir papel, vínculo de educador e CSRF |
| 429 | Respeitar Retry-After; não desligar os limites para repetir testes |
| API retorna HTML, redirect ou erro TLS | Corrigir o túnel/reverse proxy/certificado; não usar rejectUnauthorized=false |
| Funciona no Wi-Fi e falha no 4G | A API também precisa ser pública por HTTPS; validar ambos os túneis |

As variáveis EXPO_PUBLIC_* são incorporadas no bundle. Ao mudar a API, reinicie Metro e recarregue o projeto; um QR antigo pode apontar para outra sessão. Arquivos .env locais são ignorados e não devem conter segredos do backend no frontend.

Para preview web por IP, configure WEB_ORIGINS com a origem exata apropriada; não ampliar CORS para *. Expo Go nativo continua usando Bearer/SecureStore, sem enfraquecer a sessão web HttpOnly/CSRF.

## 9. Relatório do agente

Entregar: commit/branch, SDK/versão Expo Go verificados, modo escolhido, URL/link do QR, API utilizada, processos que precisam permanecer ativos, resultado do preflight, evidências dos testes e validade temporária. Não incluir senhas, tokens ou dados pessoais em logs e capturas.

Distinguir: **código e endereços verificados**, **sessão disponível agora** e **aparelho físico homologado**. Se o processo estiver parado, não entregar um QR antigo como ativo. Para publicação permanente, seguir o plano de hospedagem e distribuição; Expo Go/Metro não substituem esse trabalho.
