const fs   = require('fs')
const path = require('path')

const BASE  = 'http://localhost:8056'
const TOKEN = '4pCpZ9L8D9c4F2W6YRiDKKrjMDtZRuBb'
const H     = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }

const plan = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/plan.json'), 'utf8'))

// ─── API helpers ──────────────────────────────────────────────────────────────

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

async function ensureField(col, fieldDef) {
  if (await fieldExists(col, fieldDef.field)) return
  await api('POST', `/fields/${col}`, fieldDef)
  console.log(`  + field ${col}.${fieldDef.field}`)
}

// ─── Pre-flight: patch schema for import needs ─────────────────────────────

async function patchSchema() {
  // Add slug to sessions (string PK slug for app routing)
  await ensureField('sessions', {
    field: 'slug', type: 'string',
    schema: { is_nullable: true },
    meta: { interface: 'input' },
  })

  // Widen brickFormat to string (JSON has pyramid / follow_the_leader beyond enum)
  await api('PATCH', '/fields/block_station_block/brickFormat', {
    type: 'string',
    meta: { interface: 'input' },
  })
}

// ─── Block creators ───────────────────────────────────────────────────────────

function sequenceToStations(seq) {
  return (seq || []).map(item => {
    if (item.kind === 'run') return `Run ${item.distanceKm}km`
    return item.name || String(item)
  })
}

async function createBlock(detail) {
  const d = detail
  let collection, payload

  switch (d.type) {
    case 'warmup':
      collection = 'block_warmup'
      payload = { durationMin: d.durationMin, label: d.label ?? null, paceZone: d.paceZone ?? null }
      break

    case 'cooldown':
      collection = 'block_cooldown'
      payload = { durationMin: d.durationMin, label: d.label ?? null }
      break

    case 'circuit': {
      collection = 'block_circuit'
      const isAmrap = d.rounds === 0 || d.format === 'amrap'
      payload = {
        format: isAmrap ? 'amrap' : 'rounds',
        label:  d.label ?? null,
        rounds: isAmrap ? null : d.rounds,
        durationMin: isAmrap ? (d.durationMin ?? null) : null,
        restBetweenMin: d.restBetweenMin ?? 0,
        stations: d.stations ?? [],
      }
      break
    }

    case 'finisher':
      collection = 'block_circuit'
      payload = {
        format: 'rounds',
        label:  null,
        rounds: d.rounds,
        durationMin: null,
        restBetweenMin: d.restBetweenMin ?? 0,
        stations: d.exercises ?? [],
      }
      break

    case 'mini_race':
      collection = 'block_mini_race'
      payload = {
        rounds: d.rounds,
        runDistanceKm: d.runDistanceKm ?? null,
        paceZone: d.paceZone,
        restBetweenRoundsMin: d.restBetweenRoundsMin ?? null,
        stations: d.stations ?? [],
      }
      break

    case 'station_activation':
      collection = 'block_station_activation'
      payload = {
        note:    d.note ?? null,
        rounds:  d.rounds ?? null,
        stations: d.stations ?? [],
      }
      break

    case 'strength':
      collection = 'block_strength'
      payload = {
        sets:      d.sets || null,
        restSec:   d.restSec || null,
        exercises: d.exercises ?? [],
      }
      break

    case 'run':
      collection = 'block_run'
      payload = { durationMin: d.durationMin }
      break

    case 'intervals':
      collection = 'block_intervals'
      payload = {
        sets:        d.sets,
        distanceKm:  d.setDistanceKm ?? null,
        durationMin: d.setDurationMin ?? null,
        recoveryMin: d.recoveryMin,
        paceZone:    d.paceZone,
      }
      break

    case 'target_pace':
      collection = 'block_target_pace'
      payload = { zone: d.zone }
      break

    case 'brick_run':
      collection = 'block_brick_run'
      payload = {
        durationMin: d.durationMin,
        paceZone:    d.paceZone,
        note:        d.note ?? null,
      }
      break

    case 'station_block': {
      collection = 'block_station_block'
      const stations = d.stations ?? sequenceToStations(d.sequence)
      payload = {
        brickFormat: d.brickFormat,
        formatNote:  d.formatNote ?? null,
        stations,
      }
      break
    }

    default:
      return null
  }

  const created = await api('POST', `/items/${collection}`, payload)
  return { collection, id: created.id }
}

// ─── Cleanup (wipe all existing data) ────────────────────────────────────────

const ALL_BLOCK_COLS = [
  'block_warmup','block_cooldown','block_circuit','block_mini_race',
  'block_station_activation','block_strength','block_run',
  'block_intervals','block_target_pace','block_brick_run','block_station_block',
]

async function deleteAll(col) {
  const res = await api('GET', `/items/${col}?limit=-1&fields=id`)
  const ids = (Array.isArray(res) ? res : res.data ?? res).map(r => r.id)
  if (ids.length === 0) return
  await api('DELETE', `/items/${col}`, ids)
  console.log(`  ~ cleared ${col} (${ids.length})`)
}

async function cleanup() {
  console.log('Nettoyage…')
  await deleteAll('session_details')
  await deleteAll('sessions')
  for (const c of ALL_BLOCK_COLS) await deleteAll(c)
  await deleteAll('weeks')
  await deleteAll('athlete_profiles')
  await deleteAll('plans')
  console.log()
}

// ─── Main import ──────────────────────────────────────────────────────────────

async function main() {
  await api('GET', '/server/info')
  console.log('✓ Directus connecté\n')

  await patchSchema()
  await cleanup()

  // 1. Plan
  console.log('Création du plan…')
  const planRec = await api('POST', '/items/plans', {
    title:     plan.plan.name,
    startDate: plan.plan.startDate,
  })
  const planId = planRec.id
  console.log(`  ✓ plan id=${planId}\n`)

  // 2. Weeks + sessions
  let totalSessions = 0, totalBlocks = 0
  for (const week of plan.weeks) {
    const weekRec = await api('POST', '/items/weeks', {
      plan_id:    planId,
      weekNumber: week.weekNumber,
      phase:      week.phase ?? null,
      theme:      week.theme ?? null,
      isDeload:   week.isDeload ?? false,
      weekNote:   week.weekNote ?? null,
    })
    const weekId = weekRec.id
    process.stdout.write(`  Semaine ${week.weekNumber} (id=${weekId})\n`)

    for (const session of week.sessions || []) {
      // Create blocks
      const blocks = []
      for (const detail of session.structuredDetails || []) {
        const block = await createBlock(detail)
        if (block) {
          blocks.push(block)
          totalBlocks++
        }
      }

      // Create session
      const sessionRec = await api('POST', '/items/sessions', {
        week_id:        weekId,
        slug:           session.id,
        day:            session.day,
        type:           session.type,
        optional:       session.optional ?? false,
        title:          session.title,
        description:    session.description ?? null,
        duration:       session.duration ?? null,
        intensityScore: session.intensityScore ?? null,
        focus:          session.focus ?? null,
        coachTip:       session.coachTip ?? null,
      })
      const sessionId = sessionRec.id
      totalSessions++

      // Create session_details (M2A)
      for (let i = 0; i < blocks.length; i++) {
        await api('POST', '/items/session_details', {
          session_id: sessionId,
          position:   i,
          collection: blocks[i].collection,
          item:       blocks[i].id,
        })
      }

      process.stdout.write(`    ✓ ${session.id} (${blocks.length} blocs)\n`)
    }
  }

  console.log(`\n✓ Import terminé : ${plan.weeks.length} semaines, ${totalSessions} séances, ${totalBlocks} blocs.`)
}

main().catch(e => { console.error('\n✗', e.message); process.exit(1) })
