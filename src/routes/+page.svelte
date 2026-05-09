<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';

  // const { data } = $props<{ data: { session: { email: string } | null } }>();
  const data ={session: null} 
  // ── Auto-translation ──────────────────────────────────────────────────────
  const translations: Record<string, Record<string, string>> = {
    en: {
      nav_product:   'Product',
      nav_docs:      'Docs',
      nav_pricing:   'Pricing',
      nav_signin:    'Sign in',
      nav_start:     'Get started free',
      nav_dashboard: 'Dashboard →',

      badge:         'Beta. Not buzzword.',
      hero_pre:      'Stop gluing tools together.',
      hero_hl:       'Ship the thing.',
      hero_sub:      'Foundiq is a headless CMS, social scheduler, and product catalogue with one clean API. Your developers will stop complaining.',
      cta_primary:   'Start building free',
      cta_docs:      'Read the docs →',

      feat_title:    'One platform. Not five subscriptions.',
      feat_sub:      'We counted — the average dev stack for content + social + commerce is 6 tools. Foundiq is one.',
      f1_title:      'Headless CMS',
      f1_body:       'Collections, fields, entries, publishing. Define your schema once, fetch it anywhere. REST API that doesn\'t make you cry.',
      f2_title:      'Social management',
      f2_body:       'Schedule posts, manage multiple client accounts, see what\'s actually working. No more posting from 4 different browser tabs.',
      f3_title:      'Commerce-ready',
      f3_body:       'Product catalogues, atomic stock updates, order tracking. The boring-but-critical stuff is already handled.',
      f4_title:      'Media storage',
      f4_body:       'Upload it, get a URL back, use it anywhere. Storage scales with your plan. Not complicated.',
      f5_title:      'Two API keys, by design',
      f5_body:       'A public key safe for your frontend. A secret key for your server. Like Stripe, but for your content. Simple on purpose.',
      f6_title:      'Built to stay up',
      f6_body:       'Redundant infrastructure, automatic backups, and a 99.9% uptime SLA. Your content is available when your users are.',

      how_title:     'First fetch in under 5 minutes',
      h1_label:      '01 — Create a collection',
      h1_body:       'Name it, define your fields, set your types. Takes 30 seconds. No config files, no YAML.',
      h2_label:      '02 — Add your content',
      h2_body:       'Type directly in the dashboard or push entries via API. Both work. Pick your poison.',
      h3_label:      '03 — Fetch from anywhere',
      h3_body:       'One line. Your content. Any framework. Astro, Next, Svelte, raw HTML — we don\'t care.',

      price_title:   'Free forever. Upgrade when it hurts.',
      price_sub:     'The free plan is not fake-free. One real site, real API access, real limits. Enough to build something people use.',
      price_free:    'Free. Actually free.',
      price_limits:  '1 site · 5 collections · 1,000 entries · 500 MB storage',
      price_cta:     'Start building — no card →',
      price_paid:    'Paid plans from €9/mo when you outgrow it',

      final_title:   'Your content stack.',
      final_hl:      'Finally sorted.',
      final_sub:     'Join developers who stopped paying for five tools to do one job.',
      final_cta:     'Create your free account',
      final_login:   'Already have an account? Sign in →',

      footer_tagline: 'CMS + Social + Commerce. One API. Built in Amsterdam.',
      footer_copy:   '© 2026 Foundiq · Built by Myelin Systems',
    },

    nl: {
      nav_product:   'Product',
      nav_docs:      'Documentatie',
      nav_pricing:   'Prijzen',
      nav_signin:    'Inloggen',
      nav_start:     'Gratis starten',
      nav_dashboard: 'Dashboard →',

      badge:         'Beta. Geen hype.',
      hero_pre:      'Stop met tools aan elkaar plakken.',
      hero_hl:       'Bouw gewoon het ding.',
      hero_sub:      'Foundiq is een headless CMS, social planner en productcatalogus met één nette API. Je developers stoppen met klagen.',
      cta_primary:   'Gratis beginnen',
      cta_docs:      'Documentatie lezen →',

      feat_title:    'Één platform. Geen vijf abonnementen.',
      feat_sub:      'We hebben geteld — de gemiddelde stack voor content + social + commerce is 6 tools. Foundiq is er één.',
      f1_title:      'Headless CMS',
      f1_body:       'Collecties, velden, entries, publiceren. Definieer je schema één keer, haal het overal op. Een REST API die niet huilt.',
      f2_title:      'Social beheer',
      f2_body:       'Plan berichten, beheer meerdere klantaccounts, zie wat echt werkt. Geen vier browsertabs meer.',
      f3_title:      'Commerce-ready',
      f3_body:       'Productcatalogi, atomisch voorraadbeheer en orderregistratie. Het saaie-maar-kritieke werk is al gedaan.',
      f4_title:      'Mediaopslag',
      f4_body:       'Upload het, krijg een URL terug, gebruik het overal. Opslag schaalt mee met je plan. Niet ingewikkeld.',
      f5_title:      'Twee API-sleutels, zo ontworpen',
      f5_body:       'Een publieke sleutel voor je frontend. Een geheime voor je server. Zoals Stripe, maar dan voor je content.',
      f6_title:      'Gebouwd om online te blijven',
      f6_body:       'Redundante infrastructuur, automatische backups en 99,9% uptime SLA. Jouw content is beschikbaar wanneer je gebruikers dat zijn.',

      how_title:     'Eerste fetch in minder dan 5 minuten',
      h1_label:      '01 — Maak een collectie',
      h1_body:       'Geef het een naam, definieer je velden. Duurt 30 seconden. Geen config-bestanden, geen YAML.',
      h2_label:      '02 — Voeg content toe',
      h2_body:       'Typ direct in het dashboard of push entries via de API. Beide werken. Kies maar.',
      h3_label:      '03 — Haal op overal',
      h3_body:       'Eén regel code. Jouw content. Elk framework. Astro, Next, Svelte, plain HTML — maakt ons niet uit.',

      price_title:   'Gratis voor altijd. Upgrade als het pijn doet.',
      price_sub:     'Het gratis plan is niet nep-gratis. Eén echte site, echte API-toegang, echte limieten. Genoeg om iets te bouwen wat mensen echt gebruiken.',
      price_free:    'Gratis. Echt gratis.',
      price_limits:  '1 site · 5 collecties · 1.000 entries · 500 MB opslag',
      price_cta:     'Begin met bouwen — geen creditcard →',
      price_paid:    'Betaalde plannen vanaf €9/maand als je erbovenuit groeit',

      final_title:   'Je content-stack.',
      final_hl:      'Eindelijk geregeld.',
      final_sub:     'Sluit je aan bij developers die zijn gestopt met vijf tools betalen voor één klus.',
      final_cta:     'Maak een gratis account',
      final_login:   'Al een account? Log in →',

      footer_tagline: 'CMS + Social + Commerce. Één API. Gebouwd in Amsterdam.',
      footer_copy:   '© 2026 Foundiq · Gebouwd door Myelin Systems',
    },

    de: {
      nav_product:   'Produkt',
      nav_docs:      'Dokumentation',
      nav_pricing:   'Preise',
      nav_signin:    'Anmelden',
      nav_start:     'Kostenlos starten',
      nav_dashboard: 'Dashboard →',

      badge:         'Beta. Kein Buzzword.',
      hero_pre:      'Hör auf, Tools zusammenzukleben.',
      hero_hl:       'Bau einfach das Ding.',
      hero_sub:      'CMS. Social. Commerce. Eine API. Deine Devs werden aufhören zu meckern.',
      cta_primary:   'Kostenlos starten',
      cta_docs:      'Dokumentation lesen →',

      feat_title:    'Eine Plattform. Keine fünf Abos.',
      feat_sub:      'Der durchschnittliche Stack für Content + Social + Commerce ist 6 Tools. Foundiq ist eines.',
      f1_title:      'Headless CMS',
      f1_body:       'Kollektionen, Felder, Einträge, Publishing. Schema einmal definieren, überall abrufen.',
      f2_title:      'Social-Management',
      f2_body:       'Beiträge planen, mehrere Kundenkonten verwalten, sehen was wirklich funktioniert.',
      f3_title:      'Commerce-bereit',
      f3_body:       'Produktkataloge, atomares Bestandsmanagement und Auftragsverfolgung bereits enthalten.',
      f4_title:      'Medienspeicher',
      f4_body:       'Hochladen, URL zurückbekommen, überall verwenden. Nicht kompliziert.',
      f5_title:      'Zwei API-Schlüssel, by Design',
      f5_body:       'Ein öffentlicher Schlüssel für das Frontend. Ein geheimer für den Server. Wie Stripe, aber für Content.',
      f6_title:      'Gebaut um online zu bleiben',
      f6_body:       'Redundante Infrastruktur, automatische Backups und 99,9% Uptime-SLA. Deine Inhalte sind verfügbar, wenn deine Nutzer es sind.',

      how_title:     'Erster Fetch in unter 5 Minuten',
      h1_label:      '01 — Kollektion erstellen',
      h1_body:       'Name vergeben, Felder definieren. Dauert 30 Sekunden. Keine Config-Dateien, kein YAML.',
      h2_label:      '02 — Inhalte hinzufügen',
      h2_body:       'Im Dashboard schreiben oder Einträge per API einspeisen. Beides funktioniert.',
      h3_label:      '03 — Überall abrufen',
      h3_body:       'Eine Zeile Code. Deine Inhalte. Jedes Framework.',

      price_title:   'Kostenlos für immer. Upgrade wenn es wehtut.',
      price_sub:     'Der kostenlose Plan ist nicht fake-kostenlos. Eine echte Website, echter API-Zugang, echte Limits.',
      price_free:    'Kostenlos. Wirklich.',
      price_limits:  '1 Website · 5 Kollektionen · 1.000 Einträge · 500 MB Speicher',
      price_cta:     'Bauen starten — keine Kreditkarte →',
      price_paid:    'Bezahlpläne ab €9/Monat wenn du rauswächst',

      final_title:   'Dein Content-Stack.',
      final_hl:      'Endlich sortiert.',
      final_sub:     'Schließ dich Entwicklern an, die aufgehört haben, fünf Tools für einen Job zu bezahlen.',
      final_cta:     'Kostenloses Konto erstellen',
      final_login:   'Schon ein Konto? Anmelden →',

      footer_tagline: 'CMS + Social + Commerce. Eine API. Gebaut in Amsterdam.',
      footer_copy:   '© 2026 Foundiq · Gebaut von Myelin Systems',
    },

    fr: {
      nav_product:   'Produit',
      nav_docs:      'Documentation',
      nav_pricing:   'Tarifs',
      nav_signin:    'Connexion',
      nav_start:     'Commencer',
      nav_dashboard: 'Tableau de bord →',

      badge:         'Bêta. Pas du jargon.',
      hero_pre:      'Arrêtez de coller des outils ensemble.',
      hero_hl:       'Construisez la chose.',
      hero_sub:      'CMS. Social. Commerce. Une API. Vos devs arrêteront de se plaindre.',
      cta_primary:   'Commencer gratuitement',
      cta_docs:      'Lire la documentation →',

      feat_title:    'Une plateforme. Pas cinq abonnements.',
      feat_sub:      'La stack moyenne pour content + social + commerce c\'est 6 outils. Foundiq c\'est un.',
      f1_title:      'CMS Headless',
      f1_body:       'Collections, champs, entrées, publication. Définissez votre schéma une fois, récupérez-le partout.',
      f2_title:      'Gestion sociale',
      f2_body:       'Planifiez des publications, gérez plusieurs comptes clients, voyez ce qui marche vraiment.',
      f3_title:      'Commerce intégré',
      f3_body:       'Catalogues produits, gestion atomique des stocks et suivi des commandes déjà inclus.',
      f4_title:      'Stockage média',
      f4_body:       'Téléchargez, récupérez une URL, utilisez partout. Pas compliqué.',
      f5_title:      'Deux clés API, par design',
      f5_body:       'Une clé publique pour le frontend. Une secrète pour le serveur. Comme Stripe, pour votre contenu.',
      f6_title:      'Conçu pour rester en ligne',
      f6_title:      'Conçu pour rester en ligne',
      f6_body:       'Infrastructure redondante, sauvegardes automatiques et SLA 99,9% de disponibilité. Votre contenu est là quand vos utilisateurs en ont besoin.',

      how_title:     'Premier fetch en moins de 5 minutes',
      h1_label:      '01 — Créer une collection',
      h1_body:       'Nommez-la, définissez les champs. 30 secondes. Pas de fichiers de config, pas de YAML.',
      h2_label:      '02 — Ajouter du contenu',
      h2_body:       'Tapez dans le dashboard ou poussez des entrées via l\'API. Les deux marchent.',
      h3_label:      '03 — Récupérer partout',
      h3_body:       'Une ligne de code. Votre contenu. N\'importe quel framework.',

      price_title:   'Gratuit pour toujours. Upgradez quand ça fait mal.',
      price_sub:     'Le plan gratuit n\'est pas fake-gratuit. Un vrai site, un vrai accès API, de vraies limites.',
      price_free:    'Gratuit. Vraiment.',
      price_limits:  '1 site · 5 collections · 1 000 entrées · 500 Mo de stockage',
      price_cta:     'Commencer à construire — sans CB →',
      price_paid:    'Plans payants à partir de €9/mois quand vous grandissez',

      final_title:   'Votre stack de contenu.',
      final_hl:      'Enfin réglée.',
      final_sub:     'Rejoignez les développeurs qui ont arrêté de payer cinq outils pour un seul boulot.',
      final_cta:     'Créer un compte gratuit',
      final_login:   'Déjà un compte ? Se connecter →',

      footer_tagline: 'CMS + Social + Commerce. Une API. Construit à Amsterdam.',
      footer_copy:   '© 2026 Foundiq · Construit par Myelin Systems',
    },

    es: {
      nav_product:   'Producto',
      nav_docs:      'Documentación',
      nav_pricing:   'Precios',
      nav_signin:    'Iniciar sesión',
      nav_start:     'Empezar gratis',
      nav_dashboard: 'Panel →',

      badge:         'Beta. No es marketing.',
      hero_pre:      'Para de pegar herramientas.',
      hero_hl:       'Construye la maldita cosa.',
      hero_sub:      'CMS. Social. Commerce. Una API. Tus devs dejarán de quejarse.',
      cta_primary:   'Empezar gratis',
      cta_docs:      'Leer la documentación →',

      feat_title:    'Una plataforma. No cinco suscripciones.',
      feat_sub:      'El stack promedio para content + social + commerce son 6 herramientas. Foundiq es una.',
      f1_title:      'CMS headless',
      f1_body:       'Colecciones, campos, entradas, publicación. Define tu esquema una vez, obtén desde cualquier lugar.',
      f2_title:      'Gestión social',
      f2_body:       'Programa publicaciones, gestiona múltiples cuentas y ve qué funciona de verdad.',
      f3_title:      'Commerce integrado',
      f3_body:       'Catálogos de productos, gestión atómica de stock y seguimiento de pedidos ya incluidos.',
      f4_title:      'Almacenamiento de medios',
      f4_body:       'Sube, obtén una URL, úsala donde quieras. No es complicado.',
      f5_title:      'Dos claves API, por diseño',
      f5_body:       'Una clave pública para el frontend. Una secreta para el servidor. Como Stripe, para tu contenido.',
      f6_title:      'Construido para mantenerse activo',
      f6_body:       'Infraestructura redundante, copias de seguridad automáticas y SLA del 99,9% de disponibilidad. Tu contenido está disponible cuando tus usuarios lo necesitan.',

      how_title:     'Primer fetch en menos de 5 minutos',
      h1_label:      '01 — Crear una colección',
      h1_body:       'Ponle nombre, define los campos. 30 segundos. Sin archivos de config, sin YAML.',
      h2_label:      '02 — Añadir contenido',
      h2_body:       'Escribe en el panel o empuja entradas vía API. Los dos funcionan.',
      h3_label:      '03 — Obtener desde cualquier lugar',
      h3_body:       'Una línea de código. Tu contenido. Cualquier framework.',

      price_title:   'Gratis para siempre. Mejora cuando duela.',
      price_sub:     'El plan gratuito no es fake-gratis. Un sitio real, acceso API real, límites reales.',
      price_free:    'Gratis. De verdad.',
      price_limits:  '1 sitio · 5 colecciones · 1.000 entradas · 500 MB almacenamiento',
      price_cta:     'Empezar a construir — sin tarjeta →',
      price_paid:    'Planes de pago desde €9/mes cuando lo superas',

      final_title:   'Tu stack de contenido.',
      final_hl:      'Por fin resuelto.',
      final_sub:     'Únete a desarrolladores que dejaron de pagar cinco herramientas para un solo trabajo.',
      final_cta:     'Crear cuenta gratuita',
      final_login:   '¿Ya tienes cuenta? Iniciar sesión →',

      footer_tagline: 'CMS + Social + Commerce. Una API. Construido en Ámsterdam.',
      footer_copy:   '© 2026 Foundiq · Construido por Myelin Systems',
    },
  };

  type Locale = keyof typeof translations;

  let locale = $state<Locale>('en');
  let t = $derived(translations[locale] ?? translations.en);

  function detectLocale(): Locale {
    if (typeof navigator === 'undefined') return 'en';
    const lang = navigator.language?.split('-')[0]?.toLowerCase() ?? 'en';
    return (lang in translations ? lang : 'en') as Locale;
  }

  // ── Terminal animation ────────────────────────────────────────────────────
  const termLines = [
    { type: 'cmd',  text: 'curl https://api.foundiq.com/v1/sites/MY_SITE/collections/products/entries \\' },
    { type: 'cmd2', text: '  -H "Authorization: Bearer pnd_pub_abc123"' },
    { type: 'gap',  text: '' },
    { type: 'res',  text: '{' },
    { type: 'res',  text: '  "ok": true,' },
    { type: 'res',  text: '  "data": [' },
    { type: 'res',  text: '    { "id": "191b...", "data": { "name": "Air Max 90", "price": 120, "stock": 8 } },' },
    { type: 'res',  text: '    { "id": "7f2c...", "data": { "name": "Forum Low", "price": 95, "stock": 3 } }' },
    { type: 'res',  text: '  ],' },
    { type: 'res',  text: '  "meta": { "total": 24, "has_more": true }' },
    { type: 'res',  text: '}' },
  ];

  let visibleLines = $state(0);
  let navScrolled  = $state(false);
  let heroVisible  = $state(false);
  let activeTab    = $state<'fetch' | 'next' | 'svelte'>('fetch');
  let copied       = $state(false);

  const codeSnippets: Record<string, string> = {
    fetch: `const res = await fetch(
  \`https://api.foundiq.com/v1/sites/\${SITE_ID}/collections/products/entries\`,
  { headers: { 'Authorization': \`Bearer \${YOUR_KEY}\` } }
);
const { data, meta } = await res.json();
// data → your content. meta → pagination. that's it.
console.log(\`\${meta.total} products loaded\`);`,
    next: `// app/products/page.tsx
export default async function ProductsPage() {
  const res = await fetch(
    \`https://api.foundiq.com/v1/sites/\${SITE_ID}/collections/products/entries\`,
    { headers: { Authorization: \`Bearer \${process.env.FOUNDIQ_SECRET_KEY}\` }, next: { revalidate: 60 } }
  );
  const { data } = await res.json();
  return data.map((item) => <Product key={item.id} {...item.data} />);
}`,
    svelte: `// +page.server.ts
export const load = async () => {
  const res = await fetch(
    \`https://api.foundiq.com/v1/sites/\${SITE_ID}/collections/products/entries\`,
    { headers: { Authorization: \`Bearer \${SECRET_KEY}\` } }
  );
  const { data } = await res.json();
  return { products: data };
};
// +page.svelte
const { data } = $props();
// data.products → your entries, typed and ready`,
  };

  // Hardcoded highlighted HTML — reliable for fixed snippets
  const highlighted: Record<string, string> = {
    fetch:
`<span class="s-kw">const</span> res = <span class="s-kw">await</span> <span class="s-fn">fetch</span>(
  <span class="s-str">\`https://api.foundiq.com/v1/sites/<span class="s-tmpl">\${SITE_ID}</span>/collections/products/entries\`</span>,
  { headers: { <span class="s-str">'Authorization'</span>: <span class="s-str">\`Bearer <span class="s-tmpl">\${YOUR_KEY}</span>\`</span> } }
);
<span class="s-kw">const</span> { data, meta } = <span class="s-kw">await</span> res.<span class="s-fn">json</span>();
<span class="s-comment">// data → your content. meta → pagination. that's it.</span>
<span class="s-fn">console</span>.<span class="s-fn">log</span>(<span class="s-str">\`<span class="s-tmpl">\${meta.total}</span> products loaded\`</span>);`,

    next:
`<span class="s-comment">// app/products/page.tsx</span>
<span class="s-kw">export default async function</span> <span class="s-fn">ProductsPage</span>() {
  <span class="s-kw">const</span> res = <span class="s-kw">await</span> <span class="s-fn">fetch</span>(
    <span class="s-str">\`https://api.foundiq.com/v1/sites/<span class="s-tmpl">\${SITE_ID}</span>/collections/products/entries\`</span>,
    { headers: { Authorization: <span class="s-str">\`Bearer <span class="s-tmpl">\${process.env.FOUNDIQ_SECRET_KEY}</span>\`</span> }, next: { revalidate: <span class="s-tmpl">60</span> } }
  );
  <span class="s-kw">const</span> { data } = <span class="s-kw">await</span> res.<span class="s-fn">json</span>();
  <span class="s-kw">return</span> data.<span class="s-fn">map</span>((item) =&gt; &lt;Product key={item.id} {...item.data} /&gt;);
}`,

    svelte:
`<span class="s-comment">// +page.server.ts</span>
<span class="s-kw">export const</span> load = <span class="s-kw">async</span> () =&gt; {
  <span class="s-kw">const</span> res = <span class="s-kw">await</span> <span class="s-fn">fetch</span>(
    <span class="s-str">\`https://api.foundiq.com/v1/sites/<span class="s-tmpl">\${SITE_ID}</span>/collections/products/entries\`</span>,
    { headers: { Authorization: <span class="s-str">\`Bearer <span class="s-tmpl">\${SECRET_KEY}</span>\`</span> } }
  );
  <span class="s-kw">const</span> { data } = <span class="s-kw">await</span> res.<span class="s-fn">json</span>();
  <span class="s-kw">return</span> { products: data };
};
<span class="s-comment">// +page.svelte</span>
<span class="s-kw">const</span> { data } = <span class="s-fn">$props</span>();
<span class="s-comment">// data.products → your entries, typed and ready</span>`,
  };

  // ── Syntax highlighter ───────────────────────────────────────────────────
  function highlight(code: string): string {
    return highlighted[code] ?? code;
  }

  function copyCode() {
    navigator.clipboard.writeText(codeSnippets[activeTab]).then(() => {
      copied = true;
      setTimeout(() => { copied = false; }, 2000);
    });
  }

  onMount(() => {
    locale = detectLocale();
    heroVisible = true;

    let i = 0;
    const interval = setInterval(() => {
      i++;
      visibleLines = i;
      if (i >= termLines.length) clearInterval(interval);
    }, 110);

    const onScroll = () => { navScrolled = window.scrollY > 20; };
    window.addEventListener('scroll', onScroll);

    return () => {
      clearInterval(interval);
      window.removeEventListener('scroll', onScroll);
    };
  });

  const features = [
    { icon: '▦', key_title: 'f1_title', key_body: 'f1_body', accent: false },
    { icon: '◎', key_title: 'f2_title', key_body: 'f2_body', accent: false },
    { icon: '◈', key_title: 'f3_title', key_body: 'f3_body', accent: true  },
    { icon: '⬡', key_title: 'f4_title', key_body: 'f4_body', accent: false },
    { icon: '⌁', key_title: 'f5_title', key_body: 'f5_body', accent: false },
    { icon: '⬢', key_title: 'f6_title', key_body: 'f6_body', accent: false },
  ];
</script>

<svelte:head>
  <title>Foundiq — CMS + Social + Commerce. One API.</title>
  <meta name="description" content="Stop gluing tools together. Foundiq gives you headless CMS, social scheduling, and commerce in one API your developers will actually like." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Geist:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" />
</svelte:head>

<div class="lp">

  <!-- ── Nav ────────────────────────────────────────────────────────────── -->
  <nav class="nav" class:nav--scrolled={navScrolled}>
    <div class="nav__inner">
      <a href="/" class="nav__logo">
        <div class="nav__logo-mark">
          <span class="nav__logo-q">iq</span>
        </div>
        <span>Foundiq</span>
      </a>

      <div class="nav__links">
        <a href="#features" class="nav__link">{t.nav_product}</a>
        <a href="/docs"     class="nav__link">{t.nav_docs}</a>
        <a href="#pricing"  class="nav__link">{t.nav_pricing}</a>
      </div>

      <div class="nav__cta">
        <!-- Language switcher -->
        <!-- <div class="nav__lang">
          {#each Object.keys(translations) as lang}
            <button
              class="nav__lang-btn"
              class:nav__lang-btn--active={locale === lang}
              onclick={() => locale = lang as Locale}>{lang}</button>
          {/each}
        </div> -->
        {#if data.session}
          <a href="/dashboard/cms" class="nav__btn nav__btn--primary">{t.nav_dashboard}</a>
        {:else}
          <a href="/login"    class="nav__btn nav__btn--ghost">{t.nav_signin}</a>
          <a href="/register" class="nav__btn nav__btn--primary">{t.nav_start}</a>
        {/if}
      </div>
    </div>
  </nav>

  <!-- ── Hero ───────────────────────────────────────────────────────────── -->
  <section class="hero">
    <div class="hero__bg">
      <div class="hero__grid"></div>
      <div class="hero__noise"></div>
      <div class="hero__glow-1"></div>
      <div class="hero__glow-2"></div>
      <div class="hero__glow-3"></div>
    </div>

    <div class="hero__inner" class:hero__inner--visible={heroVisible}>
      <div class="hero__text">
        <div class="hero__badge">
          <span class="hero__badge-dot"></span>
          {t.badge}
        </div>
        <h1 class="hero__h1">
          <span class="hero__h1-pre">{t.hero_pre}</span>
          <span class="hero__h1-hl">{t.hero_hl}</span>
        </h1>
        <p class="hero__sub">{t.hero_sub}</p>
        <div class="hero__actions">
          <a href="/register" class="hero__btn hero__btn--primary">
            {t.cta_primary}
            <span class="hero__btn-arrow">→</span>
          </a>
          <a href="/docs" class="hero__btn hero__btn--ghost">{t.cta_docs}</a>
        </div>
        <div class="hero__trust">
          <span class="hero__trust-item">✓ No credit card</span>
          <span class="hero__trust-sep">·</span>
          <span class="hero__trust-item">✓ GDPR compliant</span>
          <span class="hero__trust-sep">·</span>
          <span class="hero__trust-item">✓ 99.9% uptime SLA</span>
        </div>
      </div>

      <!-- Terminal -->
      <div class="hero__term">
        <div class="hero__term-bar">
          <span class="hero__term-dot hero__term-dot--r"></span>
          <span class="hero__term-dot hero__term-dot--y"></span>
          <span class="hero__term-dot hero__term-dot--g"></span>
          <span class="hero__term-title">foundiq api — terminal</span>
        </div>
        <div class="hero__term-body">
          {#each termLines.slice(0, visibleLines) as line, i (i)}
            <div class="hero__term-line hero__term-line--{line.type}">
              {#if line.type === 'cmd'}
                <span class="hero__term-prompt">$</span>
                <span class="hero__term-cmd">{line.text}</span>
              {:else if line.type === 'cmd2'}
                <span class="hero__term-cmd hero__term-cmd--indent">{line.text}</span>
              {:else if line.type === 'gap'}
                <span>&nbsp;</span>
              {:else}
                <span class="hero__term-resp">{line.text}</span>
              {/if}
            </div>
          {/each}
          {#if visibleLines < termLines.length}
            <span class="hero__term-cursor">▌</span>
          {/if}
        </div>
        <div class="hero__term-footer">
          <span class="hero__term-tag">REST API</span>
          <span class="hero__term-tag">JSON</span>
          <span class="hero__term-tag">Any framework</span>
        </div>
      </div>
    </div>

    <!-- Stats bar -->
    <div class="hero__stats">
      <div class="hero__stat">
        <span class="hero__stat-num">1</span>
        <span class="hero__stat-label">API for everything</span>
      </div>
      <div class="hero__stat-sep"></div>
      <div class="hero__stat">
        <span class="hero__stat-num">2</span>
        <span class="hero__stat-label">key types — public + secret</span>
      </div>
      <div class="hero__stat-sep"></div>
      <div class="hero__stat">
        <span class="hero__stat-num">∞</span>
        <span class="hero__stat-label">frontends supported</span>
      </div>
      <div class="hero__stat-sep"></div>
      <div class="hero__stat">
        <span class="hero__stat-num">99.9%</span>
        <span class="hero__stat-label">uptime SLA</span>
      </div>
    </div>
  </section>

  <!-- ── Features ───────────────────────────────────────────────────────── -->
  <section class="features" id="features">
    <div class="features__inner">
      <div class="features__header">
        <div class="features__eyebrow">What's included</div>
        <h2 class="features__title">{t.feat_title}</h2>
        <p class="features__sub">{t.feat_sub}</p>
      </div>

      <div class="features__grid">
        {#each features as f}
          <div class="features__card" class:features__card--accent={f.accent}>
            <div class="features__icon-wrap">
              <span class="features__icon">{f.icon}</span>
            </div>
            <div class="features__card-title">{t[f.key_title as keyof typeof t]}</div>
            <div class="features__card-body">{t[f.key_body as keyof typeof t]}</div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- ── How it works ───────────────────────────────────────────────────── -->
  <section class="how">
    <div class="how__inner">
      <div class="how__header">
        <div class="how__eyebrow">How it works</div>
        <h2 class="how__title">{t.how_title}</h2>
      </div>

      <div class="how__steps">
        <div class="how__step">
          <div class="how__step-num">01</div>
          <div class="how__step-content">
            <div class="how__step-label">{t['h1_label' as keyof typeof t]}</div>
            <div class="how__step-body">{t['h1_body' as keyof typeof t]}</div>
          </div>
        </div>
        <div class="how__step-connector"></div>
        <div class="how__step">
          <div class="how__step-num">02</div>
          <div class="how__step-content">
            <div class="how__step-label">{t['h2_label' as keyof typeof t]}</div>
            <div class="how__step-body">{t['h2_body' as keyof typeof t]}</div>
          </div>
        </div>
        <div class="how__step-connector"></div>
        <div class="how__step">
          <div class="how__step-num">03</div>
          <div class="how__step-content">
            <div class="how__step-label">{t['h3_label' as keyof typeof t]}</div>
            <div class="how__step-body">{t['h3_body' as keyof typeof t]}</div>
          </div>
        </div>
      </div>

      <!-- Code snippet -->
      <div class="how__snippet">
        <div class="how__snippet-bar">
          <button
            class="how__snippet-tab"
            class:how__snippet-tab--active={activeTab === 'fetch'}
            onclick={() => activeTab = 'fetch'}>fetch.js</button>
          <button
            class="how__snippet-tab"
            class:how__snippet-tab--active={activeTab === 'next'}
            onclick={() => activeTab = 'next'}>next.js</button>
          <button
            class="how__snippet-tab"
            class:how__snippet-tab--active={activeTab === 'svelte'}
            onclick={() => activeTab = 'svelte'}>svelte</button>
          <button class="how__snippet-copy" onclick={copyCode}>
            {copied ? '✓ copied' : 'copy'}
          </button>
        </div>
        <pre class="how__code">{@html highlighted[activeTab]}</pre>
      </div>
    </div>
  </section>

  <!-- ── Pricing teaser ─────────────────────────────────────────────────── -->
  <section class="pricing" id="pricing">
    <div class="pricing__inner">
      <div class="pricing__text">
        <div class="pricing__eyebrow">Pricing</div>
        <h2 class="pricing__title">{t.price_title}</h2>
        <p class="pricing__sub">{t.price_sub}</p>
        <div class="pricing__pillars">
          <div class="pricing__pillar">
            <span class="pricing__pillar-icon">✓</span>
            No credit card to start
          </div>
          <div class="pricing__pillar">
            <span class="pricing__pillar-icon">✓</span>
            Cancel anytime
          </div>
          <div class="pricing__pillar">
            <span class="pricing__pillar-icon">✓</span>
            GDPR compliant
          </div>
        </div>
      </div>

      <div class="pricing__card">
        <div class="pricing__card-glow"></div>
        <div class="pricing__free-badge">Free forever</div>
        <div class="pricing__free-label">{t.price_free}</div>
        <div class="pricing__price">€0<span class="pricing__price-period">/mo</span></div>
        <div class="pricing__divider"></div>
        <ul class="pricing__list">
          <li>1 site</li>
          <li>5 collections per site</li>
          <li>1,000 entries</li>
          <li>500 MB storage</li>
          <li>Public + secret API keys</li>
          <li>Community support</li>
        </ul>
        <a href="/register" class="pricing__cta">{t.price_cta}</a>
        <div class="pricing__paid-note">{t.price_paid}</div>
      </div>
    </div>
  </section>

  <!-- ── Final CTA ──────────────────────────────────────────────────────── -->
  <section class="cta">
    <div class="cta__bg">
      <div class="cta__glow"></div>
      <div class="cta__grid"></div>
    </div>
    <div class="cta__inner">
      <div class="cta__eyebrow">Ready?</div>
      <h2 class="cta__title">
        {t.final_title}<br />
        <span class="cta__hl">{t.final_hl}</span>
      </h2>
      <p class="cta__sub">{t.final_sub}</p>
      <div class="cta__actions">
        <a href="/register" class="cta__btn">
          {t.final_cta}
          <span class="cta__btn-arrow">→</span>
        </a>
      </div>
      {#if !data.session}
        <div class="cta__login">
          <a href="/login">{t.final_login}</a>
        </div>
      {/if}
    </div>
  </section>

  <!-- ── Footer ─────────────────────────────────────────────────────────── -->
  <footer class="footer">
    <div class="footer__inner">
      <div class="footer__left">
        <div class="footer__logo">
          <div class="footer__logo-mark"><span class="footer__logo-q">iq</span></div>
          <span>Foundiq</span>
        </div>
        <div class="footer__tagline">{t.footer_tagline}</div>
      </div>
      <div class="footer__links">
        <a href="/docs">API Docs</a>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="mailto:info@foundiq.com">Contact</a>
      </div>
      <div class="footer__copy">{t.footer_copy}</div>
    </div>
  </footer>

</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Geist:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

  :root {
    --bg:          #060910;
    --surface:     #0b1018;
    --card:        #0f1620;
    --border:      #1a2535;
    --border-hi:   #243550;
    --amber:       #f5a623;
    --amber-dim:   rgba(245,166,35,0.10);
    --amber-glow:  rgba(245,166,35,0.22);
    --amber-soft:  rgba(245,166,35,0.06);
    --text:        #e2eeff;
    --text-2:      #7a9cbd;
    --text-3:      #3a5570;
    --green:       #00e896;
    --mono:        'IBM Plex Mono', monospace;
    --display:     'Syne', system-ui, sans-serif;
    --sans:        'Geist', system-ui, sans-serif;
    --r:           10px;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .lp {
    background: var(--bg);
    color: var(--text);
    font-family: var(--sans);
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
  }

  /* ── Nav ── */
  .nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    padding: 0 40px; height: 64px;
    transition: background 0.25s, border-color 0.25s;
    border-bottom: 1px solid transparent;
  }
  .nav--scrolled {
    background: rgba(6,9,16,0.88);
    backdrop-filter: blur(20px);
    border-color: var(--border);
  }
  .nav__inner {
    max-width: 1200px; margin: 0 auto; height: 100%;
    display: flex; align-items: center; gap: 32px;
  }

  .nav__logo {
    display: flex; align-items: center; gap: 10px;
    font-family: var(--display); font-size: 17px; font-weight: 700;
    color: var(--text); text-decoration: none; flex-shrink: 0;
  }
  .nav__logo-mark {
    width: 28px; height: 28px; background: var(--amber); border-radius: 7px;
    box-shadow: 0 0 16px var(--amber-glow);
    display: flex; align-items: center; justify-content: center;
  }
  .nav__logo-q {
    font-family: var(--display); font-size: 10px; font-weight: 800;
    color: #06090f; letter-spacing: -0.05em;
  }

  .nav__links { display: flex; gap: 28px; flex: 1; }
  .nav__link  {
    font-size: 13px; color: var(--text-2); text-decoration: none;
    transition: color 0.12s; font-weight: 500;
  }
  .nav__link:hover { color: var(--text); }

  .nav__cta { display: flex; gap: 10px; align-items: center; }
  .nav__btn {
    font-size: 13px; font-weight: 600; padding: 8px 18px;
    border-radius: 8px; text-decoration: none; transition: all 0.15s;
    font-family: var(--sans);
  }
  .nav__btn--ghost   { color: var(--text-2); background: none; }
  .nav__btn--ghost:hover { color: var(--text); }
  .nav__btn--primary { background: var(--amber); color: #06090f; }
  .nav__btn--primary:hover { filter: brightness(1.08); box-shadow: 0 4px 20px var(--amber-glow); }

  /* ── Hero ── */
  .hero {
    position: relative; min-height: 100vh;
    display: flex; flex-direction: column; padding-top: 64px;
  }

  .hero__bg { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }

  .hero__grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(245,166,35,0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(245,166,35,0.035) 1px, transparent 1px);
    background-size: 60px 60px;
    mask-image: radial-gradient(ellipse 90% 70% at 50% 0%, black 30%, transparent 100%);
  }

  .hero__noise {
    position: absolute; inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
    opacity: 0.4;
  }

  .hero__glow-1 {
    position: absolute; top: -15%; left: 15%; width: 900px; height: 700px;
    background: radial-gradient(ellipse, rgba(245,166,35,0.08) 0%, transparent 60%);
    filter: blur(80px); transform: translateX(-50%);
  }
  .hero__glow-2 {
    position: absolute; top: 30%; right: -10%; width: 600px; height: 500px;
    background: radial-gradient(ellipse, rgba(0,180,255,0.04) 0%, transparent 60%);
    filter: blur(100px);
  }
  .hero__glow-3 {
    position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
    width: 1200px; height: 300px;
    background: radial-gradient(ellipse, rgba(245,166,35,0.04) 0%, transparent 60%);
    filter: blur(60px);
  }

  .hero__inner {
    position: relative; flex: 1;
    max-width: 1200px; margin: 0 auto; width: 100%;
    padding: 90px 40px 60px;
    display: grid; grid-template-columns: 55fr 45fr; gap: 48px; align-items: center;
    opacity: 0; transform: translateY(24px);
    transition: opacity 0.7s ease, transform 0.7s ease;
  }
  .hero__inner--visible { opacity: 1; transform: translateY(0); }

  .hero__badge {
    display: inline-flex; align-items: center; gap: 8px;
    font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
    padding: 5px 14px; border-radius: 20px;
    background: var(--amber-dim); border: 1px solid rgba(245,166,35,0.3);
    color: var(--amber); margin-bottom: 28px;
  }
  .hero__badge-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--amber); animation: pulse 2s infinite;
  }
  @keyframes pulse { 0%, 100% { opacity: 1; box-shadow: 0 0 0 0 var(--amber-glow); } 50% { opacity: 0.6; box-shadow: 0 0 0 4px transparent; } }

  .hero__h1 {
    font-family: var(--display); font-size: clamp(34px, 4.5vw, 60px);
    font-weight: 800; line-height: 1.08; letter-spacing: -0.03em; margin-bottom: 22px;
  }
  .hero__h1-pre { display: block; color: var(--text); }
  .hero__h1-hl  {
    display: block; color: var(--amber);
    position: relative;
  }

  .hero__sub {
    font-size: 17px; color: var(--text-2); line-height: 1.75;
    max-width: 460px; margin-bottom: 36px; font-weight: 300;
  }

  .hero__actions { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; margin-bottom: 20px; }

  .hero__btn {
    font-size: 14px; font-weight: 600; padding: 13px 26px;
    border-radius: var(--r); text-decoration: none; transition: all 0.15s;
    font-family: var(--sans); display: inline-flex; align-items: center; gap: 8px;
  }
  .hero__btn--primary { background: var(--amber); color: #06090f; }
  .hero__btn--primary:hover {
    filter: brightness(1.08);
    box-shadow: 0 8px 32px var(--amber-glow);
    transform: translateY(-1px);
  }
  .hero__btn--ghost   { color: var(--text-2); border: 1px solid var(--border-hi); }
  .hero__btn--ghost:hover { color: var(--text); border-color: rgba(245,166,35,0.4); }
  .hero__btn-arrow { transition: transform 0.15s; }
  .hero__btn--primary:hover .hero__btn-arrow { transform: translateX(3px); }

  .hero__trust {
    display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
  }
  .hero__trust-item { font-size: 12px; color: var(--text-3); }
  .hero__trust-sep  { color: var(--text-3); opacity: 0.4; }

  /* Hero text + terminal grid children */
  .hero__text {
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  /* Terminal */
  .hero__term {
    min-width: 0;
    background: rgba(8,12,20,0.9); border: 1px solid var(--border-hi);
    border-radius: 16px; overflow: hidden;
    box-shadow: 0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(245,166,35,0.06);
    backdrop-filter: blur(8px);
  }
  .hero__term-bar {
    display: flex; align-items: center; gap: 8px;
    padding: 12px 16px; background: rgba(11,16,24,0.8);
    border-bottom: 1px solid var(--border);
  }
  .hero__term-dot   { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .hero__term-dot--r { background: #ff5f57; }
  .hero__term-dot--y { background: #febc2e; }
  .hero__term-dot--g { background: #28c840; }
  .hero__term-title {
    font-family: var(--mono); font-size: 11px;
    color: var(--text-3); margin-left: 6px;
  }

  .hero__term-body {
    padding: 20px 20px 16px; font-family: var(--mono); font-size: 12px;
    line-height: 1.85; overflow-x: hidden;
  }
  .hero__term-line { display: flex; gap: 8px; flex-wrap: wrap; }
  .hero__term-cmd  { color: #c3e88d; word-break: break-all; }
  .hero__term-cmd--indent { padding-left: 12px; }
  .hero__term-prompt { color: var(--amber); font-weight: 500; flex-shrink: 0; }
  .hero__term-resp   { color: #82aaff; }
  .hero__term-line--res .hero__term-resp { color: var(--text-2); }

  @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
  .hero__term-cursor { color: var(--amber); animation: blink 1s step-end infinite; }

  .hero__term-footer {
    padding: 10px 20px 14px; display: flex; gap: 8px;
    border-top: 1px solid var(--border);
  }
  .hero__term-tag {
    font-family: var(--mono); font-size: 10px;
    padding: 2px 8px; border-radius: 4px;
    background: var(--amber-dim); color: var(--amber);
    border: 1px solid rgba(245,166,35,0.2);
  }

  /* Stats bar */
  .hero__stats {
    position: relative; border-top: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    padding: 24px 40px; gap: 0; flex-wrap: wrap;
    background: rgba(255,255,255,0.01);
  }
  .hero__stat { padding: 0 36px; text-align: center; }
  .hero__stat-num {
    display: block; font-family: var(--display); font-size: 22px;
    font-weight: 800; color: var(--amber);
  }
  .hero__stat-label {
    display: block; font-size: 11px; color: var(--text-3);
    margin-top: 3px; text-transform: uppercase; letter-spacing: 0.06em;
  }
  .hero__stat-sep { width: 1px; height: 40px; background: var(--border); flex-shrink: 0; }

  /* ── Features ── */
  .features { padding: 120px 40px; }
  .features__inner { max-width: 1200px; margin: 0 auto; }
  .features__header { text-align: center; margin-bottom: 64px; }
  .features__eyebrow {
    font-size: 11px; font-weight: 600; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--amber); margin-bottom: 14px;
  }
  .features__title {
    font-family: var(--display); font-size: clamp(28px, 3.5vw, 46px);
    font-weight: 800; letter-spacing: -0.03em; margin-bottom: 16px;
  }
  .features__sub {
    font-size: 16px; color: var(--text-2); max-width: 500px;
    margin: 0 auto; line-height: 1.7;
  }

  .features__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }

  .features__card {
    background: var(--card); border: 1px solid var(--border);
    border-radius: 16px; padding: 28px 24px;
    transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
    position: relative; overflow: hidden;
  }
  .features__card::before {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(135deg, var(--amber-soft) 0%, transparent 60%);
    opacity: 0; transition: opacity 0.2s;
  }
  .features__card:hover { border-color: var(--border-hi); transform: translateY(-3px); box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
  .features__card:hover::before { opacity: 1; }
  .features__card--accent { border-color: rgba(245,166,35,0.25); }
  .features__card--accent::before { opacity: 0.6; }
  .features__card--accent:hover { border-color: rgba(245,166,35,0.5); box-shadow: 0 20px 60px rgba(245,166,35,0.08); }

  .features__icon-wrap {
    width: 40px; height: 40px; border-radius: 10px;
    background: var(--amber-dim); border: 1px solid rgba(245,166,35,0.2);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 16px;
  }
  .features__icon      { font-size: 18px; color: var(--amber); }
  .features__card-title { font-size: 15px; font-weight: 600; margin-bottom: 10px; letter-spacing: -0.01em; }
  .features__card-body  { font-size: 13px; color: var(--text-2); line-height: 1.75; }

  /* ── How ── */
  .how {
    padding: 100px 40px;
    background: var(--surface);
    border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);
  }
  .how__inner   { max-width: 1100px; margin: 0 auto; }
  .how__header  { text-align: center; margin-bottom: 60px; }
  .how__eyebrow {
    font-size: 11px; font-weight: 600; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--amber); margin-bottom: 14px;
  }
  .how__title {
    font-family: var(--display); font-size: clamp(26px, 3vw, 42px);
    font-weight: 800; letter-spacing: -0.03em;
  }

  .how__steps {
    display: flex; align-items: flex-start; gap: 0;
    margin-bottom: 56px;
  }
  .how__step { flex: 1; display: flex; gap: 16px; }
  .how__step-connector {
    width: 60px; flex-shrink: 0;
    height: 2px; background: linear-gradient(90deg, var(--amber), transparent);
    margin-top: 18px; opacity: 0.3;
  }
  .how__step-num {
    font-family: var(--display); font-size: 36px; font-weight: 800;
    color: var(--amber); opacity: 0.25; line-height: 1; flex-shrink: 0; min-width: 52px;
  }
  .how__step-label { font-size: 14px; font-weight: 600; margin-bottom: 8px; color: var(--text); }
  .how__step-body  { font-size: 13px; color: var(--text-2); line-height: 1.75; }

  .how__snippet { border-radius: 14px; overflow: hidden; border: 1px solid var(--border-hi); }
  .how__snippet-bar {
    display: flex; gap: 0; background: #080c14;
    border-bottom: 1px solid var(--border); align-items: center;
  }
  .nav__lang {
    display: flex; gap: 2px; align-items: center;
    background: var(--card); border: 1px solid var(--border);
    border-radius: 8px; padding: 3px; margin-right: 8px;
  }
  .nav__lang-btn {
    font-size: 11px; font-weight: 600; letter-spacing: 0.04em;
    text-transform: uppercase; padding: 4px 8px; border-radius: 5px;
    border: none; background: transparent; color: var(--text-3);
    cursor: pointer; font-family: var(--sans); transition: all 0.12s;
  }
  .nav__lang-btn:hover { color: var(--text-2); }
  .nav__lang-btn--active { background: var(--amber); color: #06090f; }

  .how__snippet-tab {
    font-family: var(--mono); font-size: 11px; padding: 10px 16px;
    color: var(--text-3); cursor: pointer; border-right: 1px solid var(--border);
    transition: all 0.12s; background: none; border-top: none;
    border-bottom: none; border-left: none;
  }
  .how__snippet-tab--active { color: var(--amber); background: rgba(245,166,35,0.06); }
  .how__snippet-tab:hover:not(.how__snippet-tab--active) { color: var(--text-2); }
  .how__snippet-copy {
    margin-left: auto; font-family: var(--mono); font-size: 11px;
    color: var(--text-3); padding: 10px 16px; cursor: pointer;
    transition: color 0.12s; background: none; border: none;
    min-width: 64px; text-align: right;
  }
  .how__snippet-copy:hover { color: var(--amber); }
  .how__code {
    padding: 24px 28px; font-family: var(--mono); font-size: 13px;
    line-height: 1.85; color: var(--text-2); background: #060910;
    overflow-x: auto; white-space: pre; display: block;
  }

  /* Syntax highlighting — :global() required because these classes
     live inside {@html} which Svelte doesn't scope-attribute */
  :global(.s-kw)      { color: #c792ea; }
  :global(.s-fn)      { color: #82aaff; }
  :global(.s-str)     { color: #c3e88d; }
  :global(.s-tmpl)    { color: #f78c6c; }
  :global(.s-comment) { color: #4a6a8a; font-style: italic; }

  /* ── Pricing ── */
  .pricing { padding: 120px 40px; }
  .pricing__inner {
    max-width: 960px; margin: 0 auto;
    display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: start;
  }
  .pricing__eyebrow {
    font-size: 11px; font-weight: 600; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--amber); margin-bottom: 14px;
  }
  .pricing__title {
    font-family: var(--display); font-size: clamp(24px, 3vw, 40px);
    font-weight: 800; letter-spacing: -0.03em; margin-bottom: 16px;
  }
  .pricing__sub   { font-size: 15px; color: var(--text-2); line-height: 1.75; margin-bottom: 28px; }

  .pricing__pillars { display: flex; flex-direction: column; gap: 10px; }
  .pricing__pillar  { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text-2); }
  .pricing__pillar-icon { color: var(--amber); font-size: 12px; }

  .pricing__card {
    position: relative; overflow: hidden;
    background: var(--card); border: 1px solid rgba(245,166,35,0.3);
    border-radius: 20px; padding: 36px 32px;
    box-shadow: 0 0 80px rgba(245,166,35,0.07);
  }
  .pricing__card-glow {
    position: absolute; top: -60px; right: -60px;
    width: 200px; height: 200px;
    background: radial-gradient(circle, var(--amber-glow) 0%, transparent 70%);
    filter: blur(40px); pointer-events: none;
  }
  .pricing__free-badge {
    display: inline-block; font-size: 10px; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
    padding: 3px 10px; border-radius: 20px;
    background: var(--amber-dim); color: var(--amber);
    border: 1px solid rgba(245,166,35,0.25); margin-bottom: 12px;
  }
  .pricing__free-label {
    font-family: var(--display); font-size: 20px; font-weight: 800;
    color: var(--text); margin-bottom: 4px;
  }
  .pricing__price {
    font-family: var(--display); font-size: 52px; font-weight: 800;
    color: var(--amber); line-height: 1; margin-bottom: 20px;
  }
  .pricing__price-period { font-size: 20px; color: var(--text-2); font-weight: 400; }
  .pricing__divider { height: 1px; background: var(--border); margin-bottom: 20px; }
  .pricing__list {
    list-style: none; display: flex; flex-direction: column; gap: 10px;
    margin-bottom: 28px;
  }
  .pricing__list li {
    font-size: 13px; color: var(--text-2);
    display: flex; align-items: center; gap: 10px;
  }
  .pricing__list li::before { content: '✓'; color: var(--amber); font-size: 12px; }
  .pricing__cta {
    display: block; padding: 14px; background: var(--amber); color: #06090f;
    border-radius: var(--r); font-size: 14px; font-weight: 700;
    text-decoration: none; transition: all 0.15s; margin-bottom: 14px;
    text-align: center;
  }
  .pricing__cta:hover { filter: brightness(1.08); box-shadow: 0 6px 28px var(--amber-glow); }
  .pricing__paid-note { font-size: 12px; color: var(--text-3); line-height: 1.6; text-align: center; }

  /* ── Final CTA ── */
  .cta { position: relative; padding: 160px 40px; text-align: center; overflow: hidden; }
  .cta__bg { position: absolute; inset: 0; pointer-events: none; }
  .cta__glow {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: 900px; height: 700px;
    background: radial-gradient(ellipse, rgba(245,166,35,0.09) 0%, transparent 60%);
    filter: blur(80px);
  }
  .cta__grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(245,166,35,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(245,166,35,0.025) 1px, transparent 1px);
    background-size: 60px 60px;
    mask-image: radial-gradient(ellipse 70% 80% at 50% 50%, black 20%, transparent 80%);
  }
  .cta__inner { position: relative; max-width: 700px; margin: 0 auto; }
  .cta__eyebrow {
    font-size: 11px; font-weight: 600; letter-spacing: 0.15em;
    text-transform: uppercase; color: var(--amber); margin-bottom: 20px;
  }
  .cta__title {
    font-family: var(--display); font-size: clamp(32px, 5vw, 64px);
    font-weight: 800; letter-spacing: -0.03em; line-height: 1.08; margin-bottom: 20px;
  }
  .cta__hl  { color: var(--amber); }
  .cta__sub {
    font-size: 17px; color: var(--text-2); line-height: 1.75;
    margin-bottom: 44px; font-weight: 300;
  }
  .cta__actions { display: flex; justify-content: center; }
  .cta__btn {
    display: inline-flex; align-items: center; gap: 10px;
    padding: 16px 48px; background: var(--amber); color: #06090f;
    border-radius: 12px; font-size: 15px; font-weight: 700;
    text-decoration: none; transition: all 0.15s;
  }
  .cta__btn:hover { filter: brightness(1.08); box-shadow: 0 10px 48px var(--amber-glow); transform: translateY(-2px); }
  .cta__btn-arrow { transition: transform 0.15s; }
  .cta__btn:hover .cta__btn-arrow { transform: translateX(4px); }
  .cta__login { margin-top: 24px; }
  .cta__login a { font-size: 13px; color: var(--text-3); text-decoration: none; transition: color 0.12s; }
  .cta__login a:hover { color: var(--amber); }

  /* ── Footer ── */
  .footer { border-top: 1px solid var(--border); padding: 52px 40px; }
  .footer__inner {
    max-width: 1200px; margin: 0 auto;
    display: flex; align-items: center; gap: 32px; flex-wrap: wrap;
  }
  .footer__left { display: flex; flex-direction: column; gap: 6px; }
  .footer__logo {
    display: flex; align-items: center; gap: 9px;
    font-family: var(--display); font-size: 15px; font-weight: 700;
  }
  .footer__logo-mark {
    width: 22px; height: 22px; background: var(--amber); border-radius: 5px;
    display: flex; align-items: center; justify-content: center;
  }
  .footer__logo-q { font-family: var(--display); font-size: 8px; font-weight: 800; color: #06090f; letter-spacing: -0.05em; }
  .footer__tagline { font-size: 12px; color: var(--text-3); }
  .footer__links { display: flex; gap: 24px; margin-left: auto; }
  .footer__links a { font-size: 13px; color: var(--text-3); text-decoration: none; transition: color 0.12s; }
  .footer__links a:hover { color: var(--text-2); }
  .footer__copy { font-size: 11px; color: var(--text-3); width: 100%; margin-top: 12px; }

  /* ── Responsive ── */
  @media (max-width: 960px) {
    .hero__inner { grid-template-columns: 1fr; padding: 60px 24px 40px; }
    .hero__term  { display: none; }
    .features__grid { grid-template-columns: repeat(2, 1fr); }
    .how__steps { flex-direction: column; gap: 28px; }
    .how__step-connector { display: none; }
    .pricing__inner { grid-template-columns: 1fr; gap: 48px; }
    .nav__links { display: none; }
  }

  @media (max-width: 600px) {
    .features__grid { grid-template-columns: 1fr; }
    .hero__stats { gap: 0; }
    .hero__stat { padding: 12px 20px; }
    .hero__stat-sep { display: none; }
    .nav { padding: 0 20px; }
    .features, .how, .pricing, .cta { padding-left: 24px; padding-right: 24px; }
    .footer { padding: 36px 24px; }
    .footer__links { margin-left: 0; }
  }
</style>