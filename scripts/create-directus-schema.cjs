const BASE  = 'http://localhost:8056'
const TOKEN = '4pCpZ9L8D9c4F2W6YRiDKKrjMDtZRuBb'
const H     = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }

// ─── API helpers ──────────────────────────────────────────────────────────────

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method, headers: H,
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = json?.errors?.[0]?.message ?? JSON.stringify(json)
    throw new Error(`${method} ${path} → ${res.status}: ${msg}`)
  }
  return json.data ?? json
}

async function collectionExists(name) {
  try { await api('GET', `/collections/${name}`); return true } catch { return false }
}
async function fieldExists(col, f) {
  try { await api('GET', `/fields/${col}/${f}`); return true } catch { return false }
}

async function ensureCollection(name, icon = 'box') {
  if (await collectionExists(name)) { process.stdout.write(`  ~ ${name}\n`); return }
  await api('POST', '/collections', { collection: name, meta: { icon }, schema: { name } })
  process.stdout.write(`  ✓ ${name}\n`)
}

async function ensureField(collection, field) {
  if (await fieldExists(collection, field.field)) return
  await api('POST', `/fields/${collection}`, field)
}

async function ensureRelation(rel) {
  try {
    await api('POST', '/relations', rel)
    console.log(`  ✓ ${rel.collection}.${rel.field} → ${rel.related_collection ?? 'M2A'}`)
  } catch (e) {
    if (e.message.includes('already exists') || e.message.includes('SQLITE_CONSTRAINT')) {
      console.log(`  ~ ${rel.collection}.${rel.field} (existe)`)
    } else throw e
  }
}

// ─── Field builders ───────────────────────────────────────────────────────────

const ZONES = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5']

const BLOCK_COLLECTIONS = [
  'block_warmup', 'block_cooldown', 'block_circuit', 'block_mini_race',
  'block_station_activation', 'block_strength', 'block_run',
  'block_intervals', 'block_target_pace', 'block_brick_run', 'block_station_block',
]

const f = {
  str:  (name, req) => ({ field: name, type: 'string',  schema: { is_nullable: !req }, meta: { interface: 'input' } }),
  txt:  (name)      => ({ field: name, type: 'text',    schema: { is_nullable: true }, meta: { interface: 'input-multiline' } }),
  int:  (name, req) => ({ field: name, type: 'integer', schema: { is_nullable: !req }, meta: { interface: 'input' } }),
  flt:  (name)      => ({ field: name, type: 'float',   schema: { is_nullable: true }, meta: { interface: 'input' } }),
  bool: (name, def) => ({ field: name, type: 'boolean', schema: { is_nullable: false, default_value: def ?? false }, meta: { interface: 'boolean' } }),
  date: (name)      => ({ field: name, type: 'date',    schema: { is_nullable: false }, meta: { interface: 'datetime' } }),
  json: (name)      => ({ field: name, type: 'json',    schema: { is_nullable: true }, meta: { interface: 'input-code', options: { language: 'json' }, special: ['json'] } }),
  uuid: (name)      => ({ field: name, type: 'uuid',    schema: { is_nullable: false }, meta: { interface: 'input', hidden: true } }),
  fkStr:(name)      => ({ field: name, type: 'string',  schema: { is_nullable: false }, meta: { interface: 'input', hidden: true } }),
  enum: (name, choices, req) => ({
    field: name, type: 'string',
    schema: { is_nullable: !req },
    meta: { interface: 'select-dropdown', options: { choices: choices.map(c => ({ text: c, value: c })) } },
  }),
}

// ─── Schema definition ────────────────────────────────────────────────────────

const SCHEMA = {
  plans: {
    icon: 'article',
    fields: [
      f.str('title', true),
      f.date('startDate'),
    ],
  },
  athlete_profiles: {
    icon: 'person',
    fields: [
      f.uuid('plan_id'),
      f.str('name', true),
      f.int('tenKmTimeSec'),
    ],
  },
  weeks: {
    icon: 'calendar_month',
    fields: [
      f.uuid('plan_id'),
      f.int('weekNumber', true),
      f.int('phase'),
      f.str('theme'),
      f.bool('isDeload'),
      f.txt('weekNote'),
    ],
  },
  sessions: {
    icon: 'fitness_center',
    fields: [
      f.fkStr('week_id'),
      f.enum('day', ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'], true),
      f.enum('type', ['hyrox','running','strength','brick','recovery','mobility'], true),
      f.bool('optional'),
      f.str('title', true),
      f.txt('description'),
      f.int('duration'),
      f.int('intensityScore'),
      f.str('focus'),
      f.txt('coachTip'),
    ],
  },
  session_details: {
    icon: 'list',
    fields: [
      f.fkStr('session_id'),
      f.int('position', true),
      f.str('collection'),
      f.str('item'),
    ],
  },
  block_warmup: {
    icon: 'local_fire_department',
    fields: [f.int('durationMin', true), f.str('label'), f.enum('paceZone', ZONES)],
  },
  block_cooldown: {
    icon: 'water_drop',
    fields: [f.int('durationMin', true), f.str('label')],
  },
  block_circuit: {
    icon: 'loop',
    fields: [
      f.enum('format', ['rounds','amrap'], true),
      f.str('label'), f.int('rounds'), f.int('durationMin'),
      f.flt('restBetweenMin'), f.json('stations'),
    ],
  },
  block_mini_race: {
    icon: 'directions_run',
    fields: [
      f.int('rounds', true), f.flt('runDistanceKm'),
      f.enum('paceZone', ZONES, true), f.flt('restBetweenRoundsMin'), f.json('stations'),
    ],
  },
  block_station_activation: {
    icon: 'sports',
    fields: [f.txt('note'), f.int('rounds'), f.json('stations')],
  },
  block_strength: {
    icon: 'fitness_center',
    fields: [f.int('sets'), f.int('restSec'), f.json('exercises')],
  },
  block_run: {
    icon: 'directions_run',
    fields: [f.int('durationMin', true)],
  },
  block_intervals: {
    icon: 'speed',
    fields: [
      f.int('sets', true), f.flt('distanceKm'), f.flt('durationMin'),
      f.flt('recoveryMin'), f.enum('paceZone', ZONES, true),
    ],
  },
  block_target_pace: {
    icon: 'track_changes',
    fields: [f.enum('zone', ZONES, true)],
  },
  block_brick_run: {
    icon: 'directions_run',
    fields: [f.int('durationMin', true), f.enum('paceZone', ZONES, true), f.txt('note')],
  },
  block_station_block: {
    icon: 'view_list',
    fields: [
      f.enum('brickFormat', ['emom','standard'], true),
      f.txt('formatNote'), f.json('stations'),
    ],
  },
}

const RELATIONS = [
  { collection: 'weeks',            field: 'plan_id',    related_collection: 'plans' },
  { collection: 'athlete_profiles', field: 'plan_id',    related_collection: 'plans' },
  { collection: 'sessions',         field: 'week_id',    related_collection: 'weeks' },
  { collection: 'session_details',  field: 'session_id', related_collection: 'sessions' },
  {
    collection: 'session_details', field: 'item', related_collection: null,
    meta: {
      one_collection_field:    'collection',
      one_allowed_collections: BLOCK_COLLECTIONS,
      one_deselect_action:     'delete',
      sort_field:              'position',
      junction_field:          'session_id',
    },
  },
]

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  await api('GET', '/server/info')
  console.log('✓ Directus 11 connecté\n')

  console.log('Collections...')
  for (const [name, cfg] of Object.entries(SCHEMA)) {
    await ensureCollection(name, cfg.icon)
    for (const field of cfg.fields) await ensureField(name, field)
  }

  console.log('\nRelations...')
  for (const rel of RELATIONS) await ensureRelation(rel)

  console.log('\n✓ Schéma créé.')
}

main().catch(e => { console.error('\n✗', e.message); process.exit(1) })
