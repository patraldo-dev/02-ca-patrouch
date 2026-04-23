function xorEncrypt(text, key) {
  const encoded = new TextEncoder().encode(text);
  const keyBytes = new TextEncoder().encode(key);
  const result = new Uint8Array(encoded.length);
  for (let i = 0; i < encoded.length; i++) {
    result[i] = encoded[i] ^ keyBytes[i % keyBytes.length];
  }
  let hex = "";
  for (let i = 0; i < result.length; i++) {
    hex += result[i].toString(16).padStart(2, "0");
  }
  return hex;
}
function xorDecrypt(hexStr, key) {
  const bytes = new Uint8Array(hexStr.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hexStr.substr(i * 2, 2), 16);
  }
  const keyBytes = new TextEncoder().encode(key);
  const result = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    result[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return new TextDecoder().decode(result);
}
export {
  xorEncrypt as a,
  xorDecrypt as x
};
