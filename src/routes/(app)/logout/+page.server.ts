// src/routes/logout/+page.server.ts
import { redirect }          from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, cookies }) => {
  await fetch('/api/auth/logout', { method: 'POST' });
  throw redirect(302, '/login');
};
