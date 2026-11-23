const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const ts = require('typescript');
const path = require('node:path');

function client(platform, fetchImpl, savedToken) {
  const secure = new Map(savedToken ? [['cinequebrada.auth.token', savedToken]] : []);
  let removed = 0;
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../services/auth.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    module, exports: module.exports, fetch: fetchImpl, Response, Error,
    localStorage: { removeItem() { removed++; }, setItem() { throw new Error('Web credentials must not be persisted'); }, getItem() { throw new Error('Legacy credentials must not be read'); } },
    require(id) {
      if (id === 'react-native') return { Platform: { OS: platform } };
      if (id === 'expo-secure-store') return {
        getItemAsync: async key => secure.get(key) || null,
        setItemAsync: async (key, value) => secure.set(key, value),
        deleteItemAsync: async key => secure.delete(key),
      };
      if (id === './api') return { API_URL: 'https://api.example.invalid' };
      if (id === 'expo-router') return { router: { replace() {} } };
      throw new Error('Unexpected module: ' + id);
    },
  });
  return { auth: module.exports, secure, removed: () => removed };
}
const ok = body => new Response(JSON.stringify(body), { status: 200 });
test('web login uses cookies; reload restores CSRF without reading or writing stored credentials', async () => {
  const calls = [];
  const session = { csrfToken: 'csrf-test', usuario: { papel: 'educador' } };
  const mockFetch = async (url, options) => { calls.push({ url, options }); return ok(session); };
  const first = client('web', mockFetch);
  await first.auth.entrar(' user@example.invalid ', 'test-password');
  assert.equal(calls[0].options.credentials, 'include');
  assert.equal(JSON.parse(calls[0].options.body).cliente, 'web');
  assert.ok(first.removed() > 0); assert.equal(first.secure.size, 0);
  const reloaded = client('web', mockFetch);
  const token = await reloaded.auth.lerToken();
  assert.equal(token, 'cookie-session');
  await reloaded.auth.requisicaoInterna('/auth/senha', token, { method: 'POST', body: '{}' });
  const last = calls.at(-1).options;
  assert.equal(last.headers['X-CSRF-Token'], 'csrf-test');
  assert.equal(last.headers.Authorization, undefined);
  assert.equal(last.credentials, 'include');
});
test('native clients retain SecureStore and send only bearer credentials', async () => {
  const calls = [];
  const current = client('android', async (url, options) => { calls.push({ url, options }); return ok({ token: 'native-secret', usuario: {}, csrfToken: 'unused' }); });
  await current.auth.entrar('native@example.invalid', 'test-password');
  assert.equal(await current.auth.lerToken(), 'native-secret');
  await current.auth.requisicaoInterna('/auth/me', 'native-secret');
  const last = calls.at(-1).options;
  assert.equal(last.headers.Authorization, 'Bearer native-secret');
  assert.equal(last.headers['X-CSRF-Token'], undefined);
  assert.equal(last.credentials, 'omit');
  await current.auth.apagarToken();
  assert.equal(current.secure.size, 0);
  assert.ok(calls.some(c => c.url.endsWith('/auth/logout')));
});
test('logout network failure stays visible and does not discard native revocation credentials', async () => {
  const current = client('ios', async () => { throw new Error('offline'); }, 'saved-native-token');
  await assert.rejects(current.auth.apagarToken(), /offline/);
  assert.equal(await current.auth.lerToken(), 'saved-native-token');
});
test('an expired cookie is not treated as an active browser session', async () => {
  const current = client('web', async () => new Response('{}', { status: 401 }));
  assert.equal(await current.auth.lerToken(), null);
});
