// =============================================================================
// adapter/organisation/OrganisationAdapter.ts
// =============================================================================
// Drop this into any project that needs multi-tenant workspaces.
// Requires: AuthAdapter (for the users table FK).
//
// Usage in Bootstrap.ts:
//   await new OrganisationAdapter().init();
// =============================================================================

import type { IAdapter }      from '$lib/server/framework/adapter/IAdapter';
import type { AdapterSchema } from '$lib/server/framework/adapter/AdapterSchema';
import { organisationSchema } from './schema';
import { MigrationRunner }    from '$lib/server/framework/services/database/MigrationRunner';
import { bus }                from '$lib/server/framework/services/bus/BusService';
import type { DataService }   from '$lib/server/framework/services/database/DataService';
import { OrgService }         from '$lib/server/services/organisation/OrgService';

export class OrganisationAdapter implements IAdapter {
  readonly name     = 'organisation-adapter';
  readonly version  = '1.0.0';
  readonly tags     = ['organisation'];
  readonly requires = ['db'];
  readonly schema: AdapterSchema = organisationSchema;

  async init(): Promise<void> {
    const db     = bus.get<DataService>('db');
    const runner = new MigrationRunner(db);
    await runner.run([this.schema]);

    bus.register(new OrgService(), { runtime: 'always', requires: ['db'] });
    await bus.bootService('org');
  }

  async destroy():     Promise<void>    {}
  async healthCheck(): Promise<boolean> { return bus.isActive('org'); }
}
