// src/lib/server/framework/adapter/social/SocialAdapter.ts
import type { IAdapter }           from '$lib/server/framework/adapter/IAdapter';
import type { AdapterSchema }      from '$lib/server/framework/adapter/AdapterSchema';
import { socialSchema }            from './schema';
import { MigrationRunner }         from '$lib/server/framework/services/database/MigrationRunner';
import { bus }                     from '$lib/server/framework/services/bus/BusService';
import type { DataService }        from '$lib/server/framework/services/database/DataService';
import { SocialAccountService }    from '$lib/server/services/social/SocialAccountService';
import { SocialPostService }       from '$lib/server/services/social/SocialPostService';

export class SocialAdapter implements IAdapter {
  readonly name    = 'social-adapter';
  readonly version = '1.0.0';
  readonly tags    = ['social'];
  readonly requires = ['db', 'org'];
  readonly schema: AdapterSchema = socialSchema;

  async init(): Promise<void> {
    const db     = bus.get<DataService>('db');
    const runner = new MigrationRunner(db);
    await runner.run([this.schema]);

    bus.register(new SocialAccountService(), { runtime: 'always', requires: ['db'] });
    bus.register(new SocialPostService(),    { runtime: 'always', requires: ['db', 'social-account'] });

    await bus.bootService('social-account');
    await bus.bootService('social-post');
  }

  async destroy():     Promise<void>    {}
  async healthCheck(): Promise<boolean> {
    return bus.isActive('social-account') && bus.isActive('social-post');
  }
}
