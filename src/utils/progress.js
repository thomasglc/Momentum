// Règles de progression d'un athlète dans son plan (logique pure, testable avec node --test).
//
// Semaine : { weekNumber, phase, theme, isDeload, startDate, endDate, sessions: [{ id, day, optional, duration, … }] }
// isDone(id) dit si une séance est validée. today vaut 'YYYY-MM-DD', ou null quand le plan n'a pas de calendrier.
import { addDays } from './planCalendar.js'
import { setVolumeKg } from './workout.js'

export const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

const round1 = n => Math.round(n * 10) / 10
// Les dates sont des chaînes ISO : l'ordre alphabétique est l'ordre chronologique.
const byDate = (a, b) => String(a.date ?? '').localeCompare(String(b.date ?? ''))
const dayIndex = (day) => {
  const index = DAYS.indexOf(day)
  return index < 0 ? DAYS.length : index
}

/** Date d'une séance : lundi de sa semaine + son jour. null sans calendrier ou pour un jour inconnu. */
export function sessionDate(weekStart, day) {
  const index = DAYS.indexOf(day)
  return weekStart && index >= 0 ? addDays(weekStart, index) : null
}

/** Séances obligatoires validées d'une semaine. Les optionnelles ne comptent ni pour ni contre. */
export function weekCompletion(week, isDone) {
  const mandatory = (week?.sessions ?? []).filter(s => !s.optional)
  const done = mandatory.filter(s => isDone(s.id)).length
  return { done, total: mandatory.length, complete: mandatory.length > 0 && done === mandatory.length }
}

/**
 * Les sept jours d'une semaine, du lundi au dimanche.
 * state : 'done' (séances obligatoires du jour validées), 'todo', 'late' (jour passé, non validé),
 * 'rest' (aucune séance), 'bonus' (seulement des séances optionnelles, non validées).
 */
export function weekDays(week, isDone, today) {
  return DAYS.map((day, index) => {
    const sessions = (week?.sessions ?? []).filter(s => s.day === day)
    const mandatory = sessions.filter(s => !s.optional)
    const date = week?.startDate ? addDays(week.startDate, index) : null
    let state
    if (!sessions.length) state = 'rest'
    else if (!mandatory.length) state = sessions.some(s => isDone(s.id)) ? 'done' : 'bonus'
    else if (mandatory.every(s => isDone(s.id))) state = 'done'
    else state = date && today && date < today ? 'late' : 'todo'
    return { day, letter: day[0], date, isToday: date != null && date === today, state, sessions }
  })
}

/**
 * Séance à mettre en avant : celle du jour ; sinon une séance obligatoire de la semaine dont le jour
 * est passé ; sinon une optionnelle du jour ; sinon la prochaine séance obligatoire.
 * → { kind: 'today' | 'late' | 'next', session, week, date }, ou null s'il ne reste rien à proposer.
 */
export function focusSession(weeks, isDone, today) {
  const open = [...weeks]
    .sort((a, b) => a.weekNumber - b.weekNumber)
    .flatMap(week => [...week.sessions]
      .sort((a, b) => dayIndex(a.day) - dayIndex(b.day))
      .map(session => ({ session, week, date: sessionDate(week.startDate, session.day) })))
    .filter(entry => !isDone(entry.session.id))
  const mandatory = open.filter(entry => !entry.session.optional)
  const pick = (kind, entry) => (entry ? { kind, ...entry } : null)

  // Sans calendrier, pas de jour courant : on suit l'ordre du plan
  if (!today) return pick('next', mandatory[0])

  const todays = open.filter(entry => entry.date === today)
  const inCurrentWeek = entry => entry.week.startDate <= today && today <= entry.week.endDate
  const late = mandatory.filter(entry => entry.date && entry.date < today && inCurrentWeek(entry)).sort(byDate)
  const upcoming = mandatory.filter(entry => entry.date && entry.date > today).sort(byDate)

  return pick('today', todays.find(entry => !entry.session.optional))
    ?? pick('late', late[0])
    ?? pick('today', todays[0])
    ?? pick('next', upcoming[0])
}

/**
 * Nombre de semaines complètes d'affilée en remontant depuis la semaine `upTo`.
 * La semaine `inProgress` compte si elle est complète et ne casse pas la série si elle ne l'est pas encore.
 */
export function completeWeekStreak(weeks, isDone, { upTo, inProgress = null }) {
  let streak = 0
  const past = weeks.filter(w => w.weekNumber <= upTo).sort((a, b) => b.weekNumber - a.weekNumber)
  for (const week of past) {
    const { total, complete } = weekCompletion(week, isDone)
    if (total === 0) continue // rien d'obligatoire cette semaine-là : elle ne compte ni ne casse
    if (complete) streak++
    else if (week.weekNumber !== inProgress) break
  }
  return streak
}

// Temps et distance d'une séance validée : la durée réelle quand elle est notée, la durée prévue sinon
function effortOf(session, detail) {
  return {
    minutes: detail?.durationSec != null ? detail.durationSec / 60 : session.duration || 0,
    km: detail?.distanceKm ?? 0,
  }
}

/**
 * Totaux depuis le début du plan. Une séance obligatoire est échue quand son jour est passé,
 * ou dès qu'elle est validée ; l'assiduité est la part des échues qui sont validées.
 * detailOf(id) donne la validation d'une séance ({ durationSec, distanceKm }) quand elle porte des détails.
 */
export function planTotals(weeks, isDone, today, detailOf = () => null) {
  let sessionsDone = 0
  let due = 0
  let dueDone = 0
  let minutes = 0
  let km = 0
  for (const week of weeks) {
    for (const session of week.sessions) {
      const done = isDone(session.id)
      if (done) {
        const effort = effortOf(session, detailOf(session.id))
        sessionsDone++
        minutes += effort.minutes
        km += effort.km
      }
      if (session.optional) continue
      const date = sessionDate(week.startDate, session.day)
      if (done || (today && date && date < today)) due++
      if (done) dueDone++
    }
  }
  return {
    sessionsDone,
    due,
    dueDone,
    adherence: today && due ? Math.round((dueDone / due) * 100) : null,
    minutes: Math.round(minutes),
    km: round1(km),
  }
}

/**
 * Bilan d'une semaine : séances, temps, distance, tonnage, et charges qui montent
 * par rapport à la séance précédente de chaque exercice.
 * → { weekNumber, done, total, complete, sessionsDone, minutes, km, volumeKg, gains: [{ exerciseId, name, unit, from, to }] }
 */
export function weekSummary(week, isDone, detailOf, sets) {
  const ids = new Set(week.sessions.map(s => s.id))
  let sessionsDone = 0
  let minutes = 0
  let km = 0
  for (const session of week.sessions) {
    if (!isDone(session.id)) continue
    const effort = effortOf(session, detailOf(session.id))
    sessionsDone++
    minutes += effort.minutes
    km += effort.km
  }

  const gains = []
  for (const exercise of exerciseSessions(sets)) {
    const inWeek = exercise.sessions.filter(s => ids.has(s.sessionId))
    if (!inWeek.length) continue
    const before = exercise.sessions.filter(s => !ids.has(s.sessionId) && byDate(s, inWeek[0]) < 0)
    if (!before.length) continue
    const from = before.at(-1).value
    const to = Math.max(...inWeek.map(s => s.value))
    if (to > from) gains.push({ exerciseId: exercise.exerciseId, name: exercise.name, unit: exercise.unit, from, to })
  }

  return {
    weekNumber: week.weekNumber,
    ...weekCompletion(week, isDone),
    sessionsDone,
    minutes: Math.round(minutes),
    km: round1(km),
    volumeKg: totalVolumeKg(sets.filter(set => ids.has(set.sessionId))),
    gains: gains.sort((a, b) => a.name.localeCompare(b.name)),
  }
}

/** Ce qui suit la semaine n : la semaine suivante si elle est écrite, un changement de phase, la fin du plan */
export function weekOutlook(weeks, weekNumber, totalWeeks) {
  const current = weeks.find(w => w.weekNumber === weekNumber) ?? null
  const next = weeks.find(w => w.weekNumber === weekNumber + 1) ?? null
  return {
    next,
    phaseChange: next?.phase != null && current?.phase != null && next.phase !== current.phase,
    last: !next && weekNumber >= totalWeeks,
  }
}

/**
 * Frise du plan : une case par semaine, écrite dans Directus ou non.
 * state : 'done', 'partial', 'missed' (semaines passées), 'current', 'upcoming', 'none' (passée, sans séance).
 * `status` et `weekNumber` viennent de planStatus ; status vaut null quand le plan n'a pas de calendrier.
 */
export function planTimeline(weeks, totalWeeks, isDone, { status, weekNumber }) {
  const byNumber = new Map(weeks.map(w => [w.weekNumber, w]))
  const count = Math.max(totalWeeks || 0, 0, ...byNumber.keys())
  return Array.from({ length: count }, (_, index) => {
    const number = index + 1
    const week = byNumber.get(number) ?? null
    const { done, total, complete } = weekCompletion(week, isDone)
    const past = status === 'done' || (status === 'running' && number < weekNumber)
    let state = 'upcoming'
    if (status === 'running' && number === weekNumber) state = 'current'
    else if (past || status == null) {
      if (complete) state = 'done'
      else if (done > 0) state = 'partial'
      else if (past) state = total > 0 ? 'missed' : 'none'
    }
    return {
      number,
      written: week != null,
      phase: week?.phase ?? null,
      theme: week?.theme ?? null,
      isDeload: !!week?.isDeload,
      startDate: week?.startDate ?? null,
      endDate: week?.endDate ?? null,
      done,
      total,
      state,
    }
  })
}

/** Cases consécutives d'une même phase → [{ phase, entries }] */
export function groupByPhase(entries) {
  const groups = []
  for (const entry of entries) {
    const last = groups.at(-1)
    if (last && last.phase === entry.phase) last.entries.push(entry)
    else groups.push({ phase: entry.phase, entries: [entry] })
  }
  return groups
}

/** Ligne Directus set_logs (exercice déplié ou non) → série pour les calculs de progression */
export function toProgressSet(log) {
  const exercise = log.exercise_id
  const expanded = exercise !== null && typeof exercise === 'object'
  return {
    exerciseId: (expanded ? exercise.id : exercise) ?? null,
    name: (expanded ? exercise.name : null) ?? null,
    sessionId: log.session_id ?? null,
    weightKg: log.weight_kg ?? null,
    reps: log.reps ?? null,
    durationSec: log.duration_sec ?? null,
    date: log.date_created ?? null,
  }
}

/**
 * Séries regroupées par exercice, puis par séance, de la plus ancienne à la plus récente.
 * La valeur d'une séance est sa plus lourde série ; sans charge, le plus de reps ; en gainage, la plus longue tenue.
 * → [{ exerciseId, name, unit: 'kg' | 'reps' | 's', sessions: [{ sessionId, date, value }] }]
 */
function exerciseSessions(sets) {
  const byExercise = new Map()
  for (const set of sets) {
    if (set.exerciseId == null) continue
    if (!byExercise.has(set.exerciseId)) byExercise.set(set.exerciseId, [])
    byExercise.get(set.exerciseId).push(set)
  }

  return [...byExercise].map(([exerciseId, own]) => {
    const unit = own.some(s => s.weightKg > 0) ? 'kg' : own.some(s => s.reps > 0) ? 'reps' : 's'
    const valueOf = s => (unit === 'kg' ? s.weightKg : unit === 'reps' ? s.reps : s.durationSec) ?? 0

    // Une série dont la séance a été supprimée (sessionId null) est rattachée à son jour
    const bySession = new Map()
    for (const s of own) {
      const key = s.sessionId != null ? `s${s.sessionId}` : `d${String(s.date ?? '').slice(0, 10)}`
      const entry = bySession.get(key) ?? { sessionId: s.sessionId ?? null, date: s.date, value: 0 }
      entry.value = Math.max(entry.value, valueOf(s))
      if (byDate(s, entry) < 0) entry.date = s.date
      bySession.set(key, entry)
    }
    return {
      exerciseId,
      name: own.find(s => s.name)?.name ?? 'Exercice',
      unit,
      sessions: [...bySession.values()].sort(byDate),
    }
  })
}

/**
 * Progression par exercice, le plus récemment travaillé d'abord.
 * → [{ exerciseId, name, unit: 'kg' | 'reps' | 's', first, last, best, sessions, lastDate }]
 */
export function exerciseProgress(sets) {
  return exerciseSessions(sets)
    .map(({ exerciseId, name, unit, sessions }) => ({
      exerciseId,
      name,
      unit,
      first: sessions[0].value,
      last: sessions.at(-1).value,
      best: Math.max(...sessions.map(s => s.value)),
      sessions: sessions.length,
      lastDate: sessions.at(-1).date ?? null,
    }))
    .sort((a, b) => byDate({ date: b.lastDate }, { date: a.lastDate }) || a.name.localeCompare(b.name))
}

/** Ligne Directus session_completions → validation, avec la durée et la distance quand elles sont notées */
export function toCompletion(row) {
  return {
    id: row.id,
    sessionId: row.session_id,
    completedAt: row.completed_at ?? null,
    durationSec: row.duration_sec ?? null,
    distanceKm: row.distance_km == null ? null : Number(row.distance_km),
  }
}

const DETAIL_LIMITS = { minutes: [1, 600], km: [0.1, 200] }

/**
 * Saisie du récap → { ok: true, durationSec, distanceKm } ; un champ vide vaut null.
 * Saisie invalide → { ok: false, field: 'minutes' | 'km', error }.
 */
export function parseCompletionDetails({ minutes, km }) {
  const read = (input, [min, max]) => {
    const text = String(input ?? '').trim().replace(',', '.')
    if (text === '') return null
    const value = /^\d+(\.\d+)?$/.test(text) ? Number(text) : NaN
    return value >= min && value <= max ? value : NaN
  }
  const duration = read(minutes, DETAIL_LIMITS.minutes)
  if (Number.isNaN(duration) || (duration != null && !Number.isInteger(duration))) {
    return { ok: false, field: 'minutes', error: 'Durée en minutes entières, par exemple 50' }
  }
  const distance = read(km, DETAIL_LIMITS.km)
  if (Number.isNaN(distance)) return { ok: false, field: 'km', error: 'Distance en km, par exemple 8,5' }
  return { ok: true, durationSec: duration == null ? null : duration * 60, distanceKm: distance }
}

/** Volume levé : somme de charge × reps des séries */
export function totalVolumeKg(sets) {
  return round1(sets.reduce((sum, set) => sum + setVolumeKg(set), 0))
}

/** 580 → "9 h 40", 45 → "45 min", 60 → "1 h" */
export function formatHours(minutes) {
  const total = Math.round(minutes || 0)
  const hours = Math.floor(total / 60)
  const rest = total % 60
  if (!hours) return `${rest} min`
  return rest ? `${hours} h ${String(rest).padStart(2, '0')}` : `${hours} h`
}

/** 850 → "850 kg", 14200 → "14,2 t" */
export function formatTonnage(kg) {
  const rounded = Math.round(kg || 0)
  if (rounded < 1000) return `${rounded} kg`
  return `${String(Math.round(rounded / 100) / 10).replace('.', ',')} t`
}
