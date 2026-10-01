// scripts/add-set-logs.cjs
// Crée la collection set_logs (séries réalisées par les athlètes), ses relations,
// le champ image_urls des deux catalogues et les droits de l'Athlete Policy.
// Idempotent : chaque étape est sautée si elle est déjà faite.
//   DIRECTUS_URL=… DIRECTUS_TOKEN=… node scripts/add-set-logs.cjs [--smoke]
// --smoke : crée, modifie puis supprime une ligne de test pour vérifier la collection.
const { api, DIRECTUS_URL } = require('./_directus.cjs')

const COLLECTION = 'set_logs'
const POLICY_NAME = 'Athlete Policy'

const m2o = (field, note, nullable = true) => ({
  field,
  type: 'integer',
  meta: { interface: 'select-dropdown-m2o', special: ['m2o'], required: !nullable, note },
  schema: { is_nullable: nullable },
})
const system = (field, type, special, iface) => ({
  field,
  type,
  meta: { special: [special], interface: iface, readonly: true, hidden: true },
  schema: {},
})

const FIELDS = [
  { field: 'id', type: 'integer', meta: { hidden: true, interface: 'input', readonly: true }, schema: { is_primary_key: true, has_auto_increment: true } },
  m2o('athlete_profile_id', 'Athlète', false),
  m2o('session_id', 'Séance du plan'),
  m2o('block_strength_exercise_id', 'Ligne d\'exercice prévue'),
  m2o('exercise_id', 'Exercice (clé de l\'historique)'),
  { field: 'set_number', type: 'integer', meta: { interface: 'input', required: true }, schema: { is_nullable: false } },
  { field: 'weight_kg', type: 'float', meta: { interface: 'input', note: 'Vide = poids de corps' }, schema: { is_nullable: true } },
  { field: 'reps', type: 'integer', meta: { interface: 'input' }, schema: { is_nullable: true } },
  { field: 'duration_sec', type: 'integer', meta: { interface: 'input' }, schema: { is_nullable: true } },
  system('user_created', 'uuid', 'user-created', 'select-dropdown-m2o'),
  system('date_created', 'timestamp', 'date-created', 'datetime'),
  system('date_updated', 'timestamp', 'date-updated', 'datetime'),
]

// [champ, collection liée, ON DELETE]
// SET NULL sur la séance et la ligne : l'historique survit si le coach régénère une séance.
const RELATIONS = [
  ['athlete_profile_id', 'athlete_profiles', 'CASCADE'],
  ['session_id', 'sessions', 'SET NULL'],
  ['block_strength_exercise_id', 'block_strength_exercises', 'SET NULL'],
  ['exercise_id', 'exercise_catalog', 'SET NULL'],
  ['user_created', 'directus_users', 'SET NULL'],
]

// Le filtre porte sur user_created (rempli par le serveur), pas sur athlete_profile_id (envoyé par le client).
const OWN = { user_created: { _eq: '$CURRENT_USER' } }
const PERMISSIONS = {
  create: {
    fields: ['athlete_profile_id', 'session_id', 'block_strength_exercise_id', 'exercise_id', 'set_number', 'weight_kg', 'reps', 'duration_sec'],
    permissions: null,
  },
  read: { fields: ['*'], permissions: OWN },
  update: { fields: ['set_number', 'weight_kg', 'reps', 'duration_sec'], permissions: OWN },
  delete: { fields: ['*'], permissions: OWN },
}

const IMAGE_FIELD = {
  field: 'image_urls',
  type: 'json',
  meta: { interface: 'tags', special: ['cast-json'], note: 'URL des images : position de départ, puis position d\'arrivée' },
  schema: { is_nullable: true },
}

const sameRule = (a, b) => JSON.stringify(a && Object.keys(a).length ? a : null) === JSON.stringify(b)

async function main() {
  console.log(`Directus : ${DIRECTUS_URL}`)

  // 1. Collection
  const collections = await api('GET', '/collections?limit=-1')
  if (collections.some(c => c.collection === COLLECTION)) {
    console.log(`Collection ${COLLECTION} déjà présente — skip`)
  } else {
    await api('POST', '/collections', {
      collection: COLLECTION,
      meta: { icon: 'fitness_center', note: 'Séries réalisées par les athlètes (charge, reps, durée)' },
      schema: {},
      fields: FIELDS,
    })
    console.log(`Collection ${COLLECTION} créée`)
  }

  // 2. Relations
  const relations = await api('GET', `/relations/${COLLECTION}`)
  for (const [field, related, onDelete] of RELATIONS) {
    if (relations.some(r => r.field === field)) {
      console.log(`Relation ${field} déjà présente — skip`)
      continue
    }
    await api('POST', '/relations', {
      collection: COLLECTION,
      field,
      related_collection: related,
      meta: { sort_field: null },
      schema: { on_delete: onDelete },
    })
    console.log(`Relation ${field} → ${related} créée (${onDelete})`)
  }

  // 3. Champ image_urls des catalogues
  for (const catalog of ['exercise_catalog', 'station_catalog']) {
    const fields = await api('GET', `/fields/${catalog}`)
    if (fields.some(f => f.field === IMAGE_FIELD.field)) {
      console.log(`Champ ${catalog}.image_urls déjà présent — skip`)
      continue
    }
    await api('POST', `/fields/${catalog}`, IMAGE_FIELD)
    console.log(`Champ ${catalog}.image_urls créé`)
  }

  // 4. Droits de l'Athlete Policy
  const policies = await api('GET', `/policies?filter[name][_eq]=${encodeURIComponent(POLICY_NAME)}&fields=id,name`)
  if (policies.length !== 1) throw new Error(`Policy « ${POLICY_NAME} » : ${policies.length} trouvée(s)`)
  const policy = policies[0].id
  const existing = await api('GET', `/permissions?filter[policy][_eq]=${policy}&filter[collection][_eq]=${COLLECTION}&limit=-1`)
  for (const [action, wanted] of Object.entries(PERMISSIONS)) {
    const current = existing.find(p => p.action === action)
    if (!current) {
      await api('POST', '/permissions', { policy, collection: COLLECTION, action, ...wanted, validation: null, presets: null })
      console.log(`Droit ${action} créé`)
    } else if (JSON.stringify(current.fields) === JSON.stringify(wanted.fields) && sameRule(current.permissions, wanted.permissions)) {
      console.log(`Droit ${action} déjà conforme — skip`)
    } else {
      await api('PATCH', `/permissions/${current.id}`, wanted)
      console.log(`Droit ${action} mis à jour`)
    }
  }

  // 5. Relecture
  const fields = await api('GET', `/fields/${COLLECTION}`)
  console.log(`\nChamps : ${fields.map(f => `${f.field}:${f.type}`).join(', ')}`)
  const rels = await api('GET', `/relations/${COLLECTION}`)
  console.log(`Relations : ${rels.map(r => `${r.field} → ${r.related_collection} (${r.schema?.on_delete})`).join(', ')}`)
  const perms = await api('GET', `/permissions?filter[policy][_eq]=${policy}&filter[collection][_eq]=${COLLECTION}&limit=-1`)
  for (const p of perms) console.log(`Droit ${p.action} : champs ${JSON.stringify(p.fields)}, filtre ${JSON.stringify(p.permissions)}`)

  if (process.argv.includes('--smoke')) await smoke()
}

// Essai de bout en bout avec le token admin : la ligne de test est supprimée à la fin.
async function smoke() {
  const [profile] = await api('GET', '/items/athlete_profiles?limit=1&fields=id')
  const [session] = await api('GET', '/items/sessions?limit=1&sort=-id&fields=id')
  const [line] = await api('GET', '/items/block_strength_exercises?limit=1&sort=-id&fields=id,exercise_id')
  const created = await api('POST', `/items/${COLLECTION}`, {
    athlete_profile_id: profile.id,
    session_id: session.id,
    block_strength_exercise_id: line.id,
    exercise_id: line.exercise_id,
    set_number: 1,
    weight_kg: 62.5,
    reps: 5,
  })
  try {
    if (!created.user_created || !created.date_created) throw new Error('user_created ou date_created non rempli')
    const updated = await api('PATCH', `/items/${COLLECTION}/${created.id}`, { reps: 6 })
    if (updated.reps !== 6 || updated.weight_kg !== 62.5 || !updated.date_updated) throw new Error(`mise à jour inattendue : ${JSON.stringify(updated)}`)
  } finally {
    await api('DELETE', `/items/${COLLECTION}/${created.id}`)
  }
  const left = await api('GET', `/items/${COLLECTION}?filter[id][_eq]=${created.id}`)
  if (left.length) throw new Error('la ligne de test n\'a pas été supprimée')
  console.log('\nEssai de bout en bout OK : ligne de test créée, modifiée, supprimée')
}

main().catch(e => { console.error(e); process.exit(1) })
