// scripts/add-exercise-notes.cjs
// Crée la collection exercise_notes : la note qu'un athlète laisse sur un exercice ou une station pendant une séance,
// pour se la rappeler la prochaine fois (« facile, monter la charge »). Une par exercice et par séance.
// Crée aussi ses relations et les droits de l'Athlete Policy, calqués sur ceux de set_logs.
// L'app marche sans : elle s'aperçoit que la collection manque et n'affiche pas les notes.
//   node scripts/add-exercise-notes.cjs           simulation
//   node scripts/add-exercise-notes.cjs --write   écrit
// URL et token : voir scripts/_directus.cjs. Idempotent : chaque étape est sautée si elle est déjà faite.
const { api, DIRECTUS_URL } = require('./_directus.cjs')

const WRITE = process.argv.includes('--write')
const COLLECTION = 'exercise_notes'
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
  m2o('session_id', 'Séance où la note a été écrite'),
  m2o('exercise_id', 'Exercice (vide pour une station)'),
  m2o('station_id', 'Station (vide pour un exercice)'),
  { field: 'note', type: 'text', meta: { interface: 'input-multiline', required: true, note: '300 caractères au plus' }, schema: { is_nullable: false } },
  system('user_created', 'uuid', 'user-created', 'select-dropdown-m2o'),
  system('date_created', 'timestamp', 'date-created', 'datetime'),
  system('date_updated', 'timestamp', 'date-updated', 'datetime'),
]

// [champ, collection liée, ON DELETE]
// SET NULL sur la séance et le catalogue : la note survit si le coach régénère une séance (comme set_logs).
const RELATIONS = [
  ['athlete_profile_id', 'athlete_profiles', 'CASCADE'],
  ['session_id', 'sessions', 'SET NULL'],
  ['exercise_id', 'exercise_catalog', 'SET NULL'],
  ['station_id', 'station_catalog', 'SET NULL'],
  ['user_created', 'directus_users', 'SET NULL'],
]

// Le filtre porte sur user_created (rempli par le serveur), pas sur athlete_profile_id (envoyé par le client).
const OWN = { user_created: { _eq: '$CURRENT_USER' } }
const PERMISSIONS = {
  create: { fields: ['athlete_profile_id', 'session_id', 'exercise_id', 'station_id', 'note'], permissions: null },
  read: { fields: ['*'], permissions: OWN },
  update: { fields: ['note'], permissions: OWN },
  delete: { fields: ['*'], permissions: OWN },
}

const sameRule = (a, b) => JSON.stringify(a && Object.keys(a).length ? a : null) === JSON.stringify(b)

async function main() {
  console.log(`Directus : ${DIRECTUS_URL} — ${WRITE ? 'ÉCRITURE' : 'simulation (ajouter --write pour écrire)'}`)

  // 1. Collection et champs
  const collections = await api('GET', '/collections?limit=-1')
  const exists = collections.some(c => c.collection === COLLECTION)
  if (exists) {
    console.log(`Collection ${COLLECTION} déjà présente — skip`)
  } else {
    if (WRITE) {
      await api('POST', '/collections', {
        collection: COLLECTION,
        meta: { icon: 'sticky_note_2', note: 'Notes des athlètes sur un exercice, pour la prochaine fois' },
        schema: {},
        fields: FIELDS,
      })
    }
    console.log(`Collection ${WRITE ? 'créée' : 'à créer'} : ${COLLECTION} (${FIELDS.map(f => f.field).join(', ')})`)
  }

  // 2. Relations (en simulation, la collection n'existe peut-être pas encore : aucune relation)
  const relations = exists || WRITE ? await api('GET', `/relations/${COLLECTION}`) : []
  for (const [field, related, onDelete] of RELATIONS) {
    if (relations.some(r => r.field === field)) {
      console.log(`Relation ${field} déjà présente — skip`)
      continue
    }
    if (WRITE) {
      await api('POST', '/relations', {
        collection: COLLECTION,
        field,
        related_collection: related,
        meta: { sort_field: null },
        schema: { on_delete: onDelete },
      })
    }
    console.log(`Relation ${WRITE ? 'créée' : 'à créer'} : ${field} → ${related} (${onDelete})`)
  }

  // 3. Droits de l'Athlete Policy
  const policies = await api('GET', `/policies?filter[name][_eq]=${encodeURIComponent(POLICY_NAME)}&fields=id,name`)
  if (policies.length !== 1) throw new Error(`Policy « ${POLICY_NAME} » : ${policies.length} trouvée(s)`)
  const policy = policies[0].id
  const existing = await api('GET', `/permissions?filter[policy][_eq]=${policy}&filter[collection][_eq]=${COLLECTION}&limit=-1`)
  for (const [action, wanted] of Object.entries(PERMISSIONS)) {
    const current = existing.find(p => p.action === action)
    if (!current) {
      if (WRITE) await api('POST', '/permissions', { policy, collection: COLLECTION, action, ...wanted, validation: null, presets: null })
      console.log(`Droit ${action} ${WRITE ? 'créé' : 'à créer'} : champs ${JSON.stringify(wanted.fields)}`)
    } else if (JSON.stringify(current.fields) === JSON.stringify(wanted.fields) && sameRule(current.permissions, wanted.permissions)) {
      console.log(`Droit ${action} déjà conforme — skip`)
    } else {
      if (WRITE) await api('PATCH', `/permissions/${current.id}`, wanted)
      console.log(`Droit ${action} ${WRITE ? 'mis à jour' : 'à mettre à jour'}`)
    }
  }

  // 4. Relecture
  if (WRITE) {
    const fields = await api('GET', `/fields/${COLLECTION}`)
    console.log(`\nChamps : ${fields.map(f => `${f.field}:${f.type}`).join(', ')}`)
    const rels = await api('GET', `/relations/${COLLECTION}`)
    console.log(`Relations : ${rels.map(r => `${r.field} → ${r.related_collection} (${r.schema?.on_delete})`).join(', ')}`)
    const perms = await api('GET', `/permissions?filter[policy][_eq]=${policy}&filter[collection][_eq]=${COLLECTION}&limit=-1`)
    for (const p of perms) console.log(`Droit ${p.action} : champs ${JSON.stringify(p.fields)}, filtre ${JSON.stringify(p.permissions)}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
