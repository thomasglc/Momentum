import { test } from 'node:test'
import assert from 'node:assert/strict'
import { NOTE_MAX, cleanNote, noteKey, toNote, keyOfNote, sameNote, lastNote, withNotes } from '../src/utils/notes.js'
import { syncNotice } from '../src/utils/setLogs.js'

// ── Notes Directus : dips (exercice n° 27) et farmer's carry (station n° 6) ──
const row = (id, sessionId, ref, note, date) => ({
  id, athlete_profile_id: 999, session_id: sessionId,
  exercise_id: typeof ref === 'number' ? ref : null, station_id: typeof ref === 'string' ? Number(ref.slice(2)) : null,
  note, date_created: date,
})
const dips = (id, sessionId, note, date) => toNote(row(id, sessionId, 27, note, date))
const carry = (id, sessionId, note, date) => toNote(row(id, sessionId, 's:6', note, date))

// ── texte gardé ──────────────────────────────────────────────────────────────
test('cleanNote retire les espaces autour et coupe à 300 caractères', () => {
  assert.equal(cleanNote('  facile, monter la charge  '), 'facile, monter la charge')
  assert.equal(cleanNote('   '), '')
  assert.equal(cleanNote(null), '')
  assert.equal(cleanNote('x'.repeat(NOTE_MAX + 20)).length, NOTE_MAX)
  assert.equal(NOTE_MAX, 300)
})

// ── note lue dans Directus ───────────────────────────────────────────────────
test('toNote lit une note d\'exercice et une note de station', () => {
  assert.deepEqual(dips(1, 292, 'facile', '2026-10-09T17:50:00.000Z'), {
    id: 1, sessionId: 292, exerciseId: 27, stationId: null, ref: 27, text: 'facile', date: '2026-10-09T17:50:00.000Z',
  })
  const note = carry(2, 292, 'grip lâche au 4e tour', '2026-10-09T18:20:00.000Z')
  assert.deepEqual([note.exerciseId, note.stationId, note.ref], [null, 6, 's:6'])
  // Relations dépliées, valeurs absentes
  const expanded = toNote({ id: 3, session_id: { id: 298 }, exercise_id: { id: 27, name: 'Dips' }, station_id: null, note: null, date_created: null })
  assert.deepEqual([expanded.sessionId, expanded.exerciseId, expanded.ref, expanded.text], [298, 27, 27, ''])
})

test('une note par exercice et par séance : la clé les distingue', () => {
  assert.equal(noteKey(292, 27), '292:27')
  assert.equal(keyOfNote(dips(1, 292, 'a', null)), '292:27')
  assert.equal(keyOfNote(carry(2, 292, 'b', null)), '292:s:6')
  assert.equal(keyOfNote({ sessionId: null, ref: 27 }), null) // séance supprimée
  assert.equal(keyOfNote({ sessionId: 292, ref: null }), null) // exercice disparu du catalogue
})

test('sameNote compare le texte', () => {
  assert.equal(sameNote({ text: 'facile' }, dips(1, 292, 'facile', null)), true)
  assert.equal(sameNote({ text: 'facile !' }, dips(1, 292, 'facile', null)), false)
})

// ── note rappelée ────────────────────────────────────────────────────────────
// Séance précédente avec des séries, telle que previousByExercise la donne
const previous = (sessionId, date) => ({ date, sets: [{ sessionId, setNumber: 1, date }] })

test('lastNote rappelle la note de la dernière séance où l\'exercice a été travaillé', () => {
  const notes = [dips(1, 286, 'dur', '2026-10-02T17:50:00.000Z'), dips(2, 292, 'facile, monter', '2026-10-09T17:30:00.000Z')]
  // Note écrite pendant la séance, avant même ses séries
  assert.equal(lastNote(notes, previous(292, '2026-10-09T17:40:00.000Z'), 298).text, 'facile, monter')
  // La note de la séance en cours ne se rappelle pas à elle-même
  assert.equal(lastNote(notes, previous(286, '2026-10-02T17:40:00.000Z'), 292).text, 'dur')
  assert.equal(lastNote([], previous(292, '2026-10-09T17:40:00.000Z'), 298), null)
})

test('lastNote ne ressort pas une vieille note quand l\'exercice a été refait depuis sans note', () => {
  const notes = [dips(1, 286, 'monter la charge', '2026-10-02T17:50:00.000Z')]
  assert.equal(lastNote(notes, previous(292, '2026-10-09T17:40:00.000Z'), 298), null)
})

test('lastNote garde une note écrite sur une séance sans série, plus récente que les dernières séries', () => {
  const notes = [dips(1, 298, 'épaule sensible, pas fait', '2026-10-16T17:45:00.000Z')]
  assert.equal(lastNote(notes, previous(292, '2026-10-09T17:40:00.000Z'), 304).text, 'épaule sensible, pas fait')
  // Aucune série jamais enregistrée : la dernière note suffit
  assert.equal(lastNote(notes, null, 304).text, 'épaule sensible, pas fait')
})

test('lastNote ignore les notes vides', () => {
  const notes = [dips(1, 292, 'facile', '2026-10-09T17:50:00.000Z'), dips(2, 298, '', '2026-10-16T17:50:00.000Z')]
  assert.equal(lastNote(notes, previous(292, '2026-10-09T17:40:00.000Z'), 304).text, 'facile')
})

// ── historique de la fiche ───────────────────────────────────────────────────
test('withNotes met chaque note sous les séries de sa séance, la plus récente d\'abord', () => {
  const history = [
    { key: 's298', date: '2026-10-16T17:40:00.000Z', sets: [{ setNumber: 1 }] },
    { key: 's292', date: '2026-10-09T17:40:00.000Z', sets: [{ setNumber: 1 }] },
  ]
  const notes = [dips(1, 292, 'facile, monter', '2026-10-09T17:50:00.000Z'), dips(2, 304, 'épaule, pas fait', '2026-10-23T17:45:00.000Z')]
  assert.deepEqual(withNotes(history, notes).map(s => [s.key, s.sets.length, s.note]), [
    ['s304', 0, 'épaule, pas fait'], // séance sans série, mais avec une note
    ['s298', 1, null],
    ['s292', 1, 'facile, monter'],
  ])
  assert.deepEqual(withNotes(history, []).map(s => s.note), [null, null])
})

// ── bandeau d'attente ────────────────────────────────────────────────────────
test('syncNotice compte aussi les notes qui attendent le réseau', () => {
  assert.equal(syncNotice(0, [], { waiting: 0, refused: [] }), null)
  assert.equal(syncNotice(0, [], { waiting: 1, refused: [] }).text, '1 note gardée sur ton téléphone, en attente de réseau.')
  assert.equal(syncNotice(2, [], { waiting: 1, refused: [] }).text, '2 séries et 1 note gardées sur ton téléphone, en attente de réseau.')
  assert.equal(syncNotice(1, [], { waiting: 2, refused: [] }).text, '1 série et 2 notes gardées sur ton téléphone, en attente de réseau.')
})

test('syncNotice signale une note refusée, la raison d\'une série d\'abord', () => {
  assert.deepEqual(syncNotice(0, [], { waiting: 0, refused: [{ error: 'Erreur 400' }] }),
    { tone: 'refused', text: '1 note refusée par le serveur : Erreur 400.' })
  assert.equal(syncNotice(1, [{ error: 'Accès refusé' }], { waiting: 3, refused: [{ error: 'Erreur 400' }] }).text,
    '1 série et 1 note refusées par le serveur : Accès refusé.')
})
