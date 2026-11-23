const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { parseArgs, createPlan, probeApi, validateDeepLink } = require('./lib/expo-go.cjs');
const root = path.resolve(__dirname, '..');

async function assertPortFree(port) {
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', () => reject(new Error('A porta ' + port + ' já está ocupada. Encerre apenas o Metro deste projeto ou escolha outra porta na LAN.')));
    server.listen({ host: '0.0.0.0', port, exclusive: true }, () => server.close(resolve));
  });
}
async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log('Expo Go SDK 58 em celular real:\n  npm run expo:lan -- --host IP-DO-WIFI [--api URL] [--clear]\n  npm run expo:tunnel -- --api https://SUA-API\n  npm run expo:check -- --mode lan --host IP-DO-WIFI\n\nGuia completo: EXPO-GO-AGENT.md');
    return;
  }
  const pkg = require('../package.json');
  const installedExpo = require('expo/package.json');
  if (Number(installedExpo.version.split('.')[0]) !== 58 || !pkg.dependencies.expo.includes('58.')) throw new Error('Este fluxo exige Expo SDK 58. Execute npm ci e npx expo install --check.');
  // Inherited shell variables win over development env files.
  if (process.env.EXPO_NO_DOTENV !== '1') {
    for (const name of ['.env.development.local','.env.local','.env.development','.env']) {
      const file = path.join(root, name);
      if (fs.existsSync(file)) process.loadEnvFile(file);
    }
  }
  const plan = createPlan(options);
  console.log('Modo: ' + plan.mode + '\nAPI para o celular: ' + plan.api);
  await probeApi(plan.api);
  console.log('API, banco/migração e proteção de acesso: verificados neste computador.\nTeste no celular real ainda é obrigatório (EXPO-GO-AGENT.md).');
  if (options.check) return;
  await assertPortFree(plan.port);

  const output = path.join(root, '.expo', 'expo-go');
  fs.mkdirSync(output, { recursive: true });
  for (const file of ['qr.svg','session.html','session.json']) {
    try { fs.unlinkSync(path.join(output, file)); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  }
  const cli = require.resolve('expo/bin/cli');
  const child = spawn(process.execPath, [cli, ...plan.args], { cwd: root, env: plan.childEnv, stdio: 'inherit' });
  let exited = false;
  let generationError;
  child.once('exit', code => {
    exited = true;
    if (fs.existsSync(path.join(output, 'session.json'))) {
      const session = JSON.parse(fs.readFileSync(path.join(output, 'session.json'), 'utf8'));
      fs.writeFileSync(path.join(output, 'session.json'), JSON.stringify({ ...session, status: 'stopped' }, null, 2) + '\n');
    }
    process.exitCode = code || (generationError ? 1 : 0);
  });
  child.once('error', error => { exited = true; console.error('Falha ao iniciar Metro: ' + error.message); process.exitCode = 1; });
  for (const signal of ['SIGINT','SIGTERM']) process.once(signal, () => { if (!exited) child.kill(signal); });

  try {
    const deadline = Date.now() + 120000;
    let link;
    while (!exited && Date.now() < deadline) {
      let data;
      try {
        const result = await fetch('http://127.0.0.1:' + plan.port + '/_expo/open?platform=android&runtime=expo', { signal: AbortSignal.timeout(2000) });
        if (result.ok) data = await result.json();
      } catch { /* Metro is still starting. */ }
      if (data?.url) { link = validateDeepLink(data.url, plan); break; }
      await new Promise(resolve => setTimeout(resolve, 750));
    }
    if (exited) return;
    if (!link) throw new Error('O Metro não forneceu o QR em 120 segundos. Confira login Expo, porta 8081 e conectividade. Nenhum QR foi declarado pronto.');
    const svg = await require('qrcode').toString(link, { type: 'svg', errorCorrectionLevel: 'M', margin: 4 });
    const session = { status: 'running', sdk: 58, mode: plan.mode, launcherPid: process.pid, metroPid: child.pid, expoGoUrl: link, apiUrl: plan.api, createdAt: new Date().toISOString(), physicalDeviceTest: 'pending' };
    fs.writeFileSync(path.join(output, 'qr.svg'), svg);
    fs.writeFileSync(path.join(output, 'session.json'), JSON.stringify(session, null, 2) + '\n');
    const escape = value => value.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
    fs.writeFileSync(path.join(output, 'session.html'), '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>CineQuebrada — Expo Go 58</title><body><h1>Expo Go SDK 58</h1><p>Mantenha o Metro e a API em execução. QR de desenvolvimento; não é publicação permanente.</p><img width="320" height="320" alt="QR do Expo Go" src="qr.svg"><p><a href="' + escape(link) + '">Abrir no Expo Go</a></p><p>API: ' + escape(plan.api) + '</p><p>Homologação em aparelho físico: pendente.</p></body></html>');
    console.log('\nQR Expo Go: ' + link + '\nImagem: ' + path.join(output, 'qr.svg') + '\nPágina local: ' + path.join(output, 'session.html') + '\nMantenha este processo aberto. Verifique o QR e /ready no celular antes de confirmar a entrega.');
  } catch (error) {
    generationError = error;
    console.error(error.message);
    if (!exited) child.kill('SIGTERM');
    process.exitCode = 1;
  }
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
