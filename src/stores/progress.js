import { defineStore } from 'pinia'
import { computed, shallowRef } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useTrainingStore } from '@/stores/training'
import { getAllWeeks } from '@/services/trainingService'
import { fetchAllLogs } from '@/services/setLogService'
import {
  weekDays, weekCompletion, focusSession, completeWeekStreak, planTotals, planTimeline,
  toProgressSet, exerciseProgress, totalVolumeKg, weekSummary, weekOutlook,
} from '@/utils/progress'

// Progression de l'athlète dans son plan : ce qu'on charge (semaines écrites, séries enregistrées)
// et ce qu'on en déduit pour l'accueil et l'onglet Progression. Les règles sont dans utils/progress.
export const useProgressStore = defineStore('progress', () => {
  const training = useTrainingStore()

  const weeks      = shallowRef(null)   // semaines du plan avec leurs séances ; null tant que rien n'est chargé
  const sets       = shallowRef([])     // séries enregistrées de l'athlète
  const status     = shallowRef('idle') // 'idle' | 'loading' | 'ready' | 'error'
  const setsFailed = shallowRef(false)  // séries jamais chargées : tonnage et charges inconnus, le reste s'affiche
  let setsLoaded = false
  let owner = null                      // profil, plan et date de course pour lesquels on a chargé

  function reset() {
    weeks.value = null
    sets.value = []
    status.value = 'idle'
    setsFailed.value = false
    setsLoaded = false
    owner = null
  }

  /** Charge, ou recharge en gardant l'affichage : appelé à chaque arrivée sur l'accueil ou sur Progression */
  async function load() {
    const user = useAuthStore().user
    const current = [user?.id, user?.plan_id, user?.race_date].join('|')
    if (current !== owner) reset()
    owner = current

    if (!weeks.value) status.value = 'loading'
    try {
      const loaded = await getAllWeeks()
      if (owner !== current) return // l'athlète a changé entre-temps
      weeks.value = loaded
      status.value = 'ready'
    } catch {
      if (owner === current && !weeks.value) status.value = 'error'
      return
    }

    if (!user?.id) return
    try {
      const logs = await fetchAllLogs(user.id)
      if (owner !== current) return
      sets.value = logs.map(toProgressSet)
      setsLoaded = true
      setsFailed.value = false
    } catch {
      // Un rechargement raté garde les séries déjà affichées
      if (owner === current) setsFailed.value = !setsLoaded
    }
  }

  // ── Valeurs calculées ──────────────────────────────────────────────────────
  const doneIds = computed(() => new Set(training.completedSessions))
  const isDone = id => doneIds.value.has(id)

  // Sans calendrier, pas de jour courant : ni retard, ni compte à rebours
  const today = computed(() => (training.planState ? training.today : null))

  // Semaine affichée sur l'accueil : celle du jour, la première tant que le plan n'a pas commencé
  const week = computed(() => weeks.value?.find(w => w.weekNumber === training.todayWeekNumber) ?? null)
  const days = computed(() => weekDays(week.value, isDone, today.value))
  const completion = computed(() => weekCompletion(week.value, isDone))

  const focus = computed(() => {
    if (!weeks.value || training.planState?.status === 'done') return null
    return focusSession(weeks.value, isDone, today.value)
  })

  const streak = computed(() => {
    const state = training.planState
    if (!weeks.value || !state || state.status === 'before') return 0
    return completeWeekStreak(weeks.value, isDone, {
      upTo: state.weekNumber,
      inProgress: state.status === 'running' ? state.weekNumber : null,
    })
  })

  // Durée et distance notées sur une validation, quand il y en a
  const detailOf = id => training.completionOf(id)
  const totals = computed(() => planTotals(weeks.value ?? [], isDone, today.value, detailOf))

  // Tonnage du plan : séries rattachées à ses séances
  const volumeKg = computed(() => {
    const planSessions = new Set((weeks.value ?? []).flatMap(w => w.sessions.map(s => s.id)))
    return totalVolumeKg(sets.value.filter(set => planSessions.has(set.sessionId)))
  })

  const timeline = computed(() => planTimeline(weeks.value ?? [], training.plan?.totalWeeks ?? 0, isDone, {
    status: training.planState?.status ?? null,
    weekNumber: training.planState?.weekNumber ?? 1,
  }))

  const loads = computed(() => exerciseProgress(sets.value))

  /** Bilan de la semaine d'une séance, pour le récap de validation ; null si ses semaines ne sont pas chargées */
  function summaryFor(sessionId) {
    const own = weeks.value?.find(w => w.sessions.some(s => s.id === sessionId))
    if (!own) return null
    return {
      ...weekSummary(own, isDone, detailOf, sets.value),
      streak: streak.value,
      outlook: weekOutlook(weeks.value, own.weekNumber, training.plan?.totalWeeks ?? 0),
    }
  }

  return {
    weeks, sets, status, setsFailed, load, reset,
    week, days, completion, focus, streak, totals, volumeKg, timeline, loads, summaryFor,
  }
})
