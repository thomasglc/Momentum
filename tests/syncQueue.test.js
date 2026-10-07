import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createSyncQueue, RETRY_MS } from '../src/services/syncQueue.js'

const ME = 7
const set = (setNumber, over = {}) => ({ key: `10:100:${setNumber}`, scope: 10, weightKg: 60, reps: 5, ...over })
const httpError = status => Object.assign(new Error(`Erreur ${status}`), { status })
const offline = () => new Error('Pas de connexion')

// ── Faux Directus : traite, refuse, se tait, ou traite sans répondre ─────────
function fakeServer() {
  const server = {
    rows: [],
    calls: [],
    mode: 'ok',   // 'ok' | 'offline' | 'lost' (écrit puis ne répond pas) | un code HTTP à renvoyer
    gate: null,   // promesse à attendre avant de répondre : pour agir pendant un envoi
    nextId: 55,
  }
  async function reply(call, work) {
    server.calls.push(call)
    if (server.gate) await server.gate
    if (server.mode === 'offline') throw offline()
    if (typeof server.mode === 'number') throw httpError(server.mode)
    const result = work()
    if (server.mode === 'lost') throw offline()
    return result
  }
  const find = id => server.rows.find(row => row.id === id)
  server.adapter = {
    keyOf: row => row.key ?? null,
    same: (value, row) => value.weightKg === row.weightKg && value.reps === row.reps,
    read: scope => reply(`read ${scope}`, () => server.rows.filter(row => row.scope === scope).map(row => ({ ...row }))),
    create: value => reply(`create ${value.key}`, () => {
      const row = { id: server.nextId++, ...value }
      server.rows.push(row)
      return { ...row }
    }),
    update: (id, value) => reply(`update ${id}`, () => {
      if (!find(id)) throw httpError(403)
      Object.assign(find(id), value)
      return { ...find(id) }
    }),
    remove: id => reply(`remove ${id}`, () => {
      if (!find(id)) throw httpError(403)
      server.rows = server.rows.filter(row => row.id !== id)
      return null
    }),
  }
  return server
}

function harness({ saved = null, owner = ME } = {}) {
  const server = fakeServer()
  const box = { saved, owner, states: [], read: [], savedRows: [], removed: [], scheduled: [] }
  const make = () => createSyncQueue({
    adapter: server.adapter,
    storage: { read: () => box.saved, write: (entries) => { box.saved = structuredClone(entries) } },
    owner: () => box.owner,
    onChange: state => box.states.push(state),
    onRead: (scope, rows) => box.read.push([scope, rows.map(row => row.id)]),
    onSaved: row => box.savedRows.push(row.id),
    onRemoved: id => box.removed.push(id),
    timers: {
      set: (run, ms) => { const timer = { run, ms }; box.scheduled.push(timer); return timer },
      clear: (timer) => { box.scheduled = box.scheduled.filter(t => t !== timer) },
    },
  })
  const queue = make()
  const put = (value, over = {}) => queue.put({ key: value?.key ?? over.key, scope: 10, value, at: Date.now(), ...over })
  /** Laisse passer le délai avant le nouvel essai */
  const retry = async () => {
    const [timer] = box.scheduled
    assert.ok(timer, 'aucun nouvel essai programmé')
    box.scheduled = []
    timer.run()
    await queue.idle()
  }
  return { server, box, queue, put, retry, restart: make }
}

// ── envoi ────────────────────────────────────────────────────────────────────
test('une série cochée part aussitôt et quitte la boîte d\'envoi', async () => {
  const { server, box, queue, put } = harness()
  put(set(1))
  assert.equal(queue.state().entries.length, 1) // affichable tout de suite
  await queue.idle()

  assert.deepEqual(server.calls, ['create 10:100:1'])
  assert.deepEqual(server.rows, [{ id: 55, ...set(1) }])
  assert.deepEqual(queue.state(), { entries: [], failing: false })
  assert.deepEqual(box.savedRows, [55])
  assert.deepEqual(box.saved, [])
})

test('les envois se suivent, le plus ancien d\'abord', async () => {
  const { server, queue, put } = harness()
  put(set(2), { at: 2000 })
  put(set(1), { at: 1000 })
  put(set(3), { at: 3000 })
  await queue.idle()
  // La série 2 était déjà partie quand les autres ont été cochées ; ensuite, par ancienneté
  assert.deepEqual(server.calls, ['create 10:100:2', 'create 10:100:1', 'create 10:100:3'])
})

test('une correction faite pendant l\'envoi part ensuite, sur la même ligne', async () => {
  const { server, queue, put } = harness()
  let open
  server.gate = new Promise((resolve) => { open = resolve })
  put(set(1))
  put(set(1, { weightKg: 62.5 }))
  server.gate = null
  open()
  await queue.idle()

  assert.deepEqual(server.calls, ['create 10:100:1', 'update 55'])
  assert.deepEqual(server.rows, [{ id: 55, ...set(1, { weightKg: 62.5 }) }])
  assert.deepEqual(queue.state().entries, [])
})

test('une série décochée pendant son envoi est supprimée du serveur', async () => {
  const { server, box, queue, put } = harness()
  let open
  server.gate = new Promise((resolve) => { open = resolve })
  put(set(1))
  put(null, { key: '10:100:1' })
  server.gate = null
  open()
  await queue.idle()

  assert.deepEqual(server.calls, ['create 10:100:1', 'remove 55'])
  assert.deepEqual(server.rows, [])
  assert.deepEqual(box.removed, [55])
})

test('corriger puis décocher une série du serveur : une modification, ou une suppression', async () => {
  const { server, queue, put } = harness()
  server.rows.push({ id: 40, ...set(1) })
  put(set(1, { reps: 4 }), { id: 40 })
  await queue.idle()
  put(null, { key: '10:100:1', id: 40 })
  await queue.idle()
  assert.deepEqual(server.calls, ['update 40', 'remove 40'])
  assert.deepEqual(server.rows, [])
})

// ── réseau ───────────────────────────────────────────────────────────────────
test('sans réseau, la série reste dans la boîte et repart au nouvel essai, après relecture', async () => {
  const { server, box, queue, put, retry } = harness()
  server.mode = 'offline'
  put(set(1))
  await queue.idle()
  assert.equal(queue.state().failing, true)
  assert.equal(queue.state().entries.length, 1)
  assert.equal(box.saved.length, 1) // gardée sur le téléphone
  assert.deepEqual(box.scheduled.map(t => t.ms), [RETRY_MS[0]])

  server.mode = 'ok'
  await retry()
  assert.deepEqual(server.calls, ['create 10:100:1', 'read 10', 'create 10:100:1'])
  assert.deepEqual(server.rows.map(row => row.id), [55])
  assert.deepEqual(queue.state(), { entries: [], failing: false })
})

test('réponse perdue : la série déjà créée n\'est pas créée deux fois', async () => {
  const { server, box, queue, put, retry } = harness()
  server.mode = 'lost'
  put(set(1))
  await queue.idle()
  assert.equal(server.rows.length, 1) // le serveur l'a bien reçue
  assert.equal(queue.state().entries.length, 1)

  server.mode = 'ok'
  await retry()
  assert.deepEqual(server.calls, ['create 10:100:1', 'read 10'])
  assert.equal(server.rows.length, 1)
  assert.deepEqual(queue.state().entries, [])
  assert.deepEqual(box.read, [[10, [55]]]) // l'écran apprend la ligne par la relecture
})

test('réponse perdue puis correction : la ligne existante est modifiée', async () => {
  const { server, queue, put, retry } = harness()
  server.mode = 'lost'
  put(set(1))
  await queue.idle()
  server.mode = 'offline'
  put(set(1, { reps: 4 }))
  await queue.idle()

  server.mode = 'ok'
  await retry()
  assert.deepEqual(server.calls.slice(-2), ['read 10', 'update 55'])
  assert.deepEqual(server.rows, [{ id: 55, ...set(1, { reps: 4 }) }])
})

test('série cochée puis décochée sans réseau : rien n\'arrive au serveur', async () => {
  const { server, queue, put, retry } = harness()
  server.mode = 'offline'
  put(set(1))
  await queue.idle()
  put(null, { key: '10:100:1' })
  await queue.idle()
  assert.equal(queue.state().entries.length, 1) // un envoi est parti : on ne sait pas, on vérifiera

  server.mode = 'ok'
  await retry()
  assert.deepEqual(server.calls.filter(call => !call.startsWith('read')), ['create 10:100:1'])
  assert.deepEqual(server.rows, [])
  assert.deepEqual(queue.state().entries, [])
})

test('les essais s\'espacent, jusqu\'à 30 s, puis repartent de zéro après un succès', async () => {
  const { server, box, queue, put, retry } = harness()
  server.mode = 'offline'
  put(set(1))
  await queue.idle()
  const delays = [box.scheduled[0].ms]
  for (let i = 0; i < 6; i++) { await retry(); delays.push(box.scheduled[0].ms) }
  assert.deepEqual(delays, [2000, 4000, 8000, 16000, 30000, 30000, 30000])

  server.mode = 'ok'
  await retry()
  assert.deepEqual(box.scheduled, [])
  server.mode = 'offline'
  put(set(2))
  await queue.idle()
  assert.deepEqual(box.scheduled.map(t => t.ms), [2000])
})

test('une erreur du serveur (500) se réessaie comme une coupure', async () => {
  const { server, queue, put, retry } = harness()
  server.mode = 500
  put(set(1))
  await queue.idle()
  assert.deepEqual([queue.state().failing, queue.state().entries[0].error], [true, null])
  server.mode = 'ok'
  await retry()
  assert.equal(server.rows.length, 1)
})

// ── refus ────────────────────────────────────────────────────────────────────
test('un refus du serveur ne se réessaie pas tout seul et ne bloque pas les autres séries', async () => {
  const { server, box, queue, put } = harness()
  server.mode = 403
  put(set(1), { at: 1000 })
  await queue.idle()
  assert.deepEqual(queue.state().entries.map(e => e.error), ['Erreur 403'])
  assert.equal(queue.state().failing, false)
  assert.deepEqual(box.scheduled, [])

  server.mode = 'ok'
  put(set(2), { at: 2000 })
  await queue.idle()
  assert.deepEqual(server.rows.map(row => row.key), ['10:100:2'])

  queue.retry()
  await queue.idle()
  assert.deepEqual(server.rows.map(row => row.key), ['10:100:2', '10:100:1'])
  assert.deepEqual(queue.state().entries, [])
})

test('forget abandonne une série refusée : elle quitte la boîte, rien ne repart', async () => {
  const { server, box, queue, put } = harness()
  server.mode = 403
  put(set(1))
  await queue.idle()
  server.mode = 'ok'
  queue.forget()
  await queue.idle()
  assert.deepEqual(queue.state().entries, [])
  assert.deepEqual(box.saved, [])
  assert.deepEqual(server.calls, ['create 10:100:1'])
})

test('une session expirée (401) n\'est pas un refus : la série attend', async () => {
  const { server, queue, put } = harness()
  server.mode = 401
  put(set(1))
  await queue.idle()
  assert.deepEqual(queue.state().entries.map(e => e.error), [null])
})

test('modifier une ligne disparue du serveur la recrée', async () => {
  const { server, queue, put } = harness()
  put(set(1, { reps: 4 }), { id: 40 }) // le téléphone la croit sur le serveur
  await queue.idle()
  assert.deepEqual(server.calls, ['update 40', 'read 10', 'create 10:100:1'])
  assert.deepEqual(server.rows, [{ id: 55, ...set(1, { reps: 4 }) }])
})

test('une modification refusée sur une ligne qui existe finit en refus, sans boucle', async () => {
  const { server, queue, put } = harness()
  server.rows.push({ id: 40, ...set(1) })
  server.adapter.update = async (id) => { server.calls.push(`update ${id}`); throw httpError(403) }
  put(set(1, { reps: 4 }), { id: 40 })
  await queue.idle()
  assert.deepEqual(server.calls, ['update 40', 'read 10', 'update 40'])
  assert.deepEqual(queue.state().entries.map(e => e.error), ['Erreur 403'])
})

test('supprimer une ligne déjà disparue vaut suppression', async () => {
  const { server, box, queue, put } = harness()
  put(null, { key: '10:100:1', id: 40 })
  await queue.idle()
  assert.deepEqual(server.calls, ['remove 40'])
  assert.deepEqual(queue.state().entries, [])
  assert.deepEqual(box.removed, [40])
})

// ── relectures ───────────────────────────────────────────────────────────────
test('refresh relit une séance avant tout envoi et rapproche la boîte', async () => {
  const { server, box, queue, put } = harness()
  server.rows.push({ id: 40, ...set(1) })
  server.mode = 'offline'
  put(set(1, { reps: 4 }), { doubt: true }) // cochée sans savoir ce que le serveur avait
  await queue.idle()

  server.mode = 'ok'
  await queue.refresh(10)
  await queue.idle()
  assert.deepEqual(server.calls, ['read 10', 'read 10', 'update 40'])
  assert.deepEqual(server.rows, [{ id: 40, ...set(1, { reps: 4 }) }])
  assert.deepEqual(box.read, [[10, [40]]])
})

test('une relecture demandée passe avant les envois qui attendent', async () => {
  const { server, queue, put } = harness()
  let open
  server.gate = new Promise((resolve) => { open = resolve })
  put(set(1))
  put(set(2))
  const read = queue.refresh(10)
  server.gate = null
  open()
  await read
  await queue.idle()
  assert.deepEqual(server.calls, ['create 10:100:1', 'read 10', 'create 10:100:2'])
})

test('refresh échoue sans réseau, et la relecture se refait au nouvel essai', async () => {
  const { server, box, queue, retry } = harness()
  server.rows.push({ id: 40, ...set(1) })
  server.mode = 'offline'
  await assert.rejects(queue.refresh(10), /Pas de connexion/)
  assert.equal(queue.state().failing, false) // rien n'attend d'être envoyé

  server.mode = 'ok'
  await retry()
  assert.deepEqual(box.read, [[10, [40]]])
})

// ── athlète ──────────────────────────────────────────────────────────────────
test('rien ne part sans athlète connecté, ni pour un autre athlète', async () => {
  const { server, box, queue, put } = harness()
  box.owner = null
  queue.flush()
  await queue.idle()
  box.owner = 8
  put(set(1))
  await queue.idle()
  box.owner = ME
  put(set(2))
  await queue.idle()
  assert.deepEqual(server.calls, ['create 10:100:1', 'create 10:100:2'])

  // Une série restée en attente pour l'athlète 8 ne part pas sous le compte de l'athlète 7
  server.mode = 'offline'
  box.owner = 8
  put(set(3))
  await queue.idle()
  server.mode = 'ok'
  box.owner = ME
  queue.flush()
  await queue.idle()
  assert.deepEqual(server.calls.filter(call => call.includes('100:3')), ['create 10:100:3'])
  assert.equal(queue.state().entries.length, 1)
})

test('la boîte survit à la fermeture de l\'app', async () => {
  const first = harness()
  first.server.mode = 'offline'
  first.put(set(1))
  await first.queue.idle()

  // Réouverture : même stockage, nouvelle file
  const second = harness({ saved: first.box.saved })
  assert.equal(second.queue.state().entries.length, 1)
  second.queue.flush()
  await second.queue.idle()
  assert.deepEqual(second.server.calls, ['read 10', 'create 10:100:1'])
  assert.deepEqual(second.box.saved, [])
})

test('chaque changement est annoncé à l\'écran', async () => {
  const { server, box, queue, put } = harness()
  server.mode = 'offline'
  put(set(1))
  await queue.idle()
  assert.deepEqual(box.states.at(-1), queue.state())
  assert.equal(box.states.at(-1).failing, true)
  assert.equal(box.states[0].entries.length, 1)
})
