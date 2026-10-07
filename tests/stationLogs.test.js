import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  measureOf, isTimed, formatSet, formatSetCompact, formatTarget, toSet, keyOfSet, refKeyOf, previousByExercise,
  resolveSetValues, proposedMain, sameSetValues, textsOf, draftOf, emptyTyping, typeInto, summarizeSets, historyTrend,
} from '../src/utils/setLogs.js'
import {
  loggableLinesOf, isLoggableCircuit, circuitLines, nextOpenLine, restAfter, sessionProgress, summarizeWorkout, describeLine,
} from '../src/utils/workout.js'
import { toStationRow, stationsDetail } from '../src/services/blockMappers.js'
import { structuredDetailToBlock } from '../src/services/sessionParser.js'

// ── Lignes Directus : le farmer's carry du vendredi, des wall balls de circuit ──
const carryRow = {
  id: 173, block_circuit_id: 59, position: 0, distance_m: 30, reps: null, duration_sec: null,
  weight_kg_female: null, weight_kg_male: null, custom_label: null, note: '30-40 m · lourd',
  station_id: { id: 6, name: 'Farmers Carry', image_urls: ['f0', 'f1'] },
}
const wallBallRow = {
  id: 201, position: 1, distance_m: 0, reps: 20, duration_sec: 0,
  weight_kg_female: 4, weight_kg_male: 6, custom_label: null, note: '',
  station_id: { id: 8, name: 'Wall Balls', image_urls: null },
}
const carry = toStationRow(carryRow, 'block_circuit_stations')
const wallBalls = toStationRow(wallBallRow, 'block_circuit_stations')

// ── ligne de station ─────────────────────────────────────────────────────────
test('toStationRow structure une ligne de station pour la saisie des tours', () => {
  assert.deepEqual(carry, {
    id: 'block_circuit_stations:173', kind: 'station', exerciseId: null, stationId: 6, name: 'Farmers Carry',
    reps: null, durationSec: null, distanceM: 30, weightKgFemale: null, weightKgMale: null,
    note: '30-40 m · lourd', tip: null, images: ['f0', 'f1'],
  })
})
test('toStationRow traite les 0 et les chaînes vides comme une absence de valeur', () => {
  assert.deepEqual(
    [wallBalls.distanceM, wallBalls.reps, wallBalls.durationSec, wallBalls.note, wallBalls.weightKgFemale, wallBalls.weightKgMale, wallBalls.images],
    [null, 20, null, null, 4, 6, []],
  )
})
test('toStationRow reprend la note du catalogue comme conseil de la fiche', () => {
  const row = { id: 7, station_id: { id: 6, name: 'Farmers Carry', notes: 'Épaules basses, pas courts.' }, distance_m: 30 }
  assert.equal(toStationRow(row, 'block_circuit_stations').tip, 'Épaules basses, pas courts.')
  assert.equal(toStationRow({ id: 7, station_id: { id: 6, name: 'Farmers Carry', notes: '' } }, 'block_circuit_stations').tip, null)
})

test('toStationRow se contente d\'une station non dépliée, et retombe sur le libellé de la ligne', () => {
  const row = toStationRow({ id: 5, station_id: 6, custom_label: 'Burpees to plate', reps: 10 }, 'block_circuit_stations')
  assert.deepEqual([row.stationId, row.name, row.images], [6, 'Burpees to plate', []])
  assert.equal(toStationRow({ id: 6, station_id: null }, 'block_circuit_stations').name, 'Station')
})
test('stationsDetail joint les lignes structurées aux chaînes d\'affichage', () => {
  const detail = stationsDetail([carryRow, wallBallRow], 'block_circuit_stations')
  assert.deepEqual(detail.stations, ['Farmers Carry 30m (30-40 m · lourd)', 'Wall Balls 20 reps (4kg F / 6kg H)'])
  assert.deepEqual(detail.rows, [carry, wallBalls])
})

// ── ce qu'on compte sur une ligne ────────────────────────────────────────────
test('measureOf : la distance si elle est prévue, sinon les reps, sinon la durée', () => {
  assert.equal(measureOf(carry), 'distance')
  assert.equal(measureOf(wallBalls), 'reps')
  assert.equal(measureOf({ reps: null, durationSec: 45 }), 'duration')
  assert.equal(measureOf({ reps: 5, durationSec: null }), 'reps')
  assert.equal(measureOf({ reps: null, durationSec: null }), 'reps')
  assert.equal(isTimed(carry), false)
})

test('une série en distance s\'écrit en mètres', () => {
  const set = { weightKg: 24, reps: null, durationSec: null, distanceM: 40 }
  assert.equal(formatSet(set), '24 kg × 40 m')
  assert.equal(formatSetCompact(set), '24 × 40 m')
  assert.equal(formatSet({ weightKg: null, reps: null, durationSec: null, distanceM: 80 }), '80 m')
  assert.equal(formatTarget({ sets: 4, reps: null, durationSec: null, distanceM: 30 }), '4 × 30 m')
  assert.equal(formatTarget({ sets: 4, distanceM: 50, weightKg: 24 }), '4 × 50 m · 24 kg')
})

test('toSet lit un tour de station : sa ligne, sa station, sa distance', () => {
  const set = toSet({ id: 9, session_id: 292, line_key: 'block_circuit_stations:173', station_id: 6, set_number: 2, weight_kg: 24, distance_m: 40, date_created: '2026-10-09T18:00:00.000Z' })
  assert.deepEqual(set, {
    id: 9, lineId: 'block_circuit_stations:173', exerciseId: null, stationId: 6, sessionId: 292, setNumber: 2,
    weightKg: 24, reps: null, durationSec: null, distanceM: 40, date: '2026-10-09T18:00:00.000Z',
  })
  assert.equal(keyOfSet(set), '292:block_circuit_stations:173:2')
})

// ── historique : par exercice ou par station ─────────────────────────────────
test('refKeyOf distingue une station d\'un exercice de même numéro', () => {
  assert.equal(refKeyOf({ exerciseId: 6, stationId: null }), 6)
  assert.equal(refKeyOf({ exerciseId: null, stationId: 6 }), 's:6')
  assert.equal(refKeyOf(carry), 's:6')
  assert.equal(refKeyOf({ exerciseId: null, stationId: null }), null)
})
test('previousByExercise range la dernière séance d\'une station sous sa clé', () => {
  const past = [
    { id: 1, sessionId: 286, exerciseId: null, stationId: 6, setNumber: 1, weightKg: 24, distanceM: 40, date: '2026-10-02T18:00:00.000Z' },
    { id: 2, sessionId: 286, exerciseId: null, stationId: 6, setNumber: 2, weightKg: 24, distanceM: 40, date: '2026-10-02T18:03:00.000Z' },
    { id: 3, sessionId: 286, exerciseId: 6, stationId: null, setNumber: 1, weightKg: 100, reps: 5, date: '2026-10-02T17:00:00.000Z' },
    { id: 4, sessionId: 292, exerciseId: null, stationId: 6, setNumber: 1, weightKg: 28, distanceM: 40, date: '2026-10-09T18:00:00.000Z' },
  ]
  const previous = previousByExercise(past, 292)
  assert.deepEqual(previous['s:6'].sets.map(s => s.id), [1, 2])
  assert.deepEqual(previous[6].sets.map(s => s.id), [3])
})

// ── valeurs à enregistrer ────────────────────────────────────────────────────
test('resolveSetValues enregistre une distance pour une ligne en distance', () => {
  const previous = { weightKg: 24, reps: null, durationSec: null, distanceM: 40 }
  assert.deepEqual(resolveSetValues(fridayLine, { previous: null }, { weight: '28', value: '35' }),
    { weightKg: 28, reps: null, durationSec: null, distanceM: 35 })
  assert.deepEqual(resolveSetValues(fridayLine, { previous }, { weight: '', value: '' }),
    { weightKg: 24, reps: null, durationSec: null, distanceM: 40 }) // 40 m tient dans les 30-40 m prévus
  assert.deepEqual(resolveSetValues(fridayLine, { previous: null }, { weight: '', value: '' }),
    { weightKg: null, reps: null, durationSec: null, distanceM: 30 }) // le prévu
  assert.equal(resolveSetValues(fridayLine, { previous: null }, { weight: '24', value: 'abc' }), null)
})
test('resolveSetValues garde la distance prévue quand le tour précédent vient d\'un circuit qui en demandait une autre', () => {
  const sixty = { ...fridayLine, distanceM: 60, plannedMax: null, weightKg: 20 }
  const previous = { weightKg: 22, reps: null, durationSec: null, distanceM: 30 }
  // La charge reste la dernière utilisée, la distance est celle du jour
  assert.deepEqual(resolveSetValues(sixty, { previous }, { weight: '', value: '' }),
    { weightKg: 22, reps: null, durationSec: null, distanceM: 60 })
})

// ── valeur proposée quand rien n'est tapé ────────────────────────────────────
const before = (distanceM, weightKg = 24) => ({ weightKg, reps: null, durationSec: null, distanceM })

test('proposedMain : en muscu, la série précédente passe avant le prévu', () => {
  const line = { id: 1, exerciseId: 18, sets: 3, reps: 6 }
  assert.equal(proposedMain(line, { reps: 9 }), 9)
  assert.equal(proposedMain(line, null), 6)
  assert.equal(proposedMain({ id: 1, exerciseId: 18, sets: 3 }, null), null)
})
test('proposedMain : sur une station, le tour précédent ne vaut que dans la fourchette prévue', () => {
  assert.equal(proposedMain(fridayLine, before(40)), 40) // haut des 30-40 m
  assert.equal(proposedMain(fridayLine, before(35)), 35)
  assert.equal(proposedMain(fridayLine, before(30)), 30)
  assert.equal(proposedMain(fridayLine, before(60)), 30) // fait dans un circuit plus long
  assert.equal(proposedMain(fridayLine, before(20)), 30)
  assert.equal(proposedMain(fridayLine, null), 30)
})
test('proposedMain : sur une station sans fourchette, le prévu fait foi', () => {
  const sixty = { ...fridayLine, distanceM: 60, plannedMax: null }
  assert.equal(proposedMain(sixty, before(30)), 60)
  assert.equal(proposedMain(sixty, before(60)), 60)
  const reps = circuitLines(twoStations)[1] // wall balls : 20 reps
  assert.equal(proposedMain(reps, { weightKg: 6, reps: 30 }), 20)
  // Rien de prévu : il ne reste que le tour précédent
  assert.equal(proposedMain({ kind: 'station', stationId: 6, reps: null, durationSec: null, distanceM: null }, { reps: 12 }), 12)
})
test('sameSetValues compare aussi la distance', () => {
  const set = { weightKg: 24, reps: null, durationSec: null, distanceM: 40 }
  assert.equal(sameSetValues({ weightKg: 24, reps: null, durationSec: null, distanceM: 40 }, set), true)
  assert.equal(sameSetValues({ weightKg: 24, reps: null, durationSec: null, distanceM: 35 }, set), false)
  // Une série de muscu d'avant les stations n'a pas le champ
  assert.equal(sameSetValues({ weightKg: 60, reps: 5, durationSec: null, distanceM: null }, { weightKg: 60, reps: 5, durationSec: null }), true)
})
test('les champs d\'une ligne en distance montrent des mètres, et la distance se reporte', () => {
  const logged = { setNumber: 1, weightKg: 24, reps: null, durationSec: null, distanceM: 40 }
  assert.deepEqual(textsOf(logged, 'distance'), { weight: '24', value: '40' })
  const row = { setNumber: 2, logged: null, previous: null, planned: true }
  assert.deepEqual(draftOf(emptyTyping(), row, 'distance', logged), { weight: '24', value: '40' })
  assert.deepEqual(draftOf(typeInto(emptyTyping(), 1, 'value', '35'), row, 'distance', logged), { weight: '24', value: '35' })
})
test('summarizeSets résume des tours en distance', () => {
  const sets = [40, 40, 30].map((distanceM, i) => ({ setNumber: i + 1, weightKg: 24, reps: null, durationSec: null, distanceM }))
  assert.equal(summarizeSets(sets), '24 kg × 40, 40, 30 m')
  assert.equal(summarizeSets(sets.map(s => ({ ...s, weightKg: null }))), '40, 40, 30 m')
})
test('historyTrend suit la charge d\'une station, la distance quand elle n\'en a pas', () => {
  const session = (key, sets) => ({ key, date: key, sets })
  assert.equal(historyTrend([session('a', [{ weightKg: 24, distanceM: 40 }])]).unit, 'kg')
  assert.deepEqual(historyTrend([session('b', [{ distanceM: 80 }]), session('a', [{ distanceM: 60 }, { distanceM: 70 }])]), {
    unit: 'm', points: [{ key: 'a', value: 70 }, { key: 'b', value: 80 }],
  })
})
test('describeLine fond une fourchette de distance dans l\'objectif', () => {
  assert.deepEqual(describeLine({ ...carry, sets: 4 }), { target: '4 × 30-40 m', chips: ['lourd'] })
  assert.deepEqual(describeLine({ ...wallBalls, sets: 3, weightKg: 6 }), { target: '3 × 20 · 6 kg', chips: [] })
})

// ── circuits à tours ─────────────────────────────────────────────────────────
const friday = { type: 'circuit', format: 'rounds', rounds: 4, restBetweenMin: 1.5, stations: ['Farmers Carry 30m'], rows: [carry] }
const twoStations = { type: 'circuit', format: 'rounds', rounds: 2, restBetweenMin: 2, stations: ['a', 'b'], rows: [carry, wallBalls] }
const [fridayLine] = circuitLines(friday) // 4 × 30-40 m

test('isLoggableCircuit : un circuit à tours, avec au moins un tour et une station', () => {
  assert.equal(isLoggableCircuit(friday), true)
  assert.equal(isLoggableCircuit({ ...friday, format: undefined }), true) // ancien circuit sans format : des tours
  for (const format of ['amrap', 'emom', 'time']) assert.equal(isLoggableCircuit({ ...friday, format }), false, format)
  assert.equal(isLoggableCircuit({ ...friday, rounds: 0 }), false)
  assert.equal(isLoggableCircuit({ ...friday, rounds: null }), false)
  assert.equal(isLoggableCircuit({ ...friday, rows: [] }), false)
  assert.equal(isLoggableCircuit({ ...friday, rows: undefined }), false) // séance en cache d'un ancien format
  assert.equal(isLoggableCircuit({ type: 'strength', rows: [carry] }), false)
})

test('circuitLines donne à chaque station ses tours, son repos et sa charge prévue', () => {
  const [line] = circuitLines(friday)
  assert.deepEqual([line.id, line.sets, line.restSec, line.weightKg, line.group], ['block_circuit_stations:173', 4, 90, null, null])

  const [, him] = circuitLines(twoStations)
  const [, her] = circuitLines(twoStations, { female: true })
  assert.deepEqual([him.weightKg, her.weightKg], [6, 4])
  // Plusieurs stations : elles s'enchaînent dans un même tour
  assert.deepEqual(circuitLines(twoStations).map(l => l.group), ['block_circuit_stations:173', 'block_circuit_stations:173'])
  assert.equal(circuitLines({ ...friday, restBetweenMin: 0 })[0].restSec, null)
})
test('circuitLines note le haut de la fourchette prévue, quand la note en donne une', () => {
  assert.equal(fridayLine.plannedMax, 40) // « 30-40 m · lourd » pour 30 m prévus
  assert.equal(circuitLines(twoStations)[1].plannedMax, null)
  // Une fourchette qui ne part pas de la valeur prévue, ou dans une autre unité, n'est pas la sienne
  const other = note => circuitLines({ ...friday, rows: [{ ...carry, note }] })[0].plannedMax
  assert.equal(other('20-40 m'), null)
  assert.equal(other('30-40 s'), null)
  assert.equal(other(null), null)
})

const squat = { id: 1, exerciseId: 18, name: 'Front Squat', sets: 4, reps: 5 }
const plank = { id: 2, exerciseId: 11, name: 'Planche', sets: 3, durationSec: 45 }
const details = [
  { type: 'warmup', durationMin: 10 },
  { type: 'strength', restSec: 120, rows: [squat] },
  friday,
  { type: 'circuit', format: 'amrap', durationMin: 12, rows: [wallBalls] },
  { type: 'strength', restSec: 90, rows: [plank] },
  { type: 'strength' }, // cache d'ancien format, sans lignes
]

test('loggableLinesOf rassemble les lignes de muscu avec le repos de leur bloc, dans l\'ordre', () => {
  const lines = loggableLinesOf(details)
  assert.deepEqual(lines.map(l => [l.id, l.restSec]), [[1, 120], [2, 90]])
  assert.deepEqual(loggableLinesOf(undefined), [])
  assert.deepEqual(loggableLinesOf([]), [])
})
test('loggableLinesOf ajoute les circuits à tours quand Directus sait enregistrer les stations', () => {
  const lines = loggableLinesOf(details, { stations: true })
  assert.deepEqual(lines.map(l => l.id), [1, 'block_circuit_stations:173', 2])
  assert.deepEqual(sessionProgress(lines, []), { done: 0, planned: 11 }) // 4 séries, 4 tours, 3 séries
})

// ── enchaînement ─────────────────────────────────────────────────────────────
const tour = (line, setNumber, values = {}) => ({ lineId: line.id, setNumber, weightKg: null, reps: null, durationSec: null, distanceM: null, ...values })
const done = (...pairs) => pairs.flatMap(([line, count]) => Array.from({ length: count }, (_, i) => tour(line, i + 1)))

test('un circuit à une station se déroule comme un exercice', () => {
  const lines = loggableLinesOf([friday, { type: 'strength', restSec: 90, rows: [plank] }], { stations: true })
  const [station] = lines
  assert.equal(nextOpenLine(lines, []), station.id)
  assert.equal(nextOpenLine(lines, done([station, 4]), station.id), plank.id)
  assert.deepEqual(restAfter(lines, done([station, 2]), station.id), { sec: 90, label: 'Farmers Carry · tour 3 sur 4' })
  assert.deepEqual(restAfter(lines, done([station, 4]), station.id), { sec: 90, label: 'Ensuite : Planche' })
})

test('dans un circuit à plusieurs stations, on enchaîne les stations du tour', () => {
  const lines = [...circuitLines(twoStations), { ...plank, restSec: 90 }]
  const [a, b] = lines
  assert.equal(nextOpenLine(lines, []), a.id)
  assert.equal(nextOpenLine(lines, done([a, 1]), a.id), b.id)          // même tour, station suivante
  assert.equal(nextOpenLine(lines, done([a, 1], [b, 1]), b.id), a.id)  // tour bouclé : on repart de la première
  assert.equal(nextOpenLine(lines, done([a, 2], [b, 1]), a.id), b.id)
  assert.equal(nextOpenLine(lines, done([a, 2], [b, 2]), b.id), plank.id)
  // À la réouverture de la séance, on reprend la station la moins avancée
  assert.equal(nextOpenLine(lines, done([a, 1])), b.id)
})

test('dans un circuit à plusieurs stations, le repos attend la fin du tour', () => {
  const lines = [...circuitLines(twoStations), { ...plank, restSec: 90 }]
  const [a, b] = lines
  assert.deepEqual(restAfter(lines, done([a, 1]), a.id), { sec: 0, label: '' })
  assert.deepEqual(restAfter(lines, done([a, 1], [b, 1]), b.id), { sec: 120, label: 'Farmers Carry · tour 2 sur 2' })
  assert.deepEqual(restAfter(lines, done([a, 2], [b, 2]), b.id), { sec: 120, label: 'Ensuite : Planche' })
})

test('restAfter donne le repos du bloc après une série de muscu', () => {
  const lines = loggableLinesOf(details)
  const series = [{ lineId: 1, setNumber: 1 }, { lineId: 1, setNumber: 2 }]
  assert.deepEqual(restAfter(lines, series, 1), { sec: 120, label: 'Front Squat · série 3 sur 4' })
  assert.deepEqual(restAfter(lines, series, 99), { sec: 0, label: '' })
})

// ── récap ────────────────────────────────────────────────────────────────────
test('summarizeWorkout compte les tours et les écrit en mètres', () => {
  const lines = loggableLinesOf([friday], { stations: true })
  const sets = [1, 2].map(n => tour(lines[0], n, { weightKg: 24, distanceM: 40 }))
  const summary = summarizeWorkout(lines, sets)
  assert.deepEqual([summary.setsDone, summary.setsPlanned, summary.totalReps, summary.volumeKg], [2, 4, 0, 0])
  assert.deepEqual(summary.exercises, [{ lineId: lines[0].id, name: 'Farmers Carry', summary: '24 kg × 40 m · 24 kg × 40 m', volumeKg: 0 }])
})

// ── bloc affiché ─────────────────────────────────────────────────────────────
test('le bloc d\'un circuit garde de quoi le saisir : format, tours, repos, lignes', () => {
  const block = structuredDetailToBlock({ ...friday, stationImages: [['f0', 'f1']] })
  assert.equal(block.type, 'circuit')
  assert.deepEqual([block.format, block.rounds, block.restBetweenMin, block.rows], ['rounds', 4, 1.5, [carry]])
  assert.equal(isLoggableCircuit(block), true)
  assert.equal(isLoggableCircuit(structuredDetailToBlock({ type: 'circuit', format: 'amrap', durationMin: 12, stations: ['Wall Balls 20 reps'], rows: [wallBalls] })), false)
})
