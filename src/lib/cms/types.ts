// =============================================================================
// lib/cms/types.ts
// =============================================================================

export type Theme       = 'dark' | 'light';
export type NavSection  = 'content' | 'media' | 'social' | 'api' | 'settings' | 'usage';
export type EntryStatus = 'published' | 'draft' | 'scheduled';
export type FieldType   = 'text' | 'textarea' | 'number' | 'boolean' | 'stock' | 'select' | 'date' | 'image';

// Defines a single field in a collection's schema.
// Stored as JSONB in the collections.fields column.
export interface CollectionField {
  name:      string;       // API key e.g. "product_name"
  label:     string;       // UI label e.g. "Product Name"
  type:      FieldType;
  required?: boolean;
  options?:  string[];     // only for type === 'select'
  hint?:     string;       // helper text shown below the input
}

// Matches the collections table row.
// fields comes from JSONB — always an array, never null.
export interface Collection {
  id:     string;
  name:   string;
  count:  number;
  color:  string;
  fields: CollectionField[];
}

// Matches the entries table row.
// All typed content lives in data — no hardcoded columns.
export interface Entry {
  id:            string;
  collection_id: string;
  status:        EntryStatus;
  data:          Record<string, unknown>;
  updated_at:    string;
}

export interface SocialPost {
  id:        string;
  caption:   string;
  platforms: string[];
  scheduled: string;
  status:    EntryStatus;
  hasImage:  boolean;
}

// Matches the media table row (to be built).
export interface MediaFile {
  id:      string;
  name:    string;
  size_mb: number;
  mime:    string;
  url:     string;
  width?:  number;
  height?: number;
}

// Matches the sites table row.
export interface Site {
  id:     string;
  name:   string;
  slug:   string;
  active: boolean;
}

// Static nav configuration — never from DB.
export interface NavItem {
  id:    NavSection;
  label: string;
  icon:  string;
}