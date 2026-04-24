// src/routes/profile/+page.server.js — redirect to /account
import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
    const user = locals?.user;
    if (!user) throw redirect(302, '/login');
    throw redirect(302, '/account');
}
