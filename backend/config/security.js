const production = () => process.env.NODE_ENV === "production";
const secret = () => {
  const value = process.env.SESSION_SECRET || process.env.JWT_SECRET;
  if (!value || value.length < 32) throw new Error("Configure SESSION_SECRET com pelo menos 32 caracteres aleatórios.");
  if (production() && /^(SUBSTITUA|REPLACE_|segredo-aleatorio)/i.test(value)) throw new Error("Substitua o segredo de exemplo antes de publicar.");
  return value;
};
const origins = () => (process.env.WEB_ORIGINS || "").split(",").map(v => v.trim()).filter(Boolean);
const originAllowed = origin => origins().includes(origin) || (!production() && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
const validateSecurityConfig = () => {
  secret();
  if (production() && (!origins().length || origins().some(v => {
    try { const url = new URL(v); return url.protocol !== "https:" || url.origin !== v; } catch { return true; }
  }))) throw new Error("WEB_ORIGINS deve listar as origens HTTPS exatas do site em produção.");
};
module.exports = { production, secret, originAllowed, validateSecurityConfig };
