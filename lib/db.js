// Storage layer.
//  - Production (Vercel): Postgres via DATABASE_URL / POSTGRES_URL (Neon, Vercel Postgres, Supabase...)
//  - Local fallback: JSON file in ./data (or /tmp on Vercel, which is NOT persistent - set a DATABASE_URL)
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const newId = () => crypto.randomBytes(5).toString('hex');

let impl;

if (url) {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, max: 3 });
  let ready;
  const init = () =>
    (ready ||= pool.query(`CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      bio TEXT NOT NULL DEFAULT '',
      skills JSONB NOT NULL DEFAULT '[]',
      links JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`));
  impl = {
    kind: 'postgres',
    async insert(p) {
      await init();
      const id = newId();
      await pool.query('INSERT INTO profiles (id,name,bio,skills,links) VALUES ($1,$2,$3,$4,$5)', [
        id, p.name, p.bio, JSON.stringify(p.skills), JSON.stringify(p.links),
      ]);
      return id;
    },
    async get(id) {
      await init();
      const r = await pool.query('SELECT * FROM profiles WHERE id=$1', [id]);
      return r.rows[0] || null;
    },
    async list(limit = 30) {
      await init();
      return (await pool.query('SELECT * FROM profiles ORDER BY created_at DESC LIMIT $1', [limit])).rows;
    },
  };
} else {
  const dir = process.env.VERCEL ? '/tmp' : path.join(__dirname, '..', 'data');
  const file = path.join(dir, 'profiles.json');
  const read = () => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return []; } };
  const write = (rows) => { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(file, JSON.stringify(rows, null, 2)); };
  impl = {
    kind: 'file',
    async insert(p) { const id = newId(); write([{ id, ...p, created_at: new Date().toISOString() }, ...read()]); return id; },
    async get(id) { return read().find((r) => r.id === id) || null; },
    async list(limit = 30) { return read().slice(0, limit); },
  };
}

module.exports = impl;
