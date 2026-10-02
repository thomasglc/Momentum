import { test } from 'node:test'
import assert from 'node:assert/strict'
import { summarizeSets, historyTrend } from '../src/utils/setLogs.js'
import { sessionProgress, nextOpenLine, restLabelAfter, describeLine } from '../src/utils/workout.js'

const set = (lineId, setNumber, values = {}) => ({ lineId, setNumber, weightKg: null, reps: null, durationSec: null, ...values })

// ── résumé compact des séries d'un exercice ──────────────────────────────────
test('summarizeSets regroupe les séries de même charge', () => {
  const sets = [62.5, 62.5, 62.5, 62.5].map((weightKg, i) => set(1, i + 1, { weightKg, reps: [5, 5, 5, 4][i] }))
  assert.equal(summarizeSets(sets), '62,5 kg × 5, 5, 5, 4')
})
test('summarizeSets sépare les charges qui changent', () => {
  const sets = [set(1, 1, { weightKg: 60, reps: 5 }), set(1, 2, { weightKg: 62.5, reps: 5 }), set(1, 3, { weightKg: 62.5, reps: 4 })]
  assert.equal(summarizeSets(sets), '60 kg × 5 · 62,5 kg × 5, 4')
})
test('summarizeSets écrit les reps sans charge et les durées', () => {
  assert.equal(summarizeSets([set(1, 1, { reps: 10 }), set(1, 2, { reps: 9 })]), '10, 9 reps')
  assert.equal(summarizeSets([set(1, 1, { durationSec: 45 }), set(1, 2, { durationSec: 40 })]), '45, 40 s')
  assert.equal(summarizeSets([set(1, 1, { weightKg: 5, durationSec: 45 }), set(1, 2, { weightKg: 5, durationSec: 45 })]), '5 kg × 45, 45 s')
})
test('summarizeSets suit l\'ordre des séries et renvoie une chaîne vide sans série', () => {
  assert.equal(summarizeSets([set(1, 2, { weightKg: 60, reps: 4 }), set(1, 1, { weightKg: 60, reps: 5 })]), '60 kg × 5, 4')
  assert.equal(summarizeSets([]), '')
})

// ── tendance d'un exercice dans sa fiche ─────────────────────────────────────
test('historyTrend donne la meilleure valeur de chaque séance, de la plus ancienne à la plus récente', () => {
  const history = [
    { key: 's3', date: '2026-10-19T18:00:00Z', sets: [set(1, 1, { weightKg: 65, reps: 5 }), set(1, 2, { weightKg: 67.5, reps: 3 })] },
    { key: 's2', date: '2026-10-12T18:00:00Z', sets: [set(1, 1, { weightKg: 62.5, reps: 5 })] },
    { key: 's1', date: '2026-10-05T18:00:00Z', sets: [set(1, 1, { weightKg: 60, reps: 5 })] },
  ]
  assert.deepEqual(historyTrend(history), {
    unit: 'kg',
    points: [{ key: 's1', value: 60 }, { key: 's2', value: 62.5 }, { key: 's3', value: 67.5 }],
  })
})
test('historyTrend mesure en reps sans charge, en secondes en gainage, et garde les dernières séances', () => {
  assert.equal(historyTrend([{ key: 'a', date: 'x', sets: [set(1, 1, { reps: 9 })] }]).unit, 'reps')
  assert.equal(historyTrend([{ key: 'a', date: 'x', sets: [set(1, 1, { durationSec: 45 })] }]).unit, 's')
  const long = Array.from({ length: 12 }, (_, i) => ({ key: `s${12 - i}`, date: `2026-10-${String(28 - i).padStart(2, '0')}`, sets: [set(1, 1, { weightKg: 100 - i, reps: 5 })] }))
  const trend = historyTrend(long, 8)
  assert.equal(trend.points.length, 8)
  assert.equal(trend.points.at(-1).value, 100) // la plus récente en dernier
  assert.deepEqual(historyTrend([]), { unit: 'kg', points: [] })
})

// ── avancement de la séance ──────────────────────────────────────────────────
const LINES = [
  { id: 1, name: 'Front Squat', sets: 4 },
  { id: 2, name: 'Romanian Deadlift', sets: 3 },
  { id: 3, name: 'Face Pull', sets: 3 },
]
const logged = (...pairs) => pairs.flatMap(([lineId, count]) => Array.from({ length: count }, (_, i) => set(lineId, i + 1, { reps: 5 })))

test('sessionProgress compte les séries faites sur les séries prévues', () => {
  assert.deepEqual(sessionProgress(LINES, logged([1, 2])), { done: 2, planned: 10 })
  assert.deepEqual(sessionProgress(LINES, []), { done: 0, planned: 10 })
})
test('sessionProgress compte une série en plus, ignore une série d\'une autre séance', () => {
  assert.deepEqual(sessionProgress(LINES, [...logged([1, 5]), set(99, 1, { reps: 5 })]), { done: 5, planned: 10 })
})
test('nextOpenLine ouvre le premier exercice à faire', () => {
  assert.equal(nextOpenLine(LINES, []), 1)
  assert.equal(nextOpenLine(LINES, logged([1, 4])), 2)
  assert.equal(nextOpenLine(LINES, logged([1, 4], [2, 3], [3, 3])), null)
})
test('nextOpenLine, après un exercice fini, passe au suivant puis revient à ceux laissés de côté', () => {
  assert.equal(nextOpenLine(LINES, logged([2, 3]), 2), 3)
  assert.equal(nextOpenLine(LINES, logged([2, 3], [3, 3]), 3), 1)
  assert.equal(nextOpenLine(LINES, logged([1, 4], [2, 3], [3, 3]), 3), null)
})
test('restLabelAfter annonce la série suivante, l\'exercice suivant, ou la fin', () => {
  assert.equal(restLabelAfter(LINES, logged([1, 2]), 1), 'Front Squat · série 3 sur 4')
  assert.equal(restLabelAfter(LINES, logged([1, 4]), 1), 'Ensuite : Romanian Deadlift')
  assert.equal(restLabelAfter(LINES, logged([1, 4], [2, 3], [3, 3]), 3), 'Dernière série faite')
})

// ── objectif d'un exercice et ses repères ────────────────────────────────────
test('describeLine fond dans l\'objectif la fourchette qui part de la valeur prévue', () => {
  assert.deepEqual(describeLine({ sets: 3, reps: 6, note: '6-8 reps' }), { target: '3 × 6-8 reps', chips: [] })
  assert.deepEqual(describeLine({ sets: 3, reps: 8, note: '8-10 reps · lest léger possible' }), { target: '3 × 8-10 reps', chips: ['lest léger possible'] })
  assert.deepEqual(describeLine({ sets: 3, reps: null, durationSec: 45, note: '45-60 s · lester à 60 s' }), { target: '3 × 45-60 s', chips: ['lester à 60 s'] })
})
test('describeLine garde en pastille ce qui suit la fourchette', () => {
  assert.deepEqual(describeLine({ sets: 2, reps: null, durationSec: 30, note: '30-45 s par côté' }), { target: '2 × 30-45 s', chips: ['par côté'] })
})
test('describeLine laisse l\'objectif tel quel sans fourchette, ou si elle ne part pas de la valeur prévue', () => {
  assert.deepEqual(describeLine({ sets: 4, reps: 5, note: 'RIR 2' }), { target: '4 × 5', chips: ['RIR 2'] })
  assert.deepEqual(describeLine({ sets: 3, reps: 8, note: 'par jambe · RIR 3' }), { target: '3 × 8', chips: ['par jambe', 'RIR 3'] })
  assert.deepEqual(describeLine({ sets: 3, reps: 10, note: '6-8 reps' }), { target: '3 × 10', chips: ['6-8 reps'] })
  assert.deepEqual(describeLine({ sets: 4, reps: 6, note: null }), { target: '4 × 6', chips: [] })
})
test('describeLine ajoute la charge prévue', () => {
  assert.deepEqual(describeLine({ sets: 3, reps: 6, weightKg: 62.5, note: '6-8 reps' }), { target: '3 × 6-8 reps · 62,5 kg', chips: [] })
})
