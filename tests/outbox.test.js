import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  put, stepOf, markSent, answered, settle, refuse, retryRefused, forgetRefused, recheck, reconcile, unique, overlay, nextEntry,
} from '../src/utils/outbox.js'

const ME = 7
// Une série : la clé dit la séance, la ligne d'exercice et le numéro
const change = (over = {}) => ({ key: '10:100:1', scope: 10, owner: ME, value: { weightKg: 60, reps: 5 }, id: null, at: 1000, ...over })
const keyOf = row => row.key ?? null
const same = (value, row) => value.weightKg === row.weightKg && value.reps === row.reps
const rules = { keyOf, same }
const one = (entries) => { assert.equal(entries.length, 1); return entries[0] }

// ── état voulu ───────────────────────────────────────────────────────────────
test('put ajoute une entrée, puis la remplace quand la série est corrigée', () => {
  let entries = put([], change())
  assert.deepEqual(one(entries), { key: '10:100:1', scope: 10, owner: ME, value: { weightKg: 60, reps: 5 }, id: null, doubt: false, rev: 1, at: 1000, error: null })

  entries = put(entries, change({ value: { weightKg: 62.5, reps: 5 }, at: 2000 }))
  assert.deepEqual(one(entries).value, { weightKg: 62.5, reps: 5 })
  assert.equal(one(entries).rev, 2)
  assert.equal(one(entries).at, 1000) // la place dans la file reste celle du premier geste
})

test('put oublie une série cochée puis décochée avant tout envoi', () => {
  const entries = put(put([], change()), change({ value: null }))
  assert.deepEqual(entries, [])
})

test('put garde la suppression d\'une série que le serveur connaît, ou connaît peut-être', () => {
  assert.equal(stepOf(one(put([], change({ value: null, id: 55 })))), 'delete')
  const sent = markSent(put([], change()), '10:100:1', ME)
  assert.equal(one(put(sent, change({ value: null }))).value, null) // envoi parti : on ne sait pas encore
})

test('put ne mélange pas les athlètes ni les séries', () => {
  let entries = put([], change())
  entries = put(entries, change({ owner: 8 }))
  entries = put(entries, change({ key: '10:100:2' }))
  assert.equal(entries.length, 3)
  entries = put(entries, change({ value: null })) // ne retire que la mienne
  assert.deepEqual(entries.map(e => [e.owner, e.key]), [[8, '10:100:1'], [ME, '10:100:2']])
})

test('put efface le refus précédent : la série corrigée se renvoie', () => {
  const refused = refuse(put([], change()), '10:100:1', ME, 'Accès refusé')
  assert.equal(one(refused).error, 'Accès refusé')
  assert.equal(one(put(refused, change({ value: { weightKg: 50, reps: 5 } }))).error, null)
})

// ── étape suivante ───────────────────────────────────────────────────────────
test('stepOf dit ce qu\'il reste à faire sur le serveur', () => {
  assert.equal(stepOf({ value: { reps: 5 }, id: null, doubt: false }), 'create')
  assert.equal(stepOf({ value: { reps: 5 }, id: 55, doubt: false }), 'update')
  assert.equal(stepOf({ value: null, id: 55, doubt: false }), 'delete')
  assert.equal(stepOf({ value: null, id: null, doubt: false }), 'drop')
  assert.equal(stepOf({ value: { reps: 5 }, id: null, doubt: true }), 'check') // relire avant de recréer
  assert.equal(stepOf({ value: null, id: null, doubt: true }), 'check')
})

// ── réponse du serveur ───────────────────────────────────────────────────────
test('settle retire l\'entrée quand rien n\'a changé depuis l\'envoi', () => {
  const sent = markSent(put([], change()), '10:100:1', ME)
  assert.equal(one(sent).doubt, true)
  assert.deepEqual(settle(sent, '10:100:1', ME, 1, { id: 55 }), [])
})

test('settle garde une correction faite pendant l\'envoi, avec l\'identifiant reçu', () => {
  let entries = markSent(put([], change()), '10:100:1', ME)
  entries = put(entries, change({ value: { weightKg: 62.5, reps: 5 } })) // corrigée pendant l'envoi (rev 2)
  entries = settle(entries, '10:100:1', ME, 1, { id: 55 })
  assert.deepEqual([one(entries).id, one(entries).doubt, stepOf(one(entries))], [55, false, 'update'])
})

test('settle enchaîne sur la suppression d\'une série décochée pendant sa création', () => {
  let entries = markSent(put([], change()), '10:100:1', ME)
  entries = put(entries, change({ value: null }))
  entries = settle(entries, '10:100:1', ME, 1, { id: 55 })
  assert.equal(stepOf(one(entries)), 'delete')
  assert.deepEqual(settle(entries, '10:100:1', ME, 2, null), [])
})

test('settle après une suppression : la série recochée entre-temps se recrée', () => {
  let entries = put([], change({ value: null, id: 55 }))                    // rev 1 : supprimer
  entries = put(entries, change({ value: { weightKg: 60, reps: 4 } }))      // rev 2 : recochée pendant la suppression
  entries = settle(entries, '10:100:1', ME, 1, null)
  assert.deepEqual([one(entries).id, stepOf(one(entries))], [null, 'create'])
})

test('answered lève le doute quand le serveur a répondu non : rien n\'a été créé', () => {
  const entries = answered(markSent(put([], change()), '10:100:1', ME), '10:100:1', ME)
  assert.equal(stepOf(one(entries)), 'create')
})

test('refuse note le refus, retryRefused le lève pour un nouvel essai', () => {
  let entries = refuse(put(put([], change()), change({ owner: 8 })), '10:100:1', ME, 'Accès refusé')
  assert.deepEqual(entries.map(e => e.error), ['Accès refusé', null])
  entries = retryRefused(entries, ME)
  assert.deepEqual(entries.map(e => e.error), [null, null])
})

test('forgetRefused abandonne les entrées refusées par le serveur, pour cet athlète seulement', () => {
  let entries = put(put(put([], change()), change({ key: '10:100:2' })), change({ owner: 8 }))
  entries = refuse(refuse(entries, '10:100:1', ME, 'Accès refusé'), '10:100:1', 8, 'Accès refusé')
  assert.deepEqual(forgetRefused(entries, ME).map(e => [e.owner, e.key]), [[ME, '10:100:2'], [8, '10:100:1']])
})

test('recheck demande une relecture avant de continuer', () => {
  const entries = recheck(put([], change({ id: 55 })), '10:100:1', ME)
  assert.equal(stepOf(one(entries)), 'check')
})

// ── rapprochement avec le serveur ────────────────────────────────────────────
test('reconcile retire l\'entrée dont l\'envoi avait réussi sans qu\'on le sache', () => {
  const sent = markSent(put([], change()), '10:100:1', ME)
  const rows = [{ id: 55, key: '10:100:1', weightKg: 60, reps: 5 }]
  assert.deepEqual(reconcile(sent, 10, ME, rows, rules), [])
})

test('reconcile rattache l\'entrée à la ligne du serveur quand la valeur a changé', () => {
  let entries = markSent(put([], change()), '10:100:1', ME)
  entries = put(entries, change({ value: { weightKg: 62.5, reps: 5 } }))
  entries = reconcile(entries, 10, ME, [{ id: 55, key: '10:100:1', weightKg: 60, reps: 5 }], rules)
  assert.deepEqual([one(entries).id, one(entries).doubt, stepOf(one(entries))], [55, false, 'update'])
})

test('reconcile lève le doute quand le serveur n\'a rien : la série se crée', () => {
  const entries = reconcile(markSent(put([], change()), '10:100:1', ME), 10, ME, [], rules)
  assert.equal(stepOf(one(entries)), 'create')
})

test('reconcile oublie une suppression déjà faite, et un identifiant qui n\'existe plus', () => {
  const gone = put([], change({ value: null, id: 55 }))
  assert.deepEqual(reconcile(gone, 10, ME, [], rules), [])

  const stale = put([], change({ id: 55, value: { weightKg: 62.5, reps: 5 } }))
  assert.deepEqual([one(reconcile(stale, 10, ME, [], rules)).id, stepOf(one(reconcile(stale, 10, ME, [], rules)))], [null, 'create'])
})

test('reconcile ne touche ni aux autres séances ni aux autres athlètes', () => {
  const entries = [...put([], change({ key: '11:200:1', scope: 11 })), ...put([], change({ owner: 8 }))]
  assert.deepEqual(reconcile(entries, 10, ME, [], rules), entries)
})

test('reconcile retrouve par son identifiant une ligne à supprimer dont la clé ne dit rien', () => {
  const extra = put([], { key: 'dup:56', scope: 10, owner: ME, value: null, id: 56, at: 1 })
  const rows = [{ id: 55, key: '10:100:1', weightKg: 60, reps: 5 }, { id: 56, key: '10:100:1', weightKg: 60, reps: 5 }]
  assert.equal(stepOf(one(reconcile(extra, 10, ME, rows, rules))), 'delete')
  assert.deepEqual(reconcile(extra, 10, ME, [rows[0]], rules), []) // déjà supprimée
})

// ── doublons ─────────────────────────────────────────────────────────────────
test('unique garde une ligne par clé : celle qu\'on connaît, sinon la plus ancienne', () => {
  const rows = [
    { id: 57, key: '10:100:1' }, { id: 55, key: '10:100:1' }, { id: 56, key: '10:100:2' }, { id: 58, key: '10:100:2' },
  ]
  assert.deepEqual(unique(rows, keyOf), { rows: [rows[1], rows[2]], extras: [57, 58] })
  assert.deepEqual(unique(rows, keyOf, [57]), { rows: [rows[0], rows[2]], extras: [55, 58] })
})

test('unique ne rapproche jamais deux lignes sans clé', () => {
  const rows = [{ id: 1, key: null }, { id: 2, key: null }, { id: 3 }]
  assert.deepEqual(unique(rows, keyOf), { rows, extras: [] })
})

// ── ce que l'écran affiche ───────────────────────────────────────────────────
const toRow = entry => ({ id: entry.id, key: entry.key, ...entry.value, pending: true })
const view = { keyOf, toRow }

test('overlay ajoute les séries en attente à celles du serveur', () => {
  const rows = [{ id: 55, key: '10:100:1', weightKg: 60, reps: 5 }]
  const entries = put([], change({ key: '10:100:2', value: { weightKg: 60, reps: 4 } }))
  assert.deepEqual(overlay(rows, entries, 10, ME, view), [rows[0], { id: null, key: '10:100:2', weightKg: 60, reps: 4, pending: true }])
})

test('overlay remplace sur place une série corrigée et retire une série décochée', () => {
  const rows = [{ id: 55, key: '10:100:1', weightKg: 60, reps: 5 }, { id: 56, key: '10:100:2', weightKg: 60, reps: 5 }]
  const edited = put([], change({ id: 55, value: { weightKg: 62.5, reps: 5 } }))
  assert.deepEqual(overlay(rows, edited, 10, ME, view), [{ id: 55, key: '10:100:1', weightKg: 62.5, reps: 5, pending: true }, rows[1]])

  const removed = put([], change({ id: 55, value: null }))
  assert.deepEqual(overlay(rows, removed, 10, ME, view), [rows[1]])
})

test('overlay ignore les autres séances et les autres athlètes', () => {
  const rows = [{ id: 55, key: '10:100:1', weightKg: 60, reps: 5 }]
  const entries = [...put([], change({ key: '11:200:1', scope: 11 })), ...put([], change({ owner: 8, value: null, id: 55 }))]
  assert.deepEqual(overlay(rows, entries, 10, ME, view), rows)
})

// ── ordre d'envoi ────────────────────────────────────────────────────────────
test('nextEntry prend la plus ancienne entrée de l\'athlète, hors refus', () => {
  let entries = put([], change({ key: 'b', at: 2000 }))
  entries = put(entries, change({ key: 'a', at: 1000 }))
  entries = put(entries, change({ key: 'c', at: 500, owner: 8 }))
  assert.equal(nextEntry(entries, ME).key, 'a')
  assert.equal(nextEntry(refuse(entries, 'a', ME, 'non'), ME).key, 'b')
  assert.equal(nextEntry(entries, 9), null)
})
