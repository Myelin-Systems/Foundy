// src/routes/dashboard/settings/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireSession }      from '$lib/server/utils/auth';

export const load: PageServerLoad = async ({ cookies }) => {
  const session = await requireSession(cookies);
  return { session };
};
