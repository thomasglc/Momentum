// Logique pure du chrono de séance, du chrono de repos et du récap (testable avec node --test).
import { formatNumber, formatSet, formatTarget, measureOf } from './setLogs.js'
import { noteChips } from './text.js'

const STALE_AFTER_MS = 6 * 60 * 60 * 1000
const round1 = n => Math.round(n * 10) / 10

/** 65 → "1:05", 3725 → "1:02:05" */
export function formatClock(totalSec) {
  const s = Math.max(0, Math.floor(totalSec || 0))
  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  const seconds = String(s % 60).padStart(2, '0')
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`
}

/** Secondes entières écoulées depuis startedAt (dates en millisecondes) */
export function elapsedSeconds(startedAt, now) {
  return Math.max(0, Math.floor((now - startedAt) / 1000))
}

/** Secondes restantes avant endsAt, arrondies vers le haut pour ne pas afficher 0 trop tôt */
export function remainingSeconds(endsAt, now) {
  return Math.max(0, Math.ceil((endsAt - now) / 1000))
}

/** Une séance démarrée il y a plus de six heures est considérée abandonnée */
export function isStale(startedAt, now) {
  return now - startedAt > STALE_AFTER_MS
}

/** Part du repos écoulée, entre 0 et 1 */
export function restProgress(totalSec, remainingSec) {
  if (!(totalSec > 0)) return 1
  return Math.min(1, Math.max(0, (totalSec - remainingSec) / totalSec))
}

/** Circuit qui se saisit tour par tour : format « tours », au moins un tour et une station structurée */
export const isLoggableCircuit = detail =>
  detail.type === 'circuit' && (detail.format ?? 'rounds') === 'rounds' && detail.rounds > 0 && (detail.rows?.length ?? 0) > 0

/**
 * Lignes à saisir d'un circuit à tours : chaque station compte autant de séries que le circuit a de tours.
 * Avec plusieurs stations, elles portent le même `group` : on les enchaîne, le repos vient après le tour.
 * female : charge prévue pour une athlète, sinon celle des hommes.
 * plannedMax : haut de la fourchette prévue (« 30-40 m » → 40), pour savoir si le tour précédent se propose encore.
 */
export function circuitLines(detail, { female = false } = {}) {
  const restSec = Math.round((detail.restBetweenMin ?? 0) * 60) || null
  const group = detail.rows.length > 1 ? detail.rows[0].id : null
  return detail.rows.map(row => ({
    ...row,
    sets: detail.rounds,
    weightKg: (female ? row.weightKgFemale : row.weightKgMale) ?? null,
    plannedMax: plannedRange(row, noteChips(row.note))?.high ?? null,
    restSec,
    group,
  }))
}

/**
 * Lignes à saisir d'une séance, dans l'ordre du programme : exercices de muscu, et stations des circuits
 * à tours quand Directus sait les enregistrer (`stations`). Chaque ligne porte le repos de son bloc.
 */
export function loggableLinesOf(structuredDetails, { stations = false, female = false } = {}) {
  return (structuredDetails ?? []).flatMap((detail) => {
    if (detail.type === 'strength') return (detail.rows ?? []).map(row => ({ ...row, restSec: detail.restSec ?? null }))
    return stations && isLoggableCircuit(detail) ? circuitLines(detail, { female }) : []
  })
}

/** Charge × reps telles que saisies. Sans charge ou en durée, la série ne pèse rien. */
export const setVolumeKg = set => (set.weightKg && set.reps ? set.weightKg * set.reps : 0)

/** Récap d'une séance : lignes prévues (dans l'ordre) et séries enregistrées */
export function summarizeWorkout(lines, sets) {
  const exercises = []
  let setsDone = 0
  let totalReps = 0
  for (const line of lines) {
    const lineSets = sets.filter(s => s.lineId === line.id).sort((a, b) => a.setNumber - b.setNumber)
    if (!lineSets.length) continue
    setsDone += lineSets.length
    totalReps += lineSets.reduce((sum, s) => sum + (s.reps ?? 0), 0)
    exercises.push({
      lineId: line.id,
      name: line.name,
      summary: lineSets.map(formatSet).join(' · '),
      volumeKg: round1(lineSets.reduce((sum, s) => sum + setVolumeKg(s), 0)),
    })
  }
  return {
    setsDone,
    setsPlanned: lines.reduce((sum, line) => sum + (line.sets ?? 0), 0),
    totalReps,
    volumeKg: round1(exercises.reduce((sum, e) => sum + e.volumeKg, 0)),
    exercises,
  }
}

/** 1250 → "1 250 kg" */
export function formatKg(n) {
  return `${Math.round(n).toLocaleString('fr-FR')} kg`
}

/** "48:30" → 2910 secondes ; null si la saisie n'est pas un temps en minutes:secondes */
export function parseClock(input) {
  const match = String(input ?? '').trim().match(/^(\d{1,3}):([0-5]\d)$/)
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

// ── Déroulé d'une séance de muscu ────────────────────────────────────────────
const loggedCount = (sets, lineId) => sets.filter(s => s.lineId === lineId).length
const isComplete = (line, sets) => loggedCount(sets, line.id) >= (line.sets ?? 1)

/** Avancement de la séance : séries faites sur ses lignes, séries prévues */
export function sessionProgress(lines, sets) {
  const ids = new Set(lines.map(line => line.id))
  return {
    done: sets.filter(s => ids.has(s.lineId)).length,
    planned: lines.reduce((sum, line) => sum + (line.sets ?? 0), 0),
  }
}

// Stations d'un même circuit (voir circuitLines) : la moins avancée, la première en cas d'égalité ; null s'il est fini
function laggard(lines, group, sets) {
  let last = null
  for (const line of lines) {
    if (line.group !== group || isComplete(line, sets)) continue
    if (!last || loggedCount(sets, line.id) < loggedCount(sets, last.id)) last = line
  }
  return last
}

/**
 * Ligne à ouvrir : la première à faire après `afterId`, sinon la première laissée de côté ; null si tout est fait.
 * Dans un circuit à plusieurs stations, on finit le tour avant de passer à autre chose.
 */
export function nextOpenLine(lines, sets, afterId = null) {
  const start = lines.findIndex(line => line.id === afterId) + 1 // 0 quand afterId est absent
  const after = lines[start - 1]
  const inCircuit = after?.group ? laggard(lines, after.group, sets) : null
  if (inCircuit) return inCircuit.id
  const order = [...lines.slice(start), ...lines.slice(0, start)]
  const next = order.find(line => !isComplete(line, sets))
  if (!next) return null
  return next.group ? laggard(lines, next.group, sets).id : next.id
}

/** Libellé du repos qui suit une série : la série ou le tour suivant, l'exercice suivant, ou la fin de la séance */
export function restLabelAfter(lines, sets, lineId) {
  const line = lines.find(l => l.id === lineId)
  // La suite est dans le même exercice, ou dans le même circuit
  const same = line?.group ? laggard(lines, line.group, sets) : line && !isComplete(line, sets) ? line : null
  if (same) return `${same.name} · ${same.kind === 'station' ? 'tour' : 'série'} ${loggedCount(sets, same.id) + 1} sur ${same.sets}`
  const next = lines.find(l => l.id === nextOpenLine(lines, sets, lineId))
  return next ? `Ensuite : ${next.name}` : 'Dernière série faite'
}

/**
 * Repos à lancer après une série ou un tour : { sec, label }. sec vaut 0 quand il n'y en a pas :
 * dans un circuit à plusieurs stations, le repos attend que le tour soit bouclé.
 */
export function restAfter(lines, sets, lineId) {
  const line = lines.find(l => l.id === lineId)
  if (!line) return { sec: 0, label: '' }
  if (line.group) {
    const round = loggedCount(sets, lineId)
    const roundDone = lines.every(l => l.group !== line.group || loggedCount(sets, l.id) >= round)
    if (!roundDone) return { sec: 0, label: '' }
  }
  return { sec: line.restSec ?? 0, label: restLabelAfter(lines, sets, lineId) }
}

const RANGE_CHIP = /^(\d+)\s*-\s*(\d+)\s*(reps|s|m)(?:\s+(.+))?$/i
// Unité d'une fourchette selon ce que la ligne compte, et champ qui porte la valeur prévue
const RANGE_UNIT = { reps: 'reps', duration: 's', distance: 'm' }
const PLANNED_FIELD = { reps: 'reps', duration: 'durationSec', distance: 'distanceM' }

// Fourchette écrite dans la note et qui part de la valeur prévue (« 30-40 m » pour 30 m prévus), parmi les repères `chips` :
// { index, low, high, unit, rest } (rest : ce qui suit la fourchette dans le même repère), ou null
function plannedRange(line, chips) {
  const measure = measureOf(line)
  const planned = line[PLANNED_FIELD[measure]]
  for (const [index, chip] of chips.entries()) {
    const range = RANGE_CHIP.exec(chip)
    if (range && Number(range[1]) === planned && range[3].toLowerCase() === RANGE_UNIT[measure]) {
      return { index, low: Number(range[1]), high: Number(range[2]), unit: range[3].toLowerCase(), rest: range[4] ?? null }
    }
  }
  return null
}

/**
 * Objectif d'une ligne et ses repères. Une fourchette de la note (« 6-8 reps », « 45-60 s », « 30-40 m »)
 * qui part de la valeur prévue rejoint l'objectif (« 3 × 6-8 reps ») ; le reste devient des pastilles.
 * → { target, chips }
 */
export function describeLine(line) {
  const chips = noteChips(line.note)
  const range = line.sets ? plannedRange(line, chips) : null
  if (!range) return { target: formatTarget(line), chips }

  const weight = line.weightKg ? ` · ${formatNumber(line.weightKg)} kg` : ''
  chips.splice(range.index, 1, ...(range.rest ? [range.rest] : []))
  return { target: `${line.sets} × ${range.low}-${range.high} ${range.unit}${weight}`, chips }
}
