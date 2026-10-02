import { useAuthStore } from '@/stores/auth'
import { planStartFor, weekDates } from '@/utils/planCalendar'
import { request } from './directus'
import { strengthDetail, stationsDetail } from './blockMappers'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24h
// v2 : les séances en cache portent les lignes d'exercice structurées et les images
const SESSION_LS_PREFIX = 'momentum-session-v2-'

// ── Cache mémoire (ultra-rapide, dure le temps de la session) ─────────────
let _planCache = null
let _structure = null // promesse partagée : semaines et séances du plan (voir loadStructure)
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

// Les séances en cache d'un ancien format ne sont plus jamais lues : on les retire une fois
try {
  Object.keys(localStorage)
    .filter(k => k.startsWith('momentum-session-') && !k.startsWith(SESSION_LS_PREFIX))
    .forEach(k => localStorage.removeItem(k))
} catch {}

// Lecture authentifiée. request() rafraîchit le jeton une fois avant de déconnecter.
function api(path, params = {}) {
  return request('GET', path, { params })
}

export function clearPlanCache() {
  _planCache = null
  _structure = null
  _weekCache.clear()
  _sessionCache.clear()
  // Purger les entrées localStorage du plan
  Object.keys(localStorage)
    .filter(k => k.startsWith('momentum-week-') || k.startsWith('momentum-session-') || k.startsWith('momentum-plan'))
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

// Dates d'une semaine pour cet athlète (aucune si le plan n'a pas de date de début)
const datesOf = (plan, weekNumber) =>
  (plan.startDate ? weekDates(plan.startDate, weekNumber) : { startDate: null, endDate: null })

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
      return { type: 'cooldown', durationMin: b.duration_min, paceZone: b.pace_zone ?? null, label: b.label }
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
      return strengthDetail(b, rows)
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
        ...stationsDetail(rows),
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
        ...stationsDetail(rows),
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
      return { type: 'station_activation', rounds: b.rounds, note: b.note, ...stationsDetail(rows) }
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
        ...stationsDetail(rows),
      }
    }

    default:
      return { type: 'text', label: `[bloc inconnu: ${block_type}]` }
  }
}

// Plan assigné à l'athlète connecté et date de sa course (athlete_profiles)
function currentAthlete() {
  const user = useAuthStore().user
  return { planId: user?.plan_id ?? null, raceDate: user?.race_date ?? null }
}

async function loadPlan() {
  const { planId: pid, raceDate } = currentAthlete()

  // Le cache mémoire n'est valable que pour le plan et la date de course de l'utilisateur
  if (_planCache && (!pid || _planCache.id === pid) && _planCache.raceDate === raceDate) return _planCache
  _planCache = null

  const cacheKey = `momentum-plan-v4-${pid ?? 'first'}-${raceDate ?? 'sans-date'}`
  const cached = lsGet(cacheKey)
  if (cached) { _planCache = cached; return _planCache }

  // fields=* : total_weeks et phase_names sont lus s'ils existent dans Directus, ignorés sinon
  const params = { limit: 1, fields: '*' }
  if (pid) params['filter[id][_eq]'] = pid
  const plans = await api('/items/plans', params)
  const p = plans[0]
  const weeks = await api('/items/weeks', {
    'filter[plan_id][_eq]': p.id,
    sort: 'week_number',
    fields: 'week_number,phase,theme,is_deload',
    limit: -1,
  })
  // Deux longueurs : celle du plan (calendrier) et la dernière semaine écrite (navigation)
  const lastWeek = weeks.reduce((max, w) => Math.max(max, w.week_number), 0)
  _planCache = {
    id: p.id,
    raceDate,
    // Calendrier propre à l'athlète quand le plan connaît sa longueur, sinon date commune du plan
    startDate: planStartFor({ raceDate, totalWeeks: p.total_weeks, planStartDate: p.start_date }),
    totalWeeks: p.total_weeks ?? lastWeek,
    lastWeek,
    planType: p.plan_type ?? 'open_double_mixte',
    phaseNames: p.phase_names ?? null,
    weeks,
  }
  lsSet(cacheKey, _planCache)
  return _planCache
}

export async function getPlan() {
  const p = await loadPlan()
  return {
    plan: {
      startDate: p.startDate,
      raceDate: p.raceDate,
      totalWeeks: p.totalWeeks,
      lastWeek: p.lastWeek,
      planType: p.planType ?? 'open_double_mixte',
      phaseNames: p.phaseNames,
    },
  }
}

// Semaine Directus et ses séances → semaine affichable
function toWeek(p, w, sessions) {
  return {
    id: w.id,
    weekNumber: w.week_number,
    phase: w.phase,
    theme: w.theme,
    isDeload: !!w.is_deload,
    weekNote: w.week_note,
    ...datesOf(p, w.week_number),
    sessions: sortByDay(sessions.map(mapSession)),
  }
}

// Semaine en cache (mémoire, puis navigateur). Ses dates sont recalculées à la lecture :
// elles dépendent de la date de course de l'athlète, qui peut changer sans que le cache expire.
function cachedWeek(p, weekNumber) {
  const wKey = `${p.id}-${weekNumber}`
  let week = _weekCache.get(wKey)
  if (!week) {
    week = lsGet(`momentum-week-${wKey}`)
    if (week) _weekCache.set(wKey, week)
  }
  return week ? { ...week, ...datesOf(p, weekNumber) } : null
}

function cacheWeek(p, week) {
  const wKey = `${p.id}-${week.weekNumber}`
  _weekCache.set(wKey, week)
  lsSet(`momentum-week-${wKey}`, week)
}

// Semaines et séances du plan en deux requêtes, partagées entre l'accueil et le préchargement
function loadStructure(p) {
  _structure ??= Promise.all([
    api('/items/weeks', { 'filter[plan_id][_eq]': p.id, sort: 'week_number', limit: -1 }),
    api('/items/sessions', { 'filter[week_id][plan_id][_eq]': p.id, sort: 'sort_order,id', limit: -1 }),
  ]).then(([weeks, sessions]) => {
    for (const w of weeks) {
      if (cachedWeek(p, w.week_number)) continue
      cacheWeek(p, toWeek(p, w, sessions.filter(s => String(s.week_id) === String(w.id))))
    }
    return { weeks, sessions }
  }).catch((error) => {
    _structure = null // un échec ne doit pas rester en mémoire : le prochain appel réessaie
    throw error
  })
  return _structure
}

export async function getWeek(weekNumber) {
  const p = await loadPlan()
  const cached = cachedWeek(p, weekNumber)
  if (cached) return cached

  const weeks = await api('/items/weeks', {
    'filter[plan_id][_eq]': p.id,
    'filter[week_number][_eq]': weekNumber,
    limit: 1,
  })
  if (!weeks.length) return null

  const sessions = await api('/items/sessions', {
    'filter[week_id][_eq]': weeks[0].id,
    sort: 'sort_order,id',
    limit: -1,
  })
  const result = toWeek(p, weeks[0], sessions)
  cacheWeek(p, result)
  return result
}

/** Toutes les semaines écrites du plan, avec leurs séances : depuis le cache, sinon en deux requêtes */
export async function getAllWeeks() {
  const p = await loadPlan()
  const numbers = p.weeks.map(w => w.week_number)
  let weeks = numbers.map(n => cachedWeek(p, n))
  if (weeks.some(week => !week)) {
    await loadStructure(p)
    weeks = numbers.map(n => cachedWeek(p, n))
  }
  return weeks.filter(Boolean)
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

  // ── 1. Structure semaines + sessions (2 requêtes, limitées au plan) ──────
  const { sessions } = await loadStructure(p)

  // Sessions déjà en localStorage → charger en mémoire et skipper l'API
  const missing = sessions.filter(s => {
    const key = String(s.id)
    if (_sessionCache.has(key)) return false
    const ls = lsGet(`${SESSION_LS_PREFIX}${key}`)
    if (ls) { _sessionCache.set(key, ls); return false }
    return true
  })
  if (missing.length === 0) return

  // ── 2. Blocs des séances à charger, et d'elles seules ────────────────────
  const sessionBlocks = await api('/items/session_blocks', {
    'filter[session_id][_in]': missing.map(s => s.id).join(','),
    limit: -1,
    sort: 'position',
  })
  const idsOf = type => [...new Set(sessionBlocks.filter(b => b.block_type === type).map(b => b.block_id))]
  const blocksOf = (type) => {
    const ids = idsOf(type)
    return ids.length ? api(`/items/${type}`, { 'filter[id][_in]': ids.join(','), limit: -1 }) : []
  }
  const childrenOf = (collection, type, expand) => {
    const ids = idsOf(type)
    return ids.length
      ? api(`/items/${collection}`, { [`filter[${type}_id][_in]`]: ids.join(','), limit: -1, fields: `*,${expand}.*`, sort: 'position' })
      : []
  }
  const [
    blockCardio, blockIntervals,
    blockStrength, blockStrengthExercises,
    blockCircuit, blockCircuitStations,
    blockMiniRace, blockMiniRaceStations,
    blockStationActivation, blockStationActivationEntries,
    blockStationBlock, blockStationBlockEntries,
  ] = await Promise.all([
    blocksOf('block_cardio'), blocksOf('block_intervals'),
    blocksOf('block_strength'), childrenOf('block_strength_exercises', 'block_strength', 'exercise_id'),
    blocksOf('block_circuit'), childrenOf('block_circuit_stations', 'block_circuit', 'station_id'),
    blocksOf('block_mini_race'), childrenOf('block_mini_race_stations', 'block_mini_race', 'station_id'),
    blocksOf('block_station_activation'), childrenOf('block_station_activation_entries', 'block_station_activation', 'station_id'),
    blocksOf('block_station_block'), childrenOf('block_station_block_entries', 'block_station_block', 'station_id'),
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
        return strengthDetail(b, entries.strengthExercises.get(block_id) || [])
      }
      case 'block_circuit': {
        const b = maps.circuit.get(block_id)
        if (!b) return { type: 'text', label: '[bloc manquant]' }
        return { type: 'circuit', format: b.format, label: b.label, rounds: b.rounds, durationMin: b.duration_min, restBetweenMin: b.rest_between_min, ...stationsDetail(entries.circuitStations.get(block_id) || []) }
      }
      case 'block_mini_race': {
        const b = maps.miniRace.get(block_id)
        if (!b) return { type: 'text', label: '[bloc manquant]' }
        return { type: 'mini_race', rounds: b.rounds, runDistanceKm: b.run_distance_km, paceZone: b.pace_zone, restBetweenRoundsMin: b.rest_between_rounds_min, ...stationsDetail(entries.miniRaceStations.get(block_id) || []) }
      }
      case 'block_station_activation': {
        const b = maps.stationActivation.get(block_id)
        if (!b) return { type: 'text', label: '[bloc manquant]' }
        return { type: 'station_activation', rounds: b.rounds, note: b.note, ...stationsDetail(entries.stationActivationEntries.get(block_id) || []) }
      }
      case 'block_station_block': {
        const b = maps.stationBlock.get(block_id)
        if (!b) return { type: 'text', label: '[bloc manquant]' }
        return { type: 'station_block', brickFormat: b.brick_format, formatNote: b.format_note, ...stationsDetail(entries.stationBlockEntries.get(block_id) || []) }
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
    lsSet(`${SESSION_LS_PREFIX}${key}`, result)
  }
}

// Compat — redirige vers prefetchAll
export const prefetchForWeek = () => prefetchAll()

// ── Session completions ──────────────────────────────────────────────────────

/**
 * Validations de l'athlète. `details` dit si Directus sait enregistrer la durée et la distance
 * (champs ajoutés par scripts/add-completion-details.cjs) : sans eux, on lit le strict nécessaire.
 */
export async function fetchCompletions(athleteProfileId) {
  const query = { 'filter[athlete_profile_id][_eq]': athleteProfileId, limit: -1 }
  try {
    const rows = await api('/items/session_completions', { ...query, fields: 'id,session_id,completed_at,duration_sec,distance_km' })
    return { rows, details: true }
  } catch (e) {
    // Directus refuse un champ qui n'existe pas : on s'en passe
    if (e.status !== 403 && e.status !== 400) throw e
    const rows = await api('/items/session_completions', { ...query, fields: 'id,session_id,completed_at' })
    return { rows, details: false }
  }
}

/** Valide une séance ; `details` ({ duration_sec }) part avec la validation quand Directus sait l'enregistrer */
export async function completeSession(athleteProfileId, sessionId, details = {}) {
  try {
    return await request('POST', '/items/session_completions', {
      body: { athlete_profile_id: athleteProfileId, session_id: sessionId, ...details },
    })
  } catch (e) {
    throw new Error(e.status === 401 ? 'Session expirée' : 'Impossible de valider la séance')
  }
}

/** Durée et distance notées après coup sur une validation */
export function updateCompletion(id, patch) {
  return request('PATCH', `/items/session_completions/${id}`, { body: patch })
}

export async function uncompleteSession(athleteProfileId, sessionId) {
  const rows = await api('/items/session_completions', {
    'filter[athlete_profile_id][_eq]': athleteProfileId,
    'filter[session_id][_eq]': sessionId,
    'fields': 'id',
    'limit': 1,
  })
  if (!rows.length) return
  try {
    await request('DELETE', `/items/session_completions/${rows[0].id}`)
  } catch (e) {
    throw new Error(e.status === 401 ? 'Session expirée' : 'Impossible de dévalider la séance')
  }
}

export async function getSession(id) {
  const key = String(id)
  if (_sessionCache.has(key)) return _sessionCache.get(key)

  const cached = lsGet(`${SESSION_LS_PREFIX}${key}`)
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
  lsSet(`${SESSION_LS_PREFIX}${key}`, result)
  return result
}
