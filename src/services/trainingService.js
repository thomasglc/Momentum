import { useAuthStore } from '@/stores/auth'

const DIRECTUS_URL = 'http://localhost:8056'

let _planCache = null

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
    focus: s.focus,
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
      return { type: 'run', durationMin: b.duration_min }
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
  const plans = await api('/items/plans', { limit: 1, fields: 'id,start_date' })
  const p = plans[0]
  const weeks = await api('/items/weeks', {
    'filter[plan_id][_eq]': p.id,
    sort: 'week_number',
    fields: 'week_number',
    limit: -1,
  })
  _planCache = { id: p.id, startDate: p.start_date, totalWeeks: weeks.length }
  return _planCache
}

export async function getPlan() {
  const p = await loadPlan()
  return { plan: { startDate: p.startDate, totalWeeks: p.totalWeeks } }
}

export async function getWeek(weekNumber) {
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

  return {
    id: week.id,
    weekNumber: week.week_number,
    phase: week.phase,
    theme: week.theme,
    isDeload: !!week.is_deload,
    weekNote: week.week_note,
    startDate,
    endDate,
    sessions: sessions.map(mapSession),
  }
}

export async function getSession(id) {
  const [session, blocks] = await Promise.all([
    api(`/items/sessions/${id}`),
    api('/items/session_blocks', {
      'filter[session_id][_eq]': id,
      sort: 'position',
      limit: -1,
    }),
  ])
  const structuredDetails = await Promise.all(blocks.map(fetchBlock))
  return { ...mapSession(session), structuredDetails }
}
