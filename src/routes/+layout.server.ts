// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { redirect }              from '@sveltejs/kit';
import { optionalSession }       from '$lib/server/utils/auth';

const PROTECTED_PREFIXES = ['/dashboard', '/onboarding'];

export const load: LayoutServerLoad = async ({ cookies, url }) => {
  const session = await optionalSession(cookies);

  // Only enforce onboarding guard on protected routes
  const isProtected = PROTECTED_PREFIXES.some(p => url.pathname.startsWith(p));

  if (
    isProtected &&
    session &&
    !session.oid &&
    !url.pathname.startsWith('/onboarding') &&
    !url.pathname.startsWith('/api')
  ) {
    throw redirect(302, '/onboarding');
  }

  return { session };
};