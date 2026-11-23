const { test } = require("node:test");
const assert = require("node:assert/strict");
const { validateSecurityConfig } = require("../config/security");

test("obsolete authenticator settings cannot block production startup or require an encryption key", () => {
  const keys = ["NODE_ENV", "SESSION_SECRET", "WEB_ORIGINS", "MFA_REQUIRED", "MFA_ENCRYPTION_KEY"];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  try {
    process.env.NODE_ENV = "production";
    process.env.SESSION_SECRET = require("node:crypto").randomBytes(48).toString("base64");
    process.env.WEB_ORIGINS = "https://app.example.invalid";
    delete process.env.MFA_ENCRYPTION_KEY;
    validateSecurityConfig();
    process.env.MFA_ENCRYPTION_KEY = "obsolete-invalid-key";
    for (const value of ["true", "false", "obsolete"]) {
      process.env.MFA_REQUIRED = value;
      validateSecurityConfig();
    }
    process.env.WEB_ORIGINS = "http://app.example.invalid";
    assert.throws(validateSecurityConfig, /HTTPS/);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
