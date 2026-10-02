<template>
  <div class="pb-8">

    <!-- Détail de la séance -->
    <SessionDetail
      v-if="session"
      :session="session"
      :completed="store.isCompleted(session.id)"
      @toggle="handleToggle"
      @back="goBack"
    />

    <!-- Récap à la validation, avec le bilan de la semaine quand la séance la clôt -->
    <SessionRecap
      v-if="recap"
      :session="session"
      :workout="recap.workout"
      :week="recap.week"
      :can-note="store.completionDetails"
      :saving="saving"
      :error="recapError"
      @done="closeRecap"
    />
  </div>
</template>

<script setup>
import { ref, shallowRef, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTrainingStore } from '@/stores/training'
import { useProgressStore } from '@/stores/progress'
import { useSetLogStore } from '@/stores/setLogs'
import { useWorkoutStore } from '@/stores/workout'
import { getSession } from '@/services/trainingService'
import { strengthLinesOf, summarizeWorkout } from '@/utils/workout'
import { useAppStore } from '@/stores/app'
import SessionDetail from '@/components/SessionDetail.vue'
import SessionRecap from '@/components/session/SessionRecap.vue'
import confetti from 'canvas-confetti'

const store       = useTrainingStore()
const progress    = useProgressStore()
const setLogStore = useSetLogStore()
const workout     = useWorkoutStore()
const appStore    = useAppStore()
const route       = useRoute()
const router      = useRouter()

// Rendu immédiat depuis les données passées par l'écran précédent, complétion async
const session = ref(history.state?.session ?? null)

// { workout: { durationSec, summary } | null, week } une fois la séance validée
const recap = shallowRef(null)
const saving = shallowRef(false)
const recapError = shallowRef('')

onMounted(async () => {
  const full = await getSession(route.params.id)
  session.value = full
})

// Retour à l'onglet d'où l'on vient : l'accueil ou le programme
function goBack() {
  appStore.markProgrammaticBack()
  router.push(appStore.lastTab.path)
}

async function handleToggle() {
  const id = session.value.id
  const wasCompleted = store.isCompleted(id)
  // Le chrono de séance donne la durée réelle ; on la lit avant de l'arrêter
  const durationSec = !wasCompleted && workout.isRunningFor(id) ? workout.elapsed : null
  try {
    await store.toggleSession(id, { durationSec })
  } catch (e) {
    // Afficher une alerte simple si l'API échoue
    alert(e?.message ?? 'Erreur réseau — impossible de valider la séance')
    return
  }
  if (wasCompleted) return

  confetti({
    particleCount: 120,
    spread: 80,
    origin: { x: 0.5, y: 0.9 },
    colors: ['#f97316', '#fb923c', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa'],
    zIndex: 9999,
  })
  workout.finish(id)

  const lines = strengthLinesOf(session.value.structuredDetails)
  const sets = setLogStore.sessionId === id ? setLogStore.sets : []
  // Semaines et séries à jour pour le bilan ; sans elles, le récap s'affiche sans la semaine
  await progress.load()
  recap.value = {
    workout: lines.length ? { durationSec, summary: summarizeWorkout(lines, sets) } : null,
    week: progress.summaryFor(id),
  }
}

// details : { durationSec, distanceKm } saisis dans le récap, ou null
async function closeRecap(details) {
  recapError.value = ''
  if (details) {
    saving.value = true
    try {
      await store.saveCompletionDetails(session.value.id, details)
    } catch {
      recapError.value = 'Durée et distance non enregistrées. Réessaie.'
      return
    } finally {
      saving.value = false
    }
  }
  recap.value = null
  goBack()
}
</script>
