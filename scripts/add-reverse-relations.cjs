const BASE  = 'http://localhost:8056'
const TOKEN = '4pCpZ9L8D9c4F2W6YRiDKKrjMDtZRuBb'
const H     = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }

const BLOCK_COLLECTIONS = [
  'block_warmup','block_cooldown','block_circuit','block_mini_race',
  'block_station_activation','block_strength','block_run',
  'block_intervals','block_target_pace','block_brick_run','block_station_block',
]

async function api(method, endpoint, body) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method, headers: H,
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = json?.errors?.[0]?.message ?? JSON.stringify(json)
    throw new Error(`${method} ${endpoint} → ${res.status}: ${msg}`)
  }
  return json.data ?? json
}

async function fieldExists(col, field) {
  try { await api('GET', `/fields/${col}/${field}`); return true } catch { return false }
}

async function addAliasField(collection, field, meta) {
  if (await fieldExists(collection, field)) {
    console.log(`  ~ ${collection}.${field} (existe)`)
    return
  }
  await api('POST', `/fields/${collection}`, {
    field,
    type: 'alias',
    meta,
  })
  console.log(`  ✓ ${collection}.${field}`)
}

async function patchRelation(collection, field, meta) {
  try {
    await api('PATCH', `/relations/${collection}/${field}`, { meta })
    console.log(`  ✓ relation ${collection}.${field} mise à jour`)
  } catch (e) {
    console.log(`  ✗ relation ${collection}.${field}: ${e.message}`)
  }
}

async function main() {
  await api('GET', '/server/info')
  console.log('✓ Directus connecté\n')

  // ── 1. plans → weeks (O2M) ───────────────────────────────────────────────
  console.log('plans → weeks…')
  await addAliasField('plans', 'weeks', {
    special:   ['o2m'],
    interface: 'list-o2m',
    options: { fields: ['weekNumber', 'theme', 'phase', 'isDeload'] },
    display:   'related-values',
    display_options: { fields: ['weekNumber'] },
  })
  await patchRelation('weeks', 'plan_id', { one_field: 'weeks' })

  // ── 2. weeks → sessions (O2M) ────────────────────────────────────────────
  console.log('\nweeks → sessions…')
  await addAliasField('weeks', 'sessions', {
    special:   ['o2m'],
    interface: 'list-o2m',
    options: { fields: ['slug', 'day', 'type', 'title', 'duration'] },
    display:   'related-values',
    display_options: { fields: ['title'] },
  })
  await patchRelation('sessions', 'week_id', { one_field: 'sessions' })

  // ── 3. sessions → session_details → blocs (M2A) ──────────────────────────
  console.log('\nsessions → blocs (M2A)…')
  await addAliasField('sessions', 'blocks', {
    special:   ['m2a'],
    interface: 'list-m2a',
    options: {
      fields:              ['position', 'collection', 'item'],
      allowedCollections:  BLOCK_COLLECTIONS,
      enableCreate:        true,
      enableSelect:        false,
      junctionFieldLocation: 'bottom',
    },
  })

  // Met à jour session_details.item pour lier à l'alias M2A de sessions
  await patchRelation('session_details', 'item', {
    one_field:            'blocks',
    junction_field:       'session_id',
    one_collection_field: 'collection',
    one_allowed_collections: BLOCK_COLLECTIONS,
    one_deselect_action: 'delete',
    sort_field:           'position',
  })

  // Met à jour session_details.session_id pour référencer l'alias
  await patchRelation('session_details', 'session_id', {
    one_field: 'blocks',
  })

  // ── 4. plans → athlete_profiles (O2M) ────────────────────────────────────
  console.log('\nplans → athlete_profiles…')
  await addAliasField('plans', 'athletes', {
    special:   ['o2m'],
    interface: 'list-o2m',
    options: { fields: ['name', 'tenKmTimeSec'] },
  })
  await patchRelation('athlete_profiles', 'plan_id', { one_field: 'athletes' })

  console.log('\n✓ Liens inversés configurés.')
}

main().catch(e => { console.error('\n✗', e.message); process.exit(1) })
