// src/lib/server/services/foundy/ContentTypeService.ts
import type { IService }    from '$lib/server/framework/services/IServices';
import { bus }              from '$lib/server/framework/services/bus/BusService';
import type { DataService } from '$lib/server/framework/services/database/DataService';

export type FieldType = 'text' | 'textarea' | 'url' | 'number' | 'boolean' | 'select';

export interface FieldDefinition {
  key:       string;       // machine key, e.g. "author_name"
  label:     string;       // display label, e.g. "Author Name"
  type:      FieldType;
  required?: boolean;
  options?:  string[];     // for type: 'select'
}

export interface ContentType {
  id:         string;
  site_id:    string;
  name:       string;      // slug, e.g. "blog-post" — used in API ?type=blog-post
  label:      string;      // display, e.g. "Blog Posts"
  fields:     FieldDefinition[];
  created_at: string;
  updated_at: string;
}

export class ContentTypeService implements IService {
  readonly name    = 'content-type';
  readonly version = '1.0.0';
  readonly tags    = ['foundy', 'content-type'];

  async init():        Promise<void>    {}
  async destroy():     Promise<void>    {}
  async healthCheck(): Promise<boolean> { return true; }

  private get db() { return bus.get<DataService>('db'); }

  async listBySite(siteId: string): Promise<ContentType[]> {
    const { rows } = await this.db.from<ContentType>('content_types')
      .where('site_id', siteId)
      .orderBy('created_at', 'asc')
      .run();
    return rows;
  }

  async getByName(siteId: string, name: string): Promise<ContentType | null> {
    return this.db.from<ContentType>('content_types')
      .where('site_id', siteId)
      .where('name',    name)
      .first();
  }

  async getById(id: string, siteId: string): Promise<ContentType | null> {
    return this.db.from<ContentType>('content_types')
      .where('id',      id)
      .where('site_id', siteId)
      .first();
  }

  async create(siteId: string, data: { name: string; label: string; fields: FieldDefinition[] }): Promise<ContentType> {
    // Slugify name: lowercase, hyphens, alphanum only
    const slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const { rows } = await this.db.from<ContentType>('content_types')
      .insert({ site_id: siteId, name: slug, label: data.label, fields: data.fields as any })
      .returning()
      .run();
    return rows[0];
  }

  async update(id: string, siteId: string, data: { label?: string; fields?: FieldDefinition[] }): Promise<ContentType | null> {
    const { rows } = await this.db.from<ContentType>('content_types')
      .where('id',      id)
      .where('site_id', siteId)
      .update(data as any)
      .returning()
      .run();
    return rows[0] ?? null;
  }

  async delete(id: string, siteId: string): Promise<void> {
    await this.db.from<ContentType>('content_types')
      .where('id',      id)
      .where('site_id', siteId)
      .delete()
      .run();
    // Also wipe all entries of this type — get name first
    const type = await this.db.from<ContentType>('content_types')
      .where('id', id).first();
    if (type) {
      await this.db.from('content')
        .where('site_id', siteId)
        .where('type',    type.name)
        .delete()
        .run();
    }
  }
}
