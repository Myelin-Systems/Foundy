<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';

  const { data } = $props<{ data: { session: { email: string } | null } }>();

  // ── Auto-translation ──────────────────────────────────────────────────────
  const translations: Record<string, Record<string, string>> = {
    en: {
      nav_product:   'Product',
      nav_docs:      'Docs',
      nav_pricing:   'Pricing',
      nav_signin:    'Sign in',
      nav_start:     'Get started',
      nav_dashboard: 'Dashboard →',

      badge:         'Now in beta',
      hero_pre:      'Headless CMS.',
      hero_hl:       'Any frontend.',
      hero_sub:      'Store content, manage social, sell products — then fetch everything with a single API your developers will love.',
      cta_primary:   'Start for free',
      cta_docs:      'Read the docs →',

      feat_title:    'Everything in one place',
      feat_sub:      'No more stitching together five tools. Foundy gives you the full stack.',
      f1_title:      'Headless CMS',
      f1_body:       'Define collections, manage entries, publish instantly. Fetch your content from any frontend with a clean REST API.',
      f2_title:      'Social management',
      f2_body:       'Schedule posts across platforms, manage multiple client accounts, and track performance — all from one dashboard.',
      f3_title:      'Commerce-ready',
      f3_body:       'Product catalogues, atomic stock management, and order tracking built in. No payment processing required.',
      f4_title:      'Media storage',
      f4_body:       'Upload files, images, and documents. Get back clean URLs. Storage scales with your plan.',
      f5_title:      'Two API keys',
      f5_body:       'A public key safe for browser code and a secret key for your server. Works like Stripe — simple by design.',
      f6_title:      'Self-hostable',
      f6_body:       'Deploy on your own infrastructure with Docker. Your data stays yours. No vendor lock-in, ever.',

      how_title:     'Up and running in minutes',
      h1_label:      'Create a collection',
      h1_body:       'Define your content structure — fields, types, validation. Takes 30 seconds.',
      h2_label:      'Add your content',
      h2_body:       'Write entries in the dashboard or push them via the secret key API.',
      h3_label:      'Fetch from anywhere',
      h3_body:       'One fetch call. Your content. In any framework.',

      price_title:   'Start free. Grow when you\'re ready.',
      price_sub:     'The free plan gives you a real site with real limits — enough to ship something.',
      price_free:    'Free forever',
      price_limits:  '1 site · 5 collections · 1,000 entries · 500 MB storage',
      price_cta:     'Start building →',
      price_paid:    'Paid plans from $29/mo · No credit card for free tier',

      final_title:   'Ship faster.',
      final_hl:      'Your content stack sorted.',
      final_sub:     'Join developers who stopped stitching tools together.',
      final_cta:     'Create your free account',
      final_login:   'Already have an account? Sign in →',

      footer_tagline: 'CMS + Social + Commerce. One API.',
      footer_copy:   '© 2025 Foundy. Built by Myelin Systems.',
    },

    nl: {
      nav_product:   'Product',
      nav_docs:      'Documentatie',
      nav_pricing:   'Prijzen',
      nav_signin:    'Inloggen',
      nav_start:     'Begin nu',
      nav_dashboard: 'Dashboard →',

      badge:         'Nu in beta',
      hero_pre:      'Headless CMS.',
      hero_hl:       'Elk frontend.',
      hero_sub:      'Sla content op, beheer social, verkoop producten — en haal alles op met één API die je developers geweldig vinden.',
      cta_primary:   'Gratis beginnen',
      cta_docs:      'Documentatie lezen →',

      feat_title:    'Alles op één plek',
      feat_sub:      'Stop met vijf tools aan elkaar koppelen. Foundy geeft je de complete stack.',
      f1_title:      'Headless CMS',
      f1_body:       'Definieer collecties, beheer content, publiceer direct. Haal alles op via een nette REST API.',
      f2_title:      'Social beheer',
      f2_body:       'Plan berichten, beheer meerdere klantaccounts en volg prestaties — alles vanuit één dashboard.',
      f3_title:      'Commerce-ready',
      f3_body:       'Productcatalogi, atomisch voorraadbeheer en orderregistratie ingebouwd.',
      f4_title:      'Mediaopslag',
      f4_body:       'Upload bestanden en afbeeldingen. Krijg schone URLs terug. Opslag schaalt mee.',
      f5_title:      'Twee API-sleutels',
      f5_body:       'Een publieke sleutel voor browsercode en een geheime sleutel voor je server. Simpel van ontwerp.',
      f6_title:      'Zelf te hosten',
      f6_body:       'Gebruik Docker op je eigen infrastructuur. Jouw data blijft van jou.',

      how_title:     'In minuten operationeel',
      h1_label:      'Maak een collectie',
      h1_body:       'Definieer je contentstructuur — velden, types, validatie. Duurt 30 seconden.',
      h2_label:      'Voeg content toe',
      h2_body:       'Schrijf items in het dashboard of push ze via de secret key API.',
      h3_label:      'Haal op overal',
      h3_body:       'Eén fetch-aanroep. Jouw content. In elk framework.',

      price_title:   'Begin gratis. Groei wanneer je er klaar voor bent.',
      price_sub:     'Het gratis plan geeft je een echte site met echte limieten — genoeg om iets te lanceren.',
      price_free:    'Altijd gratis',
      price_limits:  '1 site · 5 collecties · 1.000 items · 500 MB opslag',
      price_cta:     'Begin met bouwen →',
      price_paid:    'Betaalde plannen vanaf $29/mo · Geen creditcard voor gratis tier',

      final_title:   'Sneller lanceren.',
      final_hl:      'Je content-stack geregeld.',
      final_sub:     'Sluit je aan bij developers die zijn gestopt met tools aan elkaar koppelen.',
      final_cta:     'Maak een gratis account',
      final_login:   'Al een account? Log in →',

      footer_tagline: 'CMS + Social + Commerce. Één API.',
      footer_copy:   '© 2025 Foundy. Gebouwd door Myelin Systems.',
    },

    de: {
      nav_product:   'Produkt',
      nav_docs:      'Dokumentation',
      nav_pricing:   'Preise',
      nav_signin:    'Anmelden',
      nav_start:     'Kostenlos starten',
      nav_dashboard: 'Dashboard →',

      badge:         'Jetzt in Beta',
      hero_pre:      'Headless CMS.',
      hero_hl:       'Jedes Frontend.',
      hero_sub:      'Inhalte speichern, Social verwalten, Produkte verkaufen — alles mit einer einzigen API.',
      cta_primary:   'Kostenlos starten',
      cta_docs:      'Dokumentation lesen →',

      feat_title:    'Alles an einem Ort',
      feat_sub:      'Kein Zusammenflicken von fünf Tools mehr. Foundy gibt dir den kompletten Stack.',
      f1_title:      'Headless CMS',
      f1_body:       'Kollektionen definieren, Inhalte verwalten, sofort veröffentlichen.',
      f2_title:      'Social-Management',
      f2_body:       'Beiträge planen, mehrere Kundenkonten verwalten und Performance tracken.',
      f3_title:      'Commerce-bereit',
      f3_body:       'Produktkataloge, atomares Bestandsmanagement und Auftragsverfolgung inklusive.',
      f4_title:      'Medienspeicher',
      f4_body:       'Dateien hochladen, saubere URLs erhalten. Speicher skaliert mit dem Plan.',
      f5_title:      'Zwei API-Schlüssel',
      f5_body:       'Ein öffentlicher Schlüssel für Browser-Code und ein geheimer für den Server.',
      f6_title:      'Self-hostbar',
      f6_body:       'Docker auf eigener Infrastruktur. Deine Daten bleiben deine.',

      how_title:     'In Minuten einsatzbereit',
      h1_label:      'Kollektion erstellen',
      h1_body:       'Inhaltsstruktur definieren — Felder, Typen, Validierung. Dauert 30 Sekunden.',
      h2_label:      'Inhalte hinzufügen',
      h2_body:       'Im Dashboard schreiben oder über die Secret-Key-API einspeisen.',
      h3_label:      'Überall abrufen',
      h3_body:       'Ein Fetch-Aufruf. Deine Inhalte. In jedem Framework.',

      price_title:   'Kostenlos starten. Wachsen wenn du bereit bist.',
      price_sub:     'Der kostenlose Plan gibt dir eine echte Website mit echten Limits.',
      price_free:    'Für immer kostenlos',
      price_limits:  '1 Website · 5 Kollektionen · 1.000 Einträge · 500 MB Speicher',
      price_cta:     'Jetzt bauen →',
      price_paid:    'Bezahlpläne ab $29/Monat · Keine Kreditkarte für den kostenlosen Tier',

      final_title:   'Schneller liefern.',
      final_hl:      'Dein Content-Stack gelöst.',
      final_sub:     'Schließ dich Entwicklern an, die aufgehört haben, Tools zusammenzuflicken.',
      final_cta:     'Kostenloses Konto erstellen',
      final_login:   'Schon ein Konto? Anmelden →',

      footer_tagline: 'CMS + Social + Commerce. Eine API.',
      footer_copy:   '© 2025 Foundy. Entwickelt von Myelin Systems.',
    },

    fr: {
      nav_product:   'Produit',
      nav_docs:      'Documentation',
      nav_pricing:   'Tarifs',
      nav_signin:    'Connexion',
      nav_start:     'Commencer',
      nav_dashboard: 'Tableau de bord →',

      badge:         'En bêta',
      hero_pre:      'CMS headless.',
      hero_hl:       'N\'importe quel frontend.',
      hero_sub:      'Stockez du contenu, gérez les réseaux sociaux, vendez des produits — tout via une API simple.',
      cta_primary:   'Commencer gratuitement',
      cta_docs:      'Lire la documentation →',

      feat_title:    'Tout au même endroit',
      feat_sub:      'Arrêtez d\'assembler cinq outils. Foundy vous offre la stack complète.',
      f1_title:      'CMS headless',
      f1_body:       'Définissez des collections, gérez du contenu, publiez instantanément.',
      f2_title:      'Gestion sociale',
      f2_body:       'Planifiez des publications, gérez plusieurs comptes clients et suivez les performances.',
      f3_title:      'Commerce intégré',
      f3_body:       'Catalogues produits, gestion atomique des stocks et suivi des commandes inclus.',
      f4_title:      'Stockage média',
      f4_body:       'Téléchargez des fichiers, obtenez des URLs propres. Le stockage évolue avec votre plan.',
      f5_title:      'Deux clés API',
      f5_body:       'Une clé publique pour le navigateur et une clé secrète pour votre serveur.',
      f6_title:      'Auto-hébergeable',
      f6_body:       'Déployez sur votre propre infrastructure avec Docker. Vos données vous appartiennent.',

      how_title:     'Opérationnel en quelques minutes',
      h1_label:      'Créer une collection',
      h1_body:       'Définissez la structure — champs, types, validation. 30 secondes.',
      h2_label:      'Ajouter du contenu',
      h2_body:       'Rédigez dans le tableau de bord ou envoyez via l\'API.',
      h3_label:      'Récupérer partout',
      h3_body:       'Un appel fetch. Votre contenu. Dans n\'importe quel framework.',

      price_title:   'Commencez gratuitement. Évoluez quand vous êtes prêt.',
      price_sub:     'Le plan gratuit vous donne un vrai site avec de vraies limites.',
      price_free:    'Gratuit pour toujours',
      price_limits:  '1 site · 5 collections · 1 000 entrées · 500 Mo de stockage',
      price_cta:     'Commencer à construire →',
      price_paid:    'Plans payants à partir de 29 $/mois · Pas de carte de crédit',

      final_title:   'Livrez plus vite.',
      final_hl:      'Votre stack de contenu réglée.',
      final_sub:     'Rejoignez les développeurs qui ont arrêté d\'assembler des outils.',
      final_cta:     'Créer un compte gratuit',
      final_login:   'Déjà un compte ? Se connecter →',

      footer_tagline: 'CMS + Social + Commerce. Une API.',
      footer_copy:   '© 2025 Foundy. Construit par Myelin Systems.',
    },

    es: {
      nav_product:   'Producto',
      nav_docs:      'Documentación',
      nav_pricing:   'Precios',
      nav_signin:    'Iniciar sesión',
      nav_start:     'Empezar',
      nav_dashboard: 'Panel →',

      badge:         'En beta',
      hero_pre:      'CMS headless.',
      hero_hl:       'Cualquier frontend.',
      hero_sub:      'Almacena contenido, gestiona redes sociales, vende productos — todo con una sola API.',
      cta_primary:   'Empezar gratis',
      cta_docs:      'Leer la documentación →',

      feat_title:    'Todo en un solo lugar',
      feat_sub:      'Deja de pegar cinco herramientas. Foundy te da el stack completo.',
      f1_title:      'CMS headless',
      f1_body:       'Define colecciones, gestiona entradas, publica al instante.',
      f2_title:      'Gestión social',
      f2_body:       'Programa publicaciones, gestiona múltiples cuentas y rastrea el rendimiento.',
      f3_title:      'Comercio integrado',
      f3_body:       'Catálogos de productos, gestión atómica de stock y seguimiento de pedidos.',
      f4_title:      'Almacenamiento de medios',
      f4_body:       'Sube archivos, obtén URLs limpias. El almacenamiento escala con tu plan.',
      f5_title:      'Dos claves API',
      f5_body:       'Una clave pública para el navegador y una clave secreta para el servidor.',
      f6_title:      'Autoalojable',
      f6_body:       'Despliega en tu propia infraestructura con Docker.',

      how_title:     'En funcionamiento en minutos',
      h1_label:      'Crear una colección',
      h1_body:       'Define tu estructura de contenido — campos, tipos, validación. 30 segundos.',
      h2_label:      'Añadir contenido',
      h2_body:       'Escribe en el panel o envía a través de la API.',
      h3_label:      'Obtener desde cualquier lugar',
      h3_body:       'Una llamada fetch. Tu contenido. En cualquier framework.',

      price_title:   'Empieza gratis. Crece cuando estés listo.',
      price_sub:     'El plan gratuito te da un sitio real con límites reales.',
      price_free:    'Gratis para siempre',
      price_limits:  '1 sitio · 5 colecciones · 1.000 entradas · 500 MB de almacenamiento',
      price_cta:     'Empezar a construir →',
      price_paid:    'Planes de pago desde $29/mes · Sin tarjeta de crédito',

      final_title:   'Lanza más rápido.',
      final_hl:      'Tu stack de contenido resuelto.',
      final_sub:     'Únete a desarrolladores que dejaron de pegar herramientas.',
      final_cta:     'Crear cuenta gratuita',
      final_login:   '¿Ya tienes cuenta? Iniciar sesión →',

      footer_tagline: 'CMS + Social + Comercio. Una API.',
      footer_copy:   '© 2025 Foundy. Construido por Myelin Systems.',
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
    { type: 'cmd',  text: 'curl https://api.foundy.io/v1/sites/MY_SITE/collections/products/entries \\' },
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

  onMount(() => {
    locale = detectLocale();

    // Typewriter effect
    let i = 0;
    const interval = setInterval(() => {
      i++;
      visibleLines = i;
      if (i >= termLines.length) clearInterval(interval);
    }, 120);

    // Nav shadow on scroll
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

  const steps = [
    { num: '01', key_label: 'h1_label', key_body: 'h1_body' },
    { num: '02', key_label: 'h2_label', key_body: 'h2_body' },
    { num: '03', key_label: 'h3_label', key_body: 'h3_body' },
  ];
</script>

<svelte:head>
  <title>Foundy — Headless CMS + Social + Commerce</title>
  <meta name="description" content="Store content, manage social, sell products — then fetch everything with a single API." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Geist:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" />
</svelte:head>

<div class="lp">

  <!-- ── Nav ────────────────────────────────────────────────────────────── -->
  <nav class="nav" class:nav--scrolled={navScrolled}>
    <div class="nav__inner">
      <a href="/" class="nav__logo">
        <div class="nav__logo-mark"></div>
        <span>Foundy</span>
      </a>

      <div class="nav__links">
        <a href="#features" class="nav__link">{t.nav_product}</a>
        <a href="/docs"     class="nav__link">{t.nav_docs}</a>
        <a href="#pricing"  class="nav__link">{t.nav_pricing}</a>
      </div>

      <div class="nav__cta">
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
      <div class="hero__glow-1"></div>
      <div class="hero__glow-2"></div>
    </div>

    <div class="hero__inner">
      <div class="hero__text">
        <div class="hero__badge">{t.badge}</div>
        <h1 class="hero__h1">
          <span class="hero__h1-pre">{t.hero_pre}</span>
          <span class="hero__h1-hl">{t.hero_hl}</span>
        </h1>
        <p class="hero__sub">{t.hero_sub}</p>
        <div class="hero__actions">
          <a href="/register" class="hero__btn hero__btn--primary">{t.cta_primary}</a>
          <a href="/docs"     class="hero__btn hero__btn--ghost">{t.cta_docs}</a>
        </div>
      </div>

      <!-- Terminal -->
      <div class="hero__term">
        <div class="hero__term-bar">
          <span class="hero__term-dot hero__term-dot--r"></span>
          <span class="hero__term-dot hero__term-dot--y"></span>
          <span class="hero__term-dot hero__term-dot--g"></span>
          <span class="hero__term-title">terminal</span>
        </div>
        <div class="hero__term-body">
          {#each termLines.slice(0, visibleLines) as line, i (i)}
            <div class="hero__term-line hero__term-line--{line.type}">
              {#if line.type === 'cmd'}
                <span class="hero__term-prompt">$</span>
                <span class="hero__term-cmd">{line.text}</span>
              {:else if line.type === 'cmd2'}
                <span class="hero__term-cmd">{line.text}</span>
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
      </div>
    </div>

    <!-- Stats bar -->
    <div class="hero__stats">
      <div class="hero__stat">
        <span class="hero__stat-num">1 API</span>
        <span class="hero__stat-label">for everything</span>
      </div>
      <div class="hero__stat-sep"></div>
      <div class="hero__stat">
        <span class="hero__stat-num">2 key types</span>
        <span class="hero__stat-label">public + secret</span>
      </div>
      <div class="hero__stat-sep"></div>
      <div class="hero__stat">
        <span class="hero__stat-num">∞ frontends</span>
        <span class="hero__stat-label">any framework</span>
      </div>
      <div class="hero__stat-sep"></div>
      <div class="hero__stat">
        <span class="hero__stat-num">0 vendor lock-in</span>
        <span class="hero__stat-label">self-host ready</span>
      </div>
    </div>
  </section>

  <!-- ── Features ───────────────────────────────────────────────────────── -->
  <section class="features" id="features">
    <div class="features__inner">
      <div class="features__header">
        <h2 class="features__title">{t.feat_title}</h2>
        <p class="features__sub">{t.feat_sub}</p>
      </div>

      <div class="features__grid">
        {#each features as f}
          <div class="features__card" class:features__card--accent={f.accent}>
            <div class="features__icon">{f.icon}</div>
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
      <h2 class="how__title">{t.how_title}</h2>

      <div class="how__steps">
        {#each steps as s}
          <div class="how__step">
            <div class="how__step-num">{s.num}</div>
            <div class="how__step-content">
              <div class="how__step-label">{t[s.key_label as keyof typeof t]}</div>
              <div class="how__step-body">{t[s.key_body as keyof typeof t]}</div>
            </div>
          </div>
        {/each}
      </div>

      <!-- Code snippet -->
      <div class="how__snippet">
        <div class="how__snippet-bar">
          <span class="how__snippet-tab how__snippet-tab--active">fetch.js</span>
          <span class="how__snippet-tab">next.js</span>
          <span class="how__snippet-tab">svelte</span>
        </div>
        <pre class="how__code"><span class="s-kw">const</span> res = <span class="s-kw">await</span> <span class="s-fn">fetch</span>(
  <span class="s-str">`https://api.foundy.io/v1/sites/<span class="s-tmpl">${"{"}SITE_ID{"}"}</span>/collections/products/entries`</span>,
  {"{"} headers: {"{"} <span class="s-str">'Authorization'</span>: <span class="s-str">`Bearer <span class="s-tmpl">${"{"}YOUR_KEY{"}"}</span>`</span> {"}"} {"}"}
);

<span class="s-kw">const</span> {"{"} data, meta {"}"} = <span class="s-kw">await</span> res.<span class="s-fn">json</span>();

<span class="s-comment">// data → your content. meta → pagination. that's it.</span>
<span class="s-fn">console</span>.<span class="s-fn">log</span>(<span class="s-str">`<span class="s-tmpl">${"{"}meta.total{"}"}</span> products loaded`</span>);</pre>
      </div>
    </div>
  </section>

  <!-- ── Pricing teaser ─────────────────────────────────────────────────── -->
  <section class="pricing" id="pricing">
    <div class="pricing__inner">
      <div class="pricing__text">
        <h2 class="pricing__title">{t.price_title}</h2>
        <p class="pricing__sub">{t.price_sub}</p>
      </div>

      <div class="pricing__card">
        <div class="pricing__free-label">{t.price_free}</div>
        <div class="pricing__limits">{t.price_limits}</div>
        <a href="/register" class="pricing__cta">{t.price_cta}</a>
        <div class="pricing__paid-note">{t.price_paid}</div>
      </div>
    </div>
  </section>

  <!-- ── Final CTA ──────────────────────────────────────────────────────── -->
  <section class="cta">
    <div class="cta__bg">
      <div class="cta__glow"></div>
    </div>
    <div class="cta__inner">
      <h2 class="cta__title">
        {t.final_title}<br />
        <span class="cta__hl">{t.final_hl}</span>
      </h2>
      <p class="cta__sub">{t.final_sub}</p>
      <a href="/register" class="cta__btn">{t.final_cta}</a>
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
      <div class="footer__logo">
        <div class="footer__logo-mark"></div>
        <span>Foundy</span>
      </div>
      <div class="footer__tagline">{t.footer_tagline}</div>
      <div class="footer__links">
        <a href="/docs">API Docs</a>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="mailto:hello@foundy.io">Contact</a>
      </div>
      <div class="footer__copy">{t.footer_copy}</div>
    </div>
  </footer>

</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Geist:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

  :root {
    --bg:        #060910;
    --surface:   #0b1018;
    --card:      #0f1620;
    --border:    #1a2535;
    --border-hi: #243550;
    --amber:     #f5a623;
    --amber-dim: rgba(245,166,35,0.12);
    --amber-glow:rgba(245,166,35,0.25);
    --text:      #e2eeff;
    --text-2:    #7a9cbd;
    --text-3:    #3a5570;
    --green:     #00e896;
    --mono:      'IBM Plex Mono', monospace;
    --display:   'Syne', system-ui, sans-serif;
    --sans:      'Geist', system-ui, sans-serif;
    --r:         10px;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .lp {
    background: var(--bg); color: var(--text);
    font-family: var(--sans); overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
  }

  /* ── Nav ── */
  .nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    padding: 0 40px; height: 64px;
    transition: background 0.2s, border-color 0.2s;
    border-bottom: 1px solid transparent;
  }
  .nav--scrolled { background: rgba(6,9,16,0.92); backdrop-filter: blur(16px); border-color: var(--border); }
  .nav__inner    { max-width: 1200px; margin: 0 auto; height: 100%; display: flex; align-items: center; gap: 32px; }

  .nav__logo {
    display: flex; align-items: center; gap: 10px;
    font-family: var(--display); font-size: 17px; font-weight: 700;
    color: var(--text); text-decoration: none; flex-shrink: 0;
  }
  .nav__logo-mark { width: 26px; height: 26px; background: var(--amber); border-radius: 6px; box-shadow: 0 0 14px var(--amber-glow); }

  .nav__links { display: flex; gap: 28px; flex: 1; }
  .nav__link  { font-size: 13px; color: var(--text-2); text-decoration: none; transition: color 0.12s; font-weight: 500; }
  .nav__link:hover { color: var(--text); }

  .nav__cta   { display: flex; gap: 10px; align-items: center; }
  .nav__btn   { font-size: 13px; font-weight: 600; padding: 8px 18px; border-radius: 8px; text-decoration: none; transition: all 0.15s; font-family: var(--sans); }
  .nav__btn--ghost   { color: var(--text-2); background: none; }
  .nav__btn--ghost:hover { color: var(--text); }
  .nav__btn--primary { background: var(--amber); color: #06090f; }
  .nav__btn--primary:hover { filter: brightness(1.1); box-shadow: 0 4px 20px var(--amber-glow); }

  /* ── Hero ── */
  .hero { position: relative; min-height: 100vh; display: flex; flex-direction: column; padding-top: 64px; }

  .hero__bg { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
  .hero__grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(245,166,35,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(245,166,35,0.04) 1px, transparent 1px);
    background-size: 60px 60px;
    mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%);
  }
  .hero__glow-1 {
    position: absolute; top: -10%; left: 20%; width: 800px; height: 600px;
    background: radial-gradient(ellipse, rgba(245,166,35,0.07) 0%, transparent 65%);
    filter: blur(60px); transform: translateX(-50%);
  }
  .hero__glow-2 {
    position: absolute; top: 20%; right: -5%; width: 500px; height: 400px;
    background: radial-gradient(ellipse, rgba(0,212,255,0.04) 0%, transparent 60%);
    filter: blur(80px);
  }

  .hero__inner {
    position: relative; flex: 1;
    max-width: 1200px; margin: 0 auto; width: 100%;
    padding: 80px 40px 60px;
    display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center;
  }

  .hero__badge {
    display: inline-flex; align-items: center; gap: 8px;
    font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
    padding: 4px 12px; border-radius: 20px;
    background: rgba(245,166,35,0.1); border: 1px solid rgba(245,166,35,0.25);
    color: var(--amber); margin-bottom: 24px;
  }
  .hero__badge::before { content: '●'; font-size: 7px; animation: pulse 2s infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

  .hero__h1 {
    font-family: var(--display); font-size: clamp(36px, 5vw, 64px);
    font-weight: 800; line-height: 1.05; letter-spacing: -0.03em;
    margin-bottom: 20px;
  }
  .hero__h1-pre { display: block; color: var(--text); }
  .hero__h1-hl  { display: block; color: var(--amber); }

  .hero__sub {
    font-size: 17px; color: var(--text-2); line-height: 1.7;
    max-width: 460px; margin-bottom: 36px; font-weight: 300;
  }

  .hero__actions { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; }

  .hero__btn { font-size: 14px; font-weight: 600; padding: 13px 28px; border-radius: var(--r); text-decoration: none; transition: all 0.15s; font-family: var(--sans); }
  .hero__btn--primary { background: var(--amber); color: #06090f; }
  .hero__btn--primary:hover { filter: brightness(1.1); box-shadow: 0 6px 28px var(--amber-glow); transform: translateY(-1px); }
  .hero__btn--ghost   { color: var(--text-2); border: 1px solid var(--border-hi); }
  .hero__btn--ghost:hover { color: var(--text); border-color: var(--amber); }

  /* Terminal */
  .hero__term {
    background: #080c14; border: 1px solid var(--border-hi);
    border-radius: 14px; overflow: hidden;
    box-shadow: 0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(245,166,35,0.05);
  }
  .hero__term-bar {
    display: flex; align-items: center; gap: 8px;
    padding: 12px 16px; background: #0b1018; border-bottom: 1px solid var(--border);
  }
  .hero__term-dot   { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .hero__term-dot--r { background: #ff5f57; }
  .hero__term-dot--y { background: #febc2e; }
  .hero__term-dot--g { background: #28c840; }
  .hero__term-title { font-family: var(--mono); font-size: 11px; color: var(--text-3); margin-left: 4px; }

  .hero__term-body {
    padding: 20px; font-family: var(--mono); font-size: 12px;
    line-height: 1.8; min-height: 260px;
  }
  .hero__term-line { display: flex; gap: 8px; }
  .hero__term-prompt { color: var(--amber); font-weight: 500; flex-shrink: 0; }
  .hero__term-cmd    { color: #c3e88d; }
  .hero__term-resp   { color: #82aaff; }
  .hero__term-line--res .hero__term-resp { color: var(--text-2); }

  @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
  .hero__term-cursor { color: var(--amber); animation: blink 1s step-end infinite; }

  /* Stats bar */
  .hero__stats {
    position: relative;
    border-top: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    padding: 20px 40px; gap: 0; flex-wrap: wrap;
    background: rgba(255,255,255,0.01);
  }
  .hero__stat     { padding: 0 32px; text-align: center; }
  .hero__stat-num { display: block; font-family: var(--display); font-size: 18px; font-weight: 700; color: var(--amber); }
  .hero__stat-label { display: block; font-size: 11px; color: var(--text-3); margin-top: 2px; text-transform: uppercase; letter-spacing: 0.06em; }
  .hero__stat-sep { width: 1px; height: 36px; background: var(--border); flex-shrink: 0; }

  /* ── Features ── */
  .features { padding: 120px 40px; }
  .features__inner { max-width: 1200px; margin: 0 auto; }
  .features__header { text-align: center; margin-bottom: 60px; }
  .features__title  { font-family: var(--display); font-size: clamp(28px, 3.5vw, 44px); font-weight: 800; letter-spacing: -0.03em; margin-bottom: 14px; }
  .features__sub    { font-size: 16px; color: var(--text-2); max-width: 480px; margin: 0 auto; line-height: 1.6; }

  .features__grid {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
  }
  .features__card {
    background: var(--card); border: 1px solid var(--border);
    border-radius: 14px; padding: 28px 24px;
    transition: border-color 0.2s, transform 0.2s;
  }
  .features__card:hover { border-color: var(--border-hi); transform: translateY(-2px); }
  .features__card--accent { border-color: rgba(245,166,35,0.2); background: rgba(245,166,35,0.03); }
  .features__card--accent:hover { border-color: rgba(245,166,35,0.4); }

  .features__icon      { font-size: 22px; color: var(--amber); margin-bottom: 14px; }
  .features__card-title { font-size: 15px; font-weight: 600; margin-bottom: 8px; letter-spacing: -0.01em; }
  .features__card-body  { font-size: 13px; color: var(--text-2); line-height: 1.7; }

  /* ── How ── */
  .how { padding: 100px 40px; background: var(--surface); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
  .how__inner { max-width: 1200px; margin: 0 auto; }
  .how__title { font-family: var(--display); font-size: clamp(26px, 3vw, 40px); font-weight: 800; letter-spacing: -0.03em; margin-bottom: 48px; text-align: center; }

  .how__steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; margin-bottom: 56px; }
  .how__step  { display: flex; gap: 16px; }
  .how__step-num {
    font-family: var(--display); font-size: 32px; font-weight: 800;
    color: rgba(245,166,35,0.2); line-height: 1; flex-shrink: 0;
    min-width: 48px;
  }
  .how__step-label { font-size: 15px; font-weight: 600; margin-bottom: 8px; }
  .how__step-body  { font-size: 13px; color: var(--text-2); line-height: 1.7; }

  .how__snippet { border-radius: 14px; overflow: hidden; border: 1px solid var(--border-hi); }
  .how__snippet-bar { display: flex; gap: 0; background: #080c14; border-bottom: 1px solid var(--border); }
  .how__snippet-tab {
    font-family: var(--mono); font-size: 11px; padding: 10px 16px;
    color: var(--text-3); cursor: pointer; border-right: 1px solid var(--border);
    transition: all 0.12s;
  }
  .how__snippet-tab--active { color: var(--amber); background: rgba(245,166,35,0.05); }
  .how__code { padding: 24px 28px; font-family: var(--mono); font-size: 13px; line-height: 1.8; color: var(--text-2); background: #060910; overflow-x: auto; white-space: pre; }

  /* Syntax */
  .s-kw      { color: #c792ea; }
  .s-fn      { color: #82aaff; }
  .s-str     { color: #c3e88d; }
  .s-tmpl    { color: #f78c6c; }
  .s-comment { color: var(--text-3); font-style: italic; }

  /* ── Pricing ── */
  .pricing { padding: 120px 40px; }
  .pricing__inner {
    max-width: 900px; margin: 0 auto;
    display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center;
  }
  .pricing__title { font-family: var(--display); font-size: clamp(24px, 3vw, 38px); font-weight: 800; letter-spacing: -0.03em; margin-bottom: 12px; }
  .pricing__sub   { font-size: 15px; color: var(--text-2); line-height: 1.7; }

  .pricing__card {
    background: var(--card); border: 1px solid rgba(245,166,35,0.25);
    border-radius: 16px; padding: 32px; text-align: center;
    box-shadow: 0 0 60px rgba(245,166,35,0.06);
  }
  .pricing__free-label { font-family: var(--display); font-size: 22px; font-weight: 800; color: var(--amber); margin-bottom: 12px; }
  .pricing__limits { font-size: 12px; color: var(--text-2); margin-bottom: 24px; line-height: 1.8; }
  .pricing__cta {
    display: block; padding: 13px; background: var(--amber); color: #06090f;
    border-radius: var(--r); font-size: 14px; font-weight: 700;
    text-decoration: none; transition: all 0.15s; margin-bottom: 14px;
  }
  .pricing__cta:hover { filter: brightness(1.1); box-shadow: 0 4px 20px var(--amber-glow); }
  .pricing__paid-note { font-size: 11px; color: var(--text-3); line-height: 1.6; }

  /* ── Final CTA ── */
  .cta { position: relative; padding: 140px 40px; text-align: center; overflow: hidden; }
  .cta__bg   { position: absolute; inset: 0; pointer-events: none; }
  .cta__glow {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: 800px; height: 600px;
    background: radial-gradient(ellipse, rgba(245,166,35,0.08) 0%, transparent 65%);
    filter: blur(60px);
  }
  .cta__inner { position: relative; max-width: 700px; margin: 0 auto; }
  .cta__title {
    font-family: var(--display); font-size: clamp(32px, 5vw, 60px);
    font-weight: 800; letter-spacing: -0.03em; line-height: 1.1; margin-bottom: 20px;
  }
  .cta__hl  { color: var(--amber); }
  .cta__sub { font-size: 17px; color: var(--text-2); line-height: 1.7; margin-bottom: 40px; font-weight: 300; }
  .cta__btn {
    display: inline-block; padding: 16px 48px; background: var(--amber); color: #06090f;
    border-radius: 12px; font-size: 15px; font-weight: 700;
    text-decoration: none; transition: all 0.15s;
  }
  .cta__btn:hover { filter: brightness(1.1); box-shadow: 0 8px 40px var(--amber-glow); transform: translateY(-2px); }
  .cta__login { margin-top: 20px; }
  .cta__login a { font-size: 13px; color: var(--text-3); text-decoration: none; transition: color 0.12s; }
  .cta__login a:hover { color: var(--amber); }

  /* ── Footer ── */
  .footer { border-top: 1px solid var(--border); padding: 48px 40px; }
  .footer__inner { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
  .footer__logo {
    display: flex; align-items: center; gap: 8px;
    font-family: var(--display); font-size: 15px; font-weight: 700;
  }
  .footer__logo-mark { width: 20px; height: 20px; background: var(--amber); border-radius: 5px; }
  .footer__tagline   { font-size: 12px; color: var(--text-3); flex: 1; }
  .footer__links     { display: flex; gap: 20px; }
  .footer__links a   { font-size: 12px; color: var(--text-3); text-decoration: none; transition: color 0.12s; }
  .footer__links a:hover { color: var(--text-2); }
  .footer__copy { font-size: 11px; color: var(--text-3); width: 100%; margin-top: 8px; }

  /* ── Responsive ── */
  @media (max-width: 960px) {
    .hero__inner { grid-template-columns: 1fr; padding: 60px 24px 40px; }
    .hero__term  { display: none; }
    .features__grid { grid-template-columns: repeat(2, 1fr); }
    .how__steps { grid-template-columns: 1fr; gap: 24px; }
    .pricing__inner { grid-template-columns: 1fr; gap: 40px; }
    .nav__links { display: none; }
  }

  @media (max-width: 600px) {
    .features__grid { grid-template-columns: 1fr; }
    .hero__stats    { gap: 0; }
    .hero__stat     { padding: 12px 16px; }
    .hero__stat-sep { display: none; }
    .nav { padding: 0 20px; }
    .features, .how, .pricing, .cta { padding-left: 24px; padding-right: 24px; }
    .footer { padding: 32px 24px; }
  }
</style>