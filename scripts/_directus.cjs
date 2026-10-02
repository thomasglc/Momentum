// scripts/_directus.cjs
// Accès admin à Directus pour les scripts de schéma et de données.
// DIRECTUS_URL (ex. https://back.momentom.training) et DIRECTUS_TOKEN (token admin) sont lus dans
// l'environnement, sinon dans .env.local ou .env à la racine du dépôt (fichiers ignorés par git).
// Ne jamais écrire le token dans ce fichier : le dépôt est public.
const fs = require('node:fs')
const path = require('node:path')

function fromEnvFile(name) {
  for (const file of ['.env.local', '.env']) {
    const full = path.join(__dirname, '..', file)
    if (!fs.existsSync(full)) continue
    const match = fs.readFileSync(full, 'utf8').match(new RegExp(`^\\s*${name}\\s*=\\s*(.*?)\\s*$`, 'm'))
    if (match) return match[1].replace(/^["']|["']$/g, '')
  }
  return ''
}

const DIRECTUS_URL = (process.env.DIRECTUS_URL || fromEnvFile('DIRECTUS_URL')).replace(/\/+$/, '')
const TOKEN = process.env.DIRECTUS_TOKEN || fromEnvFile('DIRECTUS_TOKEN')

if (!DIRECTUS_URL || !TOKEN) {
  console.error('Définir DIRECTUS_URL et DIRECTUS_TOKEN (token admin) dans .env ou dans l\'environnement avant de lancer ce script.')
  process.exit(1)
}

async function api(method, path, body) {
  const res = await fetch(`${DIRECTUS_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${await res.text()}`)
  return res.status === 204 ? null : (await res.json()).data
}

module.exports = { api, DIRECTUS_URL }
