// =============================================================================
// adapters/email/EmailAdapter.ts
// =============================================================================
// Wiring shell for the email module.
// No tables — EmailService is stateless (emails are not stored in DB here;
// invoices are already tracked in the invoices table via MollieService).
//
// Usage in Bootstrap.ts:
//   const emailAdapter = new EmailAdapter({
//     provider:     (process.env.EMAIL_PROVIDER as 'resend' | 'smtp') ?? 'resend',
//     from:         requireEnv('EMAIL_FROM'),
//     resendApiKey: process.env.RESEND_API_KEY,
//     // smtp fields only needed when provider = 'smtp'
//   });
//   await emailAdapter.init();
// =============================================================================

import type { IAdapter }       from '../IAdapter';
import type { AdapterSchema }  from '../AdapterSchema';
import { EmailService }        from '../../../services/email/EmailService';
import type { EmailServiceConfig } from '../../../services/email/EmailService';
import { bus }                 from '../../services/bus/BusService';

export type { EmailServiceConfig as EmailAdapterConfig };

export class EmailAdapter implements IAdapter {

  readonly name     = 'email-adapter';
  readonly version  = '1.0.0';
  readonly tags     = ['core', 'email'];
  readonly requires = [];
  readonly schema:  AdapterSchema = {};   // no tables owned

  constructor(private readonly config: EmailServiceConfig) {}

  async init(): Promise<void> {
    bus.register(
      new EmailService(this.config),
      {
        runtime:  'always',
        requires: [],
        tags:     ['core', 'email'],
      }
    );

    await bus.bootService('email');
  }

  async destroy(): Promise<void> {}

  async healthCheck(): Promise<boolean> {
    return bus.isActive('email');
  }
}