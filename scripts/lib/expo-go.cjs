const os = require('node:os');
const { isIP } = require('node:net');
const { validateApiUrl, isPrivateHost, isDeviceLocalHost } = require('../../shared/api-url');

function lanAddresses(interfaces = os.networkInterfaces()) {
  return Object.entries(interfaces).flatMap(([name, entries]) => {
    if (/virtual|vmware|vethernet|wsl|docker|radmin|vpn|tailscale|zerotier|loopback/i.test(name)) return [];
    return (entries || []).filter(e => !e.internal && (e.family === 'IPv4' || e.family === 4) &&
      isPrivateHost(e.address) && !isDeviceLocalHost(e.address) && !e.address.startsWith('169.254.'))
      .map(e => ({ name, address: e.address }));
  });
}
function selectLanHost(explicit, interfaces = os.networkInterfaces()) {
  const available = Object.values(interfaces).flat().filter(Boolean);
  if (explicit) {
    if (isIP(explicit) !== 4 || isDeviceLocalHost(explicit) || !isPrivateHost(explicit) ||
      !available.some(e => e.address === explicit && !e.internal)) {
      throw new Error('--host deve ser um IPv4 privado desta máquina, acessível pelo Wi-Fi do celular.');
    }
    return explicit;
  }
  const addresses = [...new Set(lanAddresses(interfaces).map(e => e.address))];
  if (addresses.length !== 1) {
    throw new Error('Não há um único IP LAN seguro para escolher. Use --host IP-DO-WIFI. Opções: ' +
      (lanAddresses(interfaces).map(e => e.name + '=' + e.address).join(', ') || 'nenhuma; confira o Wi-Fi.'));
  }
  return addresses[0];
}
function parseArgs(argv) {
  const options = { mode: 'lan', port: 8081, apiPort: undefined, check: false, clear: false };
  const values = { '--mode':'mode', '--api':'api', '--host':'host', '--port':'port', '--api-port':'apiPort' };
  for (let i=0; i<argv.length; i++) {
    const arg = argv[i];
    if (arg === '--check') options.check = true;
    else if (arg === '--clear') options.clear = true;
    else if (arg === '--help') options.help = true;
    else if (values[arg]) {
      if (!argv[i+1] || argv[i+1].startsWith('--')) throw new Error('Falta valor para ' + arg);
      options[values[arg]] = argv[++i];
    } else throw new Error('Opção desconhecida: ' + arg);
  }
  if (!['lan','tunnel'].includes(options.mode)) throw new Error('--mode deve ser lan ou tunnel.');
  for (const key of ['port','apiPort']) {
    if (options[key] === undefined) continue;
    options[key] = Number(options[key]);
    if (!Number.isInteger(options[key]) || options[key] < 1 || options[key] > 65535) throw new Error('Porta inválida.');
  }
  if (options.mode === 'tunnel' && options.port !== 8081) throw new Error('O túnel Expo do SDK 58 exige Metro na porta 8081.');
  return options;
}
function createPlan(options, { env = process.env, interfaces = os.networkInterfaces() } = {}) {
  const host = options.mode === 'lan' ? selectLanHost(options.host, interfaces) : null;
  const explicitApi = options.api || env.EXPO_PUBLIC_API_URL;
  if (!explicitApi && options.mode === 'tunnel') throw new Error('Informe --api https://SUA-API. O túnel do Expo publica o Metro, não a API.');
  const api = validateApiUrl(explicitApi || 'http://' + host + ':' + (options.apiPort || env.EXPO_PUBLIC_API_PORT || 3001), {
    physicalDevice: true, publicOnly: options.mode === 'tunnel',
  });
  const childEnv = { ...env, NODE_ENV: 'development', EXPO_PUBLIC_API_URL: api };
  delete childEnv.EXPO_OFFLINE;
  delete childEnv.EXPO_PACKAGER_PROXY_URL;
  if (host) childEnv.REACT_NATIVE_PACKAGER_HOSTNAME = host;
  else delete childEnv.REACT_NATIVE_PACKAGER_HOSTNAME;
  const args = ['start', '--go', '--port', String(options.port)];
  if (options.mode === 'lan') args.push('--lan');
  else args.push('--tunnel', 'expo');
  if (options.clear) args.push('--clear');
  return { mode: options.mode, host, api, port: options.port, args, childEnv };
}
async function probeApi(api, fetchImpl = fetch) {
  const checks = [['/health', 200], ['/ready', 200], ['/auth/me', 401]];
  for (const [route, expected] of checks) {
    let response;
    try {
      response = await fetchImpl(api + route, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000), redirect: 'error' });
    } catch { throw new Error('API inacessível em ' + api + route + '. Confira processo, endereço, TLS e firewall.'); }
    const json = await response.json().catch(() => null);
    if (response.status !== expected || !json || (expected === 200 && json.sucesso !== true) ||
      (expected === 401 && json.sucesso !== false)) throw new Error('Falha em ' + route + ': esperado HTTP ' + expected + ' com JSON da API CineQuebrada. Recebido ' + response.status + '. Verifique banco/migração e a URL do backend.');
  }
}
function validateDeepLink(value, plan) {
  let url;
  try { url = new URL(value); } catch { throw new Error('O Metro não informou um link Expo Go válido.'); }
  if (!['exp:','exps:'].includes(url.protocol) || isDeviceLocalHost(url.hostname)) throw new Error('O QR deve abrir Expo Go por exp:// ou exps:// com host acessível pelo celular.');
  if (plan.mode === 'lan' && url.hostname !== plan.host) throw new Error('O endereço do QR difere do IP LAN escolhido. Reinicie o Metro com o IP correto.');
  if (plan.mode === 'tunnel' && isPrivateHost(url.hostname)) throw new Error('O link retornado não é um túnel público.');
  return url.href;
}
module.exports = { lanAddresses, selectLanHost, parseArgs, createPlan, probeApi, validateDeepLink };
