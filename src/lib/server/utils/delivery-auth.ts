// =============================================================================
// src/lib/server/utils/delivery-auth.ts
// =============================================================================

import { json }             from '@sveltejs/kit';
import { bus }              from '$lib/server/framework/services/bus/BusService';
import type { DataService } from '$lib/server/framework/services/database/DataService';

export type TokenType = 'public' | 'secret';

export interface DeliveryContext {
  siteId:    string;
  token:     string;
  tokenType: TokenType;
}

export async function requireDeliveryToken(
  request: Request
): Promise<DeliveryContext | Response> {
  const auth = request.headers.get('authorization') ?? '';

  if (!auth.startsWith('Bearer ')) {
    return json({
      ok: false, code: 'MISSING_TOKEN',
      message: 'Authorization header required. Use: Authorization: Bearer YOUR_TOKEN',
    }, { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } });
  }

  const token = auth.slice(7).trim();
  if (!token) {
    return json({ ok: false, code: 'MISSING_TOKEN', message: 'Bearer token is empty.' }, { status: 401 });
  }

  const db = bus.get<DataService>('db');
  const { rows } = await db.query<{ site_id: string; type: string }>(
    `SELECT site_id, type FROM site_tokens
     WHERE  token = $1 AND revoked = false AND deleted_at IS NULL`,
    [token]
  );

  if (!rows[0]) {
    return json({
      ok: false, code: 'INVALID_TOKEN',
      message: 'Token is invalid or has been revoked.',
    }, { status: 401 });
  }

  const tokenType: TokenType = rows[0].type === 'secret' ? 'secret' : 'public';
  return { siteId: rows[0].site_id, token, tokenType };
}

/** Require secret key for write operations. */
export function requireSecretToken(auth: DeliveryContext): Response | null {
  if (auth.tokenType !== 'secret') {
    return json({
      ok:      false,
      code:    'SECRET_KEY_REQUIRED',
      message: 'This endpoint requires a secret key (pnd_sec_). Never expose secret keys in client-side code.',
    }, { status: 403, headers: NO_CACHE_CORS });
  }
  return null;
}

export function assertSite(auth: DeliveryContext, siteId: string): Response | null {
  if (auth.siteId !== siteId) {
    return json({
      ok: false, code: 'FORBIDDEN',
      message: 'This token does not have access to the requested site.',
    }, { status: 403, headers: DELIVERY_CORS });
  }
  return null;
}

// ── Pagination ────────────────────────────────────────────────────────────────

export interface PaginationParams {
  limit:  number;
  offset: number;
  order:  string;
  dir:    'ASC' | 'DESC';
}

const ALLOWED_ORDER_COLS = new Set(['created_at', 'updated_at']);
const MAX_LIMIT          = 100;
const DEFAULT_LIMIT      = 20;

export function parsePagination(url: URL): PaginationParams {
  const limit  = Math.min(MAX_LIMIT, Math.max(1, parseInt(url.searchParams.get('limit')  ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') ?? '0', 10) || 0);
  const order  = ALLOWED_ORDER_COLS.has(url.searchParams.get('order') ?? '') ? url.searchParams.get('order')! : 'created_at';
  const dir    = url.searchParams.get('dir')?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  return { limit, offset, order, dir };
}

// ── CORS ──────────────────────────────────────────────────────────────────────

export const DELIVERY_CORS: Record<string, string> = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Idempotency-Key',
  'Cache-Control':                'public, max-age=60, stale-while-revalidate=300',
};

export const NO_CACHE_CORS: Record<string, string> = {
  ...DELIVERY_CORS,
  'Cache-Control': 'no-store',
};