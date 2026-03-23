import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const LS_KEY = 'hyrox-completed-sessions'

export const useTrainingStore = defineStore('training', () => {
  const currentWeekNumber = ref(1)
  const completedSessions = ref([])

  // Charge les séances validées depuis localStorage
  function initFromLocalStorage() {
    try {
      const stored = localStorage.getItem(LS_KEY)
      if (stored) completedSessions.value = JSON.parse(stored)
    } catch {
      completedSessions.value = []
    }
  }

  function toggleSession(id) {
    const idx = completedSessions.value.indexOf(id)
    if (idx === -1) {
      completedSessions.value.push(id)
    } else {
      completedSessions.value.splice(idx, 1)
    }
    localStorage.setItem(LS_KEY, JSON.stringify(completedSessions.value))
  }

  function setWeek(n) {
    currentWeekNumber.value = n
  }

  const isCompleted = computed(() => (id) => completedSessions.value.includes(id))

  // Retourne le % de séances validées pour une semaine donnée
  const weekProgress = computed(() => (weekNumber, sessions) => {
    if (!sessions || sessions.length === 0) return 0
    const done = sessions.filter(s => completedSessions.value.includes(s.id)).length
    return Math.round((done / sessions.length) * 100)
  })

  return { currentWeekNumber, completedSessions, initFromLocalStorage, toggleSession, setWeek, isCompleted, weekProgress }
})
