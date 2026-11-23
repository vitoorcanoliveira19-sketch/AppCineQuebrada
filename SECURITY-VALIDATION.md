# Validação do login e da navegação

Validação local da remoção do MFA e da correção de Voltar, em 22/11/2026. A autenticação atual usa email e senha em todos os ambientes.

| Verificação | Resultado |
| --- | --- |
| API e configuração | 28 testes passaram com API real e MariaDB 11.4.9 descartável |
| Cliente, configuração do projeto e navegação | 21 testes passaram |
| Navegador em desenvolvimento | 17 verificações passaram em Chromium com o Metro real em modo de desenvolvimento |
| Lint e TypeScript | Passaram |
| Compatibilidade Expo SDK 58 | expo install --check passou |
| Exportações | Web estático e bundles Android/iOS gerados |
| Auditoria frontend | Zero alertas |
| Auditoria backend | Sem alertas altos/críticos; duas entradas moderadas existentes de Sequelize → uuid, documentadas em SECURITY-EXCEPTIONS.md |

A suíte da API verifica login administrativo por senha em development, test e production, inclusive com a variável antiga MFA_REQUIRED=true. Verifica também que os endpoints retirados não configuram fatores e que uma base legada com fator/sessão pendentes continua permitindo autenticação.

A migração foi aplicada duas vezes na base descartável: removeu somente as cinco colunas do autenticador, preservando usuários, hashes de senha, versão de autenticação, vínculos de educador, participantes e validade das sessões. Também foi testada a migração do schema anterior ao vínculo de educador.

Permanecem cobertos os papéis e o isolamento de turmas, contas sem vínculo/inativas, histórico, edição de telefone, chamada, CSRF/cookies, expiração, revogação após logout/senha/bloqueio, recuperação operacional de senha, limites concorrentes e inscrições de menores.

No navegador foram verificados login administrativo sem autenticador, sessão após recarregar, cookie HttpOnly e ausência de credenciais no localStorage. Treze rotas foram abertas diretamente para acionar Voltar: cadastros, turmas, matrículas, chamadas, histórico, segurança, contas, cinco atividades e login. O retorno pelo histórico foi verificado de inscrição para atividade. Não houve requisição ao autenticador, aviso GO_BACK ou exceção JavaScript. A página Segurança da conta contém somente troca de senha.

Os testes usam dados fictícios e bancos com prefixo security_test_. Não acessam a conta ou a senha real de qualquer usuário. Não foram executados em celular físico, nem aplicados ao banco/hospedagem da ONG.

Para atualizar uma instalação existente, siga [SECURITY-UPGRADE.md](SECURITY-UPGRADE.md#remoção-do-autenticador-em-instalações-existentes), execute a migração e reinicie API e frontend. Para testar por QR, siga [EXPO-GO-AGENT.md](EXPO-GO-AGENT.md). O [workflow CI](https://github.com/vitoorcanoliveira19-sketch/AppCineQuebrada/actions/workflows/ci.yml) repete as verificações e usa MySQL 8.0 para a suíte do backend.
