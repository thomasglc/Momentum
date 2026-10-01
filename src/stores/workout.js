import { defineStore } from 'pinia'
import { computed, shallowRef } from 'vue'
import { elapsedSeconds, remainingSeconds, restProgress, isStale } from '@/utils/workout'
import { unlockAudio, playBeep } from '@/utils/beep'

const LS_KEY = 'momentum-workout'
const TICK_MS = 250
const REST_DONE_DISPLAY_MS = 8000 // durée d'affichage de « repos terminé »

function readSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) ?? 'null')
    if (saved?.sessionId != null && Number.isFinite(saved.startedAt) && !isStale(saved.startedAt, Date.now())) return saved
  } catch {}
  return null
}

// Séance de muscu en cours (une seule à la fois) et chrono de repos.
// Les dates sont en millisecondes ; `now` bat tant qu'il y a quelque chose à afficher.
export const useWorkoutStore = defineStore('workout', () => {
  const saved = readSaved()

  const sessionId  = shallowRef(saved?.sessionId ?? null)
  const startedAt  = shallowRef(saved?.startedAt ?? null)
  const rest       = shallowRef(null) // { endsAt, totalSec, label }
  const restDoneAt = shallowRef(null) // fin du dernier repos allé à son terme
  const now        = shallowRef(Date.now())

  const elapsed       = computed(() => (startedAt.value == null ? 0 : elapsedSeconds(startedAt.value, now.value)))
  const restRemaining = computed(() => (rest.value ? remainingSeconds(rest.value.endsAt, now.value) : 0))
  const restRatio     = computed(() => (rest.value ? restProgress(rest.value.totalSec, restRemaining.value) : 0))
  const restJustDone  = computed(() => restDoneAt.value != null && now.value - restDoneAt.value < REST_DONE_DISPLAY_MS)

  const isRunningFor = id => sessionId.value != null && sessionId.value === id

  // ── Horloge ────────────────────────────────────────────────────────────────
  let timer = null
  const needsClock = () => sessionId.value != null || rest.value != null || restJustDone.value

  function tick() {
    now.value = Date.now()
    if (rest.value && now.value >= rest.value.endsAt) completeRest()
    if (!needsClock()) stopClock()
  }
  function startClock() {
    now.value = Date.now()
    timer ??= setInterval(tick, TICK_MS)
  }
  function stopClock() {
    clearInterval(timer)
    timer = null
  }

  // ── Écran allumé pendant la séance (quand le navigateur le permet) ─────────
  let wakeLock = null
  async function keepScreenOn() {
    try {
      wakeLock = (await navigator.wakeLock?.request('screen')) ?? null
    } catch {
      wakeLock = null
    }
  }
  function letScreenSleep() {
    wakeLock?.release().catch(() => {})
    wakeLock = null
  }

  // Le navigateur relâche le verrou et ralentit les minuteries quand la page passe en arrière-plan
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return
    if (sessionId.value != null) keepScreenOn()
    if (needsClock()) tick()
  })

  function persist() {
    try {
      if (sessionId.value == null) localStorage.removeItem(LS_KEY)
      else localStorage.setItem(LS_KEY, JSON.stringify({ sessionId: sessionId.value, startedAt: startedAt.value }))
    } catch {}
  }

  // ── Séance ─────────────────────────────────────────────────────────────────
  function start(id) {
    unlockAudio()
    sessionId.value = id
    startedAt.value = Date.now()
    persist()
    keepScreenOn()
    startClock()
  }

  function ensureStarted(id) {
    if (!isRunningFor(id)) start(id)
  }

  /** Termine la séance en cours si c'est bien celle-là. Renvoie sa durée en secondes, sinon null. */
  function finish(id) {
    if (!isRunningFor(id)) return null
    const durationSec = elapsedSeconds(startedAt.value, Date.now())
    sessionId.value  = null
    startedAt.value  = null
    rest.value       = null
    restDoneAt.value = null
    persist()
    letScreenSleep()
    stopClock()
    return durationSec
  }

  // ── Repos ──────────────────────────────────────────────────────────────────
  function startRest(totalSec, label) {
    if (!(totalSec > 0)) return
    rest.value = { endsAt: Date.now() + totalSec * 1000, totalSec, label }
    restDoneAt.value = null
    startClock()
  }

  function adjustRest(deltaSec) {
    if (!rest.value) return
    const endsAt = rest.value.endsAt + deltaSec * 1000
    if (endsAt <= Date.now()) { skipRest(); return } // raccourcir jusqu'à zéro revient à passer
    rest.value = { ...rest.value, endsAt, totalSec: Math.max(1, rest.value.totalSec + deltaSec) }
    now.value = Date.now()
  }

  function skipRest() {
    rest.value = null
    restDoneAt.value = null
  }

  // Le repos est allé à son terme : on prévient
  function completeRest() {
    rest.value = null
    restDoneAt.value = Date.now()
    playBeep()
    try { navigator.vibrate?.([200, 100, 200]) } catch {}
  }

  if (sessionId.value != null) {
    startClock()
    keepScreenOn()
  }

  return {
    sessionId, rest, elapsed, restRemaining, restRatio, restJustDone,
    isRunningFor, start, ensureStarted, finish,
    unlockSound: unlockAudio, startRest, adjustRest, skipRest,
  }
})
