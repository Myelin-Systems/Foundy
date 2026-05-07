// =============================================================================
// adapter/foundy/FoundyAdapter.ts
// Requires: AuthAdapter + OrganisationAdapter already booted.
// =============================================================================
import type { IAdapter }         from '$lib/server/framework/adapter/IAdapter';
import type { AdapterSchema }    from '$lib/server/framework/adapter/AdapterSchema';
import { foundySchema }          from './schema';
import { MigrationRunner }       from '$lib/server/framework/services/database/MigrationRunner';
import { bus }                   from '$lib/server/framework/services/bus/BusService';
import type { DataService }      from '$lib/server/framework/services/database/DataService';
import { SiteService }           from '$lib/server/services/foundy/SiteService';
import { ContentTypeService }    from '$lib/server/services/foundy/ContentTypeService';
import { ContentService }        from '$lib/server/services/foundy/ContentService';
import { UsageService } from '$lib/server/services/foundy/UsageService';
import { StorageService } from '$lib/server/services/foundy/StorageService';

export class FoundyAdapter implements IAdapter {
  readonly name     = 'foundy-adapter';
  readonly version  = '1.0.0';
  readonly tags     = ['foundy'];
  readonly requires = ['db', 'org'];
  readonly schema: AdapterSchema = foundySchema;

  async init(): Promise<void> {
    const db = bus.get<DataService>('db');
    await new MigrationRunner(db).run([this.schema]);

    bus.register(new SiteService(),        { runtime: 'always', requires: ['db'] });
    bus.register(new ContentTypeService(), { runtime: 'always', requires: ['db'] });
    bus.register(new ContentService(),     { runtime: 'always', requires: ['db'] });
    bus.register(new UsageService(),       { runtime: 'always', requires: ['db'] });
    bus.register(
      new StorageService({
        endpoint:  process.env.MINIO_ENDPOINT  ?? 'localhost',
        port:      parseInt(process.env.MINIO_PORT ?? '9000', 10),
        useSSL:    process.env.MINIO_USE_SSL === 'true',
        accessKey: process.env.MINIO_ACCESS_KEY ?? '',
        secretKey: process.env.MINIO_SECRET_KEY ?? '',
        bucket:    process.env.MINIO_BUCKET     ?? 'foundy-media',
        publicUrl: process.env.MINIO_PUBLIC_URL ?? 'http://localhost:9000',
      }),
      { runtime: 'always', requires: ['db'] }
    );


    await bus.bootService('site');
    await bus.bootService('content-type');
    await bus.bootService('content');
    await bus.bootService('usage');
    await bus.bootService('storage');
  }

  async destroy():     Promise<void>    {}
  async healthCheck(): Promise<boolean> {
    return ( 
      bus.isActive('site') && 
      bus.isActive('content-type') && 
      bus.isActive('content') && 
      bus.isActive('usage') && 
      bus.isActive('storage')
    );
  }
}
