const express = require('express');
const db = require('./lib/db');
const f = require('./lib/format');

const app = express();
app.disable('x-powered-by');
app.use(express.urlencoded({ extended: false, limit: '20kb' }));

const css = `
:root{--bg:#eef1f6;--surface:#fff;--ink:#14213d;--muted:#5b6478;--line:#d6dbe6;--accent:#3a5bff;--accent-ink:#fff;--err:#b3261e}
@media (prefers-color-scheme:dark){:root{--bg:#0e1424;--surface:#161e33;--ink:#e8ecf7;--muted:#9aa4bd;--line:#2a3452;--accent:#7b93ff;--accent-ink:#0e1424;--err:#ff8a80}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 "DM Sans",system-ui,sans-serif}
a{color:inherit}
h1,h2{font-family:"Bricolage Grotesque","DM Sans",system-ui,sans-serif;line-height:1.1;margin:0}
.wrap{max-width:1040px;margin:0 auto;padding:28px 20px 64px}
.top{display:flex;justify-content:space-between;align-items:center;margin-bottom:36px}
.top a{text-decoration:none;font-weight:600}
.top nav a{margin-left:20px;color:var(--muted)}
.top nav a:hover{color:var(--ink)}
h1{font-size:clamp(2rem,5vw,3.2rem);letter-spacing:-.02em;max-width:14ch}
.lead{color:var(--muted);max-width:46ch;margin:12px 0 0}
.grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:40px;margin-top:36px;align-items:start}
@media(max-width:800px){.grid{grid-template-columns:1fr}}
form{display:grid;gap:18px}
label{font-weight:600;display:grid;gap:6px}
label small{font-weight:400;color:var(--muted)}
input,textarea{font:inherit;color:inherit;background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:11px 13px;width:100%}
input:focus,textarea:focus,button:focus-visible,a:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
textarea{min-height:110px;resize:vertical}
fieldset{border:1px solid var(--line);border-radius:12px;padding:16px;display:grid;gap:14px;margin:0}
legend{font-weight:600;padding:0 6px}
button{font:inherit;font-weight:700;background:var(--accent);color:var(--accent-ink);border:0;border-radius:10px;padding:13px 20px;cursor:pointer}
.err{background:var(--surface);border-left:4px solid var(--err);padding:12px 14px;border-radius:6px;color:var(--err);margin:0}
.preview{position:sticky;top:20px;display:grid;gap:12px}
.preview p.hint{color:var(--muted);margin:0}
.card{background:var(--surface);border:1px solid var(--line);border-radius:22px;padding:24px;display:grid;gap:16px}
.card header{display:flex;gap:16px;align-items:center}
.card h2{font-size:1.5rem}
.card h2 a{text-decoration:none}.card h2 a:hover{text-decoration:underline}
.meta{margin:2px 0 0;color:var(--muted);font-size:.9rem}
.bio{margin:0}
.skills{list-style:none;display:flex;flex-wrap:wrap;gap:8px;padding:0;margin:0}
.skills li{border:1px solid var(--line);border-radius:999px;padding:3px 12px;font-size:.9rem}
.links{display:grid;gap:6px}
.links a{text-decoration:none;color:var(--muted);overflow-wrap:anywhere}
.links a b{color:var(--ink);margin-right:8px}
.links a:hover{color:var(--accent)}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;margin-top:28px}
.empty{color:var(--muted);margin-top:28px}
.badge{margin-top:40px;color:var(--muted);font-size:.85rem}
`;

const page = (title, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${f.esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700&family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet">
<style>${css}</style></head><body><div class="wrap">
<div class="top"><a href="/">Profile Cards</a><nav><a href="/">Create</a><a href="/profiles">All profiles</a></nav></div>
${body}
<p class="badge">Storage: ${db.kind === 'postgres' ? 'Postgres' : 'local file (set DATABASE_URL for persistent storage)'}</p>
</div></body></html>`;

const formPage = (v = {}, error = '') => {
  const name = f.esc(v.name || '');
  return page('Create a profile card', `
<h1>Make your profile card</h1>
<p class="lead">Fill in your details. The server cleans them up, saves them, and builds your card.</p>
<div class="grid">
<form method="post" action="/profiles">
  ${error ? `<p class="err" role="alert">${f.esc(error)}</p>` : ''}
  <label>Name<input id="name" name="name" required maxlength="60" autocomplete="name" value="${name}"></label>
  <label>Bio <small>Up to 400 characters</small><textarea name="bio" maxlength="800">${f.esc(v.bio || '')}</textarea></label>
  <label>Skills <small>Separate with commas, e.g. python, react, node.js</small><input name="skills" value="${f.esc(v.skills || '')}"></label>
  <fieldset><legend>Social links</legend>
    <label>GitHub <small>username or URL</small><input name="github" value="${f.esc(v.github || '')}"></label>
    <label>LinkedIn <small>username or URL</small><input name="linkedin" value="${f.esc(v.linkedin || '')}"></label>
    <label>X / Twitter <small>@handle or URL</small><input name="twitter" value="${f.esc(v.twitter || '')}"></label>
    <label>Website <small>URL</small><input name="website" value="${f.esc(v.website || '')}"></label>
  </fieldset>
  <button type="submit">Create profile card</button>
</form>
<aside class="preview" aria-live="polite">
  <p class="hint">Avatar preview</p>
  <div class="card"><header><div id="av">${f.avatarSvg(v.name || '?')}</div><div><h2 id="pn">${name || 'Your name'}</h2><p class="meta">Initials and colour come from your name</p></div></header></div>
</aside></div>
<script>
// Live avatar preview only; the real card is generated on the server.
const n=document.getElementById('name'),av=document.getElementById('av'),pn=document.getElementById('pn');
const hue=s=>[...s].reduce((h,c)=>(h*31+c.charCodeAt(0))%360,7);
n.addEventListener('input',()=>{
  const t=n.value.replace(/\\s+/g,' ').trim(),h=hue(t||'?');
  const i=t.split(' ').filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join('')||'?';
  pn.textContent=t||'Your name';
  av.innerHTML='<svg width="96" height="96" viewBox="0 0 96 96"><defs><linearGradient id="p" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl('+h+' 80% 58%)"/><stop offset="1" stop-color="hsl('+((h+55)%360)+' 75% 42%)"/></linearGradient></defs><rect width="96" height="96" rx="28" fill="url(#p)"/><text x="48" y="58" text-anchor="middle" font-family="system-ui,sans-serif" font-size="36" font-weight="700" fill="#fff"></text></svg>';
  av.querySelector('text').textContent=i;
});
</script>`);
};

app.get('/', (req, res) => res.send(formPage()));

// Process the form: validate, clean strings, store, then redirect to the generated card.
app.post('/profiles', async (req, res) => {
  try {
    const b = req.body;
    const name = f.titleCase(b.name).slice(0, 60);
    if (!name) return res.status(400).send(formPage(b, 'Enter your name to create a card.'));
    const links = ['github', 'linkedin', 'twitter', 'website'].map((k) => f.normalizeLink(k, b[k])).filter(Boolean);
    const profile = { name, bio: f.cleanBio(b.bio), skills: f.parseSkills(b.skills), links };
    const id = await db.insert(profile);
    res.redirect(303, `/profile/${id}`);
  } catch (e) {
    console.error(e);
    res.status(500).send(page('Error', '<h1>Something went wrong</h1><p class="lead">The profile could not be saved. Check the database connection and try again.</p>'));
  }
});

app.get('/profile/:id', async (req, res) => {
  const p = await db.get(req.params.id.slice(0, 20)).catch(() => null);
  if (!p) return res.status(404).send(page('Not found', '<h1>Profile not found</h1><p class="lead"><a href="/">Create a new profile card</a></p>'));
  res.send(page(p.name, `<div style="max-width:520px">${f.cardHtml(p, { link: false })}</div><p class="lead"><a href="/">Create another</a></p>`));
});

app.get('/profiles', async (req, res) => {
  const rows = await db.list().catch(() => []);
  res.send(page('All profiles', `<h1>All profiles</h1>${rows.length ? `<div class="cards">${rows.map((p) => f.cardHtml(p)).join('')}</div>` : '<p class="empty">No profiles yet. <a href="/">Create the first one</a>.</p>'}`));
});

module.exports = app;
