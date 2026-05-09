// src/lib/server/utils/membership.ts
// Guards API routes that require the user to be a member of a specific company.
// Usage:
//   const { session, company, role } = await requireMembership(cookies, companyId);

import { json }                from '@sveltejs/kit';
import type { Cookies }        from '@sveltejs/kit';
import { requireSession }      from '$lib/server/utils/auth';
import { bus }                 from '$lib/server/framework/services/bus/BusService';
import type { CompanyService } from '$lib/server/services/foundiq/CompanyService';
import type { SessionPayload } from '$lib/server/services/auth/TokenService';
import type { Company }        from '$lib/server/services/foundiq/CompanyService';

export type MemberRole = 'owner' | 'editor' | 'viewer';

export interface MembershipContext {
  session:   SessionPayload;
  company:   Company;
  role:      MemberRole;
}

export async function requireMembership(
  cookies:   Cookies,
  companyId: string,
  minRole:   MemberRole = 'viewer',
): Promise<MembershipContext> {
  const session  = await requireSession(cookies);
  const companies = bus.get<CompanyService>('company');

  const company = await companies.getById(companyId);
  if (!company) throw json({ ok: false, code: 'NOT_FOUND', message: 'Company not found.' }, { status: 404 });

  const role = await companies.getMemberRole(companyId, session.sub);
  if (!role) throw json({ ok: false, code: 'FORBIDDEN', message: 'You are not a member of this company.' }, { status: 403 });

  const order: MemberRole[] = ['viewer', 'editor', 'owner'];
  if (order.indexOf(role) < order.indexOf(minRole)) {
    throw json({ ok: false, code: 'FORBIDDEN', message: `Requires ${minRole} role or higher.` }, { status: 403 });
  }

  return { session, company, role };
}

// Resolves company from session — finds the company the user belongs to.
// Used on pages where companyId isn't in the URL.
export async function requireCompanySession(cookies: Cookies): Promise<MembershipContext> {
  const session   = await requireSession(cookies);
  const companies = bus.get<CompanyService>('company');

  const company = await companies.getByUserId(session.sub);
  if (!company) throw json({ ok: false, code: 'NO_COMPANY', message: 'No company found for this account.' }, { status: 404 });

  const role = await companies.getMemberRole(company.id, session.sub);
  return { session, company, role: (role ?? 'viewer') as MemberRole };
}
