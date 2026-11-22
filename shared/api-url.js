// Shared by the app and the QR launcher. Keep this module free of Node APIs.
function normalizedHost(value) {
  return String(value || '').toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
}
function isDeviceLocalHost(value) {
  const host = normalizedHost(value);
  return host === 'localhost' || host.endsWith('.localhost') ||
    /^(127\.|0\.0\.0\.0$)/.test(host) || ['::', '::1', '::ffff:7f00:1', '10.0.2.2', '10.0.3.2'].includes(host);
}
function isPrivateHost(value) {
  const host = normalizedHost(value);
  return isDeviceLocalHost(host) || /^(10\.|192\.168\.|169\.254\.)/.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) || /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(host) ||
    /^(fc|fd)[a-f0-9]{2}:/.test(host) || /^fe[89ab][a-f0-9]:/.test(host) ||
    host.endsWith('.local') || host.endsWith('.internal');
}
function validateApiUrl(input, options = {}) {
  const { development = true, physicalDevice = false, publicOnly = false } = options;
  let url;
  try { url = new URL(String(input).trim()); } catch { throw new Error('Informe uma URL completa para EXPO_PUBLIC_API_URL.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('A URL da API deve usar HTTP/HTTPS, sem credenciais, query ou fragmento.');
  }
  if ((!development || publicOnly) && url.protocol !== 'https:') throw new Error('Use uma API HTTPS para publicar ou acessar por outras redes.');
  if (physicalDevice && isDeviceLocalHost(url.hostname)) throw new Error('Celular real não acessa a API do computador por localhost, 127.0.0.1 ou 10.0.2.2. Use o IP da LAN ou uma API HTTPS.');
  if (publicOnly && (isPrivateHost(url.hostname) || !normalizedHost(url.hostname).includes('.'))) throw new Error('O túnel do Expo exige uma API HTTPS pública separada; IP privado da LAN não funciona fora dessa rede.');
  if (physicalDevice && url.protocol === 'http:' && !isPrivateHost(url.hostname)) throw new Error('Para uma API fora da LAN, use HTTPS.');
  return url.href.replace(/\/+$/, '');
}
function hostFromManifest(value) {
  if (!value) return null;
  try { return new URL(value.includes('://') ? value : 'http://' + value).hostname; } catch { return null; }
}
function formatHost(host) {
  return host.includes(':') && !host.startsWith('[') ? '[' + host + ']' : host;
}
function resolveApiUrl(options) {
  const { configuredUrl, hostUri, platform, physicalDevice, development, webHostname, apiPort = 3001 } = options;
  const physical = physicalDevice && platform !== 'web';
  if (configuredUrl?.trim()) return validateApiUrl(configuredUrl, { development, physicalDevice: physical });
  if (!development) throw new Error('Configure EXPO_PUBLIC_API_URL com a URL HTTPS da API para publicar o aplicativo.');
  const port = Number(apiPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('EXPO_PUBLIC_API_PORT inválida.');
  if (platform === 'web') return validateApiUrl('http://' + formatHost(webHostname || 'localhost') + ':' + port);
  const host = hostFromManifest(hostUri);
  if (host && isPrivateHost(host) && !isDeviceLocalHost(host)) return validateApiUrl('http://' + formatHost(host) + ':' + port, { physicalDevice: physical });
  if (physical) throw new Error('Não foi possível localizar a API para este celular. No túnel, informe EXPO_PUBLIC_API_URL HTTPS; na LAN, use npm run expo:lan.');
  return 'http://' + (platform === 'android' ? '10.0.2.2' : 'localhost') + ':' + port;
}
module.exports = { isDeviceLocalHost, isPrivateHost, validateApiUrl, hostFromManifest, resolveApiUrl };
