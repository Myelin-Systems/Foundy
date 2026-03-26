// =============================================================================
// framework/adapters/IAdapter.ts
// =============================================================================
// Base interface every adapter must implement.
// Adapters are thin wiring shells — schema + dependencies + service wiring.
// All business logic lives in services/, never in adapters.
// =============================================================================

import type { AdapterSchema } from './AdapterSchema';

export interface IAdapter {
  readonly name:     string;
  readonly version:  string;
  readonly tags:     string[];
  readonly requires: string[];   // bus service names that must be active first
  readonly schema:   AdapterSchema;

  init():        Promise<void>;
  destroy():     Promise<void>;
  healthCheck(): Promise<boolean>;
}