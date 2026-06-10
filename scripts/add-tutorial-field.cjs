// scripts/add-tutorial-field.cjs
// Ajoute athlete_profiles.tutorial_seen (boolean, défaut false)
// et l'autorise dans la permission update de l'Athlete Policy.
const DIRECTUS_URL = 'http://localhost:8056'
const TOKEN = '4pCpZ9L8D9c4F2W6YRiDKKrjMDtZRuBb'
const ATHLETE_POLICY = 'bc59f79d-1d78-4cd3-8d0e-8312f3c66701'

async function api(method, path, body) {
  const res = await fetch(`${DIRECTUS_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${await res.text()}`)
  return res.status === 204 ? null : (await res.json()).data
}

async function main() {
  // 1. Champ tutorial_seen (idempotent : skip si déjà présent)
  const fields = await api('GET', '/fields/athlete_profiles')
  if (fields.some(f => f.field === 'tutorial_seen')) {
    console.log('Champ tutorial_seen déjà présent — skip')
  } else {
    await api('POST', '/fields/athlete_profiles', {
      field: 'tutorial_seen',
      type: 'boolean',
      schema: { default_value: false, is_nullable: false },
      meta: { interface: 'boolean', hidden: false, note: 'Tuto de bienvenue vu' },
    })
    console.log('Champ tutorial_seen créé')
  }

  // 2. Permission update de l'Athlete Policy : ajouter tutorial_seen aux fields
  const perms = await api('GET',
    `/permissions?filter[policy][_eq]=${ATHLETE_POLICY}&filter[collection][_eq]=athlete_profiles&filter[action][_eq]=update`)
  if (!perms.length) throw new Error('Permission update athlete_profiles introuvable')
  for (const p of perms) {
    const fieldSet = new Set([...(p.fields ?? []), 'tutorial_seen'])
    await api('PATCH', `/permissions/${p.id}`, { fields: [...fieldSet] })
    console.log(`Permission ${p.id} mise à jour : ${[...fieldSet].join(', ')}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
