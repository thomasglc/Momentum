// Logique pure des séries réalisées (aucun import : testable avec node --test).
//
// Série   : { id, lineId, exerciseId, stationId, sessionId, setNumber, weightKg, reps, durationSec, distanceM, date }
//           une série de muscu, ou un tour sur une station (exerciseId ou stationId, jamais les deux)
// Ligne   : ligne prévue { id, exerciseId | stationId, sets, reps, durationSec, distanceM, weightKg, … }

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

/**
 * Ce qu'on compte sur une ligne : 'distance' si elle en prévoit une (portés, ergomètres),
 * sinon 'reps', sinon 'duration' (gainage).
 */
export function measureOf(line) {
  if (line.distanceM != null) return 'distance'
  return line.reps == null && line.durationSec != null ? 'duration' : 'reps'
}

/** Ligne mesurée en durée (gainage) plutôt qu'en reps */
export const isTimed = line => measureOf(line) === 'duration'

// Champ d'une série ou d'une ligne qui porte la mesure
const MAIN_FIELD = { reps: 'reps', duration: 'durationSec', distance: 'distanceM' }

/** Valeur mesurée d'une série ou d'une ligne : ses reps, ses secondes ou ses mètres */
export const mainOf = (item, measure) => item?.[MAIN_FIELD[measure]] ?? null

function amount({ reps, durationSec, distanceM }) {
  if (reps != null) return String(reps)
  if (distanceM != null) return `${distanceM} m`
  return durationSec != null ? `${durationSec} s` : ''
}

/** "60 kg × 8", "8 reps", "5 kg × 45 s", "45 s", "24 kg × 40 m" */
export function formatSet(set = {}) {
  const what = amount(set)
  if (!what) return ''
  if (set.weightKg) return `${formatNumber(set.weightKg)} kg × ${what}`
  return set.reps != null ? `${set.reps} reps` : what
}

/** Forme courte pour la colonne « Précédent » du tableau : "62,5 × 12", "8 reps", "5 × 45 s", "24 × 40 m" */
export function formatSetCompact(set = {}) {
  const what = amount(set)
  return set.weightKg && what ? `${formatNumber(set.weightKg)} × ${what}` : formatSet(set)
}

/** Objectif d'une ligne : "4 × 5", "3 × 45 s", "4 × 30 m", "4 × 5 · 60 kg" */
export function formatTarget(line) {
  const what = amount(line)
  if (!what) return ''
  const base = line.sets ? `${line.sets} × ${what}` : formatSet({ ...line, weightKg: null })
  return line.weightKg ? `${base} · ${formatNumber(line.weightKg)} kg` : base
}

/** Log Directus (set_logs) → série. Un tour de station porte line_key à la place de la ligne d'exercice. */
export function toSet(log) {
  return {
    id: log.id,
    lineId: log.block_strength_exercise_id ?? log.line_key ?? null,
    exerciseId: log.exercise_id ?? null,
    stationId: log.station_id ?? null,
    sessionId: log.session_id ?? null,
    setNumber: log.set_number,
    weightKg: log.weight_kg ?? null,
    reps: log.reps ?? null,
    durationSec: log.duration_sec ?? null,
    distanceM: log.distance_m ?? null,
    date: log.date_created ?? null,
  }
}

/**
 * Clé d'historique d'une série ou d'une ligne : l'exercice, ou la station (« s:6 »), dont le numéro
 * peut être celui d'un exercice. null si l'un et l'autre ont disparu du catalogue.
 */
export const refKeyOf = item => (item.stationId != null ? `s:${item.stationId}` : item.exerciseId ?? null)

/** Identité d'une série pour la boîte d'envoi : sa séance, sa ligne d'exercice, son numéro */
export const setKey = (sessionId, lineId, setNumber) => `${sessionId}:${lineId}:${setNumber}`

/** Clé d'une série ; null sans ligne ou sans séance (supprimées depuis) : elle ne se rapproche alors d'aucune autre */
export const keyOfSet = set =>
  (set.lineId == null || set.sessionId == null ? null : setKey(set.sessionId, set.lineId, set.setNumber))

/** Vrai si la série porte déjà les valeurs à enregistrer */
export const sameSetValues = (values, set) =>
  values.weightKg === set.weightKg && values.reps === set.reps && values.durationSec === set.durationSec
  && (values.distanceM ?? null) === (set.distanceM ?? null)

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

/**
 * Pour chaque exercice et chaque station, la dernière séance autre que la séance courante :
 * { [clé d'historique]: { date, sets } } (voir refKeyOf)
 */
export function previousByExercise(sets, currentSessionId) {
  const byRef = new Map()
  for (const s of sets) {
    const key = refKeyOf(s)
    if (key == null || s.sessionId === currentSessionId) continue
    if (!byRef.has(key)) byRef.set(key, [])
    byRef.get(key).push(s)
  }
  const out = {}
  for (const [key, list] of byRef) {
    const [latest] = groupHistory(list)
    out[key] = { date: latest.date, sets: latest.sets }
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
 * Valeur proposée pour ce que la ligne compte quand rien n'est tapé : filigrane du champ, valeur cochée telle quelle.
 * Muscu : la série précédente, sinon le prévu.
 * Station : le prévu fait foi, car la même station revient dans des circuits qui n'en demandent pas autant.
 * Le tour précédent n'est repris que s'il tient dans la fourchette prévue (line.plannedMax en est le haut).
 */
export function proposedMain(line, previous) {
  const measure = measureOf(line)
  const planned = mainOf(line, measure)
  const before = mainOf(previous, measure)
  if (line.kind !== 'station' || planned == null || before == null) return before ?? planned
  return before >= planned && before <= (line.plannedMax ?? planned) ? before : planned
}

/**
 * Valeurs à enregistrer quand on coche une série : la saisie, sinon la valeur proposée (proposedMain).
 * La charge, elle, reprend toujours la série précédente avant le prévu.
 * draft = { weight, value } (chaînes des champs ; value = reps, secondes ou mètres selon la ligne).
 * null si la mesure manque ou si une saisie est invalide.
 */
export function resolveSetValues(line, row, draft) {
  // NaN signale une saisie présente mais invalide : on ne la remplace pas en silence.
  const pick = (text, fallback) => (String(text ?? '').trim() === '' ? fallback ?? null : parseDecimal(text) ?? NaN)
  const field = MAIN_FIELD[measureOf(line)]
  const weightKg = pick(draft.weight, row.previous?.weightKg ?? line.weightKg)
  const main = pick(draft.value, proposedMain(line, row.previous))
  if (Number.isNaN(weightKg) || main == null || !Number.isInteger(main) || main <= 0) return null
  return { weightKg, reps: null, durationSec: null, distanceM: null, [field]: main }
}

// ── Saisie d'un exercice ─────────────────────────────────────────────────────
// Ce que l'athlète tape pendant un exercice : { own, carry }
//   own    { [numéro de série]: { weight, value } }  ce qu'il a tapé dans cette série-là
//   carry  { weight, value }                         sa dernière saisie, reportée sur les séries qu'il n'a pas touchées
// weight et value sont les textes des champs ; value = reps, secondes ou mètres selon la mesure de la ligne (measureOf).

export const emptyTyping = () => ({ own: {}, carry: {} })

/** Textes des deux champs pour une série enregistrée, selon ce que la ligne compte */
export const textsOf = (set, measure) => ({
  weight: formatNumber(set.weightKg),
  value: String(set[MAIN_FIELD[measure]] ?? ''),
})

/** L'athlète tape dans un champ (`field` : 'weight' ou 'value') : la valeur se reporte sur les autres séries à faire */
export function typeInto(typing, setNumber, field, text) {
  return {
    own: { ...typing.own, [setNumber]: { ...typing.own[setNumber], [field]: text } },
    carry: { ...typing.carry, [field]: text },
  }
}

/** Fige les deux champs d'une série : décochée, elle garde ses valeurs et ne suit plus les autres */
export function pinTexts(typing, setNumber, texts) {
  return { own: { ...typing.own, [setNumber]: { weight: texts.weight, value: texts.value } }, carry: typing.carry }
}

/**
 * Textes des champs d'une ligne du tableau : ce que l'athlète y a tapé, sinon la série cochée.
 * Une série à faire reprend sa dernière saisie dans l'exercice, sinon `latest`, la dernière série cochée
 * de l'exercice : la charge ne se retape pas. Une série cochée ne change jamais toute seule.
 */
export function draftOf(typing, row, measure, latest = null) {
  const own = typing.own[row.setNumber] ?? {}
  const logged = row.logged ? textsOf(row.logged, measure) : null
  const carried = latest ? textsOf(latest, measure) : {}
  const pick = field => own[field] ?? (logged ? logged[field] : typing.carry[field] ?? carried[field] ?? '')
  return { weight: pick('weight'), value: pick('value') }
}

/**
 * Bandeau d'envoi : rien à dire tant que les séries partent normalement.
 * waiting : séries qui attendent le réseau ; refused : entrées que le serveur a refusées ({ error }).
 * → { tone: 'waiting' | 'refused', text } ou null
 */
export function syncNotice(waiting, refused) {
  if (refused.length) {
    const many = refused.length > 1
    return { tone: 'refused', text: `${refused.length} ${many ? 'séries refusées' : 'série refusée'} par le serveur : ${refused[0].error}.` }
  }
  if (!waiting) return null
  return { tone: 'waiting', text: `${waiting} ${waiting > 1 ? 'séries gardées' : 'série gardée'} sur ton téléphone, en attente de réseau.` }
}

/** Résumé compact des séries d'un exercice : "62,5 kg × 5, 5, 5, 4", "10, 9 reps", "45, 40 s", "24 kg × 40, 40 m" */
export function summarizeSets(sets) {
  // Les séries consécutives de même charge sont regroupées
  const groups = []
  for (const s of [...sets].sort((a, b) => a.setNumber - b.setNumber)) {
    const weight = s.weightKg || null
    const last = groups.at(-1)
    if (last && last.weight === weight) last.sets.push(s)
    else groups.push({ weight, sets: [s] })
  }
  return groups.map(({ weight, sets: own }) => {
    const measure = own.every(s => s.reps == null && s.distanceM != null) ? 'distance' : own.every(isTimed) ? 'duration' : 'reps'
    const values = own.map(s => s[MAIN_FIELD[measure]] ?? '—').join(', ')
    const unit = measure === 'distance' ? ' m' : measure === 'duration' ? ' s' : weight ? '' : ' reps'
    return weight ? `${formatNumber(weight)} kg × ${values}${unit}` : `${values}${unit}`
  }).join(' · ')
}

/**
 * Tendance d'un exercice : meilleure valeur de ses dernières séances, de la plus ancienne à la plus récente.
 * history : séances issues de groupHistory (la plus récente d'abord).
 * → { unit: 'kg' | 'reps' | 'm' | 's', points: [{ key, value }] } : la charge quand il y en a une, sinon ce que la ligne compte
 */
export function historyTrend(history, limit = 8) {
  const all = history.flatMap(session => session.sets)
  const unit = all.some(s => s.weightKg > 0) || !all.length ? 'kg'
    : all.some(s => s.reps > 0) ? 'reps'
      : all.some(s => s.distanceM > 0) ? 'm' : 's'
  const field = { kg: 'weightKg', reps: 'reps', m: 'distanceM', s: 'durationSec' }[unit]
  const valueOf = s => s[field] ?? 0
  const points = history.slice(0, limit).reverse()
    .map(session => ({ key: session.key, value: Math.max(...session.sets.map(valueOf)) }))
  return { unit, points }
}
