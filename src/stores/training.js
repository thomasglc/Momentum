import { defineStore } from 'pinia'
import { ref, shallowRef, computed } from 'vue'
import { getPlan } from '@/services/trainingService'
import { fetchCompletions, completeSession, uncompleteSession, updateCompletion } from '@/services/trainingService'
import { planStatus, todayIso } from '@/utils/planCalendar'
import { toCompletion } from '@/utils/progress'
import { audienceFor } from '@/utils/audience'
import { getPhaseConfig } from '@/constants/phaseConfig'
import { useAuthStore } from '@/stores/auth'

const LS_TIME_LUI  = 'hyrox-10km-lui'
const LS_TIME_ELLE = 'hyrox-10km-elle'

export const useTrainingStore = defineStore('training', () => {
  const currentWeekNumber = ref(1) // semaine affichée dans l'onglet Programme
  // Validations de l'athlète : { id, sessionId, completedAt, durationSec, distanceKm }
  const completions = ref([])
  // Directus sait enregistrer la durée et la distance d'une validation (scripts/add-completion-details.cjs)
  const completionDetails = shallowRef(false)
  const completedSessions = computed(() => completions.value.map(c => c.sessionId))
  const tenKmTimeLui  = ref(null)
  const tenKmTimeElle = ref(null)
  const planType = ref('open_double_mixte')

  // Plan de l'athlète : { startDate, raceDate, totalWeeks, lastWeek, phaseNames }
  const plan = shallowRef(null)

  // Date du jour vue de l'athlète ; rafraîchie quand l'app revient au premier plan (voir App.vue)
  const today = shallowRef(todayIso())
  function refreshToday() {
    today.value = todayIso()
  }

  // Où il en est aujourd'hui : { status: 'before'|'running'|'done', weekNumber, daysToStart, daysToRace }.
  // null tant que le plan n'est pas chargé, ou s'il n'a pas de calendrier (voir utils/planCalendar).
  const planState = computed(() => (plan.value?.startDate ? planStatus(plan.value, today.value) : null))
  const todayWeekNumber = computed(() => planState.value?.weekNumber ?? 1)

  // Charge les séances validées depuis Directus
  async function initCompletedSessions() {
    const auth = useAuthStore()
    const profileId = auth.user?.id
    if (!profileId) { completions.value = []; return }
    try {
      const { rows, details } = await fetchCompletions(profileId)
      completions.value = rows.map(toCompletion)
      completionDetails.value = details
    } catch {
      completions.value = []
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

  // Mode strict : attend la réponse de Directus avant de mettre à jour l'état.
  // durationSec : durée du chrono de séance, envoyée avec la validation quand Directus sait l'enregistrer.
  async function toggleSession(id, { durationSec = null } = {}) {
    const auth = useAuthStore()
    const profileId = auth.user?.id
    if (!profileId) throw new Error('Non authentifié')

    const alreadyDone = completedSessions.value.includes(id)

    if (!alreadyDone) {
      const details = completionDetails.value && durationSec != null ? { duration_sec: durationSec } : {}
      const created = await completeSession(profileId, id, details)
      completions.value = [...completions.value, toCompletion({ session_id: id, ...details, ...created })]
    } else {
      await uncompleteSession(profileId, id)
      completions.value = completions.value.filter(c => c.sessionId !== id)
    }
  }

  const completionOf = id => completions.value.find(c => c.sessionId === id) ?? null

  /** Durée et distance notées dans le récap, après la validation. Ne fait rien si rien n'est saisi. */
  async function saveCompletionDetails(sessionId, { durationSec, distanceKm }) {
    const completion = completionOf(sessionId)
    const patch = {}
    if (durationSec != null) patch.duration_sec = durationSec
    if (distanceKm != null) patch.distance_km = distanceKm
    if (!completion?.id || !Object.keys(patch).length) return
    const saved = await updateCompletion(completion.id, patch)
    completions.value = completions.value.map(c => (c.id === completion.id ? toCompletion({ session_id: sessionId, ...saved }) : c))
  }

  function setWeek(n) {
    currentWeekNumber.value = n
  }

  // Appelé par le routeur à chaque ouverture de session : le plan vient du cache s'il est déjà chargé
  async function initCurrentWeek() {
    try {
      const { plan: loaded } = await getPlan()
      plan.value = loaded
      planType.value = loaded.planType ?? 'open_double_mixte'
      refreshToday()
      currentWeekNumber.value = todayWeekNumber.value
    } catch {}
  }

  // À qui s'adresse l'affichage : en solo, le genre du profil décide
  const audience   = computed(() => audienceFor(planType.value, useAuthStore().user?.gender ?? null))
  const isSolo     = computed(() => audience.value.isSolo)
  const isDuoMixte = computed(() => audience.value.isDuoMixte)
  const showLui    = computed(() => audience.value.showLui)
  const showElle   = computed(() => audience.value.showElle)

  // Nom d'une phase : celui du plan s'il en définit, sinon le nom par défaut
  const phaseName = id => plan.value?.phaseNames?.[id] ?? getPhaseConfig(id).name

  const isCompleted = computed(() => (id) => completedSessions.value.includes(id))

  const weekProgress = computed(() => (weekNumber, sessions) => {
    if (!sessions || sessions.length === 0) return 0
    const done = sessions.filter(s => completedSessions.value.includes(s.id)).length
    return Math.round((done / sessions.length) * 100)
  })

  return {
    currentWeekNumber, todayWeekNumber, completedSessions,
    tenKmTimeLui, tenKmTimeElle,
    completions, completionDetails, completionOf, saveCompletionDetails,
    plan, today, planState, phaseName,
    planType, isSolo, isDuoMixte, showLui, showElle,
    initFromLocalStorage, initCompletedSessions, refreshToday,
    toggleSession, setWeek, initCurrentWeek, setTenKmTime,
    isCompleted, weekProgress,
  }
})
