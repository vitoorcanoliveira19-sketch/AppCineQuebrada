# Validação da atualização de segurança

Base: `main` no commit `2fc7a84`. Branch de trabalho: `codex/security-phases-1-3`.

| Verificação | Resultado local |
| --- | --- |
| Instalação reproduzível | `npm ci` passou na raiz e em backend |
| Autorização, sessões, MFA, migração e limites | 21 testes de integração passaram com API real e MariaDB 11.4.9 descartável |
| Cliente web/nativo de autenticação | 4 testes passaram |
| Navegador | 7 fluxos passaram em Chromium, sem erros de execução |
| Lint e TypeScript | Passaram |
| Compatibilidade de pacotes Expo | `expo install --check` passou |
| Exportação | Web estático e bundles Hermes de Android/iOS gerados |
| Dependências frontend | npm audit: zero alertas |
| Dependências backend | Zero alertas altos/críticos; duas entradas moderadas da cadeia Sequelize → uuid, analisadas em SECURITY-EXCEPTIONS.md |

Os fluxos no navegador incluem login e atalhos do educador, cookie Secure/HttpOnly/SameSite, ausência de credencial em localStorage, sessão após recarregar, histórico, logout, configuração administrativa de MFA/códigos de recuperação e bloqueio de conta. Os domínios HTTPS de teste foram interceptados localmente: isso não testa o TLS de uma hospedagem real.

A suíte do backend cobre isolamento de turmas inclusive para educadores sem vínculo/inativos, histórico por participante, telefones, chamada, papéis, revogação após logout/senha/bloqueio, CSRF, expiração, recuperação operacional sem remover MFA, códigos de uso único, configuração MFA concorrente, limites concorrentes, inscrições de menores e migração de schema anterior preservando usuários.

O workflow foi atualizado para repetir a suíte com **MySQL 8.0** e exportar as três plataformas. A execução remota desse workflow depende de publicar a branch. Não foram gerados APK/IPA assinados, nem feitos testes em aparelhos físicos ou alteração de banco/hospedagem de produção.

Antes de aplicar a atualização: seguir [SECURITY-UPGRADE.md](SECURITY-UPGRADE.md), executar a migração e configurar as variáveis de produção. Sessões JWT antigas são invalidadas e administradores passam a exigir MFA.
