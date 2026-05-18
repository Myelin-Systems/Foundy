// =============================================================================
// services/email/templates/invoice.ts
// =============================================================================
// HTML email template for Foundiq invoices.
// Renders a legally compliant Dutch invoice with:
//   - Billing address block (required for B2B invoices)
//   - Subtotal / VAT / total breakdown
//   - "BTW verlegd" notice for EU reverse charge customers
//   - Internal fee/revenue footnote (HTML comment, not visible to customer)
// =============================================================================

export interface InvoiceEmailData {
  // Recipient
  toEmail:        string;
  toName:         string;

  // Invoice metadata
  invoiceNumber:  string;   // e.g. "INV-2026-TR12345"
  paymentDate:    string;   // formatted e.g. "8 mei 2026"
  planName:       string;   // e.g. "Pro"
  periodStart:    string;   // e.g. "1 mei 2026"
  periodEnd:      string;   // e.g. "31 mei 2026"
  paymentMethod:  string;   // e.g. "iDEAL"
  dashboardUrl:   string;

  // Billing address — printed on invoice for legal compliance
  billingName:    string;
  billingAddress: string | null;
  billingPostal:  string | null;
  billingCity:    string | null;
  billingCountry: string | null;  // ISO 3166-1 alpha-2
  vatNumber:      string | null;  // EU BTW-nummer — printed for B2B customers

  // Amount breakdown
  currency:       string;   // e.g. "EUR"
  subtotalCents:  number;   // excl. VAT
  vatRatePct:     number;   // 0 or 21 (snapshot at payment time)
  vatAmountCents: number;   // 0 for reverse charge / non-EU
  reverseCharge:  boolean;  // true = BTW verlegd (required legal notice)
  totalCents:     number;   // total charged (subtotal + VAT)

  // Internal — for your own profit tracking, not shown prominently to customer
  mollieFee:      number;   // estimated Mollie transaction fee in cents
  netRevenue:     number;   // subtotalCents - mollieFee in cents
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function fmt(cents: number, currency: string): string {
  return new Intl.NumberFormat('nl-NL', {
    style:    'currency',
    currency: currency,
  }).format(cents / 100);
}

function esc(str: string | null | undefined): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Minimal ISO 3166-1 → Dutch display name for invoice address block
const COUNTRY_NAMES: Record<string, string> = {
  NL: 'Nederland',   BE: 'België',       DE: 'Duitsland',  FR: 'Frankrijk',
  GB: 'Ver. Koninkrijk', US: 'VS',        AT: 'Oostenrijk', DK: 'Denemarken',
  ES: 'Spanje',      FI: 'Finland',      IE: 'Ierland',    IT: 'Italië',
  LU: 'Luxemburg',   PL: 'Polen',        PT: 'Portugal',   SE: 'Zweden',
  CZ: 'Tsjechië',   HU: 'Hongarije',    RO: 'Roemenië',   HR: 'Kroatië',
  SK: 'Slowakije',   SI: 'Slovenië',     BG: 'Bulgarije',  CY: 'Cyprus',
  EE: 'Estland',     GR: 'Griekenland',  LT: 'Litouwen',   LV: 'Letland',
  MT: 'Malta',       CA: 'Canada',       AU: 'Australië',
};

function countryName(code: string | null): string {
  if (!code) return '';
  return COUNTRY_NAMES[code.toUpperCase()] ?? code.toUpperCase();
}

// ── Main render function ──────────────────────────────────────────────────────

export function renderInvoiceEmail(d: InvoiceEmailData): {
  subject: string;
  html:    string;
  text:    string;
} {
  const total  = fmt(d.totalCents,     d.currency);
  const sub    = fmt(d.subtotalCents,  d.currency);
  const vatAmt = fmt(d.vatAmountCents, d.currency);
  const fee    = fmt(d.mollieFee,      d.currency);
  const net    = fmt(d.netRevenue,     d.currency);
  const year   = new Date().getFullYear();

  const subject = `Factuurbevestiging — Foundiq ${esc(d.planName)} — ${total}`;

  // ── VAT line copy ─────────────────────────────────────────────────────────
  // "BTW verlegd" and art. 196 reference are legally required for reverse charge.
  const vatLabel = d.reverseCharge
    ? 'BTW (verlegd)'
    : d.vatRatePct > 0
      ? `BTW ${d.vatRatePct}%`
      : 'BTW';

  const vatValue = d.reverseCharge
    ? 'BTW verlegd — art. 196 BTW-richtlijn'
    : d.vatRatePct === 0
      ? `${vatAmt} (0% / buiten EU)`
      : vatAmt;

  // ── Billing address block ─────────────────────────────────────────────────
  const addressLines = [
    d.billingAddress,
    d.billingPostal && d.billingCity
      ? `${d.billingPostal} ${d.billingCity}`
      : (d.billingCity ?? d.billingPostal),
    countryName(d.billingCountry),
  ].filter(Boolean) as string[];

  const addressHtml = addressLines
    .map(l => `<div>${esc(l)}</div>`)
    .join('\n          ');

  // ── HTML ──────────────────────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${subject}</title>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body {
      background:#f5f5f0;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
      color:#1a1a1a; -webkit-font-smoothing:antialiased;
    }
    .wrap  { max-width:560px; margin:40px auto; padding:0 20px 60px; }
    .hdr   { padding:32px 0 28px; border-bottom:2px solid #f59e0b; margin-bottom:32px; }
    .hdr-inner { display:flex; justify-content:space-between; align-items:flex-end; }
    .logo  { display:inline-flex; align-items:center; gap:10px; text-decoration:none; }
    .logo-mark { width:28px; height:28px; background:#f59e0b; border-radius:6px; }
    .logo-text { font-size:18px; font-weight:700; color:#1a1a1a; letter-spacing:-0.01em; }
    .hdr-meta  { text-align:right; font-size:12px; color:#888; line-height:1.7; }
    .card  { background:#fff; border-radius:12px; border:1px solid #e5e5e0; overflow:hidden; margin-bottom:20px; }
    .card-hdr { background:#1a1a1a; padding:24px 28px; }
    .card-hdr-lbl   { font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:#f59e0b; margin-bottom:6px; font-weight:600; }
    .card-hdr-title { font-size:22px; font-weight:600; color:#fff; }
    .card-hdr-sub   { font-size:13px; color:#888; margin-top:4px; }
    .card-body { padding:28px; }
    .sec-title { font-size:10px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:#888; margin-bottom:10px; }
    .billing-block {
      background:#fafaf8; border:1px solid #e5e5e0; border-radius:8px;
      padding:14px 18px; margin-bottom:24px; font-size:13px; line-height:1.7; color:#444;
    }
    .billing-block strong { color:#1a1a1a; font-size:14px; display:block; margin-bottom:2px; }
    .billing-vat { font-size:11px; color:#888; margin-top:4px; }
    td.lbl { padding:10px 0; border-bottom:1px solid #f0f0eb; font-size:14px; color:#666; vertical-align:middle; }
    td.val { padding:10px 0; border-bottom:1px solid #f0f0eb; font-size:14px; color:#1a1a1a; font-weight:500; text-align:right; vertical-align:middle; white-space:nowrap; }
    td.lbl-last { padding:10px 0; font-size:14px; color:#666; }
    td.val-last { padding:10px 0; font-size:14px; color:#1a1a1a; font-weight:500; text-align:right; }
    .total-lbl { font-size:16px; font-weight:700; color:#1a1a1a; padding:14px 0 4px; border-top:2px solid #1a1a1a; }
    .total-val { font-size:22px; font-weight:800; color:#1a1a1a; text-align:right; padding:14px 0 4px; border-top:2px solid #1a1a1a; }
    .rc-notice {
      background:#fefce8; border:1px solid #fde68a; border-radius:8px;
      padding:10px 14px; margin-top:16px; font-size:12px; color:#92400e; line-height:1.6;
    }
    .cta { text-align:center; padding:24px 0 4px; }
    .cta-btn {
      display:inline-block; background:#f59e0b; color:#1a1a1a; text-decoration:none;
      font-weight:600; font-size:14px; padding:12px 28px; border-radius:8px;
    }
    .footer { text-align:center; font-size:12px; color:#999; line-height:1.7; padding-top:8px; }
    .footer a { color:#f59e0b; text-decoration:none; }
  </style>
</head>
<body>
<div class="wrap">

  <!-- Header -->
  <div class="hdr">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <div class="logo">
            <div class="logo-mark"></div>
            <span class="logo-text">Foundiq</span>
          </div>
        </td>
        <td align="right" style="font-size:12px;color:#888;line-height:1.7;">
          <div><strong>Factuur ${esc(d.invoiceNumber)}</strong></div>
          <div>Datum: ${esc(d.paymentDate)}</div>
        </td>
      </tr>
    </table>
  </div>

  <div class="card">
    <div class="card-hdr">
      <div class="card-hdr-lbl">Betalingsbevestiging</div>
      <div class="card-hdr-title">Bedankt, ${esc(d.toName.split(' ')[0])}!</div>
      <div class="card-hdr-sub">Je betaling is ontvangen en verwerkt.</div>
    </div>

    <div class="card-body">

      <!-- Billing address -->
      <div class="sec-title">Factuuradres</div>
      <div class="billing-block">
        <strong>${esc(d.billingName)}</strong>
        ${addressHtml}
        ${d.vatNumber
          ? `<div class="billing-vat">BTW-nr: ${esc(d.vatNumber)}</div>`
          : ''}
      </div>

      <!-- Line items -->
      <div class="sec-title">Specificatie</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td class="lbl">Abonnement</td>
          <td class="val">Foundiq ${esc(d.planName)}</td>
        </tr>
        <tr>
          <td class="lbl">Periode</td>
          <td class="val">${esc(d.periodStart)} – ${esc(d.periodEnd)}</td>
        </tr>
        <tr>
          <td class="lbl">Betaalmethode</td>
          <td class="val">${esc(d.paymentMethod)}</td>
        </tr>
        <tr>
          <td class="lbl">Subtotaal</td>
          <td class="val">${sub}</td>
        </tr>
        <tr>
          <td class="lbl-last">${esc(vatLabel)}</td>
          <td class="val-last">${vatValue}</td>
        </tr>
      </table>

      <!-- Total -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td class="total-lbl">Totaal te betalen</td>
          <td class="total-val">${total}</td>
        </tr>
      </table>

      <!-- Reverse charge legal notice (legally required text) -->
      ${d.reverseCharge ? `
      <div class="rc-notice">
        <strong>BTW verlegd.</strong>
        De btw wordt door de afnemer voldaan conform artikel 196 van de
        btw-richtlijn 2006/112/EG. Er is geen btw in rekening gebracht.
      </div>` : ''}

      <!-- CTA -->
      <div class="cta">
        <a href="${esc(d.dashboardUrl)}" class="cta-btn">Bekijk je abonnement →</a>
      </div>

    </div>
  </div>

  <div class="footer">
    <p>Automatische bevestiging van je betaling aan <strong>Foundiq</strong> (Myelin Systems).</p>
    <p style="margin-top:6px;">
      Vragen? Mail naar <a href="mailto:billing@myelinsystems.com">billing@myelinsystems.com</a>
    </p>
    <p style="margin-top:16px;color:#ccc;">© ${year} Foundiq · Nederland</p>
  </div>

  <!-- INTERN (niet zichtbaar voor klant):
       Mollie-kosten: ${fee}
       Netto-omzet:   ${net}
       Factuurnr:     ${esc(d.invoiceNumber)}
  -->

</div>
</body>
</html>`;

  // ── Plain text fallback ───────────────────────────────────────────────────
  const text = `FACTUUR — Foundiq
${d.invoiceNumber} | ${d.paymentDate}

Aan:
${d.billingName}
${addressLines.join(', ')}${d.vatNumber ? `\nBTW-nr: ${d.vatNumber}` : ''}

ABONNEMENT: Foundiq ${d.planName}
Periode:    ${d.periodStart} – ${d.periodEnd}
Methode:    ${d.paymentMethod}

Subtotaal:  ${sub}
${vatLabel}: ${vatValue}
──────────────────────────
Totaal:     ${total}

${d.reverseCharge
  ? 'BTW verlegd. De btw wordt door de afnemer voldaan (art. 196 btw-richtlijn 2006/112/EG).\n'
  : ''}
Bekijk je abonnement: ${d.dashboardUrl}

Vragen? billing@myelinsystems.com
© ${year} Foundiq`;

  return { subject, html, text };
}