import { test } from 'node:test'
import assert from 'node:assert/strict'
import { noteChips, isLong } from '../src/utils/text.js'
import { audienceFor } from '../src/utils/audience.js'
import { stationFacts } from '../src/utils/stations.js'
import { parseClock } from '../src/utils/workout.js'

// ── texte ────────────────────────────────────────────────────────────────────
test('noteChips découpe une note en pastilles', () => {
  assert.deepEqual(noteChips('6-8 reps · RIR 2'), ['6-8 reps', 'RIR 2'])
  assert.deepEqual(noteChips('par jambe'), ['par jambe'])
})
test('noteChips nettoie les espaces et ignore les morceaux vides', () => {
  assert.deepEqual(noteChips(' 45-60 s ·  lester à 60 s · '), ['45-60 s', 'lester à 60 s'])
})
test('noteChips renvoie une liste vide sans note', () => {
  assert.deepEqual(noteChips(null), [])
  assert.deepEqual(noteChips(''), [])
})
test('isLong repère un texte qui dépasse la limite', () => {
  assert.equal(isLong('court'), false)
  assert.equal(isLong('x'.repeat(91)), true)
  assert.equal(isLong('x'.repeat(41), 40), true)
  assert.equal(isLong(null), false)
})

// ── à qui s'adresse l'affichage ──────────────────────────────────────────────
test('audienceFor : le double mixte affiche lui et elle', () => {
  assert.deepEqual(audienceFor('open_double_mixte', 'homme'), { isSolo: false, isDuoMixte: true, showLui: true, showElle: true })
})
test('audienceFor : les doubles hommes et femmes suivent le format', () => {
  assert.deepEqual(audienceFor('open_double_men', 'homme'), { isSolo: false, isDuoMixte: false, showLui: true, showElle: false })
  assert.deepEqual(audienceFor('open_double_women', 'femme'), { isSolo: false, isDuoMixte: false, showLui: false, showElle: true })
})
test('audienceFor : en solo, c\'est le genre du profil qui décide', () => {
  assert.deepEqual(audienceFor('open_solo', 'homme'), { isSolo: true, isDuoMixte: false, showLui: true, showElle: false })
  assert.deepEqual(audienceFor('open_solo', 'femme'), { isSolo: true, isDuoMixte: false, showLui: false, showElle: true })
  assert.deepEqual(audienceFor('open_solo', null), { isSolo: true, isDuoMixte: false, showLui: true, showElle: false })
})
test('audienceFor : sans format, on garde le comportement du double mixte', () => {
  assert.equal(audienceFor(null, 'homme').isDuoMixte, true)
})

// ── stations ─────────────────────────────────────────────────────────────────
const sled = {
  volume: '25m chacun · 50m total', volumeSolo: '50 m',
  weight: 'Open Mixte : 152 kg (sled inclus) — même sled pour les deux', weightSoloMen: '152 kg, traîneau inclus',
}
const skierg = { volume: '500m chacun · 1 000m total', volumeSolo: '1 000 m', weight: null, weightSoloMen: null }

test('stationFacts garde les repères du double hors solo', () => {
  assert.deepEqual(stationFacts(sled, { isSolo: false, gender: 'homme' }), { volume: sled.volume, weight: sled.weight })
})
test('stationFacts donne le volume entier et le poids hommes en solo', () => {
  assert.deepEqual(stationFacts(sled, { isSolo: true, gender: 'homme' }), { volume: '50 m', weight: '152 kg, traîneau inclus' })
})
test('stationFacts ne donne pas de poids en solo femmes tant qu\'il n\'est pas renseigné', () => {
  assert.deepEqual(stationFacts(sled, { isSolo: true, gender: 'femme' }), { volume: '50 m', weight: null })
})
test('stationFacts renvoie null pour une station sans charge', () => {
  assert.equal(stationFacts(skierg, { isSolo: true, gender: 'homme' }).weight, null)
  assert.equal(stationFacts(skierg, { isSolo: false, gender: 'homme' }).weight, null)
})

// ── saisie d'un temps ────────────────────────────────────────────────────────
test('parseClock lit un temps en minutes et secondes', () => {
  assert.equal(parseClock('48:30'), 2910)
  assert.equal(parseClock('5:05'), 305)
  assert.equal(parseClock(' 39:50 '), 2390)
})
test('parseClock renvoie null pour une saisie invalide', () => {
  assert.equal(parseClock('48'), null)
  assert.equal(parseClock('48:75'), null)
  assert.equal(parseClock('abc'), null)
  assert.equal(parseClock(''), null)
  assert.equal(parseClock(null), null)
})
