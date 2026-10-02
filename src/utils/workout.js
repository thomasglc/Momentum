// Logique pure du chrono de séance, du chrono de repos et du récap (testable avec node --test).
import { formatSet } from './setLogs.js'

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

/** Lignes d'exercice des blocs de muscu d'une séance, dans l'ordre du programme */
export function strengthLinesOf(structuredDetails) {
  return (structuredDetails ?? []).flatMap(detail => (detail.type === 'strength' ? detail.rows ?? [] : []))
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
