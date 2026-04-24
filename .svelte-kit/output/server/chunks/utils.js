function generateSessionToken() {
  if (typeof crypto === "undefined" || !crypto.randomUUID) {
    throw new Error("crypto.randomUUID is not available");
  }
  return crypto.randomUUID();
}
function avatarVariant(avatarUrl, variant = "avatar200") {
  if (!avatarUrl) return null;
  return avatarUrl.replace(/\/avatar\d+$/, `/${variant}`);
}
export {
  avatarVariant as a,
  generateSessionToken as g
};
