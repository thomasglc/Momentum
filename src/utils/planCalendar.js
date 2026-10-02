// Calendrier d'un plan pour un athlète (logique pure, testable avec node --test).
// Les dates sont des chaînes 'YYYY-MM-DD'. Les calculs se font en UTC : ni fuseau ni heure d'été.

const DAY_MS = 86_400_000

const toMs = (iso) => {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}
const toIso = ms => new Date(ms).toISOString().slice(0, 10)
const daysBetween = (from, to) => Math.round((toMs(to) - toMs(from)) / DAY_MS)

/** Date du jour, vue de l'athlète (heure locale) */
export function todayIso(now = new Date()) {
  const pad = n => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function addDays(iso, n) {
  return toIso(toMs(iso) + n * DAY_MS)
}

export function mondayOf(iso) {
  const ms = toMs(iso)
  const sinceMonday = (new Date(ms).getUTCDay() + 6) % 7 // lundi = 0, dimanche = 6
  return toIso(ms - sinceMonday * DAY_MS)
}

/**
 * Lundi de la semaine 1 pour cet athlète : on remonte depuis la semaine de sa course.
 * Sans date de course ou sans longueur de plan, on retombe sur la date de début commune du plan.
 */
export function planStartFor({ raceDate, totalWeeks, planStartDate }) {
  if (raceDate && totalWeeks > 0) return addDays(mondayOf(raceDate), -(totalWeeks - 1) * 7)
  return planStartDate ? String(planStartDate).slice(0, 10) : null
}

/** Lundi et dimanche de la semaine n (1 = première semaine) */
export function weekDates(startDate, weekNumber) {
  const start = addDays(startDate, (weekNumber - 1) * 7)
  return { startDate: start, endDate: addDays(start, 6) }
}

/**
 * Où en est le plan à la date `today` : pas commencé, en cours ou terminé.
 * weekNumber reste dans les bornes du plan ; daysToRace devient négatif après la course.
 */
export function planStatus({ startDate, totalWeeks, raceDate }, today) {
  const sinceStart = daysBetween(startDate, today)
  const week = Math.floor(sinceStart / 7) + 1
  let status = 'running'
  if (sinceStart < 0) status = 'before'
  else if (week > totalWeeks) status = 'done'
  return {
    status,
    weekNumber: Math.max(1, Math.min(week, totalWeeks)),
    daysToStart: Math.max(0, -sinceStart),
    daysToRace: raceDate ? daysBetween(today, raceDate) : null,
  }
}

/**
 * Semaines Directus regroupées par phase, dans l'ordre, avec leurs dates pour cet athlète.
 * nameOf(id) donne le nom d'une phase.
 */
export function groupPhases(weeks, startDate, nameOf) {
  const byPhase = new Map()
  for (const week of [...weeks].sort((a, b) => a.week_number - b.week_number)) {
    const id = week.phase ?? 0
    if (!byPhase.has(id)) byPhase.set(id, [])
    byPhase.get(id).push({
      number: week.week_number,
      theme: week.theme ?? null,
      isDeload: !!week.is_deload,
      ...(startDate ? weekDates(startDate, week.week_number) : { startDate: null, endDate: null }),
    })
  }
  return [...byPhase.entries()]
    .sort(([a], [b]) => a - b)
    .map(([id, list]) => ({
      id,
      name: nameOf(id),
      firstWeek: list[0].number,
      lastWeek: list.at(-1).number,
      startDate: list[0].startDate,
      endDate: list.at(-1).endDate,
      weeks: list,
    }))
}
