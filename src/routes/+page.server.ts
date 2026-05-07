// src/routes/+page.server.ts
import type { PageServerLoad } from './$types';
import { optionalSession }     from '$lib/server/utils/auth';

export const load: PageServerLoad = async ({ cookies }) => {
  const session = await optionalSession(cookies);
  // Just pass session to the landing page — let it decide what to show
  return { session };
};