// scripts/add-station-logs.cjs
// Permet d'enregistrer dans set_logs les tours faits sur une station (circuits à tours), à côté des séries de muscu :
//   station_id  la station du catalogue, clé de l'historique
//   line_key    la ligne prévue, sous la forme « block_circuit_stations:173 » : les lignes de stations vivent dans
//               quatre collections, une clé étrangère ne peut pas toutes les viser
//   distance_m  la distance, pour ce qui ne se compte ni en reps ni en secondes
// et donne à l'athlète le droit d'écrire ces champs sur ses propres lignes.
// L'app marche sans : elle s'aperçoit que les champs manquent et laisse les circuits en lecture seule.
//   node scripts/add-station-logs.cjs           simulation
//   node scripts/add-station-logs.cjs --write   écrit
// URL et token : voir scripts/_directus.cjs. Idempotent.
const { api, DIRECTUS_URL } = require('./_directus.cjs')

const WRITE = process.argv.includes('--write')
const COLLECTION = 'set_logs'
const POLICY_NAME = 'Athlete Policy'

const FIELDS = [
  {
    field: 'station_id',
    type: 'integer',
    meta: { interface: 'select-dropdown-m2o', special: ['m2o'], note: 'Station (clé de l\'historique), pour un tour de circuit' },
    schema: { is_nullable: true },
  },
  {
    field: 'line_key',
    type: 'string',
    meta: { interface: 'input', note: 'Ligne prévue d\'un tour de station : collection et identifiant, ex. block_circuit_stations:173' },
    schema: { is_nullable: true, max_length: 80 },
  },
  {
    field: 'distance_m',
    type: 'integer',
    meta: { interface: 'input', note: 'Distance en mètres (portés, ergomètres)' },
    schema: { is_nullable: true },
  },
]

// SET NULL : l'historique survit si la station quitte le catalogue (le CRM refuse de toute façon de supprimer une station utilisée)
const RELATION = { field: 'station_id', related: 'station_catalog', onDelete: 'SET NULL' }

// Champs que l'athlète doit pouvoir écrire, en plus de ceux qu'il écrit déjà
const CREATE_FIELDS = ['station_id', 'line_key', 'distance_m']
const UPDATE_FIELDS = ['distance_m']

async function main() {
  console.log(`Directus : ${DIRECTUS_URL} — ${WRITE ? 'ÉCRITURE' : 'simulation (ajouter --write pour écrire)'}`)

  // 1. Champs
  const existing = (await api('GET', `/fields/${COLLECTION}`)).map(f => f.field)
  for (const field of FIELDS) {
    if (existing.includes(field.field)) { console.log(`Champ ${COLLECTION}.${field.field} déjà présent — skip`); continue }
    if (WRITE) await api('POST', `/fields/${COLLECTION}`, field)
    console.log(`${WRITE ? 'Champ créé' : 'Champ à créer'} : ${COLLECTION}.${field.field} (${field.type})`)
  }

  // 2. Relation vers le catalogue des stations
  const relations = await api('GET', `/relations/${COLLECTION}`)
  if (relations.some(r => r.field === RELATION.field)) {
    console.log(`Relation ${RELATION.field} déjà présente — skip`)
  } else {
    if (WRITE) {
      await api('POST', '/relations', {
        collection: COLLECTION,
        field: RELATION.field,
        related_collection: RELATION.related,
        meta: { sort_field: null },
        schema: { on_delete: RELATION.onDelete },
      })
    }
    console.log(`Relation ${WRITE ? 'créée' : 'à créer'} : ${RELATION.field} → ${RELATION.related} (${RELATION.onDelete})`)
  }

  // 3. Droits de l'athlète : les nouveaux champs s'ajoutent à ceux qu'il écrit déjà, le filtre ne change pas
  const policies = await api('GET', `/policies?filter[name][_eq]=${encodeURIComponent(POLICY_NAME)}&fields=id`)
  if (policies.length !== 1) throw new Error(`Policy « ${POLICY_NAME} » : ${policies.length} trouvée(s)`)
  const policy = policies[0].id
  const perms = await api('GET', `/permissions?filter[policy][_eq]=${policy}&filter[collection][_eq]=${COLLECTION}&limit=-1`)
  for (const [action, added] of [['create', CREATE_FIELDS], ['update', UPDATE_FIELDS]]) {
    const perm = perms.find(p => p.action === action)
    if (!perm) throw new Error(`Droit ${action} introuvable sur ${COLLECTION}`)
    const current = perm.fields ?? []
    if (current.includes('*') || added.every(f => current.includes(f))) {
      console.log(`Droit ${action} : couvre déjà les nouveaux champs — skip`)
      continue
    }
    const fields = [...new Set([...current, ...added])]
    if (WRITE) await api('PATCH', `/permissions/${perm.id}`, { fields })
    console.log(`Droit ${action} ${WRITE ? 'étendu' : 'à étendre'} : + ${added.filter(f => !current.includes(f)).join(', ')}`)
  }

  // 4. Relecture
  if (WRITE) {
    const fields = await api('GET', `/fields/${COLLECTION}`)
    console.log(`\nChamps : ${fields.map(f => `${f.field}:${f.type}`).join(', ')}`)
    const rels = await api('GET', `/relations/${COLLECTION}`)
    console.log(`Relations : ${rels.map(r => `${r.field} → ${r.related_collection} (${r.schema?.on_delete})`).join(', ')}`)
    const after = await api('GET', `/permissions?filter[policy][_eq]=${policy}&filter[collection][_eq]=${COLLECTION}&limit=-1`)
    for (const p of after) console.log(`Droit ${p.action} : champs ${JSON.stringify(p.fields)}, filtre ${JSON.stringify(p.permissions)}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
