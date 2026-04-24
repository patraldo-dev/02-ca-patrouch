function avatarVariant(avatarUrl, variant = "avatar200") {
  if (!avatarUrl) return null;
  return avatarUrl.replace(/\/avatar\d+$/, `/${variant}`);
}
export {
  avatarVariant as a
};
