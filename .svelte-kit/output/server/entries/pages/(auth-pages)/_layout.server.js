async function load({ locals, url }) {
  if (locals.user) {
    const redirectUrl = "/dashboard";
    return {
      status: 302,
      headers: {
        location: redirectUrl
      }
    };
  }
  return {};
}
export {
  load
};
