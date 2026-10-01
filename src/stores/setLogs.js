import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { fetchSessionLogs, fetchExerciseLogs, createSetLog, updateSetLog, deleteSetLog } from '@/services/setLogService'
import { toSet, groupHistory, previousByExercise } from '@/utils/setLogs'

// Séries réalisées de la séance affichée, et dernière séance précédente de chacun de ses exercices.
export const useSetLogStore = defineStore('setLogs', () => {
  const sessionId = shallowRef(null)
  const sets      = ref([])
  const previous  = shallowRef({})   // exerciseId → { date, sets }
  const ready     = shallowRef(false)
  const loadError = shallowRef(null)

  const profileId = () => useAuthStore().user?.id ?? null

  async function loadSession(id, exerciseIds) {
    sessionId.value = id
    sets.value      = []
    previous.value  = {}
    ready.value     = false
    loadError.value = null

    const profile = profileId()
    if (!profile) { loadError.value = 'Profil athlète introuvable'; return }
    try {
      const [current, past] = await Promise.all([
        fetchSessionLogs(profile, id),
        exerciseIds.length ? fetchExerciseLogs(profile, exerciseIds) : [],
      ])
      if (sessionId.value !== id) return // l'athlète a changé de séance entre-temps
      sets.value     = current.map(toSet)
      previous.value = previousByExercise(past.map(toSet), id)
      ready.value    = true
    } catch (e) {
      if (sessionId.value === id) loadError.value = e.message
    }
  }

  function setsForLine(lineId) {
    return sets.value.filter(s => s.lineId === lineId)
  }

  // Mode strict, comme la validation de séance : l'état ne change qu'après la réponse de Directus.
  async function saveSet(line, setNumber, values) {
    const payload = { weight_kg: values.weightKg, reps: values.reps, duration_sec: values.durationSec }
    const existing = sets.value.find(s => s.lineId === line.id && s.setNumber === setNumber)
    if (existing) {
      const saved = toSet(await updateSetLog(existing.id, payload))
      sets.value = sets.value.map(s => (s.id === saved.id ? saved : s))
      return
    }
    const saved = await createSetLog({
      athlete_profile_id: profileId(),
      session_id: sessionId.value,
      block_strength_exercise_id: line.id,
      exercise_id: line.exerciseId,
      set_number: setNumber,
      ...payload,
    })
    sets.value = [...sets.value, toSet(saved)]
  }

  async function removeSet(id) {
    await deleteSetLog(id)
    sets.value = sets.value.filter(s => s.id !== id)
  }

  /** Séances passées d'un exercice, la plus récente d'abord */
  async function loadHistory(exerciseId) {
    const logs = await fetchExerciseLogs(profileId(), [exerciseId], 200)
    return groupHistory(logs.map(toSet))
  }

  return { sessionId, sets, previous, ready, loadError, loadSession, setsForLine, saveSet, removeSet, loadHistory }
})
