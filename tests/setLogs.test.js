import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseDecimal, formatNumber, formatRest, formatSet, formatTarget, isTimed,
  toSet, groupHistory, previousByExercise, buildSetRows, resolveSetValues,
} from '../src/utils/setLogs.js'

const set = (over) => ({
  id: 1, lineId: 100, exerciseId: 18, sessionId: 10, setNumber: 1,
  weightKg: 60, reps: 5, durationSec: null, distanceM: null, stationId: null, date: '2026-10-05T17:00:00.000Z', ...over,
})

// ── parseDecimal ─────────────────────────────────────────────────────────────
test('parseDecimal lit une virgule ou un point décimal', () => {
  assert.equal(parseDecimal('62,5'), 62.5)
  assert.equal(parseDecimal('62.5'), 62.5)
})
test('parseDecimal ignore les espaces autour', () => {
  assert.equal(parseDecimal(' 60 '), 60)
})
test('parseDecimal accepte zéro et les nombres déjà numériques', () => {
  assert.equal(parseDecimal('0'), 0)
  assert.equal(parseDecimal(12), 12)
})
test('parseDecimal renvoie null pour une saisie vide ou absente', () => {
  assert.equal(parseDecimal(''), null)
  assert.equal(parseDecimal('   '), null)
  assert.equal(parseDecimal(null), null)
  assert.equal(parseDecimal(undefined), null)
})
test('parseDecimal renvoie null pour ce qui n\'est pas un nombre positif simple', () => {
  assert.equal(parseDecimal('abc'), null)
  assert.equal(parseDecimal('-5'), null)
  assert.equal(parseDecimal('12kg'), null)
  assert.equal(parseDecimal('1e3'), null)
})

// ── mise en forme ────────────────────────────────────────────────────────────
test('formatNumber écrit les décimales à la française', () => {
  assert.equal(formatNumber(62.5), '62,5')
  assert.equal(formatNumber(60), '60')
  assert.equal(formatNumber(0), '0')
  assert.equal(formatNumber(null), '')
})
test('formatRest exprime le repos en minutes et secondes', () => {
  assert.equal(formatRest(150), '2 min 30')
  assert.equal(formatRest(120), '2 min')
  assert.equal(formatRest(90), '1 min 30')
  assert.equal(formatRest(45), '45 s')
})
test('formatRest renvoie une chaîne vide sans repos', () => {
  assert.equal(formatRest(0), '')
  assert.equal(formatRest(null), '')
})
test('isTimed reconnaît une ligne en durée', () => {
  assert.equal(isTimed({ reps: null, durationSec: 45 }), true)
  assert.equal(isTimed({ reps: 5, durationSec: null }), false)
  assert.equal(isTimed({ reps: null, durationSec: null }), false)
})
test('formatSet affiche charge et reps', () => {
  assert.equal(formatSet({ weightKg: 60, reps: 8 }), '60 kg × 8')
  assert.equal(formatSet({ weightKg: 62.5, reps: 5 }), '62,5 kg × 5')
})
test('formatSet affiche les reps seules au poids de corps', () => {
  assert.equal(formatSet({ weightKg: null, reps: 8 }), '8 reps')
  assert.equal(formatSet({ weightKg: 0, reps: 8 }), '8 reps')
})
test('formatSet affiche une durée, lestée ou non', () => {
  assert.equal(formatSet({ weightKg: null, reps: null, durationSec: 45 }), '45 s')
  assert.equal(formatSet({ weightKg: 5, reps: null, durationSec: 45 }), '5 kg × 45 s')
})
test('formatSet renvoie une chaîne vide pour une série sans valeur', () => {
  assert.equal(formatSet({}), '')
})
test('formatTarget décrit l\'objectif d\'une ligne', () => {
  assert.equal(formatTarget({ sets: 4, reps: 5, durationSec: null, weightKg: null }), '4 × 5')
  assert.equal(formatTarget({ sets: 3, reps: null, durationSec: 45, weightKg: null }), '3 × 45 s')
  assert.equal(formatTarget({ sets: 4, reps: 5, durationSec: null, weightKg: 60 }), '4 × 5 · 60 kg')
})
test('formatTarget s\'adapte quand le nombre de séries manque', () => {
  assert.equal(formatTarget({ sets: null, reps: 8, durationSec: null, weightKg: null }), '8 reps')
  assert.equal(formatTarget({ sets: null, reps: null, durationSec: null, weightKg: null }), '')
})

// ── toSet ────────────────────────────────────────────────────────────────────
test('toSet convertit un log Directus en série', () => {
  const log = {
    id: 7, athlete_profile_id: 4, session_id: 290, block_strength_exercise_id: 496, exercise_id: 18,
    set_number: 2, weight_kg: 60, reps: 5, duration_sec: null, date_created: '2026-10-05T17:00:00.000Z',
  }
  assert.deepEqual(toSet(log), {
    id: 7, lineId: 496, exerciseId: 18, sessionId: 290, setNumber: 2,
    weightKg: 60, reps: 5, durationSec: null, distanceM: null, stationId: null, date: '2026-10-05T17:00:00.000Z',
  })
})
test('toSet met null pour les champs absents', () => {
  assert.deepEqual(toSet({ id: 8, set_number: 1 }), {
    id: 8, lineId: null, exerciseId: null, sessionId: null, setNumber: 1,
    weightKg: null, reps: null, durationSec: null, distanceM: null, stationId: null, date: null,
  })
})

// ── groupHistory ─────────────────────────────────────────────────────────────
test('groupHistory regroupe par séance, la plus récente d\'abord, séries dans l\'ordre', () => {
  const a2 = set({ id: 1, sessionId: 10, setNumber: 2, date: '2026-10-05T17:05:00.000Z' })
  const a1 = set({ id: 2, sessionId: 10, setNumber: 1, date: '2026-10-05T17:00:00.000Z' })
  const b1 = set({ id: 3, sessionId: 20, setNumber: 1, date: '2026-10-12T17:00:00.000Z' })
  assert.deepEqual(groupHistory([a2, a1, b1]), [
    { key: 's20', date: '2026-10-12T17:00:00.000Z', sets: [b1] },
    { key: 's10', date: '2026-10-05T17:00:00.000Z', sets: [a1, a2] },
  ])
})
test('groupHistory regroupe par jour les séries dont la séance a disparu', () => {
  const a = set({ id: 1, sessionId: null, setNumber: 1, date: '2026-10-05T17:00:00.000Z' })
  const b = set({ id: 2, sessionId: null, setNumber: 2, date: '2026-10-05T17:04:00.000Z' })
  const c = set({ id: 3, sessionId: null, setNumber: 1, date: '2026-10-06T08:00:00.000Z' })
  assert.deepEqual(groupHistory([a, b, c]).map(g => [g.key, g.sets.length]), [['d2026-10-06', 1], ['d2026-10-05', 2]])
})
test('groupHistory renvoie une liste vide sans série', () => {
  assert.deepEqual(groupHistory([]), [])
})

// ── previousByExercise ───────────────────────────────────────────────────────
test('previousByExercise prend la dernière séance autre que la séance courante', () => {
  const old1 = set({ id: 1, exerciseId: 18, sessionId: 10, setNumber: 1, date: '2026-10-05T17:00:00.000Z' })
  const old2 = set({ id: 2, exerciseId: 18, sessionId: 10, setNumber: 2, date: '2026-10-05T17:05:00.000Z' })
  const last = set({ id: 3, exerciseId: 18, sessionId: 20, setNumber: 1, date: '2026-10-12T17:00:00.000Z' })
  const current = set({ id: 4, exerciseId: 18, sessionId: 30, setNumber: 1, date: '2026-10-19T17:00:00.000Z' })
  assert.deepEqual(previousByExercise([old1, old2, last, current], 30), {
    18: { date: '2026-10-12T17:00:00.000Z', sets: [last] },
  })
})
test('previousByExercise omet un exercice sans séance antérieure', () => {
  const current = set({ id: 4, exerciseId: 4, sessionId: 30 })
  assert.deepEqual(previousByExercise([current], 30), {})
})
test('previousByExercise ignore les séries sans exercice', () => {
  assert.deepEqual(previousByExercise([set({ exerciseId: null, sessionId: 10 })], 30), {})
})

// ── buildSetRows ─────────────────────────────────────────────────────────────
test('buildSetRows crée une ligne par série prévue', () => {
  const rows = buildSetRows({ sets: 4 }, [], undefined)
  assert.deepEqual(rows.map(r => r.setNumber), [1, 2, 3, 4])
  assert.ok(rows.every(r => r.logged === null && r.previous === null && r.planned === true))
})
test('buildSetRows rattache une série enregistrée à sa ligne', () => {
  const logged = set({ setNumber: 2 })
  const rows = buildSetRows({ sets: 4 }, [logged], undefined)
  assert.equal(rows[1].logged, logged)
  assert.equal(rows[0].logged, null)
})
test('buildSetRows ajoute les séries enregistrées au-delà du prévu', () => {
  const extra = set({ setNumber: 5 })
  const rows = buildSetRows({ sets: 4 }, [extra], undefined)
  assert.equal(rows.length, 5)
  assert.equal(rows[4].planned, false)
  assert.equal(rows[4].logged, extra)
})
test('buildSetRows ajoute les séries supplémentaires demandées', () => {
  const rows = buildSetRows({ sets: 4 }, [], undefined, 1)
  assert.equal(rows.length, 5)
  assert.deepEqual([rows[4].planned, rows[4].logged], [false, null])
})
test('buildSetRows ne double pas une série supplémentaire une fois enregistrée', () => {
  assert.equal(buildSetRows({ sets: 4 }, [set({ setNumber: 5 })], undefined, 1).length, 5)
})
test('buildSetRows apparie la séance précédente par numéro de série', () => {
  const p1 = set({ setNumber: 1 })
  const p2 = set({ setNumber: 2 })
  const rows = buildSetRows({ sets: 3 }, [], [p2, p1])
  assert.deepEqual(rows.map(r => r.previous), [p1, p2, null])
})
test('buildSetRows garde au moins une ligne quand aucune série n\'est prévue', () => {
  assert.equal(buildSetRows({ sets: null }, [], undefined).length, 1)
})

// ── resolveSetValues ─────────────────────────────────────────────────────────
const repsLine = { reps: 5, durationSec: null, weightKg: null }
const timedLine = { reps: null, durationSec: 45, weightKg: null }
const prev = { weightKg: 60, reps: 5, durationSec: null }

test('resolveSetValues prend la saisie en priorité', () => {
  assert.deepEqual(resolveSetValues(repsLine, { previous: prev }, { weight: '62,5', value: '6' }),
    { weightKg: 62.5, reps: 6, durationSec: null, distanceM: null })
})
test('resolveSetValues reprend la série précédente quand rien n\'est saisi', () => {
  assert.deepEqual(resolveSetValues(repsLine, { previous: prev }, { weight: '', value: '' }),
    { weightKg: 60, reps: 5, durationSec: null, distanceM: null })
})
test('resolveSetValues reprend le prévu quand il n\'y a pas de précédent', () => {
  assert.deepEqual(resolveSetValues({ reps: 5, durationSec: null, weightKg: 50 }, { previous: null }, { weight: '', value: '' }),
    { weightKg: 50, reps: 5, durationSec: null, distanceM: null })
})
test('resolveSetValues accepte une série sans charge', () => {
  assert.deepEqual(resolveSetValues({ reps: 8, durationSec: null, weightKg: null }, { previous: null }, { weight: '', value: '8' }),
    { weightKg: null, reps: 8, durationSec: null, distanceM: null })
})
test('resolveSetValues garde un zéro saisi même si la séance précédente était chargée', () => {
  assert.deepEqual(resolveSetValues(repsLine, { previous: prev }, { weight: '0', value: '8' }),
    { weightKg: 0, reps: 8, durationSec: null, distanceM: null })
})
test('resolveSetValues enregistre une durée pour une ligne en durée', () => {
  assert.deepEqual(resolveSetValues(timedLine, { previous: null }, { weight: '', value: '50' }),
    { weightKg: null, reps: null, durationSec: 50, distanceM: null })
  assert.deepEqual(resolveSetValues(timedLine, { previous: null }, { weight: '', value: '' }),
    { weightKg: null, reps: null, durationSec: 45, distanceM: null })
})
test('resolveSetValues renvoie null sans reps ni durée exploitables', () => {
  assert.equal(resolveSetValues({ reps: null, durationSec: null, weightKg: null }, { previous: null }, { weight: '', value: '' }), null)
  assert.equal(resolveSetValues(repsLine, { previous: prev }, { weight: '60', value: '0' }), null)
})
test('resolveSetValues renvoie null pour une saisie invalide plutôt que de la remplacer', () => {
  assert.equal(resolveSetValues(repsLine, { previous: prev }, { weight: '60', value: 'abc' }), null)
  assert.equal(resolveSetValues(repsLine, { previous: prev }, { weight: 'abc', value: '5' }), null)
  assert.equal(resolveSetValues(repsLine, { previous: prev }, { weight: '60', value: '5,5' }), null)
})

// ── formatSetCompact (colonne « Précédent » du tableau) ──────────────────────
import { formatSetCompact } from '../src/utils/setLogs.js'

test('formatSetCompact omet l\'unité de charge', () => {
  assert.equal(formatSetCompact({ weightKg: 62.5, reps: 12 }), '62,5 × 12')
  assert.equal(formatSetCompact({ weightKg: 5, reps: null, durationSec: 45 }), '5 × 45 s')
})
test('formatSetCompact garde la forme longue sans charge', () => {
  assert.equal(formatSetCompact({ weightKg: null, reps: 8 }), '8 reps')
  assert.equal(formatSetCompact({ weightKg: null, reps: null, durationSec: 45 }), '45 s')
  assert.equal(formatSetCompact({}), '')
})

// ── clé d'une série (boîte d'envoi) ──────────────────────────────────────────
import { setKey, keyOfSet, sameSetValues, textsOf, emptyTyping, typeInto, pinTexts, draftOf } from '../src/utils/setLogs.js'

test('setKey identifie une série par sa séance, sa ligne et son numéro', () => {
  assert.equal(setKey(10, 100, 2), '10:100:2')
  assert.equal(keyOfSet(set({ setNumber: 3 })), '10:100:3')
})
test('keyOfSet ne donne pas de clé à une série sans ligne ou sans séance : elle ne se rapproche d\'aucune autre', () => {
  assert.equal(keyOfSet(set({ lineId: null })), null)
  assert.equal(keyOfSet(set({ sessionId: null })), null)
})
test('sameSetValues compare ce qui s\'enregistre', () => {
  assert.equal(sameSetValues({ weightKg: 60, reps: 5, durationSec: null }, set()), true)
  assert.equal(sameSetValues({ weightKg: 62.5, reps: 5, durationSec: null }, set()), false)
  assert.equal(sameSetValues({ weightKg: null, reps: null, durationSec: 45 }, set({ weightKg: null, reps: null, durationSec: 45 })), true)
})

// ── saisie d'un exercice : valeurs tapées et valeurs reportées ───────────────
const rowOf = (setNumber, logged = null) => ({ setNumber, logged, previous: null, planned: true })

test('textsOf écrit une série comme dans les champs', () => {
  assert.deepEqual(textsOf(set({ weightKg: 62.5, reps: 5 }), 'reps'), { weight: '62,5', value: '5' })
  assert.deepEqual(textsOf(set({ weightKg: null, reps: null, durationSec: 45 }), 'duration'), { weight: '', value: '45' })
})

test('une charge tapée dans une série s\'affiche dans les autres séries à faire', () => {
  const typing = typeInto(emptyTyping(), 1, 'weight', '60')
  assert.deepEqual(draftOf(typing, rowOf(1), 'reps'), { weight: '60', value: '' })
  assert.deepEqual(draftOf(typing, rowOf(2), 'reps'), { weight: '60', value: '' })
  assert.deepEqual(draftOf(typing, rowOf(5), 'reps'), { weight: '60', value: '' }) // série ajoutée ensuite
})

test('les reps se reportent de la même façon, sans toucher à la charge', () => {
  const typing = typeInto(typeInto(emptyTyping(), 1, 'weight', '60'), 1, 'value', '8')
  assert.deepEqual(draftOf(typing, rowOf(3), 'reps'), { weight: '60', value: '8' })
})

test('une série où l\'athlète a tapé garde sa valeur ; les autres suivent la dernière saisie', () => {
  let typing = typeInto(emptyTyping(), 1, 'weight', '60')
  typing = typeInto(typing, 3, 'weight', '62,5')
  assert.equal(draftOf(typing, rowOf(1), 'reps').weight, '60')   // tapée par lui
  assert.equal(draftOf(typing, rowOf(3), 'reps').weight, '62,5')
  assert.equal(draftOf(typing, rowOf(2), 'reps').weight, '62,5') // pas touchée : la dernière saisie
  assert.equal(draftOf(typing, rowOf(4), 'reps').weight, '62,5')
})

test('une série cochée ne change jamais toute seule', () => {
  const logged = set({ setNumber: 1, weightKg: 60, reps: 5 })
  const typing = typeInto(emptyTyping(), 3, 'weight', '62,5')
  assert.deepEqual(draftOf(typing, rowOf(1, logged), 'reps'), { weight: '60', value: '5' })
})

test('corriger une série cochée vaut aussi pour les séries à faire', () => {
  const logged = set({ setNumber: 1, weightKg: 60, reps: 5 })
  const typing = typeInto(emptyTyping(), 1, 'weight', '65')
  assert.deepEqual(draftOf(typing, rowOf(1, logged), 'reps'), { weight: '65', value: '5' })
  assert.equal(draftOf(typing, rowOf(2), 'reps').weight, '65')
})

test('un champ vidé redevient une proposition, pour la série et pour celles qui la suivent', () => {
  const typing = typeInto(typeInto(emptyTyping(), 1, 'weight', '60'), 1, 'weight', '')
  assert.equal(draftOf(typing, rowOf(1), 'reps').weight, '')
  assert.equal(draftOf(typing, rowOf(2), 'reps').weight, '')
})

test('pinTexts fige les champs d\'une série décochée : elle se recoche telle quelle', () => {
  let typing = typeInto(emptyTyping(), 1, 'weight', '60')
  typing = pinTexts(typing, 2, { weight: '60', value: '5' }) // la série 2 vient d'être décochée
  typing = typeInto(typing, 3, 'weight', '62,5')
  assert.deepEqual(draftOf(typing, rowOf(2), 'reps'), { weight: '60', value: '5' })
})

test('typeInto et pinTexts ne modifient pas la saisie d\'origine', () => {
  const typing = emptyTyping()
  typeInto(typing, 1, 'weight', '60')
  pinTexts(typing, 1, { weight: '60', value: '5' })
  assert.deepEqual(typing, { own: {}, carry: {} })
})

test('une ligne en durée reporte les secondes', () => {
  const typing = typeInto(emptyTyping(), 1, 'value', '50')
  assert.deepEqual(draftOf(typing, rowOf(2), 'duration'), { weight: '', value: '50' })
  assert.deepEqual(draftOf(emptyTyping(), rowOf(1, set({ weightKg: null, reps: null, durationSec: 45 })), 'duration'), { weight: '', value: '45' })
})

// ── bandeau d'envoi ──────────────────────────────────────────────────────────
import { syncNotice } from '../src/utils/setLogs.js'

test('syncNotice ne dit rien tant que tout part normalement', () => {
  assert.equal(syncNotice(0, []), null)
})
test('syncNotice compte les séries qui attendent le réseau', () => {
  assert.deepEqual(syncNotice(1, []), { tone: 'waiting', text: '1 série gardée sur ton téléphone, en attente de réseau.' })
  assert.deepEqual(syncNotice(3, []), { tone: 'waiting', text: '3 séries gardées sur ton téléphone, en attente de réseau.' })
})
test('syncNotice signale d\'abord un refus du serveur, avec sa raison', () => {
  assert.deepEqual(syncNotice(2, [{ error: 'Accès refusé' }]), { tone: 'refused', text: '1 série refusée par le serveur : Accès refusé.' })
  assert.equal(syncNotice(0, [{ error: 'Accès refusé' }, { error: 'Erreur 400' }]).text, '2 séries refusées par le serveur : Accès refusé.')
})

// ── valeurs reportées depuis la dernière série cochée ────────────────────────
test('sans saisie, les séries à faire reprennent la dernière série cochée de l\'exercice', () => {
  const latest = set({ setNumber: 2, weightKg: 62.5, reps: 5 })
  assert.deepEqual(draftOf(emptyTyping(), rowOf(3), 'reps', latest), { weight: '62,5', value: '5' })
  assert.deepEqual(draftOf(emptyTyping(), rowOf(3), 'reps', null), { weight: '', value: '' })
  // Au poids de corps, la charge reste une proposition
  assert.deepEqual(draftOf(emptyTyping(), rowOf(2), 'reps', set({ weightKg: null, reps: 9 })), { weight: '', value: '9' })
})
test('ce que l\'athlète vient de taper passe avant la dernière série cochée', () => {
  const latest = set({ setNumber: 1, weightKg: 60, reps: 5 })
  const typing = typeInto(emptyTyping(), 2, 'weight', '62,5')
  assert.deepEqual(draftOf(typing, rowOf(3), 'reps', latest), { weight: '62,5', value: '5' })
  // Un champ vidé reste vide : la proposition en filigrane reprend la main
  assert.equal(draftOf(typeInto(typing, 2, 'weight', ''), rowOf(3), 'reps', latest).weight, '')
})
test('la dernière série cochée ne change pas une série cochée ni une série décochée', () => {
  const latest = set({ setNumber: 3, weightKg: 65, reps: 4 })
  assert.deepEqual(draftOf(emptyTyping(), rowOf(1, set({ weightKg: 60, reps: 5 })), 'reps', latest), { weight: '60', value: '5' })
  const pinned = pinTexts(emptyTyping(), 2, { weight: '60', value: '5' })
  assert.deepEqual(draftOf(pinned, rowOf(2), 'reps', latest), { weight: '60', value: '5' })
})
