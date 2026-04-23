// =============================================================================
// Central service lifecycle manager.
//
// Responsibilities:
//   - Register services with runtime metadata
//   - Activate / deactivate services based on runtime tier
//   - Auto-deactivate on-demand services after idle timeout
//   - Log every lifecycle event with tags
//   - Validate dependencies at startup
//
// Usage:
//   bus.register(new AuthService(), { runtime: 'always' })
//   bus.register(new LinkedInService(), { runtime: 'on-demand', idleTimeout: 300_000 })
//
//   const auth     = bus.get<IAuthService>('auth')           // sync  — always-active
//   const linkedin = await bus.activate<ILinkedInService>('linkedin') // async — on-demand
// =============================================================================

import type { IService , ServiceRuntime, ServiceState} from '../IServices';

// ── Registration options ──────────────────────────────────────────────────────

export interface RegisterOptions {
  runtime:      ServiceRuntime;
  idleTimeout?: number;    // ms — only for 'on-demand'. default: 300_000 (5 min)
  requires?:    string[];  // service names that must be active before this one
}

// ── Internal service entry ────────────────────────────────────────────────────

interface ServiceEntry {
  service:     IService;
  options:     RegisterOptions;
  state:       ServiceState;
  activatedAt: number | null;   // Date.now() when last activated
  lastUsedAt:  number | null;   // Date.now() when last get() / activate() called
  idleTimer:   ReturnType<typeof setTimeout> | null;
}

// ── BusService ────────────────────────────────────────────────────────────────

export class BusService {
    private name : string = 'BusService'
    private registry : Map<string, ServiceEntry> = new Map<string, ServiceEntry>();
    private booted : boolean = false;

    // ── Register ───────────────────────────────────────────────────────────────
    //
    // Call this in bootstrap.ts before boot().
    // Returns `this` so calls can be chained.
    //
    register(service: IService, options: RegisterOptions): this {
        if (this.registry.has(service.name)) {
            throw new Error(
                `[${this.name}] SERVICE_DUPLICATE - "${service.name}" is already registered.`
            );
        }

        this.registry.set(service.name, {
            service,
            options,
            state:       'registered',
            activatedAt: null,
            lastUsedAt:  null,
            idleTimer:   null,
        });

        this.log(service, 'registered', `runtime: ${options.runtime}`);
        return this;
    }

    // ── bootService() — activate a single named service post-boot ────────────────
    //
    // Used by adapters that register services during their own init().
    // Recursively activates dependencies first, then the service itself.
    // Idempotent — safe to call on an already-active service.
    //
    async bootService(name: string): Promise<void> {
        const entry = this.registry.get(name);
        if (!entry) {
            throw new Error(
                `[${this.name}] SERVICE_NOT_FOUND - "${name}" is not registered.`
            );
        }

        if (entry.state === 'active') return;

        // Activate dependencies first, in declared order
        for (const dep of entry.options.requires ?? []) {
            await this.bootService(dep);
        }

        await this.activateEntry(entry);
    }

    // ── Boot ───────────────────────────────────────────────────────────────────
    //
    // Call once in hooks.server.ts.
    // Validates all dependencies, then activates all 'always' services in
    // registration order.
    //
    async boot(): Promise<void> {
        if (this.booted) return;

        this.log(null, 'boot', `booting ${this.registry.size} registered services...`);

        this.validateDependencies();

        for (const [, entry] of this.registry) {
            if (entry.options.runtime === 'always') {
                await this.activateEntry(entry);
            }
        }

        this.booted = true;
        this.log(null, 'boot', `boot complete. ${this.countByState('active')} services active.`);
    }

    // ── get() — sync, assumes service is active ────────────────────────────────
    //
    // Use for 'always' services you know are running.
    // Throws SERVICE_IDLE if the service exists but is not currently active.
    // Throws SERVICE_NOT_FOUND if the service was never registered.
    //
    get<T extends IService>(name: string): T {
        const entry = this.registry.get(name);

        if (!entry) {
            throw new Error(
                `[${this.name}] SERVICE_NOT_FOUND - "${name}" is not registered. ` + 
                `Did you register it in bootstrap.ts?`
            );
        }

        if (entry.state !== 'active') {
            throw new Error(
                `[${this.name}] SERVICE_IDLE — "${name}" is not currently active ` +
                `(state: ${entry.state}). Use await bus.activate("${name}") instead.`
            );
        }

         entry.lastUsedAt = Date.now();
        this.resetIdleTimer(entry);

        return entry.service as T;
    }

    // ── activate() — async, wakes up on-demand services ───────────────────────
    //
    // Use for 'on-demand' or 'manual' services.
    // If already active — returns immediately (no double init).
    // If idle — runs init() + healthCheck() then returns the service.
    //
    async activate<T extends IService>(name: string): Promise<T> {
        const entry = this.registry.get(name);

        if (!entry) {
            throw new Error(
                `[${this.name}] SERVICE_NOT_FOUND - "${name}" is not registered.`
            );
        }

        if (entry.state === 'active') {
            entry.lastUsedAt = Date.now();
            this.resetIdleTimer(entry);
            return entry.service as T;
        }

        if (entry.state === 'activating') {
            return this.waitForActive<T>(name);
        }

        await this.activateEntry(entry);
        return entry.service as T;
    }

    // ── deactivate() — manually deactivate a service ──────────────────────────
    //
    // Calls destroy() and sets state to idle.
    // Throws if the service is 'always' runtime — core services cannot be
    // manually deactivated.
    //
    async deactivate(name: string): Promise<void> {
        const entry = this.registry.get(name);

        if (!entry) {
            throw new Error(
                `[${this.name}] SERVICE_NOT_FOUND - "${name}" is not registered.`
            );
        }

        if (entry.options.runtime === 'always') {
            throw new Error(
                `[${this.name}] SERVICE_PROTECTED - "${name}" has runtime 'always' ` +
                `and cannot be manually deactivated.`
            );
        }

        if (entry.state !== 'active') return;

        await this.deactivateEntry(entry);
    }

    // ── has() — check if a service is registered ──────────────────────────────
    has(name: string): boolean {
        return this.registry.has(name);
    }

    // ── isActive() — check if a service is currently active ───────────────────
    isActive(name: string): boolean {
        return this.registry.get(name)?.state === 'active';
    }

    // ── status() — get a snapshot of all services ─────────────────────────────
    //
    // Useful for health endpoints and debug logging.
    //
    status(): ServiceStatus[] {
        return Array.from(this.registry.values()).map(entry => ({
            name:        entry.service.name,
            version:     entry.service.version,
            tags:        entry.service.tags,
            runtime:     entry.options.runtime,
            state:       entry.state,
            activatedAt: entry.activatedAt,
            lastUsedAt:  entry.lastUsedAt,
        }));
    }

    // ── shutdown() — gracefully destroy all active services ───────────────────
    //
    // Call this on process exit / SIGTERM.
    //
    async shutdown(): Promise<void> {
        this.log(null, 'shutdown', 'shutting down all active services...');

        for (const [, entry] of this.registry) {
            if (entry.state === 'active') {
                await this.deactivateEntry(entry);
            }
        }

        this.log(null, 'shutdown', 'all services shut down.');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private
    // ─────────────────────────────────────────────────────────────────────────
    private async activateEntry(entry: ServiceEntry): Promise<void> {
        entry.state = 'activating';
        this.log(entry.service, 'activating', '');

        try {
            await entry.service.init();
            const healthy = await entry.service.healthCheck();

            if (!healthy) {
                entry.state = 'error';
                throw new Error(
                    `[${this.name}] SERVICE_UNHEALTHY - "${entry.service.name}" failed health check after init().`
                );
            }

            entry.state = 'active';
            entry.activatedAt = Date.now();
            entry.lastUsedAt = Date.now();

            this.log(entry.service, 'active', `version: ${entry.service.version}`);
            
            if (entry.options.runtime === 'on-demand') {
                this.resetIdleTimer(entry);
            }
        } catch (err) {
            entry.state = 'error';
            this.log(entry.service, 'error', (err as Error).message);
            throw err;
        }
    }

    private async deactivateEntry(entry: ServiceEntry): Promise<void> {
        entry.state = 'deactivating';
        this.log(entry.service, 'deactivating', '');

        if (entry.idleTimer) {
            clearTimeout(entry.idleTimer);
            entry.idleTimer = null;
        }

        try {
            await entry.service.destroy();
        } catch (err) {
            this.log(entry.service, 'error', `destroy() threw: ${(err as Error).message}`);
        }

        entry.state = 'idle';
        entry.activatedAt = null;
        this.log(entry.service, 'idle', 'deactivated');
    }

    private resetIdleTimer(entry: ServiceEntry): void {
        if (entry.options.runtime !== 'on-demand') return;

        const timeout = entry.options.idleTimeout ?? 300_000;

        if (entry.idleTimer) clearTimeout(entry.idleTimer);

        entry.idleTimer = setTimeout(async () => {
            const idleSecs = Math.round(timeout / 1000);
            this.log(entry.service, 'deactivating', `idle for ${idleSecs}s - auto-deactivating...`);
            await this.deactivateEntry(entry);
        }, timeout);
    }

    private validateDependencies(): void {
        for (const [, entry] of this.registry) {
            const requires = entry.options.requires ?? [];

            for (const dep of requires) {
                if (!this.registry.has(dep)) {
                    throw new Error(
                        `[${this.name}] ADAPTER_MISSING_DEPENDENCY -  "${entry.service.name}" requires ` +
                        `"${dep}" which is not registered. Please register "${dep}" first in bootstrap.ts.`
                    )
                }
            }
        }
    }

    private waitForActive<T extends IService>(name: string, attempts = 0): Promise<T> {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const entry = this.registry.get(name);
                if (!entry) return reject(new Error(`[${this.name}] SERVICE_NOT_FOUND — "${name}"`));

                if (entry.state === 'active')     return resolve(entry.service as T);
                if (entry.state === 'error')      return reject(new Error(`[${this.name}] SERVICE_ERROR — "${name}" failed to activate`));
                if (attempts > 50)                return reject(new Error(`[${this.name}] SERVICE_TIMEOUT — "${name}" took too long to activate`));

                this.waitForActive<T>(name, attempts + 1).then(resolve).catch(reject);
            }, 100)
        });
    }

    private countByState(state: ServiceState): number {
        let count = 0;
        for (const [, entry] of this.registry) {
        if (entry.state === state) count++;
        }
        return count;
    }

    private log(service: IService | null, event: string, message: string): void {
        const timestamp = new Date().toISOString();
        const tags      = service ? `[${service.tags.join('] [')}]` : '[bus]';
        const name      = service ? service.name : this.name;
        const pad       = event.padEnd(12);

        console.log(`${timestamp}  ${tags.padEnd(28)}  ${pad}  ${name}  ${message}`);
    }
}

// ── Status snapshot type (returned by bus.status()) ───────────────────────────
export interface ServiceStatus {
  name:        string;
  version:     string;
  tags:        string[];
  runtime:     ServiceRuntime;
  state:       ServiceState;
  activatedAt: number | null;
  lastUsedAt:  number | null;
}

// ── Singleton export ───────────────────────────────────────────────────────────
//
// Import this anywhere in the framework:
//   import { bus } from '$lib/framework/services/BusService'
//
export const bus = new BusService();