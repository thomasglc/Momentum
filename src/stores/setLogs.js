import { defineStore } from 'pinia'
import { computed, shallowRef, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import {
  fetchSessionLogs, fetchExerciseLogs, fetchStationLogs, canLogStations, createSetLog, updateSetLog, deleteSetLog,
} from '@/services/setLogService'
import { createSyncQueue } from '@/services/syncQueue'
import { overlay, unique } from '@/utils/outbox'
import { toSet, groupHistory, previousByExercise, setKey, keyOfSet, sameSetValues, emptyTyping } from '@/utils/setLogs'

const LS_OUTBOX = 'momentum-set-outbox-v1' // séries cochées, pas encore envoyées
const LS_COPY   = 'momentum-set-session-v1' // ce que Directus sait de la séance en cours, pour la rouvrir sans réseau
const LS_TYPING = 'momentum-set-typing-v1'  // ce que l'athlète a tapé dans la séance en cours, série cochée ou non
// Première ouverture d'une séance sur ce téléphone : on laisse ce délai au réseau, puis la saisie s'ouvre de toute façon
const FIRST_LOAD_GRACE_MS = 1500
// Préfixe des entrées qui suppriment un doublon trouvé sur le serveur
const DUPLICATE = 'dup:'

function readJson(key) {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') } catch { return null }
}
function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {} // quota dépassé : on continue en mémoire
}

// Séries et tours réalisés de la séance affichée, et dernière séance précédente de chacun de ses exercices et stations.
// Le téléphone d'abord : une série cochée s'affiche tout de suite et part vers Directus en arrière-plan.
// Ce qui attend d'être envoyé est dans la boîte d'envoi (utils/outbox, services/syncQueue).
export const useSetLogStore = defineStore('setLogs', () => {
  const sessionId = shallowRef(null)
  const server    = shallowRef([])    // séries de la séance, telles que Directus les connaît
  const previous  = shallowRef({})    // exerciseId → { date, sets }
  const ready     = shallowRef(false) // la saisie est ouverte
  const loadError = shallowRef(null)  // séries déjà enregistrées inconnues : ni réseau, ni copie sur le téléphone
  const typing    = shallowRef({})    // ligne d'exercice → saisie en cours (utils/setLogs : valeurs tapées et reportées)
  let known = false                   // `server` reflète bien Directus (lu à l'instant, ou copie du téléphone)
  // Directus sait enregistrer un tour sur une station (scripts/add-station-logs.cjs) : les circuits à tours se saisissent
  const stationLogging = shallowRef(canLogStations())

  const profileId = () => useAuthStore().user?.id ?? null

  // ── Boîte d'envoi ──────────────────────────────────────────────────────────
  // Ce qui part vers Directus. Un tour de station porte la clé de sa ligne, sa station et sa distance ;
  // une série de muscu n'envoie aucun de ces champs, que Directus n'a peut-être pas encore.
  const onStation = values => values.kind === 'station'
  const measuresOf = values => ({
    weight_kg: values.weightKg,
    reps: values.reps,
    duration_sec: values.durationSec,
    ...(onStation(values) ? { distance_m: values.distanceM ?? null } : {}),
  })
  const lineOf = values => (onStation(values)
    ? { line_key: values.lineId, station_id: values.stationId }
    : { block_strength_exercise_id: values.lineId, exercise_id: values.exerciseId })

  const queue = createSyncQueue({
    owner: profileId,
    storage: { read: () => readJson(LS_OUTBOX), write: entries => writeJson(LS_OUTBOX, entries) },
    adapter: {
      keyOf: keyOfSet,
      same: sameSetValues,
      read: async (id) => {
        const logs = await fetchSessionLogs(profileId(), id)
        stationLogging.value = canLogStations() // la lecture vient de dire si Directus a les champs des stations
        return logs.map(toSet)
      },
      create: async values => toSet(await createSetLog({
        athlete_profile_id: profileId(),
        session_id: values.sessionId,
        set_number: values.setNumber,
        ...lineOf(values),
        ...measuresOf(values),
      })),
      update: async (id, values) => toSet(await updateSetLog(id, measuresOf(values))),
      remove: id => deleteSetLog(id),
    },
    onChange: (state) => {
      entries.value = state.entries
      failing.value = state.failing
    },
    // Directus vient de dire où en est une séance. Deux lignes pour la même série : la seconde est un doublon, on la supprime.
    onRead: (scope, sets) => {
      const shown = scope === sessionId.value
      const { rows, extras } = unique(sets, keyOfSet, shown ? server.value.map(set => set.id) : [])
      for (const id of extras) queue.put({ key: `${DUPLICATE}${id}`, scope, value: null, id, at: Date.now() })
      if (!shown) return
      server.value = rows
      known = true
      loadError.value = null
      saveCopy()
    },
    onSaved: (set) => {
      if (set.sessionId !== sessionId.value) return
      server.value = [...server.value.filter(row => row.id !== set.id), set]
      saveCopy()
    },
    onRemoved: (id) => {
      if (!server.value.some(set => set.id === id)) return
      server.value = server.value.filter(set => set.id !== id)
      saveCopy()
    },
  })

  const entries = shallowRef(queue.state().entries)
  const failing = shallowRef(false) // des séries attendent et le réseau ne répond pas

  // Ce qui était resté en attente repart dès que l'athlète est connu, au retour du réseau et au retour sur l'app
  watch(profileId, (id) => { if (id != null) queue.flush() }, { immediate: true })
  window.addEventListener('online', () => queue.flush())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') queue.flush()
  })

  // ── Ce que l'écran affiche ─────────────────────────────────────────────────
  const view = { keyOf: keyOfSet, toRow: entry => ({ ...entry.value, id: entry.id, pending: true }) }
  const sets = computed(() =>
    (sessionId.value == null ? [] : overlay(server.value, entries.value, sessionId.value, profileId(), view)))

  const mine = computed(() => entries.value.filter(entry => entry.owner === profileId() && !entry.key.startsWith(DUPLICATE)))
  /** Séries en attente parce que le réseau ne répond pas (0 pendant un envoi normal) */
  const waiting = computed(() => (failing.value ? mine.value.filter(entry => !entry.error).length : 0))
  /** Séries que le serveur a refusées : [{ key, error }] */
  const refused = computed(() => mine.value.filter(entry => entry.error))

  // ── Copie de la séance sur le téléphone ────────────────────────────────────
  function readCopy(id) {
    const copy = readJson(LS_COPY)
    return copy && copy.owner === profileId() && copy.sessionId === id ? copy : null
  }
  function saveCopy() {
    if (!known) return
    writeJson(LS_COPY, { owner: profileId(), sessionId: sessionId.value, sets: server.value, previous: previous.value })
  }

  // ── Saisie en cours : elle survit au repli d'un exercice, à un changement d'écran et à un rechargement ──
  const NO_TYPING = emptyTyping()
  const typingOf = lineId => typing.value[lineId] ?? NO_TYPING
  function setTyping(lineId, next) {
    typing.value = { ...typing.value, [lineId]: next }
    writeJson(LS_TYPING, { owner: profileId(), sessionId: sessionId.value, lines: typing.value })
  }
  function readTyping(id) {
    const saved = readJson(LS_TYPING)
    return saved && saved.owner === profileId() && saved.sessionId === id ? saved.lines ?? {} : {}
  }

  // Dernière séance de chaque exercice ou de chaque station : complète ce qu'on sait déjà
  async function loadPrevious(id, fetchLogs) {
    try {
      const past = await fetchLogs()
      if (sessionId.value !== id) return // l'athlète a changé de séance entre-temps
      previous.value = { ...previous.value, ...previousByExercise(past.map(toSet), id) }
      saveCopy()
    } catch {} // sans réseau, les propositions restent celles de la copie
  }

  /**
   * Ouvre une séance : la copie du téléphone tout de suite, Directus dès qu'il répond.
   * exerciseIds, stationIds : ce que la séance fait travailler, pour retrouver la séance précédente de chacun.
   */
  async function loadSession(id, { exerciseIds = [], stationIds = [] } = {}) {
    sessionId.value = id
    loadError.value = null
    const copy = readCopy(id)
    server.value   = copy?.sets ?? []
    previous.value = copy?.previous ?? {}
    typing.value   = readTyping(id)
    known          = !!copy
    ready.value    = known

    if (!profileId()) { loadError.value = 'Profil athlète introuvable'; return }
    if (exerciseIds.length) loadPrevious(id, () => fetchExerciseLogs(profileId(), exerciseIds))
    const loadStations = () => {
      if (stationIds.length && canLogStations()) loadPrevious(id, () => fetchStationLogs(profileId(), stationIds))
    }
    // Tant qu'on ne sait pas si Directus enregistre les stations, leur historique attend la relecture de la séance
    const stationsKnown = canLogStations()
    if (stationsKnown) loadStations()
    // La relecture passe par la file : elle ne croise jamais un envoi, et se refait seule si le réseau manque
    const read = queue.refresh(id)
      .then(() => { if (!stationsKnown && sessionId.value === id) loadStations() })
      .catch((e) => { if (sessionId.value === id && !known) loadError.value = e.message })
    if (ready.value) return
    await Promise.race([read, new Promise(resolve => setTimeout(resolve, FIRST_LOAD_GRACE_MS))])
    if (sessionId.value === id) ready.value = true
  }

  function setsForLine(lineId) {
    return sets.value.filter(s => s.lineId === lineId)
  }

  const onServer = key => server.value.find(set => keyOfSet(set) === key) ?? null

  /** Coche ou corrige une série ou un tour : il s'affiche aussitôt. values = { weightKg, reps, durationSec, distanceM } */
  function saveSet(line, setNumber, values) {
    const id = sessionId.value
    const key = setKey(id, line.id, setNumber)
    const date = sets.value.find(set => keyOfSet(set) === key)?.date ?? new Date().toISOString()
    queue.put({
      key,
      scope: id,
      id: onServer(key)?.id ?? null,
      // Sans savoir ce que Directus a déjà, on relira la séance avant de créer la série
      doubt: !known,
      at: Date.now(),
      value: {
        kind: line.kind ?? 'exercise',
        lineId: line.id,
        exerciseId: line.exerciseId ?? null,
        stationId: line.stationId ?? null,
        sessionId: id,
        setNumber,
        ...values,
        date,
      },
    })
  }

  /** Décoche une série */
  function removeSet(lineId, setNumber) {
    const id = sessionId.value
    const key = setKey(id, lineId, setNumber)
    queue.put({ key, scope: id, id: onServer(key)?.id ?? null, doubt: !known, at: Date.now(), value: null })
  }

  /** Séances passées de l'exercice ou de la station d'une ligne, la plus récente d'abord */
  async function loadHistory(line) {
    const logs = line.kind === 'station'
      ? await fetchStationLogs(profileId(), [line.stationId], 200)
      : await fetchExerciseLogs(profileId(), [line.exerciseId], 200)
    return groupHistory(logs.map(toSet))
  }

  return {
    sessionId, sets, previous, ready, loadError, waiting, refused, stationLogging,
    loadSession, setsForLine, saveSet, removeSet, typingOf, setTyping,
    retry: queue.retry, forget: queue.forget, loadHistory,
  }
})
