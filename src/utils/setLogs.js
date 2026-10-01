// Logique pure des séries réalisées (aucun import : testable avec node --test).
//
// Série   : { id, lineId, exerciseId, sessionId, setNumber, weightKg, reps, durationSec, date }
// Ligne   : ligne d'exercice prévue { id, exerciseId, sets, reps, durationSec, weightKg, … }

const PLAIN_NUMBER = /^\d+(?:[.,]\d+)?$/

/** Nombre saisi au clavier, avec virgule ou point. null si vide ou invalide. */
export function parseDecimal(input) {
  if (typeof input === 'number') return Number.isFinite(input) && input >= 0 ? input : null
  const text = String(input ?? '').trim()
  if (!PLAIN_NUMBER.test(text)) return null
  return Number(text.replace(',', '.'))
}

export function formatNumber(n) {
  return n == null ? '' : String(n).replace('.', ',')
}

/** 150 → "2 min 30", 45 → "45 s" */
export function formatRest(sec) {
  if (!sec) return ''
  const min = Math.floor(sec / 60)
  const rest = sec % 60
  if (!min) return `${rest} s`
  return rest ? `${min} min ${String(rest).padStart(2, '0')}` : `${min} min`
}

/** Ligne mesurée en durée (gainage) plutôt qu'en reps */
export function isTimed(line) {
  return line.reps == null && line.durationSec != null
}

function amount(reps, durationSec) {
  if (reps != null) return String(reps)
  return durationSec != null ? `${durationSec} s` : ''
}

/** "60 kg × 8", "8 reps", "5 kg × 45 s", "45 s" */
export function formatSet({ weightKg, reps, durationSec } = {}) {
  const what = amount(reps, durationSec)
  if (!what) return ''
  if (weightKg) return `${formatNumber(weightKg)} kg × ${what}`
  return reps != null ? `${reps} reps` : what
}

/** Forme courte pour la colonne « Précédent » du tableau : "62,5 × 12", "8 reps", "5 × 45 s" */
export function formatSetCompact(set = {}) {
  const what = amount(set.reps, set.durationSec)
  return set.weightKg && what ? `${formatNumber(set.weightKg)} × ${what}` : formatSet(set)
}

/** Objectif d'une ligne : "4 × 5", "3 × 45 s", "4 × 5 · 60 kg" */
export function formatTarget({ sets, reps, durationSec, weightKg }) {
  const what = amount(reps, durationSec)
  if (!what) return ''
  const base = sets ? `${sets} × ${what}` : formatSet({ reps, durationSec })
  return weightKg ? `${base} · ${formatNumber(weightKg)} kg` : base
}

/** Log Directus (set_logs) → série */
export function toSet(log) {
  return {
    id: log.id,
    lineId: log.block_strength_exercise_id ?? null,
    exerciseId: log.exercise_id ?? null,
    sessionId: log.session_id ?? null,
    setNumber: log.set_number,
    weightKg: log.weight_kg ?? null,
    reps: log.reps ?? null,
    durationSec: log.duration_sec ?? null,
    date: log.date_created ?? null,
  }
}

// Les dates sont des chaînes ISO : l'ordre alphabétique est l'ordre chronologique.
const byDate = (a, b) => String(a ?? '').localeCompare(String(b ?? ''))

/**
 * Regroupe des séries par séance, la plus récente d'abord.
 * Une série dont la séance a été supprimée (sessionId null) est rattachée à son jour.
 */
export function groupHistory(sets) {
  const groups = new Map()
  for (const s of sets) {
    const key = s.sessionId != null ? `s${s.sessionId}` : `d${String(s.date ?? '').slice(0, 10)}`
    if (!groups.has(key)) groups.set(key, { key, date: s.date, sets: [] })
    const group = groups.get(key)
    group.sets.push(s)
    if (byDate(s.date, group.date) < 0) group.date = s.date
  }
  const list = [...groups.values()]
  for (const group of list) group.sets.sort((a, b) => a.setNumber - b.setNumber || byDate(a.date, b.date))
  return list.sort((a, b) => byDate(b.date, a.date))
}

/** Pour chaque exercice, la dernière séance autre que la séance courante : { [exerciseId]: { date, sets } } */
export function previousByExercise(sets, currentSessionId) {
  const byExercise = new Map()
  for (const s of sets) {
    if (s.exerciseId == null || s.sessionId === currentSessionId) continue
    if (!byExercise.has(s.exerciseId)) byExercise.set(s.exerciseId, [])
    byExercise.get(s.exerciseId).push(s)
  }
  const out = {}
  for (const [exerciseId, list] of byExercise) {
    const [latest] = groupHistory(list)
    out[exerciseId] = { date: latest.date, sets: latest.sets }
  }
  return out
}

/** Lignes du tableau de saisie : séries prévues, séries enregistrées au-delà, séries ajoutées à la main. */
export function buildSetRows(line, lineSets, previousSets, extraCount = 0) {
  const planned = line.sets ?? 0
  const maxLogged = lineSets.reduce((max, s) => Math.max(max, s.setNumber), 0)
  const count = Math.max(planned + extraCount, maxLogged, 1)
  return Array.from({ length: count }, (_, i) => {
    const setNumber = i + 1
    return {
      setNumber,
      logged: lineSets.find(s => s.setNumber === setNumber) ?? null,
      previous: previousSets?.find(s => s.setNumber === setNumber) ?? null,
      planned: setNumber <= planned,
    }
  })
}

/**
 * Valeurs à enregistrer quand on coche une série : la saisie, sinon la série précédente, sinon le prévu.
 * draft = { weight, value } (chaînes des champs ; value = reps ou secondes selon la ligne).
 * null si les reps (ou la durée) manquent ou si une saisie est invalide.
 */
export function resolveSetValues(line, row, draft) {
  // NaN signale une saisie présente mais invalide : on ne la remplace pas en silence.
  const pick = (text, fallback) => (String(text ?? '').trim() === '' ? fallback ?? null : parseDecimal(text) ?? NaN)
  const timed = isTimed(line)
  const weightKg = pick(draft.weight, row.previous?.weightKg ?? line.weightKg)
  const main = pick(draft.value, timed ? row.previous?.durationSec ?? line.durationSec : row.previous?.reps ?? line.reps)
  if (Number.isNaN(weightKg) || main == null || !Number.isInteger(main) || main <= 0) return null
  return timed
    ? { weightKg, reps: null, durationSec: main }
    : { weightKg, reps: main, durationSec: null }
}
