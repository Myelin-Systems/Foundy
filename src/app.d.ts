// src/app.d.ts
// SvelteKit global type augmentations.
// These types are available in all +server.ts and +page.server.ts files.

import type { SessionPayload } from '$lib/server/services/auth/TokenService';
import type { Organisation }      from '$lib/server/services/organisation/OrgService';

declare global {
  namespace App {
    // Per-request locals — populated in hooks.server.ts
    interface Locals {
      requestId:  string;      // UUID set in hooks.server.ts for tracing
      requestAt:  number;      // Date.now() at request start
      session?:   SessionPayload; // Optionally populated by middleware
      memberships?: Array<Organisation & { role: string }>;
    }

    interface Error {
      code?:    string;
      message:  string;
    }

    // interface PageData {}
    // interface Platform {}
  }
}

export {};
