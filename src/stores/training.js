import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const LS_KEY      = 'hyrox-completed-sessions'
const LS_TIME_LUI = 'hyrox-10km-lui'
const LS_TIME_ELLE = 'hyrox-10km-elle'

export const useTrainingStore = defineStore('training', () => {
  const currentWeekNumber = ref(1)
  const completedSessions = ref([])
  const tenKmTimeLui  = ref(null) // secondes
  const tenKmTimeElle = ref(null)

  // Charge les séances validées depuis localStorage
  function initFromLocalStorage() {
    try {
      const stored = localStorage.getItem(LS_KEY)
      if (stored) completedSessions.value = JSON.parse(stored)
    } catch {
      completedSessions.value = []
    }
    const lui  = localStorage.getItem(LS_TIME_LUI)
    const elle = localStorage.getItem(LS_TIME_ELLE)
    if (lui)  tenKmTimeLui.value  = Number(lui)
    if (elle) tenKmTimeElle.value = Number(elle)
  }

  function setTenKmTime(who, seconds) {
    if (who === 'lui')  { tenKmTimeLui.value  = seconds; localStorage.setItem(LS_TIME_LUI,  seconds ?? '') }
    if (who === 'elle') { tenKmTimeElle.value = seconds; localStorage.setItem(LS_TIME_ELLE, seconds ?? '') }
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

  return { currentWeekNumber, completedSessions, tenKmTimeLui, tenKmTimeElle, initFromLocalStorage, toggleSession, setWeek, setTenKmTime, isCompleted, weekProgress }
})
