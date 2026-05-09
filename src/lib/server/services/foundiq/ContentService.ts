// src/lib/server/services/foundiq/ContentService.ts
import type { IService }    from '$lib/server/framework/services/IServices';
import { bus }              from '$lib/server/framework/services/bus/BusService';
import type { DataService } from '$lib/server/framework/services/database/DataService';

export type ContentStatus = 'draft' | 'published' | 'archived';

export interface ContentEntry {
  id:         string;
  site_id:    string;
  type:       string;                    // free string — matches a content_type.name
  status:     ContentStatus;
  data:       Record<string, unknown>;   // arbitrary keys defined by the type's fields
  created_at: string;
  updated_at: string;
}

export class ContentService implements IService {
  readonly name    = 'content';
  readonly version = '1.0.0';
  readonly tags    = ['foundiq', 'content'];

  async init():        Promise<void>    {}
  async destroy():     Promise<void>    {}
  async healthCheck(): Promise<boolean> { return true; }

  private get db() { return bus.get<DataService>('db'); }

  // ── Private queries ───────────────────────────────────────────────────────

  async listByType(siteId: string, type: string): Promise<ContentEntry[]> {
    const { rows } = await this.db.from<ContentEntry>('content')
      .where('site_id', siteId)
      .where('type',    type)
      .orderBy('created_at', 'desc')
      .run();
    return rows;
  }

  async getById(id: string, siteId: string): Promise<ContentEntry | null> {
    return this.db.from<ContentEntry>('content')
      .where('id',      id)
      .where('site_id', siteId)
      .first();
  }

  async create(siteId: string, payload: {
    type:   string;
    status: ContentStatus;
    data:   Record<string, unknown>;
  }): Promise<ContentEntry> {
    const { rows } = await this.db.from<ContentEntry>('content')
      .insert({ site_id: siteId, ...payload })
      .returning()
      .run();
    return rows[0];
  }

  async update(id: string, siteId: string, updates: {
    status?: ContentStatus;
    data?:   Record<string, unknown>;
  }): Promise<ContentEntry | null> {
    const { rows } = await this.db.from<ContentEntry>('content')
      .where('id',      id)
      .where('site_id', siteId)
      .update(updates as any)
      .returning()
      .run();
    return rows[0] ?? null;
  }

  async delete(id: string, siteId: string): Promise<void> {
    await this.db.from<ContentEntry>('content')
      .where('id',      id)
      .where('site_id', siteId)
      .delete()
      .run();
  }

  // ── Public SDK fetch — published entries only ─────────────────────────────
  async fetchPublic(siteId: string, opts: {
    type?:   string;
    ids?:    string[];   // filter by specific entry IDs
    start?:  number;
    end?:    number;
  }): Promise<ContentEntry[]> {
    let q = this.db.from<ContentEntry>('content')
      .where('site_id', siteId)
      .where('status',  'published');

    if (opts.type) q = q.where('type', opts.type);

    const { rows } = await q.orderBy('created_at', 'desc').run();

    if (opts.ids?.length) return rows.filter(r => opts.ids!.includes(r.id));

    const start = opts.start ?? 0;
    const end   = opts.end   ?? rows.length - 1;
    return rows.slice(start, end + 1);
  }
}
