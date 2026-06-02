<template>
  <div class="pb-8">

    <!-- Détail de la séance -->
    <SessionDetail
      v-if="session"
      :session="session"
      :completed="store.isCompleted(session.id)"
      @toggle="handleToggle"
      @back="appStore.markProgrammaticBack(); router.push('/')"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTrainingStore } from '@/stores/training'
import { getSession } from '@/services/trainingService'
import { useAppStore } from '@/stores/app'
import SessionDetail from '@/components/SessionDetail.vue'
import confetti from 'canvas-confetti'

const store    = useTrainingStore()
const appStore = useAppStore()
const route    = useRoute()
const router   = useRouter()

// Rendu immédiat depuis les données passées par WeekView, complétion async
const session = ref(history.state?.session ?? null)

onMounted(async () => {
  const full = await getSession(route.params.id)
  session.value = full
})

function handleToggle() {
  const wasCompleted = store.isCompleted(session.value.id)
  store.toggleSession(session.value.id)

  if (!wasCompleted) {
    // Burst de confettis depuis le bas de l'écran
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { x: 0.5, y: 0.9 },
      colors: ['#f97316', '#fb923c', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa'],
      zIndex: 9999,
    })
    setTimeout(() => { appStore.markProgrammaticBack(); router.push('/') }, 1800)
  }
}
</script>
