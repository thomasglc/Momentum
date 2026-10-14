import { defineStore } from 'pinia'
import { computed, shallowRef, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import {
  canTakeNotes, fetchRecentNotes, fetchSessionNotes, createNote, updateNote, deleteNote,
} from '@/services/noteService'
import { createSyncQueue } from '@/services/syncQueue'
import { overlay, unique } from '@/utils/outbox'
import { cleanNote, keyOfNote, noteKey, sameNote, toNote } from '@/utils/notes'
import { refKeyOf } from '@/utils/setLogs'

const LS_OUTBOX = 'momentum-note-outbox-v1' // notes tapées, pas encore envoyées
const LS_COPY   = 'momentum-notes-v1'       // notes de l'athlète telles que Directus les connaît, pour les rappeler sans réseau
// Préfixe des entrées qui suppriment un doublon trouvé sur le serveur
const DUPLICATE = 'dup:'

function readJson(key) {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') } catch { return null }
}
function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {} // quota dépassé : on continue en mémoire
}

// Notes d'exercice : celle de la séance affichée, et les notes passées à rappeler.
// Comme les séries (stores/setLogs) : une note tapée est gardée sur le téléphone et part vers Directus en arrière-plan.
export const useExerciseNoteStore = defineStore('exerciseNotes', () => {
  const sessionId = shallowRef(null)
  const server    = shallowRef([])    // notes de l'athlète, toutes séances, telles que Directus les connaît
  // Directus a la collection des notes : sinon, rien ne s'affiche
  const available = shallowRef(canTakeNotes())
  let known = false                   // les notes de la séance affichée ont été lues sur Directus

  const profileId = () => useAuthStore().user?.id ?? null

  // ── Boîte d'envoi ──────────────────────────────────────────────────────────
  const queue = createSyncQueue({
    owner: profileId,
    storage: { read: () => readJson(LS_OUTBOX), write: entries => writeJson(LS_OUTBOX, entries) },
    adapter: {
      keyOf: keyOfNote,
      same: sameNote,
      read: async id => (await fetchSessionNotes(profileId(), id)).map(toNote),
      create: async value => toNote(await createNote({
        athlete_profile_id: profileId(),
        session_id: value.sessionId,
        exercise_id: value.exerciseId,
        station_id: value.stationId,
        note: value.text,
      })),
      update: async (id, value) => toNote(await updateNote(id, { note: value.text })),
      remove: id => deleteNote(id),
    },
    onChange: (state) => {
      entries.value = state.entries
      failing.value = state.failing
    },
    // Directus vient de dire quelles notes a une séance. Deux notes pour le même exercice : la seconde est un doublon.
    onRead: (scope, notes) => {
      const shown = scope === sessionId.value
      const mine = server.value.filter(note => note.sessionId === scope).map(note => note.id)
      const { rows, extras } = unique(notes, keyOfNote, shown ? mine : [])
      for (const id of extras) queue.put({ key: `${DUPLICATE}${id}`, scope, value: null, id, at: Date.now() })
      server.value = [...server.value.filter(note => note.sessionId !== scope), ...rows]
      if (shown) known = true
      saveCopy()
    },
    onSaved: (note) => {
      server.value = [...server.value.filter(row => row.id !== note.id), note]
      saveCopy()
    },
    onRemoved: (id) => {
      if (!server.value.some(note => note.id === id)) return
      server.value = server.value.filter(note => note.id !== id)
      saveCopy()
    },
  })

  const entries = shallowRef(queue.state().entries)
  const failing = shallowRef(false) // des notes attendent et le réseau ne répond pas

  // ── Copie sur le téléphone : les notes passées se rappellent sans réseau ───
  function saveCopy() {
    writeJson(LS_COPY, { owner: profileId(), notes: server.value })
  }
  function restoreCopy() {
    const copy = readJson(LS_COPY)
    if (copy?.owner === profileId() && Array.isArray(copy.notes) && !server.value.length) server.value = copy.notes
  }

  // Ce qui était resté en attente repart dès que l'athlète est connu, au retour du réseau et au retour sur l'app
  watch(profileId, (id) => {
    if (id == null) return
    restoreCopy()
    queue.flush()
  }, { immediate: true })
  window.addEventListener('online', () => queue.flush())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') queue.flush()
  })

  // ── Ce que l'écran affiche ─────────────────────────────────────────────────
  const view = { keyOf: keyOfNote, toRow: entry => ({ ...entry.value, id: entry.id, pending: true }) }
  // Toutes les notes de l'athlète, avec ce qui attend d'être envoyé, quelle que soit la séance
  const notes = computed(() => {
    const me = profileId()
    const scopes = new Set(entries.value.filter(entry => entry.owner === me).map(entry => entry.scope))
    return [...scopes].reduce((rows, scope) => overlay(rows, entries.value, scope, me, view), server.value)
  })

  const mine = computed(() => entries.value.filter(entry => entry.owner === profileId() && !entry.key.startsWith(DUPLICATE)))
  /** Notes en attente parce que le réseau ne répond pas (0 pendant un envoi normal) */
  const waiting = computed(() => (failing.value ? mine.value.filter(entry => !entry.error).length : 0))
  /** Notes que le serveur a refusées : [{ key, error }] */
  const refused = computed(() => mine.value.filter(entry => entry.error))

  /** Note de la séance affichée sur l'exercice ou la station d'une ligne ('' sans note) */
  function noteOf(line) {
    const key = noteKey(sessionId.value, refKeyOf(line))
    return notes.value.find(note => keyOfNote(note) === key)?.text ?? ''
  }

  /** Notes de l'athlète sur l'exercice ou la station d'une ligne, toutes séances */
  function notesFor(line) {
    const ref = refKeyOf(line)
    return ref == null ? [] : notes.value.filter(note => note.ref === ref)
  }

  /** Écrit, corrige ou efface (texte vide) la note de la séance sur une ligne : gardée tout de suite sur le téléphone */
  function saveNote(line, text) {
    const id = sessionId.value
    const ref = refKeyOf(line)
    if (!available.value || id == null || ref == null) return
    const clean = cleanNote(text)
    const key = noteKey(id, ref)
    const current = notes.value.find(note => keyOfNote(note) === key)
    if ((current?.text ?? '') === clean) return
    queue.put({
      key,
      scope: id,
      id: server.value.find(note => keyOfNote(note) === key)?.id ?? null,
      // Sans savoir ce que Directus a déjà, on relira la séance avant de créer la note
      doubt: !known,
      at: Date.now(),
      value: clean
        ? { sessionId: id, ref, exerciseId: line.exerciseId ?? null, stationId: line.stationId ?? null, text: clean, date: current?.date ?? new Date().toISOString() }
        : null,
    })
  }

  // Notes passées de l'athlète. La séance affichée garde ce que sa relecture en a dit (elle passe par la file).
  async function loadRecent() {
    const recent = (await fetchRecentNotes(profileId())).map(toNote)
    available.value = canTakeNotes()
    server.value = [
      ...recent.filter(note => note.sessionId !== sessionId.value),
      ...server.value.filter(note => note.sessionId === sessionId.value),
    ]
    saveCopy()
  }

  /** Ouvre une séance : notes passées et notes de la séance, sans jamais bloquer l'écran */
  async function loadSession(id) {
    sessionId.value = id
    known = false
    if (!profileId()) return
    try {
      // Première fois sur ce téléphone : c'est cette lecture qui dit si Directus a la collection
      if (available.value) loadRecent().catch(() => {})
      else await loadRecent()
    } catch {
      return // collection absente (403), ou pas de réseau : on redemandera à la prochaine séance
    }
    if (!available.value || sessionId.value !== id) return
    // La relecture passe par la file : elle ne croise jamais un envoi, et se refait seule si le réseau manque
    queue.refresh(id).catch(() => {})
  }

  return {
    sessionId, available, notes, waiting, refused,
    loadSession, noteOf, notesFor, saveNote,
    retry: queue.retry, forget: queue.forget,
  }
})
