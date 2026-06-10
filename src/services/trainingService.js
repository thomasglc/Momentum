import { useAuthStore } from '@/stores/auth'

const DIRECTUS_URL = import.meta.env.VITE_DIRECTUS_URL || 'http://localhost:8056'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24h

// ── Cache mémoire (ultra-rapide, dure le temps de la session) ─────────────
let _planCache = null
const _weekCache    = new Map()
const _sessionCache = new Map()

// ── Cache localStorage (survit au refresh) ───────────────────────────────
function lsGet(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const { data, expires } = JSON.parse(raw)
    if (Date.now() > expires) { localStorage.removeItem(key); return null }
    return data
  } catch { return null }
}

function lsSet(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, expires: Date.now() + CACHE_TTL_MS }))
  } catch {} // quota dépassé → on ignore
}

async function api(path, params = {}) {
  const url = new URL(`${DIRECTUS_URL}${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.append(k, v)
  const authStore = useAuthStore()
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${authStore.token}` } })
  if (res.status === 401) {
    authStore.logout()
    window.location.hash = '/login'
    throw new Error('Session expirée')
  }
  return (await res.json()).data
}

export function clearPlanCache() {
  _planCache = null
  _weekCache.clear()
  _sessionCache.clear()
  // Purger les entrées localStorage du plan
  Object.keys(localStorage)
    .filter(k => k.startsWith('momentum-week-') || k.startsWith('momentum-session-') || k === 'momentum-plan')
    .forEach(k => localStorage.removeItem(k))
}

function intensityLabel(score) {
  if (!score) return ''
  if (score <= 3) return 'Facile'
  if (score <= 5) return 'Modéré'
  if (score <= 7) return 'Soutenu'
  if (score <= 9) return 'Intense'
  return 'Maximal'
}

function weekDates(startDate, weekNumber) {
  const start = new Date(startDate)
  start.setDate(start.getDate() + (weekNumber - 1) * 7)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const fmt = d => d.toISOString().split('T')[0]
  return { startDate: fmt(start), endDate: fmt(end) }
}

const DAY_ORDER = { Lundi: 0, Mardi: 1, Mercredi: 2, Jeudi: 3, Vendredi: 4, Samedi: 5, Dimanche: 6 }

function sortByDay(sessions) {
  return [...sessions].sort((a, b) => (DAY_ORDER[a.day] ?? 7) - (DAY_ORDER[b.day] ?? 7))
}

function mapSession(s) {
  return {
    id: s.id,
    day: s.day,
    type: s.type,
    optional: !!s.optional,
    title: s.title,
    description: s.description,
    duration: s.duration_min ?? 0,
    intensityLabel: intensityLabel(s.intensity_score),
    intensityScore: s.intensity_score,
    coachTip: s.coach_tip,
    slug: s.slug,
  }
}

function cardioToDetail(b) {
  switch (b.subtype) {
    case 'warmup':
      return { type: 'warmup', durationMin: b.duration_min, paceZone: b.pace_zone, label: b.label }
    case 'cooldown':
      return { type: 'cooldown', durationMin: b.duration_min, label: b.label }
    case 'run':
      return { type: 'run', durationMin: b.duration_min, paceZone: b.pace_zone ?? null, label: b.label ?? null }
    case 'target_pace':
      return { type: 'target_pace', zone: b.pace_zone, label: b.label }
    case 'brick_run':
      return { type: 'brick_run', durationMin: b.duration_min, paceZone: b.pace_zone, note: b.note }
    default:
      return { type: b.subtype, durationMin: b.duration_min, label: b.label }
  }
}

function formatExercise(row) {
  const name = row.exercise_id?.name ?? row.custom_label ?? 'Exercice'
  let str
  if (row.sets && row.reps)          str = `${row.sets}×${row.reps} ${name}`
  else if (row.sets && row.duration_sec) str = `${row.sets}×${row.duration_sec}s ${name}`
  else if (row.duration_sec)         str = `${row.duration_sec}s ${name}`
  else if (row.reps)                 str = `${row.reps} ${name}`
  else                               str = name
  if (row.note) str += ` (${row.note})`
  return str
}

function formatStation(row) {
  const name = row.station_id?.name ?? row.custom_label ?? 'Station'
  let str = name
  if (row.distance_m)      str += ` ${row.distance_m}m`
  else if (row.reps)       str += ` ${row.reps} reps`
  if (row.weight_kg_female != null && row.weight_kg_male != null)
    str += ` (${row.weight_kg_female}kg F / ${row.weight_kg_male}kg H)`
  else if (row.weight_kg_male != null)
    str += ` (${row.weight_kg_male}kg)`
  else if (row.weight_kg_female != null)
    str += ` (${row.weight_kg_female}kg)`
  if (row.note) str += ` (${row.note})`
  return str
}

async function fetchBlock({ block_type, block_id }) {
  switch (block_type) {
    case 'block_cardio': {
      const b = await api(`/items/block_cardio/${block_id}`)
      return cardioToDetail(b)
    }

    case 'block_intervals': {
      const b = await api(`/items/block_intervals/${block_id}`)
      return {
        type: 'intervals',
        sets: b.sets,
        setDistanceKm: b.distance_km,
        setDurationMin: b.duration_min,
        recoveryMin: b.recovery_min,
        paceZone: b.pace_zone,
        note: b.note,
      }
    }

    case 'block_strength': {
      const [b, rows] = await Promise.all([
        api(`/items/block_strength/${block_id}`),
        api('/items/block_strength_exercises', {
          'filter[block_strength_id][_eq]': block_id,
          'fields': '*,exercise_id.*',
          'sort': 'position',
        }),
      ])
      return { type: 'strength', restSec: b.rest_sec, exercises: rows.map(formatExercise) }
    }

    case 'block_circuit': {
      const [b, rows] = await Promise.all([
        api(`/items/block_circuit/${block_id}`),
        api('/items/block_circuit_stations', {
          'filter[block_circuit_id][_eq]': block_id,
          'fields': '*,station_id.*',
          'sort': 'position',
        }),
      ])
      return {
        type: 'circuit',
        format: b.format,
        label: b.label,
        rounds: b.rounds,
        durationMin: b.duration_min,
        restBetweenMin: b.rest_between_min,
        stations: rows.map(formatStation),
      }
    }

    case 'block_mini_race': {
      const [b, rows] = await Promise.all([
        api(`/items/block_mini_race/${block_id}`),
        api('/items/block_mini_race_stations', {
          'filter[block_mini_race_id][_eq]': block_id,
          'fields': '*,station_id.*',
          'sort': 'position',
        }),
      ])
      return {
        type: 'mini_race',
        rounds: b.rounds,
        runDistanceKm: b.run_distance_km,
        paceZone: b.pace_zone,
        restBetweenRoundsMin: b.rest_between_rounds_min,
        stations: rows.map(formatStation),
      }
    }

    case 'block_station_activation': {
      const [b, rows] = await Promise.all([
        api(`/items/block_station_activation/${block_id}`),
        api('/items/block_station_activation_entries', {
          'filter[block_station_activation_id][_eq]': block_id,
          'fields': '*,station_id.*',
          'sort': 'position',
        }),
      ])
      return { type: 'station_activation', rounds: b.rounds, note: b.note, stations: rows.map(formatStation) }
    }

    case 'block_station_block': {
      const [b, rows] = await Promise.all([
        api(`/items/block_station_block/${block_id}`),
        api('/items/block_station_block_entries', {
          'filter[block_station_block_id][_eq]': block_id,
          'fields': '*,station_id.*',
          'sort': 'position',
        }),
      ])
      return {
        type: 'station_block',
        brickFormat: b.brick_format,
        formatNote: b.format_note,
        stations: rows.map(formatStation),
      }
    }

    default:
      return { type: 'text', label: `[bloc inconnu: ${block_type}]` }
  }
}

async function loadPlan() {
  if (_planCache) return _planCache

  const cached = lsGet('momentum-plan-v2')
  if (cached) { _planCache = cached; return _planCache }

  const plans = await api('/items/plans', { limit: 1, fields: 'id,start_date,plan_type' })
  const p = plans[0]
  const weeks = await api('/items/weeks', {
    'filter[plan_id][_eq]': p.id,
    sort: 'week_number',
    fields: 'week_number',
    limit: -1,
  })
  _planCache = { id: p.id, startDate: p.start_date, totalWeeks: weeks.length, planType: p.plan_type ?? 'open_double_mixte' }
  lsSet('momentum-plan-v2', _planCache)
  return _planCache
}

export async function getPlan() {
  const p = await loadPlan()
  return { plan: { startDate: p.startDate, totalWeeks: p.totalWeeks, planType: p.planType ?? 'open_double_mixte' } }
}

export async function getWeek(weekNumber) {
  if (_weekCache.has(weekNumber)) return _weekCache.get(weekNumber)

  const cached = lsGet(`momentum-week-${weekNumber}`)
  if (cached) { _weekCache.set(weekNumber, cached); return cached }

  const p = await loadPlan()
  const weeks = await api('/items/weeks', {
    'filter[plan_id][_eq]': p.id,
    'filter[week_number][_eq]': weekNumber,
    limit: 1,
  })
  if (!weeks.length) return null
  const week = weeks[0]

  const sessions = await api('/items/sessions', {
    'filter[week_id][_eq]': week.id,
    sort: 'sort_order,id',
    limit: -1,
  })
  const { startDate, endDate } = weekDates(p.startDate, weekNumber)

  const result = {
    id: week.id,
    weekNumber: week.week_number,
    phase: week.phase,
    theme: week.theme,
    isDeload: !!week.is_deload,
    weekNote: week.week_note,
    startDate,
    endDate,
    sessions: sortByDay(sessions.map(mapSession)),
  }
  _weekCache.set(weekNumber, result)
  lsSet(`momentum-week-${weekNumber}`, result)
  return result
}

function groupBy(arr, key) {
  const m = new Map()
  for (const item of arr) {
    const k = item[key]
    if (!m.has(k)) m.set(k, [])
    m.get(k).push(item)
  }
  return m
}

export async function prefetchAll() {
  const p = await loadPlan()

  // Déjà tout en mémoire → rien à faire
  if (_sessionCache.size > 50) return

  // ── 1. Structure semaines + sessions (2 requêtes) ────────────────────────
  const [weeks, sessions] = await Promise.all([
    api('/items/weeks', { 'filter[plan_id][_eq]': p.id, sort: 'week_number', limit: -1 }),
    api('/items/sessions', { limit: -1 }),
  ])

  // Remplir le cache des semaines
  for (const w of weeks) {
    if (_weekCache.has(w.week_number)) continue
    const ls = lsGet(`momentum-week-${w.week_number}`)
    if (ls) { _weekCache.set(w.week_number, ls); continue }
    const { startDate, endDate } = weekDates(p.startDate, w.week_number)
    const weekSessions = sessions.filter(s => String(s.week_id) === String(w.id))
    const result = {
      id: w.id, weekNumber: w.week_number, phase: w.phase, theme: w.theme,
      isDeload: !!w.is_deload, weekNote: w.week_note, startDate, endDate,
      sessions: sortByDay(weekSessions.map(mapSession)),
    }
    _weekCache.set(w.week_number, result)
    lsSet(`momentum-week-${w.week_number}`, result)
  }

  // Sessions déjà en localStorage → charger en mémoire et skipper l'API
  const missing = sessions.filter(s => {
    const key = String(s.id)
    if (_sessionCache.has(key)) return false
    const ls = lsGet(`momentum-session-${key}`)
    if (ls) { _sessionCache.set(key, ls); return false }
    return true
  })
  if (missing.length === 0) return

  // ── 2. Tous les blocs en parallèle (13 requêtes) ─────────────────────────
  const [
    sessionBlocks,
    blockCardio, blockIntervals,
    blockStrength, blockStrengthExercises,
    blockCircuit, blockCircuitStations,
    blockMiniRace, blockMiniRaceStations,
    blockStationActivation, blockStationActivationEntries,
    blockStationBlock, blockStationBlockEntries,
  ] = await Promise.all([
    api('/items/session_blocks', { limit: -1, sort: 'position' }),
    api('/items/block_cardio', { limit: -1 }),
    api('/items/block_intervals', { limit: -1 }),
    api('/items/block_strength', { limit: -1 }),
    api('/items/block_strength_exercises', { limit: -1, fields: '*,exercise_id.*', sort: 'position' }),
    api('/items/block_circuit', { limit: -1 }),
    api('/items/block_circuit_stations', { limit: -1, fields: '*,station_id.*', sort: 'position' }),
    api('/items/block_mini_race', { limit: -1 }),
    api('/items/block_mini_race_stations', { limit: -1, fields: '*,station_id.*', sort: 'position' }),
    api('/items/block_station_activation', { limit: -1 }),
    api('/items/block_station_activation_entries', { limit: -1, fields: '*,station_id.*', sort: 'position' }),
    api('/items/block_station_block', { limit: -1 }),
    api('/items/block_station_block_entries', { limit: -1, fields: '*,station_id.*', sort: 'position' }),
  ])

  // ── 3. Maps de lookup ────────────────────────────────────────────────────
  const maps = {
    cardio:            new Map(blockCardio.map(b => [b.id, b])),
    intervals:         new Map(blockIntervals.map(b => [b.id, b])),
    strength:          new Map(blockStrength.map(b => [b.id, b])),
    circuit:           new Map(blockCircuit.map(b => [b.id, b])),
    miniRace:          new Map(blockMiniRace.map(b => [b.id, b])),
    stationActivation: new Map(blockStationActivation.map(b => [b.id, b])),
    stationBlock:      new Map(blockStationBlock.map(b => [b.id, b])),
  }
  const entries = {
    strengthExercises:          groupBy(blockStrengthExercises, 'block_strength_id'),
    circuitStations:            groupBy(blockCircuitStations, 'block_circuit_id'),
    miniRaceStations:           groupBy(blockMiniRaceStations, 'block_mini_race_id'),
    stationActivationEntries:   groupBy(blockStationActivationEntries, 'block_station_activation_id'),
    stationBlockEntries:        groupBy(blockStationBlockEntries, 'block_station_block_id'),
  }
  const blocksBySession = groupBy(sessionBlocks, 'session_id')

  function resolveBlock({ block_type, block_id }) {
    switch (block_type) {
      case 'block_cardio': {
        const b = maps.cardio.get(block_id)
        return b ? cardioToDetail(b) : { type: 'text', label: '[bloc manquant]' }
      }
      case 'block_intervals': {
        const b = maps.intervals.get(block_id)
        if (!b) return { type: 'text', label: '[bloc manquant]' }
        return { type: 'intervals', sets: b.sets, setDistanceKm: b.distance_km, setDurationMin: b.duration_min, recoveryMin: b.recovery_min, paceZone: b.pace_zone, note: b.note }
      }
      case 'block_strength': {
        const b = maps.strength.get(block_id)
        if (!b) return { type: 'text', label: '[bloc manquant]' }
        return { type: 'strength', restSec: b.rest_sec, exercises: (entries.strengthExercises.get(block_id) || []).map(formatExercise) }
      }
      case 'block_circuit': {
        const b = maps.circuit.get(block_id)
        if (!b) return { type: 'text', label: '[bloc manquant]' }
        return { type: 'circuit', format: b.format, label: b.label, rounds: b.rounds, durationMin: b.duration_min, restBetweenMin: b.rest_between_min, stations: (entries.circuitStations.get(block_id) || []).map(formatStation) }
      }
      case 'block_mini_race': {
        const b = maps.miniRace.get(block_id)
        if (!b) return { type: 'text', label: '[bloc manquant]' }
        return { type: 'mini_race', rounds: b.rounds, runDistanceKm: b.run_distance_km, paceZone: b.pace_zone, restBetweenRoundsMin: b.rest_between_rounds_min, stations: (entries.miniRaceStations.get(block_id) || []).map(formatStation) }
      }
      case 'block_station_activation': {
        const b = maps.stationActivation.get(block_id)
        if (!b) return { type: 'text', label: '[bloc manquant]' }
        return { type: 'station_activation', rounds: b.rounds, note: b.note, stations: (entries.stationActivationEntries.get(block_id) || []).map(formatStation) }
      }
      case 'block_station_block': {
        const b = maps.stationBlock.get(block_id)
        if (!b) return { type: 'text', label: '[bloc manquant]' }
        return { type: 'station_block', brickFormat: b.brick_format, formatNote: b.format_note, stations: (entries.stationBlockEntries.get(block_id) || []).map(formatStation) }
      }
      default: return { type: 'text', label: `[bloc inconnu: ${block_type}]` }
    }
  }

  // ── 4. Remplir le cache des sessions ─────────────────────────────────────
  for (const s of sessions) {
    const key = String(s.id)
    if (_sessionCache.has(key)) continue
    const blocks = blocksBySession.get(s.id) || []
    const result = { ...mapSession(s), structuredDetails: blocks.map(resolveBlock) }
    _sessionCache.set(key, result)
    lsSet(`momentum-session-${key}`, result)
  }
}

// Compat — redirige vers prefetchAll
export const prefetchForWeek = () => prefetchAll()

// ── Session completions ──────────────────────────────────────────────────────

export async function fetchCompletedSessions(athleteProfileId) {
  return api('/items/session_completions', {
    'filter[athlete_profile_id][_eq]': athleteProfileId,
    'fields': 'session_id',
    'limit': -1,
  })
}

export async function completeSession(athleteProfileId, sessionId) {
  const authStore = useAuthStore()
  const res = await fetch(`${DIRECTUS_URL}/items/session_completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authStore.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      athlete_profile_id: athleteProfileId,
      session_id: sessionId,
    }),
  })
  if (res.status === 401) { authStore.logout(); throw new Error('Session expirée') }
  if (!res.ok) throw new Error('Impossible de valider la séance')
  return (await res.json()).data
}

export async function uncompleteSession(athleteProfileId, sessionId) {
  const rows = await api('/items/session_completions', {
    'filter[athlete_profile_id][_eq]': athleteProfileId,
    'filter[session_id][_eq]': sessionId,
    'fields': 'id',
    'limit': 1,
  })
  if (!rows.length) return
  const authStore = useAuthStore()
  const res = await fetch(`${DIRECTUS_URL}/items/session_completions/${rows[0].id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${authStore.token}` },
  })
  if (res.status === 401) { authStore.logout(); throw new Error('Session expirée') }
  if (!res.ok && res.status !== 204) throw new Error('Impossible de dévalider la séance')
}

export async function getSession(id) {
  const key = String(id)
  if (_sessionCache.has(key)) return _sessionCache.get(key)

  const cached = lsGet(`momentum-session-${key}`)
  if (cached) { _sessionCache.set(key, cached); return cached }

  const [session, blocks] = await Promise.all([
    api(`/items/sessions/${id}`),
    api('/items/session_blocks', {
      'filter[session_id][_eq]': id,
      sort: 'position',
      limit: -1,
    }),
  ])
  const structuredDetails = await Promise.all(blocks.map(fetchBlock))
  const result = { ...mapSession(session), structuredDetails }
  _sessionCache.set(key, result)
  lsSet(`momentum-session-${key}`, result)
  return result
}
