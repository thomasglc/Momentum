import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  formatClock, elapsedSeconds, remainingSeconds, isStale, restProgress,
  strengthLinesOf, summarizeWorkout, formatKg,
} from '../src/utils/workout.js'

const HOUR = 60 * 60 * 1000

// ── horloge ──────────────────────────────────────────────────────────────────
test('formatClock écrit minutes et secondes', () => {
  assert.equal(formatClock(0), '0:00')
  assert.equal(formatClock(5), '0:05')
  assert.equal(formatClock(65), '1:05')
  assert.equal(formatClock(3599), '59:59')
})
test('formatClock ajoute les heures à partir de soixante minutes', () => {
  assert.equal(formatClock(3600), '1:00:00')
  assert.equal(formatClock(3725), '1:02:05')
})
test('formatClock ramène à zéro une valeur négative ou absente', () => {
  assert.equal(formatClock(-3), '0:00')
  assert.equal(formatClock(null), '0:00')
})
test('elapsedSeconds compte les secondes entières écoulées', () => {
  assert.equal(elapsedSeconds(1000, 66500), 65)
  assert.equal(elapsedSeconds(1000, 1000), 0)
})
test('elapsedSeconds ne descend pas sous zéro', () => {
  assert.equal(elapsedSeconds(5000, 1000), 0)
})
test('remainingSeconds arrondit à la seconde supérieure', () => {
  assert.equal(remainingSeconds(10000, 9001), 1)
  assert.equal(remainingSeconds(10000, 8999), 2)
})
test('remainingSeconds vaut zéro une fois l\'échéance atteinte', () => {
  assert.equal(remainingSeconds(10000, 10000), 0)
  assert.equal(remainingSeconds(10000, 12000), 0)
})
test('isStale considère abandonnée une séance démarrée il y a plus de six heures', () => {
  assert.equal(isStale(0, 6 * HOUR + 1), true)
  assert.equal(isStale(0, 6 * HOUR), false)
  assert.equal(isStale(0, HOUR), false)
})
test('restProgress donne la part de repos écoulée', () => {
  assert.equal(restProgress(150, 150), 0)
  assert.equal(restProgress(150, 75), 0.5)
  assert.equal(restProgress(150, 0), 1)
})
test('restProgress reste entre 0 et 1', () => {
  assert.equal(restProgress(150, 200), 0)
  assert.equal(restProgress(0, 0), 1)
})

// ── lignes de muscu d'une séance ─────────────────────────────────────────────
test('strengthLinesOf rassemble les lignes des blocs de muscu, dans l\'ordre', () => {
  const details = [
    { type: 'warmup', durationMin: 10 },
    { type: 'strength', rows: [{ id: 1 }, { id: 2 }] },
    { type: 'circuit', stations: ['Farmers Carry 30m'] },
    { type: 'strength', rows: [{ id: 3 }] },
    { type: 'strength' }, // cache d'ancien format, sans lignes
  ]
  assert.deepEqual(strengthLinesOf(details).map(l => l.id), [1, 2, 3])
})
test('strengthLinesOf renvoie une liste vide sans détail de séance', () => {
  assert.deepEqual(strengthLinesOf(undefined), [])
  assert.deepEqual(strengthLinesOf([]), [])
})

// ── récap ────────────────────────────────────────────────────────────────────
const squat = { id: 10, name: 'Front Squat', sets: 4 }
const pullup = { id: 11, name: 'Pull-up', sets: 3 }
const plank = { id: 12, name: 'Planche', sets: 3 }
const logged = (lineId, setNumber, weightKg, reps, durationSec = null) => ({ lineId, setNumber, weightKg, reps, durationSec })

test('summarizeWorkout totalise séries, reps et volume', () => {
  const sets = [logged(10, 1, 60, 5), logged(10, 2, 62.5, 4), logged(11, 1, null, 8)]
  const summary = summarizeWorkout([squat, pullup, plank], sets)
  assert.equal(summary.setsDone, 3)
  assert.equal(summary.setsPlanned, 10)
  assert.equal(summary.totalReps, 17)
  assert.equal(summary.volumeKg, 550) // 60×5 + 62,5×4
})
test('summarizeWorkout ne compte pas de volume sans charge ni pour une durée', () => {
  const sets = [logged(11, 1, null, 8), logged(11, 2, 0, 8), logged(12, 1, 5, null, 45)]
  const summary = summarizeWorkout([pullup, plank], sets)
  assert.equal(summary.volumeKg, 0)
  assert.equal(summary.setsDone, 3)
  assert.equal(summary.totalReps, 16)
})
test('summarizeWorkout détaille chaque exercice dans l\'ordre du programme', () => {
  const sets = [logged(12, 1, null, null, 45), logged(10, 2, 62.5, 4), logged(10, 1, 60, 5)]
  assert.deepEqual(summarizeWorkout([squat, pullup, plank], sets).exercises, [
    { lineId: 10, name: 'Front Squat', summary: '60 kg × 5 · 62,5 kg × 4', volumeKg: 550 },
    { lineId: 12, name: 'Planche', summary: '45 s', volumeKg: 0 },
  ])
})
test('summarizeWorkout renvoie des zéros sans série enregistrée', () => {
  assert.deepEqual(summarizeWorkout([squat, pullup], []), {
    setsDone: 0, setsPlanned: 7, totalReps: 0, volumeKg: 0, exercises: [],
  })
})
test('summarizeWorkout arrondit le volume au dixième', () => {
  const sets = [logged(10, 1, 22.7, 3), logged(10, 2, 22.7, 3)]
  assert.equal(summarizeWorkout([squat], sets).volumeKg, 136.2)
})

// ── kilos ────────────────────────────────────────────────────────────────────
test('formatKg sépare les milliers et arrondit au kilo', () => {
  assert.match(formatKg(1250), /^1\s250 kg$/u)
  assert.equal(formatKg(375.5), '376 kg')
  assert.equal(formatKg(0), '0 kg')
})
