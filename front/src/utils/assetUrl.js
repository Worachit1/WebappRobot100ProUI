export function normalizeAssetUrl(url, fallback = "") {
  const value = String(url || "").trim();
  if (!value) return fallback;
  if (/^(https?:|data:|blob:|\/)/.test(value)) return value;
  return `/${value}`;
}
