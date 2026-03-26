// src/routes/+layout.server.ts
// Runs on every page. Passes session info to all layouts and pages.
// If the session cookie is valid, $page.data.session is populated.

import type { LayoutServerLoad } from './$types';
import { optionalSession }       from '$lib/server/utils/auth';

export const load: LayoutServerLoad = async ({ cookies }) => {
  const session = await optionalSession(cookies);
  return { session };
};
