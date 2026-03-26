// =============================================================================
// shared/web/WebService.ts
// =============================================================================
// Universal HTTP transport layer.
//
// - Runs on BOTH client and server (no SvelteKit server-only APIs used)
// - Every outbound request in the framework goes through here
// - Never call fetch() directly anywhere else
// - T types the response body — predictable, consistent output every time
//
// Usage:
//   const web = bus.get<WebService>('web');
//   const res = await web.get<User[]>('/api/users');
//   if (res.ok) console.log(res.data);
//   else        console.error(res.error.code);
// =============================================================================

import type { IService } from '../server/framework/services/IServices';


// ── Response types ────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  ok:     boolean;
  status: number;
  data:   T | null;
  error:  ApiError | null;
}

export interface ApiError {
  code:     string;
  message:  string;
  field?:   string;
  details?: unknown;
}


// ── Request options ───────────────────────────────────────────────────────────

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  method?:    HttpMethod;
  headers?:   Record<string, string>;
  token?:     string;
  timeout?:   number;        // ms. default: 10_000
  baseUrl?:   string;
  retry?:     number;        // retry N times on network failure. default: 0
}


// ── Config ────────────────────────────────────────────────────────────────────

export interface WebServiceConfig {
  baseUrl?:        string;
  defaultTimeout?: number;
  getToken?:       () => string | null;
}


// ── WebService ────────────────────────────────────────────────────────────────

export class WebService implements IService {

  readonly name    = 'web';
  readonly version = '1.0.0';
  readonly tags    = ['core', 'web'];

  private config: Required<WebServiceConfig>;

  constructor(config: WebServiceConfig = {}) {
    this.config = {
      baseUrl:        config.baseUrl        ?? '',
      defaultTimeout: config.defaultTimeout ?? 10_000,
      getToken:       config.getToken       ?? (() => null),
    };
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  // WebService is stateless — no connections to open or close.

  async init(): Promise<void> {
    // stateless — nothing to initialise
  }

  async destroy(): Promise<void> {
    // stateless — nothing to tear down
  }

  async healthCheck(): Promise<boolean> {
    // Always healthy — no external dependencies
    return true;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  visit<T = unknown>(url: string, options: RequestOptions & { body?: unknown } = {}): Promise<ApiResponse<T>> {
    return this.execute<T>(url, options);
  }

  get<T = unknown>(url: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return this.execute<T>(url, { ...options, method: 'GET' });
  }

  post<T = unknown>(url: string, body?: unknown, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return this.execute<T>(url, { ...options, method: 'POST', body });
  }

  put<T = unknown>(url: string, body?: unknown, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return this.execute<T>(url, { ...options, method: 'PUT', body });
  }

  patch<T = unknown>(url: string, body?: unknown, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return this.execute<T>(url, { ...options, method: 'PATCH', body });
  }

  delete<T = unknown>(url: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return this.execute<T>(url, { ...options, method: 'DELETE' });
  }

  upload<T = unknown>(url: string, file: File | Blob | FormData, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const form = file instanceof FormData ? file : (() => {
      const fd = new FormData();
      fd.append('file', file);
      return fd;
    })();
    return this.execute<T>(url, { ...options, method: 'POST', body: form });
  }

  async stream(url: string, onChunk: (chunk: string) => void, options: RequestOptions = {}): Promise<void> {
    const fullUrl    = this.resolveUrl(url, options.baseUrl);
    const headers    = this.buildHeaders(options, false);
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), options.timeout ?? this.config.defaultTimeout);

    try {
      const response = await fetch(fullUrl, {
        method:  options.method ?? 'GET',
        headers,
        signal:  controller.signal,
      });
      if (!response.body) return;

      const reader  = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        onChunk(decoder.decode(value, { stream: true }));
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  // ── Core execution ─────────────────────────────────────────────────────────

  private async execute<T>(
    url: string,
    options: RequestOptions & { body?: unknown } = {},
    attempt = 0
  ): Promise<ApiResponse<T>> {

    const fullUrl    = this.resolveUrl(url, options.baseUrl);
    const isFormData = options.body instanceof FormData;
    const headers    = this.buildHeaders(options, !isFormData && options.body !== undefined);
    const body       = this.serializeBody(options.body);

    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), options.timeout ?? this.config.defaultTimeout);

    try {
      const response = await fetch(fullUrl, {
        method:  options.method ?? 'GET',
        headers,
        body,
        signal:  controller.signal,
      });
      clearTimeout(timeout);
      return await this.parseResponse<T>(response);

    } catch (err) {
      clearTimeout(timeout);

      if (attempt < (options.retry ?? 0)) {
        return this.execute<T>(url, options, attempt + 1);
      }

      if ((err as Error).name === 'AbortError') {
        return this.failure<T>(408, { code: 'TIMEOUT', message: 'The request took too long.' });
      }

      return this.failure<T>(0, { code: 'NETWORK_ERROR', message: 'No internet connection.' });
    }
  }

  private async parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
    let body: unknown = null;
    try {
      const text = await response.text();
      body = text ? JSON.parse(text) : null;
    } catch {
      if (!response.ok) {
        return this.failure<T>(response.status, { code: 'PARSE_ERROR', message: 'Unexpected response format.' });
      }
      return { ok: true, status: response.status, data: null, error: null };
    }

    if (response.ok) {
      return { ok: true, status: response.status, data: body as T, error: null };
    }

    return this.failure<T>(response.status, this.extractError(body, response.status));
  }

  private buildHeaders(options: RequestOptions, includeContentType: boolean): Record<string, string> {
    const token    = options.token ?? this.config.getToken();
    const defaults: Record<string, string> = {
      'Accept':        'application/json',
      'X-App-Version': this.version,
    };
    if (includeContentType) defaults['Content-Type'] = 'application/json';
    if (token) defaults['Authorization'] = `Bearer ${token}`;
    return { ...defaults, ...(options.headers ?? {}) };
  }

  private serializeBody(body: unknown): BodyInit | undefined {
    if (body === undefined || body === null) return undefined;
    if (body instanceof FormData) return body;
    return JSON.stringify(body);
  }

  private resolveUrl(path: string, baseUrlOverride?: string): string {
    const base = baseUrlOverride ?? this.config.baseUrl;
    if (!base || path.startsWith('http')) return path;
    return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  }

  private extractError(body: unknown, status: number): ApiError {
    if (body && typeof body === 'object' && 'code' in body && 'message' in body) {
      return body as ApiError;
    }
    return { code: `HTTP_${status}`, message: 'An unexpected error occurred.', details: body };
  }

  private failure<T>(status: number, error: ApiError): ApiResponse<T> {
    return { ok: false, status, data: null, error };
  }
}
