function generateSessionToken() {
  if (typeof crypto === "undefined" || !crypto.randomUUID) {
    throw new Error("crypto.randomUUID is not available");
  }
  return crypto.randomUUID();
}
export {
  generateSessionToken as g
};
