const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { createRequire } = require('node:module');
const { parseEnv } = require('node:util');
const { selectLanHost, probeApi } = require('./lib/expo-go.cjs');

const root = path.resolve(__dirname, '..');
const backend = path.join(root, 'backend');
const backendRequire = createRequire(path.join(backend, 'package.json'));

function parseOptions(args) {
  const options = { service: 'all', port: 8081, clear: false, check: false };
  if (args[0] && !args[0].startsWith('--')) options.service = args.shift();
  if (!['all', 'api', 'web', 'lan', 'setup', 'migrate'].includes(options.service)) throw new Error('Serviço inválido. Use all, api, web, lan, setup ou migrate.');
  for (let i=0; i<args.length; i++) {
    const arg = args[i];
    if (arg === '--help') options.help = true;
    else if (arg === '--clear') options.clear = true;
    else if (arg === '--check') options.check = true;
    else if (['--host', '--port', '--api-port'].includes(arg)) {
      const value = args[++i];
      if (!value || value.startsWith('--')) throw new Error('Falta valor para ' + arg);
      options[{ '--host': 'host', '--port': 'port', '--api-port': 'apiPort' }[arg]] = value;
    } else throw new Error('Opção desconhecida: ' + arg);
  }
  for (const key of ['port', 'apiPort']) if (options[key] !== undefined) {
    options[key] = Number(options[key]);
    if (!Number.isInteger(options[key]) || options[key] < 1 || options[key] > 65535) throw new Error('Porta inválida: ' + key);
  }
  if (options.host && options.service !== 'lan') throw new Error('--host é usado pelo modo lan (celular).');
  if (options.service === 'setup' && options.check) throw new Error('--check não instala dependências; use all --check para verificar o ambiente preparado.');
  return options;
}

function createEnvFile(directory = backend) {
  const target = path.join(directory, '.env');
  if (fs.existsSync(target)) return false;
  const template = fs.readFileSync(path.join(directory, '.env.example'), 'utf8');
  const value = template.replace(/^SESSION_SECRET=.*$/m, 'SESSION_SECRET=' + crypto.randomBytes(48).toString('base64'));
  fs.writeFileSync(target, value, { flag: 'wx', mode: 0o600 });
  return true;
}

function readBackendConfig(options, inherited = process.env, directory = backend) {
  const file = path.join(directory, '.env');
  const env = { ...(fs.existsSync(file) ? parseEnv(fs.readFileSync(file, 'utf8')) : {}), ...inherited };
  env.NODE_ENV ||= 'development';
  if (env.NODE_ENV !== 'development') throw new Error('Estes atalhos são para NODE_ENV=development. Para produção, use o procedimento SECURITY-UPGRADE.md e npm start em backend.');
  const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'SESSION_SECRET'];
  const missing = required.filter(key => !env[key] || /^(SUBSTITUA|REPLACE_)/i.test(env[key]));
  if (missing.length) throw new Error('Configure ' + missing.join(', ') + ' em backend/.env. Prepare o projeto com npm run dev:setup; nenhum segredo existente será sobrescrito.');
  if (env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET deve ter pelo menos 32 caracteres.');
  env.PORT = String(options.apiPort || env.PORT || 3001);
  env.DB_PORT ||= '3306';
  env.BIND_HOST ||= '0.0.0.0';
  for (const key of ['PORT', 'DB_PORT']) if (!Number.isInteger(Number(env[key])) || Number(env[key]) < 1 || Number(env[key]) > 65535) throw new Error(key + ' inválida em backend/.env.');
  return env;
}

async function assertPortAvailable(port, label) {
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', () => reject(new Error(label + ': porta ' + port + ' ocupada ou indisponível. Encerre apenas a instância deste projeto ou escolha outra porta.')));
    server.listen({ host: '0.0.0.0', port, exclusive: true }, () => server.close(resolve));
  });
}

function serviceAddresses(env, port) {
  const host = ['0.0.0.0', '::', '127.0.0.1', '::1', 'localhost'].includes(env.BIND_HOST) ? 'localhost' : env.BIND_HOST;
  const hostname = host.includes(':') ? '[' + host + ']' : host;
  return { host, api: 'http://' + hostname + ':' + env.PORT, web: 'http://' + hostname + ':' + port };
}

async function checkDatabase(env) {
  let mysql;
  try { mysql = backendRequire('mysql2/promise'); backendRequire.resolve('express'); }
  catch { throw new Error('Dependências da API ausentes. Execute npm run dev:setup na raiz ou iniciar.ps1 -Servico preparar.'); }
  let connection;
  try {
    connection = await mysql.createConnection({
      host: env.DB_HOST, port: Number(env.DB_PORT), user: env.DB_USER,
      password: env.DB_PASSWORD, database: env.DB_NAME, connectTimeout: 3000,
    });
    await connection.ping();
  } catch (error) {
    const detail = {
      ECONNREFUSED: 'Inicie o MySQL. Se usa o container do guia: docker start novoapp-mysql.',
      ETIMEDOUT: 'Confira se o MySQL está acessível pelo endereço e porta configurados.',
      ER_ACCESS_DENIED_ERROR: 'Confira DB_USER e DB_PASSWORD em backend/.env.',
      ER_BAD_DB_ERROR: 'Crie o banco indicado em DB_NAME ou corrija essa configuração.',
    }[error.code] || 'Confira o MySQL e as variáveis DB_* em backend/.env.';
    throw new Error('Banco indisponível (' + (error.code || 'conexão') + '). ' + detail);
  } finally { if (connection) await connection.end(); }
}

function managedProcesses() {
  const children = new Set();
  let stopping = false;
  const stop = async (code = 0) => {
    if (stopping) return;
    stopping = true;
    process.exitCode = code;
    const owned = [...children];
    await Promise.all(owned.map(child => new Promise(resolve => {
      if (child.exitCode !== null || !child.pid) return resolve();
      if (process.platform === 'win32') {
        // Only this launcher's recorded child PID and its descendants.
        const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
        killer.once('error', () => { child.kill(); resolve(); });
        killer.once('exit', resolve);
      } else {
        child.once('exit', resolve);
        child.kill('SIGTERM');
        const timer = setTimeout(() => { if (child.exitCode === null) child.kill('SIGKILL'); }, 4000);
        timer.unref();
      }
    })));
    for (const child of owned.filter(value => value.qrSession)) {
      const file = path.join(root, '.expo/expo-go/session.json');
      try {
        const session = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (session.launcherPid === child.pid) fs.writeFileSync(file, JSON.stringify({ ...session, status: 'stopped' }, null, 2) + '\n');
      } catch { /* A QR may not have been generated before shutdown. */ }
    }
  };
  const launch = (command, args, cwd, env, persistent = true) => {
    const child = spawn(command, args, { cwd, env, windowsHide: true, stdio: 'inherit' });
    children.add(child);
    child.once('error', error => { console.error('Falha ao iniciar processo: ' + error.code); void stop(1); });
    child.once('exit', (code, signal) => {
      children.delete(child);
      if (persistent && !stopping) void stop(code ?? (signal === 'SIGINT' ? 0 : 1));
    });
    return child;
  };
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void stop(); });
  return { launch, stop, isStopping: () => stopping };
}

async function waitForApi(api, runtime) {
  const deadline = Date.now() + 60000;
  while (!runtime.isStopping() && Date.now() < deadline) {
    try { await probeApi(api); return; } catch { /* API is connecting and applying development migrations. */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!runtime.isStopping()) throw new Error('API não ficou pronta em 60 segundos. Confira o erro no terminal; o Expo não foi iniciado.');
}

async function main(args = process.argv.slice(2)) {
  const options = parseOptions([...args]);
  if (options.help) {
    console.log('Startup CineQuebrada (Node 22.23.1):\n  node scripts/dev.cjs setup       Instala dependências e prepara .env sem sobrescrever\n  node scripts/dev.cjs all         API + web (padrão)\n  node scripts/dev.cjs api         Somente API\n  node scripts/dev.cjs web         Somente web, com API já iniciada\n  node scripts/dev.cjs lan --host IP-DO-WIFI  API + QR Expo Go 58\n  node scripts/dev.cjs migrate     Migração, com API parada\nOpções: --api-port 3001, --port 8081 (Expo), --clear, --check (somente verificações).\nGuia: STARTUP.md. Ctrl+C encerra os processos iniciados por este comando.');
    return;
  }
  const [major, minor, patch] = process.versions.node.split('.').map(Number);
  if (major !== 22 || minor < 23 || (minor === 23 && patch < 1)) throw new Error('Use Node 22.23.1 ou superior da linha 22, conforme .nvmrc.');
  const runtime = managedProcesses();
  try {
    if (options.service === 'setup') {
      for (const directory of [root, backend]) {
        if (!fs.existsSync(path.join(directory, 'package-lock.json'))) throw new Error('Lockfile ausente em ' + directory + '. Atualize o checkout; não gere outro lockfile.');
        console.log('Instalando dependências em ' + directory);
        const child = process.platform === 'win32'
          ? runtime.launch('cmd.exe', ['/d', '/c', 'npm ci'], directory, process.env, false)
          : runtime.launch('npm', ['ci'], directory, process.env, false);
        const code = await new Promise((resolve, reject) => { child.once('exit', resolve); child.once('error', reject); });
        if (runtime.isStopping()) return;
        if (code !== 0) throw new Error('npm ci falhou. Corrija o erro acima antes de continuar.');
      }
      console.log(createEnvFile() ? 'Criado backend/.env com SESSION_SECRET aleatório. Preencha DB_* com o seu MySQL.' : 'backend/.env existente preservado.');
      console.log('Inicie seu MySQL e execute iniciar.ps1 ou npm run dev. Guia: STARTUP.md');
      return;
    }
    const env = readBackendConfig(options);
    if (['all', 'lan'].includes(options.service) && Number(env.PORT) === options.port) throw new Error('API e Expo precisam de portas diferentes. Use --api-port e --port.');
    if (['all', 'web', 'lan'].includes(options.service)) {
      try { require.resolve('expo/bin/cli'); } catch { throw new Error('Dependências do app ausentes. Execute npm run dev:setup.'); }
      await assertPortAvailable(options.port, 'Expo');
    }
    const startsApi = ['all', 'api', 'lan'].includes(options.service);
    if (startsApi || options.service === 'migrate') {
      await assertPortAvailable(Number(env.PORT), 'API');
      await checkDatabase(env);
    }
    const addresses = serviceAddresses(env, options.port);
    const api = addresses.api;
    const lanHost = options.service === 'lan' ? selectLanHost(options.host) : null;
    if (lanHost && !['0.0.0.0', '::', lanHost].includes(env.BIND_HOST)) throw new Error('Para celular, configure BIND_HOST=0.0.0.0 em backend/.env e reinicie.');
    if (['all', 'web'].includes(options.service) && addresses.host !== 'localhost' && !(env.WEB_ORIGINS || '').split(',').map(value => value.trim()).includes(addresses.web)) {
      throw new Error('Inclua a origem exata ' + addresses.web + ' em WEB_ORIGINS para usar o web nesse BIND_HOST.');
    }
    if (options.service === 'web') await probeApi(api);
    console.log('Configuração verificada. API: ' + api + '\nBanco: acessível.');
    if (options.check) return;
    if (options.service === 'migrate') {
      console.log('Aplicando as migrações do projeto no banco configurado.');
      runtime.launch(process.execPath, [path.join(backend, 'scripts/migrate.js')], backend, env);
      return;
    }
    if (startsApi) {
      console.log('Iniciando API. Aguarde a confirmação de /ready antes do Expo.');
      runtime.launch(process.execPath, [path.join(backend, 'server.js')], backend, env);
      await waitForApi(api, runtime);
      if (runtime.isStopping()) return;
      console.log('API e banco prontos: ' + api + '/ready');
    }
    if (options.service === 'lan') {
      const args = [path.join(root, 'scripts/expo-go.cjs'), '--mode', 'lan', '--host', lanHost, '--api', 'http://' + lanHost + ':' + env.PORT, '--port', String(options.port)];
      if (options.clear) args.push('--clear');
      runtime.launch(process.execPath, args, root, env).qrSession = true;
    } else if (['all', 'web'].includes(options.service)) {
      const args = [require.resolve('expo/bin/cli'), 'start', '--go', '--web', addresses.host === 'localhost' ? '--localhost' : '--lan', '--port', String(options.port)];
      if (options.clear) args.push('--clear');
      runtime.launch(process.execPath, args, root, { ...env, NODE_ENV: 'development', EXPO_PUBLIC_API_URL: api, REACT_NATIVE_PACKAGER_HOSTNAME: addresses.host });
      console.log('Web: ' + addresses.web + '\nMantenha este terminal aberto. Para celular use o modo lan.');
    }
  } catch (error) { await runtime.stop(1); throw error; }
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { parseOptions, createEnvFile, readBackendConfig, assertPortAvailable, serviceAddresses };
