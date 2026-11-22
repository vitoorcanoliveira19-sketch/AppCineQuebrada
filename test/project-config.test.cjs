const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

test('Metro excludes backend code and dependencies while retaining frontend routes', () => {
  const { resolver } = require('../metro.config');
  const patterns = [resolver.blockList].flat();
  const blocked = file => patterns.some(pattern => pattern.test(path.resolve(__dirname, '..', file)));
  assert.equal(blocked('backend/server.js'), true);
  assert.equal(blocked('backend/node_modules/bcrypt/index.js'), true);
  assert.equal(blocked('app/login.tsx'), false);
  assert.equal(blocked('services/auth.ts'), false);
});

test('backend dependencies remain independently installable for the Docker build context', () => {
  const backend = require('../backend/package.json');
  assert.ok(Object.values(backend.dependencies).every(version => !version.startsWith('file:')));
  assert.equal(backend.scripts['seed:validation'], 'node scripts/seed-validation.js');
});
