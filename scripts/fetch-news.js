// Busca manchetes no Google Notícias (RSS) para as palavras-chave do nicho
// e salva em data/sugestoes.json. O painel /admin mostra essas sugestões.
// Uso: node scripts/fetch-news.js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'site.config.json'), 'utf8'));
const out = path.join(root, 'data/sugestoes.json');

const decode = (s) => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
  .replace(/<[^>]+>/g, '').trim();
const tag = (x, t) => { const m = x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)); return m ? decode(m[1]) : ''; };

async function fetchKeyword(kw) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(kw + ' when:14d')}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ThermcamBot/1.0)' } });
  if (!res.ok) throw new Error(`${kw}: HTTP ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 8).map(([, x]) => {
    const source = tag(x, 'source');
    let title = tag(x, 'title');
    if (source && title.endsWith(' - ' + source)) title = title.slice(0, -(source.length + 3));
    const d = new Date(tag(x, 'pubDate'));
    return { title, source, link: tag(x, 'link'), date: isNaN(d) ? null : d.toISOString(), keyword: kw };
  });
}

(async () => {
  const all = [];
  for (const kw of cfg.newsKeywords) {
    try { all.push(...(await fetchKeyword(kw))); } catch (e) { console.warn('Falhou:', e.message); }
  }
  const seen = new Set();
  const items = all
    .filter((i) => i.title && i.link && !seen.has(i.title.toLowerCase()) && seen.add(i.title.toLowerCase()))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 60);
  if (!items.length) { console.log('Nenhuma sugestão obtida; mantendo arquivo atual.'); return; }
  fs.writeFileSync(out, JSON.stringify({ updatedAt: new Date().toISOString(), items }, null, 2) + '\n');
  console.log(`OK: ${items.length} sugestões salvas.`);
})();
