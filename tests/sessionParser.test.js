import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseExercise, structuredDetailToBlock } from '../src/services/sessionParser.js'

const row = { id: 496, exerciseId: 18, name: 'Front Squat', sets: 4, reps: 5, durationSec: null, weightKg: null, note: 'RIR 2', images: ['u0', 'u1'] }

test('parseExercise découpe une ligne de la phase 1 en nom, valeur et note', () => {
  const parsed = parseExercise('3×45s Planche (45-60 s · à lester une fois 60 s tenues)')
  assert.deepEqual([parsed.name, parsed.value, parsed.note], ['Planche', '3×45s', '(45-60 s · à lester une fois 60 s tenues)'])
})

test('un bloc de muscu transmet ses lignes, son repos et sa note', () => {
  const block = structuredDetailToBlock({
    type: 'strength', restSec: 150, note: 'Polyarticulaires', exercises: ['4×5 Front Squat (RIR 2)'], rows: [row],
  })
  assert.equal(block.type, 'strength')
  assert.equal(block.restSec, 150)
  assert.equal(block.note, 'Polyarticulaires')
  assert.deepEqual(block.rows, [row])
})
test('un bloc de muscu attache les images à ses exercices', () => {
  const block = structuredDetailToBlock({ type: 'strength', restSec: 150, exercises: ['4×5 Front Squat (RIR 2)'], rows: [row] })
  assert.deepEqual([block.exercises[0].name, block.exercises[0].value, block.exercises[0].images], ['Front Squat', '4×5', ['u0', 'u1']])
})
test('un bloc de muscu d\'ancien format (sans lignes) reste affichable', () => {
  const block = structuredDetailToBlock({ type: 'strength', restSec: 90, exercises: ['3×10 Squat'] })
  assert.equal(block.rows, null)
  assert.equal(block.note, null)
  assert.deepEqual(block.exercises[0].images, [])
})

test('un circuit attache les images à ses stations', () => {
  const block = structuredDetailToBlock({
    type: 'circuit', format: 'rounds', label: null, rounds: 4, durationMin: null, restBetweenMin: 1.5,
    stations: ['Farmers Carry 30m (30-40 m · lourd)'], stationImages: [['f0', 'f1']],
  })
  assert.equal(block.header, 'Circuit × 4 passages — repos 1.5 min')
  const [station] = block.exercises
  assert.deepEqual([station.name, station.value, station.note, station.images], ['Farmers Carry', '30m', '(30-40 m · lourd)', ['f0', 'f1']])
})
test('un circuit sans images donne une liste vide par station', () => {
  const block = structuredDetailToBlock({ type: 'circuit', format: 'rounds', rounds: 2, stations: ['SkiErg 150m'] })
  assert.deepEqual(block.exercises[0].images, [])
})
test('un circuit EMOM attache aussi les images', () => {
  const block = structuredDetailToBlock({ type: 'circuit', format: 'emom', rounds: 3, stations: ['SkiErg 150m'], stationImages: [['s0']] })
  assert.deepEqual(block.exercises[0].images, ['s0'])
})
test('une mini-course, une activation et un bloc de stations attachent les images', () => {
  const detail = { stations: ['RowErg 400m'], stationImages: [['r0']] }
  assert.deepEqual(structuredDetailToBlock({ type: 'mini_race', rounds: 4, runDistanceKm: 1, ...detail }).stations[0].images, ['r0'])
  assert.deepEqual(structuredDetailToBlock({ type: 'station_activation', rounds: 2, ...detail }).stations[0].images, ['r0'])
  assert.deepEqual(structuredDetailToBlock({ type: 'station_block', brickFormat: 'standard', ...detail }).exercises[0].images, ['r0'])
})
