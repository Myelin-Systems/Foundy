// =============================================================================
// services/email/EmailService.ts
// =============================================================================
// Transactional email via Resend (primary) or SMTP (fallback).
//
// Resend:  npm install resend
// SMTP:    npm install nodemailer @types/nodemailer
//
// .env:
//   EMAIL_PROVIDER=resend            # or 'smtp'
//   EMAIL_FROM=Foundiq <noreply@foundiq.nl>
//
//   # Resend:
//   RESEND_API_KEY=re_xxxxx
//
//   # SMTP (e.g. Postfix, Mailgun SMTP, Brevo):
//   SMTP_HOST=smtp.example.com
//   SMTP_PORT=587
//   SMTP_USER=user@example.com
//   SMTP_PASS=secret
// =============================================================================

import type { IService }             from '../../framework/services/IServices';
import type { InvoiceEmailData }     from '$lib/server/services/email/templates/invoice';
import { renderInvoiceEmail }        from '$lib/server/services/email/templates/invoice';


export type EmailProvider = 'resend' | 'smtp';

export interface EmailServiceConfig {
  provider:  EmailProvider;
  from:      string;                // e.g. "Foundiq <noreply@foundiq.nl>"

  // Resend
  resendApiKey?: string;

  // SMTP
  smtpHost?:    string;
  smtpPort?:    number;
  smtpUser?:    string;
  smtpPass?:    string;
  smtpSecure?:  boolean;            // true for port 465
}

export interface SendResult {
  ok:        boolean;
  messageId: string | null;
  error?:    string;
}

// ── EmailService ──────────────────────────────────────────────────────────────

export class EmailService implements IService {

  readonly name    = 'email';
  readonly version = '1.1.3';
  readonly tags    = ['core', 'email'];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private resend:     any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private transporter: any = null;

  constructor(private readonly config: EmailServiceConfig) {}

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  async init(): Promise<void> {
    if (this.config.provider === 'resend') {
      if (!this.config.resendApiKey) {
        throw new Error(`[${this.name}] RESEND_API_KEY is required when EMAIL_PROVIDER=resend`);
      }
      const { Resend } = await import('resend');
      this.resend = new Resend(this.config.resendApiKey);
      console.log(`[${this.name}] Resend client initialised`);
    }

    if (this.config.provider === 'smtp') {
      if (!this.config.smtpHost) {
        throw new Error(`[${this.name}] SMTP_HOST is required when EMAIL_PROVIDER=smtp`);
      }
      const nodemailer = await import('nodemailer');
      this.transporter = nodemailer.createTransport({
        host:   this.config.smtpHost,
        port:   this.config.smtpPort ?? 587,
        secure: this.config.smtpSecure ?? false,
        auth: this.config.smtpUser ? {
          user: this.config.smtpUser,
          pass: this.config.smtpPass,
        } : undefined,
      });
      console.log(`[${this.name}] SMTP transport initialised (${this.config.smtpHost})`);
    }
  }

  async destroy(): Promise<void> {
    if (this.transporter) {
      this.transporter.close?.();
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (this.config.provider === 'resend' && this.resend) return true;
      if (this.config.provider === 'smtp' && this.transporter) {
        await this.transporter.verify();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  /**
   * Send a payment confirmation + invoice email.
   * Called by MollieService after handlePaymentPaid().
   */
  // src/lib/server/services/email/EmailService.ts

  // Change the method signature from the old flat params to:
  async sendInvoice(params: InvoiceEmailData): Promise<SendResult> {
    const { subject, html, text } = renderInvoiceEmail(params);
    return this.send({
      to:      params.toEmail,   // string — matches send() signature
      subject,
      html,
      text,
    });
  }

  /**
   * Low-level send — use sendInvoice() and other typed methods in practice.
   */
  async send(params: {
    to:       string;
    subject:  string;
    html:     string;
    text?:    string;
    replyTo?: string;
  }): Promise<SendResult> {

    try {
      if (this.config.provider === 'resend') {
        return await this.sendViaResend(params);
      }
      if (this.config.provider === 'smtp') {
        return await this.sendViaSmtp(params);
      }
      throw new Error(`Unknown email provider: ${this.config.provider}`);
    } catch (err) {
      const message = (err as Error).message;
      console.error(`[${this.name}] Failed to send email to ${params.to}:`, message);
      return { ok: false, messageId: null, error: message };
    }
  }

  // ── Private ───────────────────────────────────────────────────────────────────

  private async sendViaResend(params: {
    to: string; subject: string; html: string; text?: string; replyTo?: string;
  }): Promise<SendResult> {
    const result = await this.resend.emails.send({
      from:      this.config.from,
      to:        [params.to],
      subject:   params.subject,
      html:      params.html,
      text:      params.text,
      reply_to:  params.replyTo,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return { ok: true, messageId: result.data?.id ?? null };
  }

  private async sendViaSmtp(params: {
    to: string; subject: string; html: string; text?: string; replyTo?: string;
  }): Promise<SendResult> {
    const info = await this.transporter.sendMail({
      from:    this.config.from,
      to:      params.to,
      subject: params.subject,
      html:    params.html,
      text:    params.text,
      replyTo: params.replyTo,
    });

    return { ok: true, messageId: info.messageId ?? null };
  }
}