// =============================================================================
// src/routes/api/auth/register/+server.ts
// =============================================================================
// POST /api/auth/register
//
// Body:  { email, password, fullName, orgName? }
//
// If orgName is provided:
//   → creates user + org + membership in one flow
//   → user lands on /dashboard/cms
//
// If orgName is omitted:
//   → creates user only
//   → user lands on /onboarding to create their org
//
// Success 201: { ok: true, user: PublicUser, hasOrg: boolean }
// =============================================================================

import type { RequestHandler } from '@sveltejs/kit';
import { json }                from '@sveltejs/kit';
import { bus }                 from '$lib/server/framework/services/bus/BusService';
import type { AuthService }    from '$lib/server/services/auth/AuthService';
import type { OrgService }     from '$lib/server/services/organisation/OrgService';
import { handleAuthError, setSessionCookie } from '$lib/server/utils/auth';

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return json({ ok: false, code: 'VALIDATION_ERROR', message: 'Request body must be JSON.' }, { status: 400 });
    }

    const { email, password, fullName, orgName } = body as Record<string, unknown>;

    // ── Validation ────────────────────────────────────────────────────────────
    if (!email || typeof email !== 'string') {
      return json({ ok: false, code: 'VALIDATION_ERROR', message: 'Email is required.', field: 'email' }, { status: 400 });
    }
    if (!password || typeof password !== 'string') {
      return json({ ok: false, code: 'VALIDATION_ERROR', message: 'Password is required.', field: 'password' }, { status: 400 });
    }
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return json({ ok: false, code: 'VALIDATION_ERROR', message: 'Full name must be at least 2 characters.', field: 'fullName' }, { status: 400 });
    }
    if (orgName !== undefined && (typeof orgName !== 'string' || orgName.trim().length < 2)) {
      return json({ ok: false, code: 'VALIDATION_ERROR', message: 'Organisation name must be at least 2 characters.', field: 'orgName' }, { status: 400 });
    }

    // ── Register user ─────────────────────────────────────────────────────────
    const auth   = bus.get<AuthService>('auth');
    const result = await auth.register({
      email:     email as string,
      password:  password as string,
      fullName:  fullName as string,
      ipAddress: getClientAddress(),
      userAgent: request.headers.get('user-agent') ?? undefined,
    });

    // ── Optionally create org ─────────────────────────────────────────────────
    // OrgService.create() also sets active_org_id on the user atomically,
    // so the next getSession() call will return oid immediately.
    const hasOrg = !!(orgName && typeof orgName === 'string' && orgName.trim());

    if (hasOrg) {
      const orgSvc = bus.get<OrgService>('org');
      await orgSvc.create(
        { name: (orgName as string).trim() },
        result.user.id,
      );
    }

    setSessionCookie(cookies, result.token);

    return json({ ok: true, user: result.user, hasOrg }, { status: 201 });

  } catch (err) {
    return handleAuthError(err);
  }
};