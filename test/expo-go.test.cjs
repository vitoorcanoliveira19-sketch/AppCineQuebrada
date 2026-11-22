const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { resolveApiUrl, validateApiUrl } = require('../shared/api-url');
const { parseArgs, createPlan, selectLanHost, probeApi, validateDeepLink } = require('../scripts/lib/expo-go.cjs');
const physical = { platform: 'android', physicalDevice: true, development: true };
const interfaces = { WiFi: [{ family: 'IPv4', internal: false, address: '192.168.1.20' }], VMware: [{ family: 'IPv4', internal: false, address: '192.168.200.1' }] };

test('real Android and iPhone resolve the computer LAN host from the Expo Go manifest', () => {
  for (const platform of ['android', 'ios']) {
    assert.equal(resolveApiUrl({ ...physical, platform, hostUri: '192.168.1.20:8081' }), 'http://192.168.1.20:3001');
    assert.equal(resolveApiUrl({ ...physical, platform, hostUri: 'exp://192.168.1.20:8081', apiPort: 3100 }), 'http://192.168.1.20:3100');
  }
});
test('real devices reject loopback, numeric loopback and Android emulator addresses', () => {
  for (const host of ['localhost','127.0.0.1','127.2.3.4','0.0.0.0','10.0.2.2','10.0.3.2','[::1]','2130706433']) {
    assert.throws(() => resolveApiUrl({ ...physical, configuredUrl: 'http://' + host + ':3001' }), /Celular real/);
  }
});
test('a tunnel hostname is never reused as an implicit API hostname on a physical device', () => {
  assert.throws(() => resolveApiUrl({ ...physical, hostUri: 'random.exp.direct:80' }), /EXPO_PUBLIC_API_URL/);
  assert.throws(() => resolveApiUrl({ ...physical }), /EXPO_PUBLIC_API_URL/);
  assert.equal(resolveApiUrl({ ...physical, hostUri: 'random.exp.direct:80', configuredUrl: 'https://api.example.invalid/api/' }), 'https://api.example.invalid/api');
});
test('emulators and local browser development retain their explicit local fallbacks', () => {
  assert.equal(resolveApiUrl({ ...physical, physicalDevice: false }), 'http://10.0.2.2:3001');
  assert.equal(resolveApiUrl({ ...physical, physicalDevice: false, platform: 'ios' }), 'http://localhost:3001');
  assert.equal(resolveApiUrl({ ...physical, platform: 'web', webHostname: '192.168.1.20' }), 'http://192.168.1.20:3001');
});
test('published builds still require an explicit HTTPS API', () => {
  assert.throws(() => resolveApiUrl({ ...physical, development: false }), /HTTPS/);
  assert.throws(() => resolveApiUrl({ ...physical, development: false, configuredUrl: 'http://192.168.1.20:3001' }), /HTTPS/);
  assert.equal(resolveApiUrl({ ...physical, development: false, configuredUrl: 'https://api.example.invalid' }), 'https://api.example.invalid');
});
test('API configuration rejects credentials and non-HTTP URL schemes', () => {
  for (const value of ['javascript:alert(1)','ftp://host.test','https://user:password@host.test','https://host.test/?token=secret','https://host.test/#x']) {
    assert.throws(() => validateApiUrl(value));
  }
});
test('LAN selection ignores virtual adapters and refuses ambiguous or foreign addresses', () => {
  assert.equal(selectLanHost(null, interfaces), '192.168.1.20');
  assert.throws(() => selectLanHost('127.0.0.1', interfaces));
  assert.throws(() => selectLanHost('192.168.1.99', interfaces));
  assert.throws(() => selectLanHost(null, { ...interfaces, Ethernet: [{ family: 'IPv4', internal: false, address: '192.168.1.21' }] }), /--host/);
});
test('launcher prepares separate public API and Expo Go tunnel and removes offline flags', () => {
  const options = parseArgs(['--mode','tunnel','--api','https://api.example.invalid']);
  const plan = createPlan(options, { env: { EXPO_OFFLINE:'1', EXPO_PACKAGER_PROXY_URL:'http://localhost:8081' }, interfaces });
  assert.equal(plan.api, 'https://api.example.invalid');
  assert.ok(plan.args.includes('--go'));
  assert.ok(plan.args.includes('--tunnel'));
  assert.equal(plan.childEnv.EXPO_OFFLINE, undefined);
  assert.equal(plan.childEnv.EXPO_PACKAGER_PROXY_URL, undefined);
  for (const api of [undefined,'http://192.168.1.20:3001','https://192.168.1.20:3001','https://localhost:3001']) {
    assert.throws(() => createPlan({ ...options, api }, { env:{}, interfaces }));
  }
});
test('LAN launcher respects explicit API ports and pins the Metro host to a real adapter', () => {
  const plan = createPlan(parseArgs(['--host','192.168.1.20','--api-port','3100']), { env:{ EXPO_PUBLIC_API_PORT:'3001' }, interfaces });
  assert.equal(plan.api, 'http://192.168.1.20:3100');
  assert.equal(plan.childEnv.REACT_NATIVE_PACKAGER_HOSTNAME, '192.168.1.20');
  assert.ok(plan.args.includes('--lan'));
});
test('generated QR must be an actual reachable-host Expo Go deep link', () => {
  const plan = { mode:'lan', host:'192.168.1.20' };
  assert.equal(validateDeepLink('exp://192.168.1.20:8081', plan), 'exp://192.168.1.20:8081');
  for (const value of ['http://192.168.1.20:8081','exp://localhost:8081','exp://192.168.1.99:8081']) assert.throws(() => validateDeepLink(value, plan));
});
test('preflight accepts only a ready CineQuebrada API with protected staff access', async () => {
  const paths = [];
  await probeApi('https://api.example.invalid', async url => {
    paths.push(new URL(url).pathname);
    return new Response(JSON.stringify({ sucesso: !url.endsWith('/auth/me') }), { status: url.endsWith('/auth/me') ? 401 : 200 });
  });
  assert.deepEqual(paths, ['/health','/ready','/auth/me']);
  await assert.rejects(probeApi('https://api.example.invalid', async () => new Response('<html>login wall</html>')), /JSON/);
  await assert.rejects(probeApi('https://api.example.invalid', async url => new Response(JSON.stringify({ sucesso: true }), { status:url.endsWith('/ready') ? 503 : 200 })), /ready/);
});
test('preflight performs real HTTP requests rather than validating only URL syntax', async () => {
  const server = http.createServer((req,res) => {
    const auth = req.url === '/auth/me';
    res.writeHead(auth ? 401 : 200, { 'Content-Type':'application/json' });
    res.end(JSON.stringify({ sucesso: !auth }));
  }).listen(0,'127.0.0.1');
  await once(server,'listening');
  try { await probeApi('http://127.0.0.1:' + server.address().port); }
  finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
