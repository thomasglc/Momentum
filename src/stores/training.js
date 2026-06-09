import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getPlan } from '@/services/trainingService'
import { fetchCompletedSessions, completeSession, uncompleteSession } from '@/services/trainingService'
import { getCurrentWeekNumber } from '@/utils/dateUtils'
import { useAuthStore } from '@/stores/auth'

const LS_TIME_LUI  = 'hyrox-10km-lui'
const LS_TIME_ELLE = 'hyrox-10km-elle'

export const useTrainingStore = defineStore('training', () => {
  const currentWeekNumber = ref(1)
  const todayWeekNumber   = ref(1)
  const completedSessions = ref([])
  const tenKmTimeLui  = ref(null)
  const tenKmTimeElle = ref(null)

  // Charge les séances validées depuis Directus
  async function initCompletedSessions() {
    const auth = useAuthStore()
    const profileId = auth.user?.id
    if (!profileId) { completedSessions.value = []; return }
    try {
      const rows = await fetchCompletedSessions(profileId)
      completedSessions.value = rows.map(r => r.session_id)
    } catch {
      completedSessions.value = []
    }
  }

  // Compat — appelé depuis le router, redirige vers initCompletedSessions
  function initFromLocalStorage() {
    initCompletedSessions()
    const lui  = localStorage.getItem(LS_TIME_LUI)
    const elle = localStorage.getItem(LS_TIME_ELLE)
    if (lui)  tenKmTimeLui.value  = Number(lui)
    if (elle) tenKmTimeElle.value = Number(elle)
  }

  function setTenKmTime(who, seconds) {
    if (who === 'lui')  { tenKmTimeLui.value  = seconds; localStorage.setItem(LS_TIME_LUI,  seconds ?? '') }
    if (who === 'elle') { tenKmTimeElle.value = seconds; localStorage.setItem(LS_TIME_ELLE, seconds ?? '') }
  }

  // Mode strict : attend la réponse de Directus avant de mettre à jour l'état
  async function toggleSession(id) {
    const auth = useAuthStore()
    const profileId = auth.user?.id
    if (!profileId) throw new Error('Non authentifié')

    const alreadyDone = completedSessions.value.includes(id)

    if (!alreadyDone) {
      await completeSession(profileId, id)
      completedSessions.value.push(id)
    } else {
      await uncompleteSession(profileId, id)
      completedSessions.value = completedSessions.value.filter(s => s !== id)
    }
  }

  function setWeek(n) {
    currentWeekNumber.value = n
  }

  let _weekInitialized = false
  async function initCurrentWeek() {
    if (_weekInitialized) return
    _weekInitialized = true
    try {
      const plan = await getPlan()
      const n = getCurrentWeekNumber(plan.plan.startDate, plan.plan.totalWeeks)
      currentWeekNumber.value = n
      todayWeekNumber.value   = n
    } catch {}
  }

  const isCompleted = computed(() => (id) => completedSessions.value.includes(id))

  const weekProgress = computed(() => (weekNumber, sessions) => {
    if (!sessions || sessions.length === 0) return 0
    const done = sessions.filter(s => completedSessions.value.includes(s.id)).length
    return Math.round((done / sessions.length) * 100)
  })

  return {
    currentWeekNumber, todayWeekNumber, completedSessions,
    tenKmTimeLui, tenKmTimeElle,
    initFromLocalStorage, initCompletedSessions,
    toggleSession, setWeek, initCurrentWeek, setTenKmTime,
    isCompleted, weekProgress,
  }
})
