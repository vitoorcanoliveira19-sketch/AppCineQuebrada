# Guia rápido de testes

Use o banco local e somente dados fictícios. Esta preparação cria a conta de administrador no seu banco local. Você escolhe o email e a senha; o projeto não tem senha padrão.

## 1. Iniciar e preparar

Abra o terminal do VS Code ou o PowerShell do Windows. Para evitar comandos na pasta errada, use os caminhos completos abaixo. Ao copiar comandos, copie somente as linhas dentro do bloco; não copie as linhas com três crases.

1. Instale as dependências (só precisa fazer na primeira vez):

   ```powershell
   Set-Location "C:\Users\vitoo\OneDrive\Área de Trabalho\TESTE\novoapp"
   npm ci
   Set-Location "C:\Users\vitoo\OneDrive\Área de Trabalho\TESTE\novoapp\backend"
   npm ci
   ```

   Os próximos comandos desta seção usam a pasta `backend`, exceto quando indicarem outra pasta.

2. Inicie o MySQL local pelo Docker. Se o container `novoapp-mysql` já aparece como ativo no Docker Desktop, pule este comando. Se existe, mas está parado, execute `docker start novoapp-mysql`.

   ```powershell
   docker run --name novoapp-mysql -e MYSQL_ROOT_PASSWORD=local-only-change-me -e MYSQL_DATABASE=cadastrodb -p 3306:3306 -v novoapp-mysql-data:/var/lib/mysql -d mysql:8.0
   ```

   Espere o container ficar ativo. Para conferir, execute `docker exec novoapp-mysql mysqladmin ping -h 127.0.0.1 -uroot -plocal-only-change-me --silent`; deve aparecer `mysqld is alive`.

3. Configure o backend. Se ainda não existir, copie o arquivo de exemplo; depois abra o arquivo para edição:

   ```powershell
   Set-Location "C:\Users\vitoo\OneDrive\Área de Trabalho\TESTE\novoapp\backend"
   if (!(Test-Path .env)) { Copy-Item .env.example .env }
   notepad .env
   ```

   Em `backend/.env`, defina `DB_PASSWORD=local-only-change-me` e troque `JWT_SECRET` por uma frase aleatória com pelo menos 32 caracteres. Salve o arquivo. Ele é local e não deve ser compartilhado.

4. Inicie o backend em uma janela do PowerShell. Entre diretamente na pasta do backend:

   ```powershell
   Set-Location "C:\Users\vitoo\OneDrive\Área de Trabalho\TESTE\novoapp\backend"
   npm start
   ```

   Deixe essa janela aberta. Espere a conexão com o banco e confirme que `http://localhost:3001/health` responde.

5. Crie seu login de administrador em **uma segunda janela do PowerShell**. Entre na pasta do backend antes dos comandos:

   ```powershell
   Set-Location "C:\Users\vitoo\OneDrive\Área de Trabalho\TESTE\novoapp\backend"
   $env:ADMIN_NAME = Read-Host "Nome do administrador"
   $env:ADMIN_EMAIL = Read-Host "Email para login"
   $secure = Read-Host "Crie uma senha com pelo menos 12 caracteres" -AsSecureString
   $env:ADMIN_PASSWORD = [Net.NetworkCredential]::new("", $secure).Password
   npm run bootstrap-admin
   Remove-Item Env:ADMIN_NAME, Env:ADMIN_EMAIL, Env:ADMIN_PASSWORD
   ```

   Guarde o email e a senha que você digitou. A senha não é fornecida pelo projeto e não pode ser recuperada do banco. Se o comando disser que já existe administrador, use a conta criada anteriormente; o bootstrap não cria uma segunda conta.

6. Em outra janela, na pasta `novoapp`, inicie o app:

   ```powershell
   Set-Location "C:\Users\vitoo\OneDrive\Área de Trabalho\TESTE\novoapp"
   npx expo start
   ```

   Pressione `w` para testar no navegador ou escaneie o QR code com Expo Go. No Android/iOS, os endereços padrão da API estão descritos no [README](README.md#endereco-da-api-no-app).

## 2. Fazer login e preparar os dados

1. Na tela inicial do app, toque em **Equipe** na barra inferior, à direita. Na tela **Acesso da equipe**, informe o email e a senha escolhidos no passo 5 da preparação e toque em **Entrar**.
2. Em **Cadastros**, crie dois registros de educador com emails fictícios diferentes, uma atividade ativa e uma sala ativa. Crie também uma atividade ou sala inativa para testar validações.
3. Crie o usuário de acesso de um educador: o registro de educador em **Cadastros** não cria login. Em uma janela PowerShell na pasta `novoapp`, rode o bloco abaixo. Use o mesmo email do registro de educador e escolha uma senha de pelo menos 12 caracteres:

   ```powershell
   Set-Location "C:\Users\vitoo\OneDrive\Área de Trabalho\TESTE\novoapp"
   $adminEmail = Read-Host "Email do administrador"
   $adminSecure = Read-Host "Senha do administrador" -AsSecureString
   $adminPassword = [Net.NetworkCredential]::new("", $adminSecure).Password
   $login = Invoke-RestMethod -Uri http://localhost:3001/auth/login -Method Post -ContentType "application/json" -Body (@{ email = $adminEmail; senha = $adminPassword } | ConvertTo-Json)
   $educadorSenhaSecure = Read-Host "Crie uma senha para o educador (mínimo 12 caracteres)" -AsSecureString
   $educadorSenha = [Net.NetworkCredential]::new("", $educadorSenhaSecure).Password
   $cabecalho = @{ Authorization = "Bearer $($login.token)" }
   Invoke-RestMethod -Uri http://localhost:3001/admin/educadores -Method Post -Headers $cabecalho -ContentType "application/json" -Body (@{ nome = "Educador Teste"; email = "educador@teste.local"; senha = $educadorSenha } | ConvertTo-Json)
   Remove-Variable adminPassword, educadorSenha, cabecalho, login
   ```

   Se aparecer `True` e um resultado com `papel=educador` e um `id`, a conta foi criada. Ignore eventual erro dizendo que crases não são reconhecidas: ele ocorre quando as crases do bloco são copiadas. Não rode o comando novamente para essa mesma conta.

   Troque `Educador Teste` e `educador@teste.local` pelos mesmos nome e email cadastrados. Guarde a senha do educador para o teste de login.
   Para testar o isolamento entre duas contas de educador, repita o bloco com o nome, email e senha do segundo educador.
4. Em **Turmas**, crie duas turmas ativas, uma para cada registro de educador. A tela só mostra atividades, educadores e salas ativos; os inativos devem ficar fora das opções.
5. Para abrir a inscrição pública, volte para **Home**, toque em um ícone de atividade (por exemplo, **Capoeira**) e depois em **QUERO ME CADASTRAR!**. Envie duas inscrições fictícias; preencha todos os campos obrigatórios e aceite a política de privacidade. Na área da equipe, aprove uma e deixe a outra pendente.

Se esquecer a senha do educador, redefina-a numa janela PowerShell, usando o email da conta criada:

```powershell
Set-Location "C:\Users\vitoo\OneDrive\Área de Trabalho\TESTE\novoapp\backend"
$env:RESET_EMAIL = Read-Host "Email do educador"
$secure = Read-Host "Nova senha (mínimo 12 caracteres)" -AsSecureString
$env:RESET_PASSWORD = [Net.NetworkCredential]::new("", $secure).Password
npm run reset-educator-password
Remove-Item Env:RESET_EMAIL, Env:RESET_PASSWORD
```

Depois entre no app com esse email e a nova senha. O comando não cria uma segunda conta.

Agora você tem o mínimo para seguir o checklist abaixo. Use somente dados fictícios.

Marque cada item: **☐ passou** ou **☐ falhou**.

## Checklist

1. **Entrar e sair** — Faça login como administradora e depois como educadora. Saia e tente abrir uma tela interna sem login.
   **Confira:** sem login não acessa; educadora não administra cadastros nem matrículas.

2. **Inscrição** — Em **Home**, toque em uma atividade e em **QUERO ME CADASTRAR!**. Envie uma inscrição fictícia válida; depois tente enviar com campo obrigatório vazio.
   **Confira:** inscrição válida fica pendente; formulário inválido mostra erro.

3. **Cadastros** — Crie uma atividade, sala e educador. Tente repetir o nome da atividade ou o email do educador. Inative e reative um cadastro.
   **Confira:** itens aparecem, duplicatas são recusadas e a situação atualiza.

4. **Turmas** — Crie turma usando atividade, sala e educador ativos. Confira que os itens inativos não aparecem nas opções.
   **Confira:** turma válida é criada; itens inativos não podem ser selecionados; educadora não edita a turma. A interface impede selecionar itens inativos, então não é preciso tentar forçar esse envio.

5. **Matrículas** — Matricule o participante aprovado em turma ativa. Tente matriculá-lo de novo; depois encerre a matrícula e consulte a lista.
   **Confira:** duplicata ativa é recusada; matrícula encerrada continua no histórico.

6. **Chamada** — Como administradora, abra uma turma, escolha a data, marque presenças e faltas e salve. Reabra a mesma data e altere uma marcação.
   **Confira:** dados salvos reaparecem; salvar de novo atualiza a chamada. Educadora só acessa a própria turma.

7. **Histórico** — Consulte por turma e por participante. Aplique um intervalo de datas que inclua a chamada salva.
   **Confira:** aparecem as marcações e totais corretos; educadora não vê turmas de outra pessoa.

## Se algo falhar

Anote o número do passo, o papel usado e a mensagem exibida. Não compartilhe senhas, tokens ou dados pessoais. Ao terminar, pare Expo e backend com **Ctrl+C**; preserve o banco local se for repetir os testes.
