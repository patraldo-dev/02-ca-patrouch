async function load({ locals }) {
  if (!locals.user) {
    throw redirect(302, "/login");
  }
  return {};
}
export {
  load
};
