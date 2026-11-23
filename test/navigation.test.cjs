const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const moduleUnderTest = { exports: {} };
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../utils/navigation.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(code, { module: moduleUnderTest, exports: moduleUnderTest.exports });
const { voltarComFallback } = moduleUnderTest.exports;

test('back preserves the previous screen when navigator history exists', () => {
  const actions = [];
  voltarComFallback({ canGoBack: () => true, back: () => actions.push('back'), replace: () => assert.fail('Unexpected fallback') }, '/equipe');
  assert.deepEqual(actions, ['back']);
});

test('direct entry to a menu replaces with its parent without dispatching GO_BACK', () => {
  const actions = [];
  voltarComFallback({ canGoBack: () => false, back: () => assert.fail('GO_BACK has no target'), replace: value => actions.push(value) }, '/equipe');
  assert.deepEqual(actions, ['/equipe']);
});

test('public screens with no history return to Home', () => {
  const actions = [];
  voltarComFallback({ canGoBack: () => false, back: () => assert.fail('GO_BACK has no target'), replace: value => actions.push(value) });
  assert.deepEqual(actions, ['/']);
});
