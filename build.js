// Gerador estático da Thermcam. Uso: node build.js  → gera a pasta /dist
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const root = __dirname;
const dist = path.join(root, 'dist');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'site.config.json'), 'utf8'));
const SITE = cfg.url.replace(/\/$/, '');
const BASE = new URL(SITE).pathname.replace(/\/$/, '');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fill = (tpl, vars) => tpl.replace(/{{(\w+)}}/g, (_, k) => (vars[k] ?? ''));
const write = (rel, content) => {
  const f = path.join(dist, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content);
};
const todaySP = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const fmtDate = (d) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
const hue = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
const imgUrl = (u) => (!u ? '' : /^https?:/.test(u) ? u : `${SITE}/${u.replace(/^\//, '')}`);
const imgSrc = (u) => (!u ? '' : /^https?:/.test(u) ? u : `${BASE}/${u.replace(/^\//, '')}`);

// ---------- Posts ----------
function parsePost(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/\r/g, '');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return null;
  const meta = {};
  m[1].split('\n').forEach((l) => {
    const i = l.indexOf(':');
    if (i > 0) meta[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  });
  const name = path.basename(file, '.md');
  const dm = name.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
  const slug = meta.slug || (dm ? dm[2] : name);
  const date = meta.date || (dm ? dm[1] : todaySP);
  const md = m[2].trim();
  const words = md.split(/\s+/).length;
  return {
    slug, date, md,
    title: meta.title || slug,
    category: meta.category || 'Notícias',
    description: meta.description || md.replace(/[#*_>\[\]()]/g, '').slice(0, 155),
    keywords: meta.keywords || '',
    image: meta.image || '',
    minutes: Math.max(1, Math.round(words / 200)),
    html: marked.parse(md),
  };
}
const postsDir = path.join(root, 'posts');
const posts = fs.readdirSync(postsDir).filter((f) => f.endsWith('.md'))
  .map((f) => parsePost(path.join(postsDir, f))).filter(Boolean)
  .filter((p) => p.date <= todaySP) // posts com data futura ficam agendados
  .sort((a, b) => (a.date < b.date ? 1 : -1));
const categories = [...new Set(posts.map((p) => p.category))];

function cardHtml(p) {
  const bg = p.image
    ? `<img src="${esc(imgSrc(p.image))}" alt="${esc(p.title)}" loading="lazy">`
    : `<div class="card-ph" style="--h:${hue(p.slug)}"><span>${esc(p.category)}</span></div>`;
  return `<a class="card" href="${BASE}/noticias/${p.slug}/" data-cat="${esc(p.category)}">
  <div class="card-img">${bg}</div>
  <div class="card-body"><span class="tag">${esc(p.category)}</span>
  <h3>${esc(p.title)}</h3><p>${esc(p.description)}</p>
  <span class="meta">${fmtDate(p.date)} · ${p.minutes} min de leitura</span></div></a>`;
}

// ---------- Layout ----------
const layoutTpl = read('src/layout.html');
// Logo e ícones (gerados a partir do logo oficial em assets/)
const logoFile = 'logo.png';
const brandHtml = `<img class="logo-img" src="${BASE}/assets/logo.png" alt="${esc(cfg.name)}" width="220" height="54">`;
const brandFooterHtml = `<img class="logo-img" src="${BASE}/assets/logo-white.png" alt="${esc(cfg.name)}" width="220" height="54" loading="lazy">`;
const iconsHtml = `<link rel="icon" href="${BASE}/assets/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="${BASE}/assets/favicon-32.png">
<link rel="apple-touch-icon" href="${BASE}/assets/apple-touch-icon.png">
<link rel="manifest" href="${BASE}/site.webmanifest">`;
const waLink = (msg) => `https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(msg)}`;
function page({ title, description, path: p, body, jsonld = [], image = '', type = 'website', noindex = false, keywords = '' }) {
  const canonical = `${SITE}${p}`;
  const ld = jsonld.map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n');
  return fill(layoutTpl, {
    title: esc(title), description: esc(description), canonical, keywords: esc(keywords),
    og_image: esc(imageAbs(image)), og_type: type, jsonld: ld, body,
    robots: noindex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large',
    brand: brandHtml, brand_footer: brandFooterHtml, icons: iconsHtml, base: BASE, site: SITE, name: esc(cfg.name), phone: esc(cfg.phone),
    wa: waLink('Olá! Vim pelo site e gostaria de um orçamento de câmara fria.'),
    email: esc(cfg.email), instagram: cfg.instagram, facebook: cfg.facebook,
    address: esc(`${cfg.address.street}, ${cfg.address.district}, ${cfg.address.city} - ${cfg.address.state}`),
    year: new Date().getFullYear(),
  });
}
const imageAbs = (i) => imgUrl(i) || `${SITE}/assets/og-default.png`;

const business = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': `${SITE}/#negocio`,
  name: cfg.name, url: SITE + '/', description: cfg.description,
  telephone: '+' + cfg.whatsapp, email: cfg.email,
  image: `${SITE}/assets/og-default.png`, logo: `${SITE}/assets/logo.png`,
  address: {
    '@type': 'PostalAddress', streetAddress: cfg.address.street, addressLocality: cfg.address.city,
    addressRegion: cfg.address.state, addressCountry: cfg.address.country,
  },
  areaServed: ['São Paulo', 'Região Metropolitana de São Paulo'],
  sameAs: [cfg.instagram, cfg.facebook],
  makesOffer: ['Montagem de câmara fria', 'Manutenção de câmara fria', 'Painéis isotérmicos', 'Projetos de refrigeração comercial']
    .map((n) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: n } })),
};

// ---------- Home ----------
const faqHtml = cfg.faq.map((f) => `<details class="faq-item"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('\n');
const faqLd = {
  '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: cfg.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
};
const projDir = path.join(root, 'assets/img/projetos');
const projFiles = fs.existsSync(projDir) ? fs.readdirSync(projDir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort() : [];
const projectsHtml = projFiles.length
  ? projFiles.map((f, i) => `<figure class="proj"><img src="${BASE}/assets/img/projetos/${f}" alt="Projeto de câmara fria Thermcam ${i + 1}" loading="lazy"></figure>`).join('\n')
  : ['Câmara de resfriados', 'Câmara de congelados', 'Painéis isotérmicos', 'Porta frigorífica'].map((t, i) =>
    `<figure class="proj proj-ph" style="--h:${190 + i * 14}"><img src="${BASE}/assets/symbol-white.png" alt="" width="64" height="64"><figcaption>${t}</figcaption></figure>`).join('\n');

const homeBody = fill(read('src/home.html'), {
  base: BASE, faq: faqHtml, projects: projectsHtml,
  latest: posts.slice(0, 3).map(cardHtml).join('\n'),
  phone: esc(cfg.phone), email: esc(cfg.email), instagram: cfg.instagram, facebook: cfg.facebook,
  address: esc(`${cfg.address.street} — ${cfg.address.district}, ${cfg.address.city}/${cfg.address.state}`),
  wa: waLink('Olá! Vim pelo site e gostaria de um orçamento de câmara fria.'),
});
write('index.html', page({
  title: `Câmara Fria em São Paulo | Montagem e Manutenção — ${cfg.shortName}`,
  description: cfg.description, path: '/', body: homeBody, jsonld: [business, faqLd],
  keywords: 'câmara fria, montagem de câmara fria, manutenção de câmara fria, refrigeração comercial, painel isotérmico, São Paulo',
}));

// ---------- Notícias ----------
const chips = ['Todas', ...categories].map((c, i) => `<button class="chip${i ? '' : ' on'}" data-filter="${esc(c)}">${esc(c)}</button>`).join('');
write('noticias/index.html', page({
  title: `Notícias e Dicas sobre Câmara Fria e Refrigeração — ${cfg.shortName}`,
  description: 'Portal de notícias, guias e dicas sobre câmaras frias, refrigeração comercial, cadeia do frio e manutenção. Atualizado sempre.',
  path: '/noticias/',
  body: `<section class="page-head"><div class="wrap"><span class="eyebrow">Portal Thermcam</span><h1>Notícias e dicas sobre câmara fria e refrigeração</h1>
  <p>Guias práticos, novidades do setor e boas práticas para o seu comércio conservar melhor e perder menos.</p></div></section>
  <section class="section"><div class="wrap"><div class="chips" id="chips">${chips}</div>
  <div class="grid" id="grid">${posts.map(cardHtml).join('\n')}</div></div></section>`,
  jsonld: [{
    '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Notícias Thermcam', url: `${SITE}/noticias/`,
  }],
}));

// ---------- Páginas de matéria ----------
posts.forEach((p) => {
  const related = posts.filter((x) => x.slug !== p.slug).slice(0, 3);
  const hero = p.image
    ? `<img class="post-hero" src="${esc(imgSrc(p.image))}" alt="${esc(p.title)}" fetchpriority="high">`
    : `<div class="post-hero post-hero-ph" style="--h:${hue(p.slug)}"></div>`;
  const url = `${SITE}/noticias/${p.slug}/`;
  const share = encodeURIComponent(`${p.title} ${url}`);
  const body = `<article class="post"><header class="post-head wrap-narrow">
    <nav class="crumbs" aria-label="Você está em"><a href="${BASE}/">Início</a> › <a href="${BASE}/noticias/">Notícias</a> › <span>${esc(p.category)}</span></nav>
    <span class="tag">${esc(p.category)}</span><h1>${esc(p.title)}</h1>
    <p class="lead">${esc(p.description)}</p>
    <p class="meta">Por ${esc(cfg.shortName)} · <time datetime="${p.date}">${fmtDate(p.date)}</time> · ${p.minutes} min de leitura</p></header>
    <div class="wrap-narrow">${hero}<div class="prose">${p.html}</div>
    <aside class="cta-box"><h2>Precisa de câmara fria ou manutenção?</h2><p>Fale com a Thermcam e receba um orçamento sem compromisso.</p>
    <div class="btn-row"><a class="btn btn-wa" href="${waLink('Olá! Li a matéria "' + p.title + '" e gostaria de um orçamento.')}" target="_blank" rel="noopener">Chamar no WhatsApp</a>
    <a class="btn btn-ghost" href="https://wa.me/?text=${share}" target="_blank" rel="noopener">Compartilhar</a></div></aside></div></article>
    ${related.length ? `<section class="section alt"><div class="wrap"><h2 class="h-sec">Continue lendo</h2><div class="grid">${related.map(cardHtml).join('')}</div></div></section>` : ''}`;
  write(`noticias/${p.slug}/index.html`, page({
    title: `${p.title} — ${cfg.shortName}`, description: p.description, path: `/noticias/${p.slug}/`,
    body, image: p.image, type: 'article', keywords: p.keywords,
    jsonld: [{
      '@context': 'https://schema.org', '@type': 'Article', headline: p.title, description: p.description,
      image: [imageAbs(p.image)], datePublished: p.date, dateModified: p.date, inLanguage: 'pt-BR',
      mainEntityOfPage: url, keywords: p.keywords,
      author: { '@type': 'Organization', name: cfg.name, url: SITE + '/' },
      publisher: { '@type': 'Organization', name: cfg.name, logo: { '@type': 'ImageObject', url: logoFile ? `${SITE}/assets/${logoFile}` : `${SITE}/assets/favicon.svg` } },
    }, {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [['Início', SITE + '/'], ['Notícias', SITE + '/noticias/'], [p.title, url]]
        .map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item })),
    }],
  }));
});

// ---------- 404, sitemap, rss, robots ----------
write('404.html', page({
  title: `Página não encontrada — ${cfg.shortName}`, description: 'Página não encontrada.', path: '/404.html', noindex: true,
  body: `<section class="page-head"><div class="wrap"><h1>Ops, essa página não existe</h1><p>Volte para o <a href="${BASE}/">início</a> ou veja as <a href="${BASE}/noticias/">notícias</a>.</p></div></section>`,
}));
const urls = [['/', todaySP], ['/noticias/', posts[0]?.date || todaySP], ...posts.map((p) => [`/noticias/${p.slug}/`, p.date])];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, d]) => `  <url><loc>${SITE}${u}</loc><lastmod>${d}</lastmod></url>`).join('\n')}\n</urlset>\n`);
write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ${SITE}/sitemap.xml\n`);
write('feed.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${esc(cfg.name)} — Notícias</title><link>${SITE}/noticias/</link><description>${esc(cfg.description)}</description><language>pt-BR</language>\n${posts.slice(0, 20).map((p) => `<item><title>${esc(p.title)}</title><link>${SITE}/noticias/${p.slug}/</link><guid>${SITE}/noticias/${p.slug}/</guid><pubDate>${new Date(p.date + 'T12:00:00Z').toUTCString()}</pubDate><description>${esc(p.description)}</description></item>`).join('\n')}\n</channel></rss>\n`);

// ---------- Arquivos estáticos ----------
fs.cpSync(path.join(root, 'assets'), path.join(dist, 'assets'), { recursive: true });
fs.cpSync(path.join(root, 'admin'), path.join(dist, 'admin'), { recursive: true });
fs.copyFileSync(path.join(root, 'assets/favicon.ico'), path.join(dist, 'favicon.ico'));
write('site.webmanifest', JSON.stringify({
  name: cfg.name, short_name: cfg.shortName, start_url: `${BASE}/`, scope: `${BASE}/`, display: 'standalone',
  background_color: '#ffffff', theme_color: '#06162b', lang: 'pt-BR',
  icons: [192, 512].map((s) => ({ src: `${BASE}/assets/icon-${s}.png`, sizes: `${s}x${s}`, type: 'image/png' })),
}, null, 2));
fs.writeFileSync(path.join(dist, '.nojekyll'), '');
console.log(`OK: ${posts.length} matérias publicadas · base="${BASE}" · ${SITE}`);
