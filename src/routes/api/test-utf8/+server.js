// src/routes/api/test-utf8/+server.js
/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
    const { text } = await request.json();
    console.log('Received text:', text);
    return new Response(JSON.stringify({ received: text }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json; charset=utf-8'
        }
    });
}
