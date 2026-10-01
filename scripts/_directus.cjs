// scripts/_directus.cjs
// Accès admin à Directus pour les scripts de schéma.
// Variables d'environnement : DIRECTUS_URL (ex. https://back.momentom.training) et DIRECTUS_TOKEN (token admin).
const DIRECTUS_URL = (process.env.DIRECTUS_URL || '').replace(/\/+$/, '')
const TOKEN = process.env.DIRECTUS_TOKEN

if (!DIRECTUS_URL || !TOKEN) {
  console.error('Définir DIRECTUS_URL et DIRECTUS_TOKEN (token admin) avant de lancer ce script.')
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
