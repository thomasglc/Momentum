// Envoi de la boîte d'envoi vers Directus, en arrière-plan : l'écran n'attend jamais le réseau.
// Sans Vue ni navigateur (stockage, horloge et serveur sont fournis) : testable avec node --test.
// Les règles sur les entrées sont dans utils/outbox.
import {
  put as putEntry, stepOf, markSent, answered, settle, refuse, retryRefused, forgetRefused, recheck, reconcile, nextEntry,
} from '../utils/outbox.js'

/** Attente avant chaque nouvel essai quand le réseau ne répond pas */
export const RETRY_MS = [2000, 4000, 8000, 16000, 30000]

// Le serveur a répondu non (4xx) : la demande n'a pas été exécutée
const answeredNo = e => e?.status >= 400 && e.status < 500
// Un non qui ne changera pas en réessayant. 401 : session à rouvrir ; 408 et 429 : à retenter plus tard.
const isRefusal = e => answeredNo(e) && ![401, 408, 429].includes(e.status)
// La ligne visée n'existe plus. Directus répond 403 à la place de 404 pour ne pas dire ce qui existe.
const isGone = e => e?.status === 404 || e?.status === 403

const browserTimers = { set: (run, ms) => setTimeout(run, ms), clear: timer => clearTimeout(timer) }

/**
 * adapter : { read(scope) → lignes, create(valeur) → ligne, update(id, valeur) → ligne, remove(id),
 *             keyOf(ligne), same(valeur, ligne) }
 * storage : { read() → entrées ou null, write(entrées) }
 * owner() : profil connecté, ou null
 * onChange({ entries, failing }) : à chaque changement de la boîte
 * onRead(scope, lignes), onSaved(ligne), onRemoved(id) : pour tenir à jour ce que l'écran sait du serveur
 */
export function createSyncQueue({
  adapter, storage, owner,
  onChange = () => {}, onRead = () => {}, onSaved = () => {}, onRemoved = () => {},
  timers = browserTimers,
}) {
  let entries = storage.read() ?? []
  let failing = false      // des envois attendent et le dernier essai n'a pas abouti
  let running = null       // promesse de l'envoi en cours
  let again = false        // la boîte a changé pendant l'envoi
  let attempt = 0          // essais ratés d'affilée
  let timer = null
  const wanted = new Set() // périmètres à relire avant tout envoi
  const waiters = new Map() // périmètre → promesses en attente de sa relecture

  const state = () => ({ entries, failing })
  const announce = () => onChange(state())

  function commit(next) {
    if (next === entries) return
    entries = next
    storage.write(entries)
    announce()
  }

  /** Note l'état voulu d'une ligne et lance l'envoi. Voir put dans utils/outbox. */
  function put(change) {
    const me = owner()
    if (me == null) return
    commit(putEntry(entries, { ...change, owner: me }))
    flush()
  }

  /** Relit un périmètre sur le serveur, avant tout envoi. La promesse échoue si le réseau ne répond pas. */
  function refresh(scope) {
    const done = new Promise((resolve, reject) => {
      waiters.set(scope, [...(waiters.get(scope) ?? []), { resolve, reject }])
    })
    wanted.add(scope)
    flush()
    return done
  }

  /** Relance les envois que le serveur avait refusés */
  function retry() {
    const me = owner()
    if (me != null) commit(retryRefused(entries, me))
    attempt = 0
    flush()
  }

  /** Abandonne les envois que le serveur avait refusés */
  function forget() {
    const me = owner()
    if (me != null) commit(forgetRefused(entries, me))
  }

  function answer(scope, how, value) {
    for (const waiter of waiters.get(scope) ?? []) waiter[how](value)
    waiters.delete(scope)
  }

  async function read(scope, me) {
    let rows
    try {
      rows = await adapter.read(scope)
    } catch (e) {
      answer(scope, 'reject', e)
      throw e
    }
    wanted.delete(scope)
    commit(reconcile(entries, scope, me, rows, adapter))
    onRead(scope, rows)
    answer(scope, 'resolve')
  }

  // Une étape pour une entrée. `rechecked` : clés déjà revérifiées pendant cet envoi.
  async function send(entry, rechecked) {
    const { key, owner: me, rev } = entry
    switch (stepOf(entry)) {
      case 'check':
        return read(entry.scope, me)
      case 'drop':
        return commit(entries.filter(e => e !== entry))
      case 'create': {
        commit(markSent(entries, key, me))
        let row
        try {
          row = await adapter.create(entry.value)
        } catch (e) {
          if (answeredNo(e)) commit(answered(entries, key, me))
          throw e
        }
        commit(settle(entries, key, me, rev, row))
        return onSaved(row)
      }
      case 'update': {
        let row
        try {
          row = await adapter.update(entry.id, entry.value)
        } catch (e) {
          // La ligne a peut-être disparu : on relit une fois, et elle se recrée s'il le faut
          if (!isGone(e) || rechecked.has(key)) throw e
          rechecked.add(key)
          return commit(recheck(entries, key, me))
        }
        commit(settle(entries, key, me, rev, row))
        return onSaved(row)
      }
      case 'delete': {
        try {
          await adapter.remove(entry.id)
        } catch (e) {
          if (!isGone(e)) throw e // déjà supprimée : c'est fait
        }
        commit(settle(entries, key, me, rev, null))
        return onRemoved(entry.id)
      }
    }
  }

  // Un passage : les relectures d'abord, puis les entrées, la plus ancienne en tête. Renvoie true si le réseau a manqué.
  async function pass() {
    const rechecked = new Set()
    for (;;) {
      const me = owner()
      if (me == null) return false
      try {
        const [scope] = wanted
        if (scope !== undefined) { await read(scope, me); continue }
        const entry = nextEntry(entries, me)
        if (!entry) return false
        try {
          await send(entry, rechecked)
        } catch (e) {
          if (!isRefusal(e)) throw e
          commit(refuse(entries, entry.key, entry.owner, e.message))
        }
      } catch {
        return true
      }
    }
  }

  async function run() {
    timers.clear(timer)
    timer = null
    let failed
    do {
      again = false
      failed = await pass()
    } while (again && !failed)
    running = null

    if (failed) {
      timer = timers.set(flush, RETRY_MS[Math.min(attempt, RETRY_MS.length - 1)])
      attempt++
    } else {
      attempt = 0
    }
    const me = owner()
    const waiting = failed && entries.some(entry => entry.owner === me && !entry.error)
    if (waiting !== failing) {
      failing = waiting
      announce()
    }
  }

  /** Envoie ce qui attend. Sans effet si un envoi est déjà en cours : il repassera sur la boîte. */
  function flush() {
    if (running) { again = true; return running }
    running = run()
    return running
  }

  /** Promesse tenue quand plus aucun envoi n'est en cours */
  const idle = () => running ?? Promise.resolve()

  return { put, refresh, retry, forget, flush, idle, state }
}
