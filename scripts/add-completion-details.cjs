// scripts/add-completion-details.cjs
// Ajoute à session_completions la durée réelle (duration_sec) et la distance (distance_km) d'une séance validée,
// et donne à l'athlète le droit de modifier ces deux champs sur ses propres validations.
// L'app marche sans : elle compte alors les durées prévues et ne propose pas la saisie.
//   node scripts/add-completion-details.cjs           simulation
//   node scripts/add-completion-details.cjs --write   écrit
// URL et token : voir scripts/_directus.cjs. Idempotent.
const { api, DIRECTUS_URL } = require('./_directus.cjs')

const WRITE = process.argv.includes('--write')
const COLLECTION = 'session_completions'
const POLICY_NAME = 'Athlete Policy'
const OWN = { athlete_profile_id: { directus_user_id: { _eq: '$CURRENT_USER' } } }
const DETAIL_FIELDS = ['duration_sec', 'distance_km']

const FIELDS = [
  {
    field: 'duration_sec',
    type: 'integer',
    meta: { interface: 'input', note: 'Durée réelle de la séance, en secondes. Vide : la durée prévue compte.' },
    schema: { is_nullable: true },
  },
  {
    field: 'distance_km',
    type: 'float',
    meta: { interface: 'input', note: 'Distance parcourue, en km (courses).' },
    schema: { is_nullable: true },
  },
]

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

async function main() {
  console.log(`Directus : ${DIRECTUS_URL} — ${WRITE ? 'ÉCRITURE' : 'simulation (ajouter --write pour écrire)'}`)

  // 1. Champs
  const existing = (await api('GET', `/fields/${COLLECTION}`)).map(f => f.field)
  for (const field of FIELDS) {
    if (existing.includes(field.field)) { console.log(`Champ ${COLLECTION}.${field.field} déjà présent — skip`); continue }
    if (WRITE) await api('POST', `/fields/${COLLECTION}`, field)
    console.log(`${WRITE ? 'Champ créé' : 'Champ à créer'} : ${COLLECTION}.${field.field}`)
  }

  // 2. Droits de l'athlète
  const policies = await api('GET', `/policies?filter[name][_eq]=${encodeURIComponent(POLICY_NAME)}&fields=id`)
  if (policies.length !== 1) throw new Error(`Policy « ${POLICY_NAME} » : ${policies.length} trouvée(s)`)
  const policy = policies[0].id
  const perms = await api('GET', `/permissions?filter[policy][_eq]=${policy}&filter[collection][_eq]=${COLLECTION}&limit=-1`)

  // Création : la durée du chrono part avec la validation
  const create = perms.find(p => p.action === 'create')
  if (!create) throw new Error(`Droit create introuvable sur ${COLLECTION}`)
  const createFields = create.fields ?? []
  if (createFields.includes('*') || DETAIL_FIELDS.every(f => createFields.includes(f))) {
    console.log('Droit create : couvre déjà les nouveaux champs — skip')
  } else {
    const fields = [...new Set([...createFields, ...DETAIL_FIELDS])]
    if (WRITE) await api('PATCH', `/permissions/${create.id}`, { fields })
    console.log(`Droit create ${WRITE ? 'étendu' : 'à étendre'} : ${JSON.stringify(createFields)} → ${JSON.stringify(fields)}`)
  }

  // Modification : seulement la durée et la distance, seulement sur ses propres validations
  const wanted = { fields: DETAIL_FIELDS, permissions: OWN }
  const update = perms.find(p => p.action === 'update')
  if (!update) {
    if (WRITE) await api('POST', '/permissions', { policy, collection: COLLECTION, action: 'update', ...wanted, validation: null, presets: null })
    console.log(`Droit update ${WRITE ? 'créé' : 'à créer'} : champs ${JSON.stringify(wanted.fields)}, filtre ${JSON.stringify(wanted.permissions)}`)
  } else if (same(update.fields, wanted.fields) && same(update.permissions, wanted.permissions)) {
    console.log('Droit update déjà conforme — skip')
  } else {
    if (WRITE) await api('PATCH', `/permissions/${update.id}`, wanted)
    console.log(`Droit update ${WRITE ? 'corrigé' : 'à corriger'} : champs ${JSON.stringify(update.fields)} → ${JSON.stringify(wanted.fields)}, filtre ${JSON.stringify(update.permissions)} → ${JSON.stringify(wanted.permissions)}`)
  }

  // 3. Relecture
  if (WRITE) {
    const fields = await api('GET', `/fields/${COLLECTION}`)
    console.log(`\nChamps : ${fields.map(f => `${f.field}:${f.type}`).join(', ')}`)
    const after = await api('GET', `/permissions?filter[policy][_eq]=${policy}&filter[collection][_eq]=${COLLECTION}&limit=-1`)
    for (const p of after) console.log(`Droit ${p.action} : champs ${JSON.stringify(p.fields)}, filtre ${JSON.stringify(p.permissions)}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
