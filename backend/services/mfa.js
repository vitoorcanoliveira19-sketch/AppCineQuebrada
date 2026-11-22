const crypto = require("node:crypto");
const OTPAuth = require("otpauth");
const { encryptionKey, secret } = require("../config/security");
function encrypt(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
}
function decrypt(value) {
  const data = Buffer.from(value, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString("utf8");
}
function totp(secretValue, email) {
  return new OTPAuth.TOTP({ issuer: "CineQuebrada", label: email, algorithm: "SHA1", digits: 6, period: 30, secret: secretValue });
}
const recoveryHash = value => crypto.createHmac("sha256", secret()).update("recovery:" + value).digest("hex");
function recoveryCodes() {
  const codes = Array.from({ length: 10 }, () => crypto.randomBytes(10).toString("hex"));
  return { codes, hashes: codes.map(recoveryHash) };
}
function counterValido(usuario, codigo) {
  if (typeof codigo !== "string" || !/^\d{6}$/.test(codigo)) return null;
  const otp = totp(decrypt(usuario.mfaSecret), usuario.email);
  const delta = otp.validate({ token: codigo, window: 1 });
  if (delta === null) return null;
  const counter = Math.floor(Date.now() / 30000) + delta;
  return counter > Number(usuario.mfaLastCounter ?? -1) ? counter : null;
}
module.exports = { encrypt, decrypt, totp, recoveryHash, recoveryCodes, counterValido };
