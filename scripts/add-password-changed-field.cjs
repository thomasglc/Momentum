// scripts/add-password-changed-field.cjs
const DIRECTUS_URL = process.env.DIRECTUS_URL || 'https://momentum.training'
const TOKEN = process.env.DIRECTUS_TOKEN || process.env.DIRECTUS_ADMIN_TOKEN || ''

if (!TOKEN) {
  console.error('Error: DIRECTUS_TOKEN or DIRECTUS_ADMIN_TOKEN environment variable not set')
  console.error('Set one of these env vars or provide the token via DIRECTUS_TOKEN')
  process.exit(1)
}

async function run() {
  // Vérifier si le champ existe déjà
  const checkRes = await fetch(`${DIRECTUS_URL}/fields/athlete_profiles/password_changed`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  })
  if (checkRes.ok) {
    console.log('✓ Le champ password_changed existe déjà, rien à faire.')
    return
  }

  // Créer le champ
  const res = await fetch(`${DIRECTUS_URL}/fields/athlete_profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({
      field: 'password_changed',
      type: 'boolean',
      meta: {
        interface: 'boolean',
        display: 'boolean',
        note: 'false = mot de passe temporaire, true = mot de passe personnalisé',
      },
      schema: {
        default_value: false,
        is_nullable: true,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(JSON.stringify(err, null, 2))
  }
  console.log('✓ Champ password_changed créé avec succès.')
}

run().catch(e => { console.error(e); process.exit(1) })
