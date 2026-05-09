// =============================================================================
// server/utils/org.ts
// =============================================================================
// Route guards for multi-tenant org context.
// Replaces membership.ts — clean, no Foundiq-specific logic.
//
// Usage:
//   // Requires user to be in their org with at least 'viewer' role
//   const ctx = await requireOrg(cookies);
//
//   // Requires at least 'editor' role
//   const ctx = await requireOrg(cookies, 'editor');
//
//   // Returns null instead of throwing if not in an org
//   const ctx = await optionalOrg(cookies);
// =============================================================================

import { json }             from '@sveltejs/kit';
import type { Cookies }     from '@sveltejs/kit';
import { requireSession }   from '$lib/server/utils/auth';
import { bus }              from '$lib/server/framework/services/bus/BusService';
import type { OrgService }  from '$lib/server/services/organisation/OrgService';
import { OrgService as OrgServiceClass } from '$lib/server/services/organisation/OrgService';
import type { Organisation } from '$lib/server/services/organisation/OrgService';
import type { SessionPayload } from '$lib/server/services/auth/TokenService';

export interface OrgContext {
  session: SessionPayload;
  org:     Organisation;
  role:    string;
}

/**
 * Requires the user to be authenticated AND belong to an organisation.
 * Throws a 401/403/404 Response if not.
 *
 * minRole is checked against OrgService.roleOrder.
 * Default: 'viewer' — any member passes.
 */
export async function requireOrg(
  cookies: Cookies,
  minRole: string = 'viewer',
): Promise<OrgContext> {
  const session = await requireSession(cookies);
  const orgSvc  = bus.get<OrgService>('org');

  const orgWithRole = await orgSvc.getForUser(session.sub);
  if (!orgWithRole) {
    throw json(
      { ok: false, code: 'NO_ORG', message: 'You are not a member of any organisation.' },
      { status: 404 }
    );
  }

  const { role, ...org } = orgWithRole;

  if (!OrgServiceClass.hasMinRole(role, minRole)) {
    throw json(
      { ok: false, code: 'FORBIDDEN', message: `Requires ${minRole} role or higher.` },
      { status: 403 }
    );
  }

  return { session, org, role };
}

/**
 * Like requireOrg but returns null instead of throwing.
 * Use for pages that behave differently when in an org vs not.
 */
export async function optionalOrg(cookies: Cookies): Promise<OrgContext | null> {
  try {
    return await requireOrg(cookies);
  } catch {
    return null;
  }
}

/**
 * Requires the user to be in a specific org by ID.
 * Use when the org ID is in the URL (e.g. /orgs/[id]/...).
 */
export async function requireOrgById(
  cookies: Cookies,
  orgId:   string,
  minRole: string = 'viewer',
): Promise<OrgContext> {
  const session = await requireSession(cookies);
  const orgSvc  = bus.get<OrgService>('org');

  const org  = await orgSvc.getById(orgId);
  if (!org) throw json({ ok: false, code: 'NOT_FOUND' }, { status: 404 });

  const role = await orgSvc.getRole(orgId, session.sub);
  if (!role) throw json({ ok: false, code: 'FORBIDDEN', message: 'Not a member.' }, { status: 403 });

  if (!OrgServiceClass.hasMinRole(role, minRole)) {
    throw json({ ok: false, code: 'FORBIDDEN', message: `Requires ${minRole} role or higher.` }, { status: 403 });
  }

  return { session, org, role };
}
