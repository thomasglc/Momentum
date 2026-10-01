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

    <!-- Récap d'une séance de muscu, à la validation -->
    <WorkoutRecap
      v-if="recap"
      :title="session.title"
      :duration-sec="recap.durationSec"
      :summary="recap.summary"
      @close="goBack"
    />
  </div>
</template>

<script setup>
import { ref, shallowRef, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTrainingStore } from '@/stores/training'
import { useSetLogStore } from '@/stores/setLogs'
import { useWorkoutStore } from '@/stores/workout'
import { getSession } from '@/services/trainingService'
import { strengthLinesOf, summarizeWorkout } from '@/utils/workout'
import { useAppStore } from '@/stores/app'
import SessionDetail from '@/components/SessionDetail.vue'
import WorkoutRecap from '@/components/session/WorkoutRecap.vue'
import confetti from 'canvas-confetti'

const store       = useTrainingStore()
const setLogStore = useSetLogStore()
const workout     = useWorkoutStore()
const appStore    = useAppStore()
const route       = useRoute()
const router      = useRouter()

// Rendu immédiat depuis les données passées par WeekView, complétion async
const session = ref(history.state?.session ?? null)

// { durationSec, summary } une fois une séance de muscu validée
const recap = shallowRef(null)

onMounted(async () => {
  const full = await getSession(route.params.id)
  session.value = full
})

function goBack() {
  appStore.markProgrammaticBack()
  router.push('/')
}

async function handleToggle() {
  const wasCompleted = store.isCompleted(session.value.id)
  try {
    await store.toggleSession(session.value.id)
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

  // Séance de muscu : le récap remplace le retour automatique à la semaine
  const lines = strengthLinesOf(session.value.structuredDetails)
  if (lines.length) {
    const sets = setLogStore.sessionId === session.value.id ? setLogStore.sets : []
    recap.value = {
      durationSec: workout.finish(session.value.id),
      summary: summarizeWorkout(lines, sets),
    }
    return
  }
  setTimeout(goBack, 1800)
}
</script>
