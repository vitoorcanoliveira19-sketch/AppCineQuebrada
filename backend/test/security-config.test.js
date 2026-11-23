const { test } = require("node:test");
const assert = require("node:assert/strict");
const { mfaRequired, validateSecurityConfig } = require("../config/security");

function configured(mode, value, check) {
  const previous = { NODE_ENV: process.env.NODE_ENV, MFA_REQUIRED: process.env.MFA_REQUIRED };
  try {
    if (mode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = mode;
    if (value === undefined) delete process.env.MFA_REQUIRED;
    else process.env.MFA_REQUIRED = value;
    check();
  } finally {
    for (const [key, original] of Object.entries(previous)) {
      if (original === undefined) delete process.env[key];
      else process.env[key] = original;
    }
  }
}

test("development temporarily defaults to no MFA and can explicitly enable it", () => {
  for (const value of [undefined, "false"]) configured("development", value, () => assert.equal(mfaRequired(), false));
  configured("development", "true", () => assert.equal(mfaRequired(), true));
});

test("production, test, staging and an unspecified environment cannot disable MFA", () => {
  for (const mode of ["production", "test", "staging", undefined]) {
    for (const value of [undefined, "true"]) configured(mode, value, () => assert.equal(mfaRequired(), true));
    configured(mode, "false", () => {
      assert.throws(mfaRequired, /só é permitido com NODE_ENV=development/);
      assert.throws(validateSecurityConfig, /só é permitido com NODE_ENV=development/);
    });
  }
});

test("misspelled MFA settings fail configuration validation", () => {
  for (const value of ["", "0", "1", "FALSE", "disabled"]) configured("development", value, () => {
    assert.throws(mfaRequired, /deve ser true ou false/);
    assert.throws(validateSecurityConfig, /deve ser true ou false/);
  });
});
