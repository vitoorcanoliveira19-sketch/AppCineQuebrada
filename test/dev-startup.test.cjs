const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { once } = require('node:events');
const { parseOptions, createEnvFile, readBackendConfig, assertPortAvailable, serviceAddresses } = require('../scripts/dev.cjs');

function workspace(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cine-startup-'));
  t.after(() => {
    const target = path.resolve(directory);
    assert.ok(target.startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(target).startsWith('cine-startup-'));
    fs.rmSync(target, { recursive: true });
  });
  return directory;
}
const configuration = 'NODE_ENV=development\nDB_HOST=127.0.0.1\nDB_USER=test-user\nDB_PASSWORD="test#password"\nDB_NAME=test-db\nSESSION_SECRET=synthetic-session-secret-at-least-32-characters\n';

test('setup creates a private env with a random secret and preserves existing configuration', t => {
  const directory = workspace(t);
  fs.writeFileSync(path.join(directory, '.env.example'), configuration.replace(/SESSION_SECRET=.*/, 'SESSION_SECRET=SUBSTITUA'));
  assert.equal(createEnvFile(directory), true);
  const contents = fs.readFileSync(path.join(directory, '.env'), 'utf8');
  assert.match(contents, /SESSION_SECRET=[A-Za-z0-9+/]{64}/);
  assert.equal(createEnvFile(directory), false);
  assert.equal(fs.readFileSync(path.join(directory, '.env'), 'utf8'), contents);
});

test('startup reads its project env instead of the terminal directory and shell settings take precedence', t => {
  const directory = workspace(t);
  fs.writeFileSync(path.join(directory, '.env'), configuration);
  const env = readBackendConfig({ apiPort: 3100 }, { DB_HOST: '192.168.1.10' }, directory);
  assert.equal(env.PORT, '3100');
  assert.equal(env.DB_HOST, '192.168.1.10');
  assert.equal(env.DB_PASSWORD, 'test#password');
  assert.equal(env.DB_PORT, '3306');
});

test('startup rejects incomplete configuration and accidental production use without printing credentials', t => {
  const directory = workspace(t);
  assert.throws(() => readBackendConfig({}, {}, directory), /Configure.*DB_HOST/);
  fs.writeFileSync(path.join(directory, '.env'), configuration);
  assert.throws(() => readBackendConfig({}, { NODE_ENV: 'production' }, directory), /produção/);
  assert.throws(() => readBackendConfig({}, { DB_PASSWORD: 'SUBSTITUA_PELA_SENHA_LOCAL' }, directory), /Configure DB_PASSWORD/);
  assert.throws(() => readBackendConfig({}, { PORT: 'not-a-port' }, directory), /PORT inválida/);
});

test('startup validates arguments before any installation or service mutation', () => {
  const options = parseOptions(['lan', '--host', '192.168.1.10', '--api-port', '3100', '--port', '8090', '--clear']);
  assert.equal(options.service, 'lan');
  assert.equal(options.apiPort, 3100);
  assert.equal(options.port, 8090);
  assert.equal(options.clear, true);
  for (const args of [['unknown'], ['api', '--api-port', '0'], ['all', '--port', '65536'], ['setup', '--check'], ['api', '--host', '192.168.1.10']]) {
    assert.throws(() => parseOptions(args));
  }
});

test('busy-port checks leave the existing service running', async () => {
  const server = net.createServer().listen(0, '0.0.0.0');
  await once(server, 'listening');
  const port = server.address().port;
  try {
    await assert.rejects(assertPortAvailable(port, 'API'), /ocupada/);
    assert.ok(server.listening);
  } finally { await new Promise(resolve => server.close(resolve)); }
  await assertPortAvailable(port, 'API');
});

test('web and API share a hostname so SameSite session cookies work during local login', () => {
  for (const BIND_HOST of ['0.0.0.0', '::', '127.0.0.1', '::1', 'localhost', '192.168.1.20']) {
    const urls = serviceAddresses({ BIND_HOST, PORT:'3001' }, 8081);
    assert.equal(new URL(urls.api).hostname, new URL(urls.web).hostname);
    assert.equal(new URL(urls.api).port, '3001');
    assert.equal(new URL(urls.web).port, '8081');
  }
});
