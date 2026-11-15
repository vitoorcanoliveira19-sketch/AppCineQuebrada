# Guia de testes das implementações recentes

Este roteiro valida manualmente os fluxos de inscrição e equipe, cadastros administrativos, turmas, matrículas e frequência no app Expo e na API. Use apenas uma base local isolada e registros fictícios. Não execute os cenários em produção.

## 1. Preparar o ambiente

Siga a seção **Validação com a equipe da ONG → Ambiente local reproduzível (Windows/PowerShell)** do [README](README.md) para iniciar MySQL, configurar `backend/.env`, criar o primeiro administrador, iniciar o backend e abrir o Expo. O health check `http://localhost:3001/health` deve responder HTTP 200 antes de começar.

Use dois usuários de teste:

- **Administrador:** criado pelo procedimento de bootstrap.
- **Educador:** criado pelo administrador em Cadastros ou pelo endpoint administrativo, com um email de teste.

Prepare uma segunda turma atribuída a outro educador para conferir isolamento de acesso. Use nomes e emails fictícios. O roteiro pressupõe também:

- uma atividade ativa e uma inativa;
- uma sala ativa e uma inativa;
- duas contas de educador ativas, cada uma vinculada a uma turma;
- um participante fictício aprovado e ativo, e outro pendente;
- uma turma ativa para cada educador.

Se começar sem esses registros, crie-os na ordem acima pelo app, usando o usuário administrador. Anote os IDs exibidos pela API ou pelo banco local quando for testar a API. O app deve continuar aberto na mesma rede e apontando para o backend local.

## 2. Registrar os resultados

Para cada cenário, anote **Passou**, **Falhou** ou **Não testado**, a plataforma (web, Android ou iOS), o papel usado e qualquer mensagem de erro. Um cenário passa quando o resultado observado corresponde ao esperado e os dados persistidos continuam corretos ao recarregar a tela.

## 3. Login, sessão e permissões

1. Entre como administrador. Confirme que a tela de equipe mostra o papel correto e os atalhos para Cadastros, Turmas, Matrículas, Chamadas e Histórico.
2. Saia e entre com senha incorreta. O app deve mostrar erro sem abrir a área da equipe.
3. Entre como educador. Confirme acesso às telas permitidas de consulta, chamada e histórico; o acesso à administração de matrículas e às ações de edição administrativa deve ser bloqueado ou não oferecido.
4. Saia e tente abrir uma rota interna sem sessão. O app deve retornar ao login.
5. No Android/iOS, feche e reabra o app e confira a sessão conforme o comportamento da plataforma. Na web, confira que o token não persiste após fechar/recarregar a sessão do navegador.
6. Como administrador, bloqueie/inative uma conta de teste ou altere seu papel; valide que um token antigo deixa de autorizar operações protegidas.

**Esperado:** somente usuários autenticados acessam as rotas internas; somente administradores executam operações administrativas. Educadores não veem dados de contato de outros educadores.

## 4. Inscrição pública e análise

1. Na tela pública, envie uma inscrição fictícia válida, incluindo responsável quando o participante for menor. Confirme a mensagem de sucesso.
2. Tente enviar com campos obrigatórios vazios ou formatos inválidos. A interface deve apontar os erros e não criar inscrição duplicada por esse envio.
3. Como administrador, localize o registro na lista de participantes pendentes. Confirme que a inscrição não cria matrícula automaticamente.
4. Aprove uma inscrição. Confirme o estado atualizado após recarregar.
5. Repita com outra inscrição e recuse-a; valide que os estados não se confundem.
6. Edite dados de um participante de teste e inative-o. Confirme a persistência após sair da tela e retornar.
7. Como educador, tente consultar/alterar a fila administrativa. A operação deve ser recusada pela interface ou pela API.

**Esperado:** inscrição pública gera estado pendente; análise e alteração de participantes são restritas ao administrador; erros do servidor não expõem SQL ou detalhes internos.

## 5. Cadastros: atividades, salas e equipe

Como administrador, em **Cadastros**:

1. Crie uma atividade, uma sala e um educador de teste; confirme que aparecem na listagem.
2. Edite nome/descrição/contato e confirme a alteração após recarregar.
3. Tente criar atividade ou sala com nome repetido e educador com email repetido. A API deve rejeitar a duplicidade e a tela deve mostrar erro compreensível.
4. Tente enviar nome ou campos obrigatórios inválidos; confirme validação e ausência de registro inválido.
5. Inative uma atividade, uma sala e um educador; confirme o estado. Reative pelo controle disponível.
6. Entre como educador e consulte a equipe. Confirme que vê apenas nomes/situação e não dados de contato privados; tente criar/editar/inativar cadastro e confirme a restrição.

**Esperado:** nomes de atividades/salas e emails de educadores não se repetem; educador pode consultar conforme permitido, mas mutações administrativas são exclusivas do administrador.

## 6. Turmas

Como administrador, em **Turmas**:

1. Crie uma turma vinculando atividade, educador e sala ativos. Confirme que atividade, educador e sala aparecem corretamente na listagem.
2. Tente criar turma sem nome, com vínculo inexistente ou com atividade/sala/educador inativo. O backend deve rejeitar e a lista não deve ganhar uma turma inválida.
3. Edite nome e vínculos para outros registros ativos; confirme a persistência.
4. Inative e reative uma turma. Confirme a situação na listagem.
5. Como educador, consulte as turmas permitidas; tente criar, editar ou inativar turma e confirme que a API recusa.

**Esperado:** vínculos inválidos/inativos não são aceitos; relações existentes são exibidas com seus nomes; registros vinculados devem ser inativados em vez de apagados.

## 7. Matrículas

Como administrador, abra **Gerenciar matrículas**:

1. Matricule o participante aprovado e ativo em uma turma ativa. Confirme situação **ativa**, participante, turma e data.
2. Tente matricular o mesmo participante novamente na mesma turma enquanto a matrícula está ativa. Deve ser recusado sem criar uma segunda matrícula ativa.
3. Tente matricular participante pendente, recusado ou inativo, e tente selecionar turma inativa (se disponível). A API deve recusar a operação.
4. Use os filtros por participante, turma e situação. Confirme que cada filtro limita a lista corretamente.
5. Encerre a matrícula. Confirme situação **encerrada**, data de encerramento preenchida e preservação do registro.
6. Crie novamente matrícula para o mesmo par participante/turma após o encerramento. Deve ser permitido como novo registro; confira que o histórico anterior permanece.
7. Reative uma matrícula encerrada quando não houver outra ativa para o mesmo par. Depois tente reativar quando já houver uma matrícula ativa concorrente; a duplicidade deve ser recusada.
8. Entre como educador e tente abrir/alterar matrículas. O acesso deve ser negado.

**Esperado:** só participantes aprovados/ativos e turmas ativas são elegíveis; existe no máximo uma matrícula ativa por participante e turma; encerramento preserva histórico.

## 8. Chamada e frequência

1. Entre como administrador e abra **Registrar chamada e frequência**. Selecione uma turma ativa e uma data válida; carregue a chamada.
2. Confirme que a lista contém as matrículas ativas elegíveis e não inclui participantes pendentes/inativos ou matrículas encerradas.
3. Marque alguns participantes como presentes e outros como ausentes. Salve e confirme a mensagem de sucesso.
4. Saia da tela, reabra a mesma turma/data e carregue novamente. As marcações devem ser iguais às salvas.
5. Altere uma marcação e salve de novo. Deve atualizar a chamada existente, sem criar outra chamada para a mesma turma/data.
6. Tente uma data inválida ou uma turma sem acesso. A tela deve mostrar erro, não confirmar o salvamento e não deixar dados antigos aparentarem uma gravação bem-sucedida.
7. Entre como educador atribuído à turma. Confirme que pode registrar chamada nela. Tente consultar turma atribuída a outro educador; não deve carregar nem salvar a chamada.
8. Como administrador, carregue a turma do outro educador e confirme acesso.

**Esperado:** uma chamada por turma/data; gravação atualiza em vez de duplicar; só são aceitos estados presente/ausente e a chamada inteira corresponde às matrículas elegíveis atuais.

## 9. Histórico de frequência

1. Abra **Consultar histórico de frequência** como administrador. Consulte por turma e confira datas, atividade, turma, participante e situação.
2. Consulte por participante e confirme que aparecem registros das turmas correspondentes.
3. Defina intervalo de datas com chamada dentro do período. Confirme que datas inicial e final são inclusivas.
4. Use intervalo sem registros. A tela deve indicar resultado vazio sem erro inesperado.
5. Informe data inválida ou início posterior ao fim. A API deve rejeitar a consulta e a tela mostrar erro.
6. Compare totais com registros filtrados: presença conta como presença, ausência como falta. Chamadas não salvas não aparecem e não contam como faltas.
7. Como educador, consulte uma turma própria e depois tente turma/participante relacionado somente a turma de outro educador. Os dados de outra turma não devem ser retornados.
8. Refaça uma consulta e confirme que ela não altera chamadas nem marcações.

**Esperado:** filtro e autorização são aplicados no servidor; o histórico reflete apenas presenças efetivamente gravadas e os totais do resultado filtrado.

## 10. Verificações da API e erros

Opcionalmente, valide endpoints diretamente com PowerShell ou cliente HTTP. Exemplo para health check:

```powershell
Invoke-RestMethod http://localhost:3001/health
```

Para rotas protegidas, obtenha o token pelo `POST /auth/login` com usuário de teste e envie `Authorization: Bearer <token>`. Confira os códigos de resposta: sem token deve receber 401, papel insuficiente 403, registro inexistente 404, entrada inválida 400/422 (conforme a rota) e duplicidade 409 quando aplicável. Não cole tokens, senhas ou dados pessoais em capturas de tela, tickets ou logs compartilhados.

Confira também que `/cadastro` legado não cria conta e que `POST /participantes` continua sendo a rota pública de inscrição. Mensagens de erro não devem incluir stack trace, query SQL, senha ou corpo completo da requisição.

## 11. Fechamento e registro de falhas

Ao terminar, pare Expo e backend com Ctrl+C. O banco local de validação pode ser parado com `docker stop novoapp-mysql`; preserve o volume se precisar dos dados para repetir os cenários. Não remova banco/volume sem combinar antes.

Para cada falha, registre tela ou endpoint, papel, plataforma, passos mínimos para reproduzir, resultado esperado e resultado observado. Remova ou oculte nomes, emails, telefones, tokens e outros dados identificáveis antes de compartilhar evidências.
