import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  formatExercise, formatStation, imagesOf, toExerciseRow, strengthDetail, stationsDetail,
} from '../src/services/blockMappers.js'

const squatRow = {
  id: 496, block_strength_id: 70, position: 0, custom_label: null,
  exercise_id: { id: 18, name: 'Front Squat', image_urls: ['u0', 'u1'] },
  sets: 4, reps: 5, duration_sec: null, weight_kg: null, note: 'RIR 2',
}
const plankRow = {
  id: 510, block_strength_id: 72, position: 0, custom_label: null,
  exercise_id: { id: 11, name: 'Planche', image_urls: null },
  sets: 3, reps: null, duration_sec: 45, weight_kg: null, note: null,
}

// ── formatExercise (chaînes inchangées par rapport à trainingService) ────────
test('formatExercise écrit séries × reps, le nom du catalogue et la note', () => {
  assert.equal(formatExercise(squatRow), '4×5 Front Squat (RIR 2)')
})
test('formatExercise écrit séries × durée pour une ligne en durée', () => {
  assert.equal(formatExercise(plankRow), '3×45s Planche')
})
test('formatExercise gère une durée ou des reps sans nombre de séries', () => {
  assert.equal(formatExercise({ exercise_id: { name: 'Planche' }, duration_sec: 60 }), '60s Planche')
  assert.equal(formatExercise({ exercise_id: { name: 'Burpees' }, reps: 10 }), '10 Burpees')
})
test('formatExercise retombe sur le libellé libre puis sur un nom générique', () => {
  assert.equal(formatExercise({ exercise_id: null, custom_label: 'Gainage libre', sets: 2, reps: 10 }), '2×10 Gainage libre')
  assert.equal(formatExercise({ exercise_id: null }), 'Exercice')
})

// ── formatStation ────────────────────────────────────────────────────────────
test('formatStation écrit la distance ou les reps', () => {
  assert.equal(formatStation({ station_id: { name: 'SkiErg' }, distance_m: 150 }), 'SkiErg 150m')
  assert.equal(formatStation({ station_id: { name: 'Wall Balls' }, reps: 10 }), 'Wall Balls 10 reps')
})
test('formatStation écrit les charges femme et homme, ou une seule', () => {
  assert.equal(
    formatStation({ station_id: { name: 'Wall Balls' }, reps: 10, weight_kg_female: 4, weight_kg_male: 6 }),
    'Wall Balls 10 reps (4kg F / 6kg H)',
  )
  assert.equal(formatStation({ station_id: { name: 'Farmers Carry' }, distance_m: 30, weight_kg_male: 24 }), 'Farmers Carry 30m (24kg)')
})
test('formatStation ajoute la note', () => {
  assert.equal(
    formatStation({ station_id: { name: 'Farmers Carry' }, distance_m: 30, note: '30-40 m · lourd' }),
    'Farmers Carry 30m (30-40 m · lourd)',
  )
})

// ── imagesOf ─────────────────────────────────────────────────────────────────
test('imagesOf renvoie les URL du catalogue', () => {
  assert.deepEqual(imagesOf({ image_urls: ['a', 'b'] }), ['a', 'b'])
})
test('imagesOf renvoie une liste vide sans catalogue ou sans images', () => {
  assert.deepEqual(imagesOf(null), [])
  assert.deepEqual(imagesOf(18), [])
  assert.deepEqual(imagesOf({ image_urls: null }), [])
  assert.deepEqual(imagesOf({}), [])
})
test('imagesOf écarte ce qui n\'est pas une URL exploitable', () => {
  assert.deepEqual(imagesOf({ image_urls: ['a', '', 3, null] }), ['a'])
  assert.deepEqual(imagesOf({ image_urls: 'a' }), [])
})

// ── toExerciseRow ────────────────────────────────────────────────────────────
test('toExerciseRow structure une ligne d\'exercice', () => {
  assert.deepEqual(toExerciseRow(squatRow), {
    id: 496, exerciseId: 18, name: 'Front Squat', sets: 4, reps: 5,
    durationSec: null, weightKg: null, note: 'RIR 2', tip: null, images: ['u0', 'u1'],
  })
})
test('toExerciseRow reprend la note du catalogue comme conseil de fiche', () => {
  const row = { ...squatRow, exercise_id: { ...squatRow.exercise_id, notes: 'Alternative : squat arrière.' } }
  assert.equal(toExerciseRow(row).tip, 'Alternative : squat arrière.')
  assert.equal(toExerciseRow({ id: 1, exercise_id: 18, sets: 2, reps: 10 }).tip, null)
})
test('toExerciseRow traite les zéros et les chaînes vides comme absents', () => {
  const row = toExerciseRow({ ...squatRow, reps: 0, duration_sec: 45, note: '' })
  assert.deepEqual([row.reps, row.durationSec, row.note], [null, 45, null])
  assert.equal(toExerciseRow({ ...squatRow, duration_sec: 0 }).durationSec, null)
})
test('toExerciseRow accepte une ligne sans exercice du catalogue', () => {
  const row = toExerciseRow({ id: 1, exercise_id: null, custom_label: 'Gainage libre', sets: 2, reps: 10 })
  assert.deepEqual([row.exerciseId, row.name, row.images], [null, 'Gainage libre', []])
})
test('toExerciseRow garde l\'id quand l\'exercice n\'est pas déplié', () => {
  assert.equal(toExerciseRow({ id: 1, exercise_id: 18, sets: 2, reps: 10 }).exerciseId, 18)
})

// ── détails de bloc ──────────────────────────────────────────────────────────
test('strengthDetail assemble le bloc de muscu', () => {
  assert.deepEqual(strengthDetail({ id: 70, rest_sec: 150, note: 'Polyarticulaires' }, [squatRow, plankRow]), {
    type: 'strength',
    restSec: 150,
    note: 'Polyarticulaires',
    exercises: ['4×5 Front Squat (RIR 2)', '3×45s Planche'],
    rows: [toExerciseRow(squatRow), toExerciseRow(plankRow)],
  })
})
test('strengthDetail met null pour une note vide', () => {
  assert.equal(strengthDetail({ rest_sec: null, note: '' }, []).note, null)
})
test('stationsDetail renvoie les chaînes et les images en parallèle', () => {
  const rows = [
    { station_id: { name: 'Farmers Carry', image_urls: ['f0', 'f1'] }, distance_m: 30 },
    { station_id: { name: 'Wall Balls', image_urls: null }, reps: 10 },
  ]
  assert.deepEqual(stationsDetail(rows), {
    stations: ['Farmers Carry 30m', 'Wall Balls 10 reps'],
    stationImages: [['f0', 'f1'], []],
  })
})
