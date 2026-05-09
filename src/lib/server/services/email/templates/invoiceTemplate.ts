// =============================================================================
// services/email/templates/invoice.ts
// =============================================================================
// HTML email template for Foundiq invoices.
// Called by EmailService.sendInvoice() after a successful Mollie payment.
// =============================================================================

export interface InvoiceEmailData {
  // Recipient
  toEmail:       string;
  toName:        string;

  // Invoice details
  invoiceNumber: string;   // e.g. "INV-2024-00042"
  paymentDate:   string;   // formatted e.g. "8 mei 2026"
  planName:      string;   // e.g. "Pro"
  periodStart:   string;   // e.g. "1 mei 2026"
  periodEnd:     string;   // e.g. "31 mei 2026"
  amountCents:   number;   // e.g. 2900
  currency:      string;   // e.g. "EUR"
  paymentMethod: string;   // e.g. "iDEAL"

  // Org / billing details
  orgName:       string;
  dashboardUrl:  string;   // link to billing portal
}

function formatCurrency(cents: number, currency: string): string {
  return new Intl.NumberFormat('nl-NL', {
    style:    'currency',
    currency: currency,
  }).format(cents / 100);
}

export function renderInvoiceEmail(data: InvoiceEmailData): { subject: string; html: string; text: string } {
  const amount = formatCurrency(data.amountCents, data.currency);

  const subject = `Betalingsbevestiging — ${data.planName} — ${amount}`;

  const html = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${subject}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #f5f5f0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      color: #1a1a1a;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 560px;
      margin: 40px auto;
      padding: 0 20px 60px;
    }
    /* ── Header ── */
    .header {
      padding: 32px 0 28px;
      border-bottom: 2px solid #f59e0b;
      margin-bottom: 32px;
    }
    .logo {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
    }
    .logo-mark {
      width: 28px; height: 28px;
      background: #f59e0b;
      border-radius: 6px;
    }
    .logo-text {
      font-size: 18px;
      font-weight: 700;
      color: #1a1a1a;
      letter-spacing: -0.01em;
    }
    /* ── Card ── */
    .card {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e5e5e0;
      overflow: hidden;
      margin-bottom: 24px;
    }
    .card-header {
      background: #1a1a1a;
      padding: 24px 28px;
      color: #ffffff;
    }
    .card-header-label {
      font-size: 11px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #f59e0b;
      margin-bottom: 6px;
      font-weight: 600;
    }
    .card-header-title {
      font-size: 22px;
      font-weight: 600;
      color: #ffffff;
    }
    .card-header-subtitle {
      font-size: 13px;
      color: #888;
      margin-top: 4px;
    }
    .card-body {
      padding: 28px;
    }
    /* ── Amount block ── */
    .amount-block {
      background: #fefce8;
      border: 1px solid #fde68a;
      border-radius: 8px;
      padding: 20px 24px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .amount-label {
      font-size: 13px;
      color: #92400e;
      font-weight: 500;
    }
    .amount-value {
      font-size: 26px;
      font-weight: 700;
      color: #92400e;
    }
    /* ── Line items ── */
    .line-items {
      border-top: 1px solid #f0f0eb;
    }
    .line-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #f0f0eb;
      font-size: 14px;
    }
    .line-item:last-child {
      border-bottom: none;
    }
    .line-label { color: #666; }
    .line-value { color: #1a1a1a; font-weight: 500; }
    /* ── CTA ── */
    .cta-block {
      text-align: center;
      padding: 8px 0 4px;
    }
    .cta-btn {
      display: inline-block;
      background: #f59e0b;
      color: #1a1a1a;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      padding: 12px 28px;
      border-radius: 8px;
    }
    /* ── Footer ── */
    .footer {
      text-align: center;
      font-size: 12px;
      color: #999;
      line-height: 1.6;
      padding-top: 8px;
    }
    .footer a { color: #f59e0b; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">

    <div class="header">
      <div class="logo">
        <div class="logo-mark"></div>
        <span class="logo-text">Foundiq</span>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-header-label">Betalingsbevestiging</div>
        <div class="card-header-title">Bedankt, ${escHtml(data.toName.split(' ')[0])}!</div>
        <div class="card-header-subtitle">Factuurnummer: ${escHtml(data.invoiceNumber)}</div>
      </div>

      <div class="card-body">
        <!-- Amount -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          <tr>
            <td style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:13px;color:#92400e;font-weight:500;">Betaald bedrag</td>
                  <td align="right" style="font-size:26px;font-weight:700;color:#92400e;">${amount}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Line items -->
        <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0f0eb;">
          <tr>
            <td style="padding:12px 0;border-bottom:1px solid #f0f0eb;font-size:14px;color:#666;">Abonnement</td>
            <td align="right" style="padding:12px 0;border-bottom:1px solid #f0f0eb;font-size:14px;color:#1a1a1a;font-weight:500;">Foundiq ${escHtml(data.planName)}</td>
          </tr>
          <tr>
            <td style="padding:12px 0;border-bottom:1px solid #f0f0eb;font-size:14px;color:#666;">Periode</td>
            <td align="right" style="padding:12px 0;border-bottom:1px solid #f0f0eb;font-size:14px;color:#1a1a1a;font-weight:500;">${escHtml(data.periodStart)} – ${escHtml(data.periodEnd)}</td>
          </tr>
          <tr>
            <td style="padding:12px 0;border-bottom:1px solid #f0f0eb;font-size:14px;color:#666;">Betaalmethode</td>
            <td align="right" style="padding:12px 0;border-bottom:1px solid #f0f0eb;font-size:14px;color:#1a1a1a;font-weight:500;">${escHtml(data.paymentMethod)}</td>
          </tr>
          <tr>
            <td style="padding:12px 0;font-size:14px;color:#666;">Betaaldatum</td>
            <td align="right" style="padding:12px 0;font-size:14px;color:#1a1a1a;font-weight:500;">${escHtml(data.paymentDate)}</td>
          </tr>
        </table>

        <!-- CTA -->
        <table width="100%" cellpadding="0" cellspacing="0" style="padding-top:24px;">
          <tr>
            <td align="center">
              <a href="${data.dashboardUrl}"
                 style="display:inline-block;background:#f59e0b;color:#1a1a1a;text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:8px;">
                Bekijk je abonnement →
              </a>
            </td>
          </tr>
        </table>
      </div>
    </div>

    <div class="footer">
      <p>Dit is een automatische bevestiging van je betaling aan <strong>Foundiq</strong>.</p>
      <p style="margin-top:6px;">
        Vragen? Mail naar <a href="mailto:billing@myelinsystems.com">billing@myelinsystems.com</a>
      </p>
      <p style="margin-top:16px;color:#ccc;">
        © ${new Date().getFullYear()} Foundiq · Nederland
      </p>
    </div>

  </div>
</body>
</html>`;

  // Plain text fallback
  const text = `Betalingsbevestiging — Foundiq

Hallo ${data.toName},

Je betaling is ontvangen. Hier zijn de details:

Abonnement:    Foundiq ${data.planName}
Bedrag:        ${amount}
Periode:       ${data.periodStart} – ${data.periodEnd}
Betaalmethode: ${data.paymentMethod}
Betaaldatum:   ${data.paymentDate}
Factuurnummer: ${data.invoiceNumber}

Bekijk je abonnement: ${data.dashboardUrl}

Vragen? Stuur een mail naar billing@foundiq.io

© ${new Date().getFullYear()} Foundiq`;

  return { subject, html, text };
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}