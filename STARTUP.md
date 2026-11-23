# Iniciar o ambiente de desenvolvimento

Use Node 22.23.1 (linha 22, conforme .nvmrc), npm e seu MySQL de testes. Os atalhos localizam o projeto pelo caminho do próprio script; o diretório atual do terminal não muda o destino dos comandos npm.

## Primeira preparação

Pare as instâncias antigas de API/Expo deste projeto. Dentro do repositório, execute no PowerShell:

~~~powershell
Set-Location -LiteralPath (git rev-parse --show-toplevel)
.\iniciar.ps1 -Servico preparar
~~~

O preparo executa npm ci na raiz e em backend. Se backend/.env ainda não existe, cria o arquivo a partir do exemplo com SESSION_SECRET aleatório. Arquivos existentes são preservados.

Abra backend/.env e configure DB_HOST, DB_PORT, DB_USER, DB_PASSWORD e DB_NAME para o seu banco de testes. Se uma instalação antiga ainda tiver SESSION_SECRET de exemplo, substitua-o por um segredo aleatório. Use NODE_ENV=development. O script não imprime os valores secretos.

O MySQL precisa estar em execução e o banco configurado precisa existir. Se já usa o container do guia, pode iniciá-lo com:

~~~powershell
docker start novoapp-mysql
~~~

Não é necessário Docker se seu MySQL já funciona como serviço ou em outra instalação. Os atalhos não criam nem removem bancos, containers ou volumes.

## Iniciar normalmente

Na raiz:

~~~powershell
.\iniciar.ps1
~~~

Isso inicia a API, aguarda /ready confirmar banco e migrações e então inicia o Expo web. A página será aberta pelo Expo; o endereço padrão é http://localhost:8081 e a API usa a porta do backend/.env (padrão 3001).

Mantenha o terminal aberto. Ctrl+C encerra os processos iniciados por esse comando, incluindo o Metro. Se uma porta já estiver ocupada, o lançador informa o problema sem encerrar a outra instância.

| O que iniciar | Na raiz do projeto | Dentro de backend |
| --- | --- | --- |
| API e web juntos | .\iniciar.ps1 | .\iniciar.ps1 -Servico tudo |
| Somente API | .\iniciar.ps1 -Servico api | .\iniciar.ps1 |
| Somente web, com API já iniciada | .\iniciar.ps1 -Servico web | .\iniciar.ps1 -Servico web |
| Preparar dependências/configuração | .\iniciar.ps1 -Servico preparar | .\iniciar.ps1 -Servico preparar |
| Migrar, com API parada | .\iniciar.ps1 -Servico migrar | .\iniciar.ps1 -Servico migrar |

Também é possível executar um caminho absoluto, inclusive com espaços:

~~~powershell
& 'C:\caminho do projeto\novoapp\iniciar.ps1' -Servico api
~~~

## Celular físico: API e QR no mesmo comando

Na raiz, substitua pelo IPv4 da interface do computador na rede do telefone:

~~~powershell
.\iniciar.ps1 -Servico celular -IP 192.168.1.20 -LimparCache
~~~

O lançador inicia a API e usa o fluxo verificado de Expo Go SDK 58 para gerar o QR em .expo/expo-go. A URL da API usa esse IP da LAN, sem endereços de emulador. Mantenha BIND_HOST=0.0.0.0 no backend/.env. Se houver uma única interface LAN válida, -IP pode ser omitido; com várias interfaces, a escolha explícita é exigida.

Computador e telefone precisam alcançar ambos os serviços. Para outras redes, API HTTPS e túnel, continue pelo procedimento [EXPO-GO-AGENT.md](EXPO-GO-AGENT.md). A homologação em aparelho físico continua obrigatória; gerar o QR não a substitui.

## Opções úteis

~~~powershell
# Confere configuração, MySQL e portas sem iniciar serviços nem aplicar migrações
.\iniciar.ps1 -Verificar

# Portas alternativas para API e Expo
.\iniciar.ps1 -PortaApi 3100 -PortaExpo 8090 -LimparCache
~~~

A configuração de backend/.env é carregada pelo caminho do projeto; variáveis já exportadas no terminal têm precedência. -PortaApi altera a porta somente nessa execução. A API e o app recebem a mesma porta.

Em desenvolvimento, o backend já aplica as migrações durante o início. -Servico migrar permite executá-las separadamente, inclusive a remoção dos campos antigos de MFA. Login continua usando email e senha. Os atalhos recusam NODE_ENV diferente de development; para produção, siga [SECURITY-UPGRADE.md](SECURITY-UPGRADE.md) e use npm start em backend.

## Alternativa com npm

Estes comandos são para o terminal na raiz:

~~~powershell
npm run dev:setup
npm run dev
npm run dev:api
npm run dev:web
npm run dev:lan -- --host 192.168.1.20 --clear
npm run dev:migrate
~~~

São opções alternativas: execute o comando correspondente ao serviço desejado, não todos em sequência. npm run dev inicia API e web juntos. No VS Code, a tarefa de build padrão também inicia API + web; há uma tarefa separada de preparo.

## Diagnóstico

| Mensagem | Ação |
| --- | --- |
| Scripts PowerShell bloqueados | Use npm run dev na raiz; ou powershell -NoProfile -ExecutionPolicy Bypass -File .\iniciar.ps1 para essa execução, sem mudar a política permanente |
| Node incompatível ou não encontrado | Instale a versão indicada em .nvmrc e abra um novo terminal |
| Dependências ausentes | Execute -Servico preparar e aguarde concluir sem erros |
| Configure DB_* ou SESSION_SECRET | Edite backend/.env; valores de exemplo não iniciam a API |
| Banco indisponível | Confira MySQL em execução, banco existente e credenciais do backend/.env |
| Porta ocupada | Pare a instância correta ou escolha -PortaApi/-PortaExpo diferentes |
| Mais de um IP LAN | Use -IP com a interface da rede do celular |
| App aponta para API antiga | Reinicie com -LimparCache e recarregue o app |
| EUSAGE com comando manual npm | Confira a pasta; dentro de backend use npm ci sem --prefix backend. Os atalhos já fazem essa seleção |
