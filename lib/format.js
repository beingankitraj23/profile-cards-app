// Server-side string manipulation: cleaning, normalising and escaping user input.
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Collapse runs of whitespace and trim.
const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

// "aNKIT  kumar" -> "Ankit Kumar"
const titleCase = (s) =>
  clean(s).toLowerCase().replace(/(^|[\s\-'])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());

// "Ankit Kumar" -> "AK"
const initials = (name) =>
  clean(name).split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

// Bio: keep paragraph breaks, strip extra blank lines, cap length, ensure it ends cleanly.
const cleanBio = (s) => {
  let t = String(s ?? '').replace(/\r\n?/g, '\n').split('\n').map(clean).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (t.length > 400) t = t.slice(0, 400).replace(/\s+\S*$/, '') + '…';
  if (t && !/[.!?…]$/.test(t)) t += '.';
  return t;
};

// "react, REACT; node.js  ai" -> ["React", "Node.js", "AI"]
const parseSkills = (raw) => {
  const seen = new Set();
  const out = [];
  for (const part of String(raw ?? '').split(/[,;\n]+/)) {
    const s = clean(part).slice(0, 30);
    if (!s || seen.has(s.toLowerCase())) continue;
    seen.add(s.toLowerCase());
    const isShort = s.length <= 3 && s === s.toLowerCase();
    out.push(isShort ? s.toUpperCase() : s[0].toUpperCase() + s.slice(1));
    if (out.length === 12) break;
  }
  return out;
};

const PLATFORMS = {
  github: { label: 'GitHub', base: 'https://github.com/' },
  linkedin: { label: 'LinkedIn', base: 'https://www.linkedin.com/in/' },
  twitter: { label: 'X / Twitter', base: 'https://x.com/' },
  website: { label: 'Website', base: '' },
};

// Accepts "@handle", "handle", "github.com/handle" or a full URL. Returns null if unusable.
const normalizeLink = (kind, raw) => {
  let v = clean(raw);
  if (!v) return null;
  const p = PLATFORMS[kind];
  if (!p) return null;
  if (!/^https?:\/\//i.test(v)) {
    const looksLikeDomain = /[./]/.test(v);
    v = looksLikeDomain ? 'https://' + v.replace(/^\/+/, '') : p.base ? p.base + v.replace(/^@/, '') : '';
  }
  try {
    const u = new URL(v);
    if (!['http:', 'https:'].includes(u.protocol) || !u.hostname.includes('.')) return null;
    return { kind, label: p.label, url: u.toString(), text: (u.hostname + u.pathname).replace(/^www\./, '').replace(/\/$/, '') };
  } catch {
    return null;
  }
};

// Stable hue from the name so each person gets their own avatar colours.
const hueFor = (name) => [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

const avatarSvg = (name, size = 96) => {
  const h = hueFor(name || '?');
  const txt = esc(initials(name) || '?');
  return `<svg class="avatar" width="${size}" height="${size}" viewBox="0 0 96 96" role="img" aria-label="Avatar for ${esc(name)}">
<defs><linearGradient id="g${h}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h} 80% 58%)"/><stop offset="1" stop-color="hsl(${(h + 55) % 360} 75% 42%)"/></linearGradient></defs>
<rect width="96" height="96" rx="28" fill="url(#g${h})"/>
<text x="48" y="58" text-anchor="middle" font-family="Bricolage Grotesque, system-ui, sans-serif" font-size="36" font-weight="700" fill="#fff">${txt}</text></svg>`;
};

// Dynamic HTML card built from a stored profile record.
const cardHtml = (p, { link = true } = {}) => {
  const skills = (p.skills || []).map((s) => `<li>${esc(s)}</li>`).join('');
  const links = (p.links || [])
    .map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer"><b>${esc(l.label)}</b> ${esc(l.text)}</a>`)
    .join('');
  const bio = esc(p.bio).replace(/\n/g, '<br>');
  const name = link ? `<a href="/profile/${esc(p.id)}">${esc(p.name)}</a>` : esc(p.name);
  return `<article class="card">
  <header>${avatarSvg(p.name)}<div><h2>${name}</h2><p class="meta">${(p.skills || []).length} skills · ${(p.links || []).length} links</p></div></header>
  ${bio ? `<p class="bio">${bio}</p>` : ''}
  ${skills ? `<ul class="skills">${skills}</ul>` : ''}
  ${links ? `<nav class="links">${links}</nav>` : ''}
</article>`;
};

module.exports = { esc, clean, titleCase, initials, cleanBio, parseSkills, normalizeLink, avatarSvg, cardHtml, PLATFORMS };
