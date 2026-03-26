// =============================================================================
// Base interface every service in the framework must implement.
// =============================================================================

export type ServiceRuntime =
  | 'always'      // activated on bootstrap, never deactivated (core services)
  | 'on-demand'   // activated on first activate(), deactivated after idleTimeout
  | 'manual';     // only activated when explicitly called, never auto-deactivated

export type ServiceState =
  | 'registered'  // known to the bus, not yet initialised
  | 'activating'  // init() is currently running
  | 'active'      // running and ready to use
  | 'deactivating'// destroy() is currently running
  | 'idle'        // was active, now destroyed — can be re-activated
  | 'error';      // init() or healthCheck() failed

export interface IService {

  // ── Identity ────────────────────────────────────────────────────────────────
  readonly name:    string;   // unique key on the bus e.g. 'auth', 'linkedin'
  readonly version: string;   // semver e.g. '1.0.0'
  readonly tags:    string[]; // e.g. ['core', 'auth'] or ['social', 'linkedin']

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  init():        Promise<void>;    // called when service activates
  destroy():     Promise<void>;    // called when service deactivates — close
                                   // connections, clear timers, free memory
  healthCheck(): Promise<boolean>; // called after init() to verify readiness
                                   // return false → state set to 'error'
}
