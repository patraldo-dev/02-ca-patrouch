async function GET({ request, platform }) {
  const env = platform?.env;
  if (!env?.BOOTY_CHAT) {
    return new Response("Chat not available", { status: 503 });
  }
  const id = env.BOOTY_CHAT.idFromName("global-room");
  const stub = env.BOOTY_CHAT.get(id);
  const url = new URL(request.url);
  url.pathname = "/ws";
  const doRequest = new Request(url.toString(), {
    headers: request.headers
  });
  return stub.fetch(doRequest);
}
export {
  GET
};
