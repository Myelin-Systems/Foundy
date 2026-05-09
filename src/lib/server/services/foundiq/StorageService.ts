// =============================================================================
// services/foundiq/StorageService.ts
// =============================================================================
// MinIO wrapper. URL is never stored in the DB — built at read time from key.
// This means changing CDN domain / moving to R2 requires zero data migration.
// =============================================================================

import type { IService } from '../../framework/services/IServices';

export interface UploadResult {
  key:      string;   // MinIO object key — the only thing stored in the DB
  url:      string;   // built at upload time for immediate use in the response
  size:     number;
  mimeType: string;
}

export interface StorageConfig {
  endpoint:  string;
  port:      number;
  useSSL:    boolean;
  accessKey: string;
  secretKey: string;
  bucket:    string;
  publicUrl: string;
}

export const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'video/mp4', 'video/webm',
  'application/pdf',
  'text/plain', 'text/csv',
  'application/json',
]);

export const MAX_FILE_BYTES = 50 * 1_024 * 1_024; // 50 MB

export class StorageService implements IService {

  readonly name    = 'storage';
  readonly version = '1.1.0';
  readonly tags    = ['foundiq', 'storage'];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client!: any;

  constructor(private readonly config: StorageConfig) {}

  async init(): Promise<void> {
    const { Client } = await import('minio');
    this.client = new Client({
      endPoint:  this.config.endpoint,
      port:      this.config.port,
      useSSL:    this.config.useSSL,
      accessKey: this.config.accessKey,
      secretKey: this.config.secretKey,
    });

    const exists = await this.client.bucketExists(this.config.bucket);
    if (!exists) {
      throw new Error(
        `[storage] Bucket "${this.config.bucket}" does not exist. ` +
        `Did the minio-init container run successfully?`
      );
    }

    console.log(`[storage] Connected — bucket: ${this.config.bucket}`);
  }

  async destroy(): Promise<void> {}

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.bucketExists(this.config.bucket);
      return true;
    } catch {
      return false;
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  async upload(
    siteId:   string,
    filename: string,
    buffer:   Buffer,
    mimeType: string,
  ): Promise<UploadResult> {
    const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key       = `sites/${siteId}/${Date.now()}-${sanitized}`;

    await this.client.putObject(
      this.config.bucket,
      key,
      buffer,
      buffer.length,
      { 'Content-Type': mimeType },
    );

    return {
      key,
      url:      this.buildUrl(key),   // only used for immediate API response
      size:     buffer.length,
      mimeType,
    };
  }

  async delete(key: string): Promise<void> {
    await this.client.removeObject(this.config.bucket, key);
  }

  /**
   * Build the public URL for a key.
   * Call this at READ time — never store the result in the DB.
   */
  buildUrl(key: string): string {
    const base = this.config.publicUrl.replace(/\/$/, '');
    return `${base}/${this.config.bucket}/${key}`;
  }
}