// src/routes/register/+page.server.ts
import { redirect }            from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { optionalSession }     from '$lib/server/utils/auth';

export const load: PageServerLoad = async ({ cookies }) => {
  const session = await optionalSession(cookies);
  if (session) throw redirect(302, '/onboarding');
  return {};
};