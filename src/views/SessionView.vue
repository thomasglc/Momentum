<template>
  <div class="pb-8 relative">

    <!-- Couvre la zone safe-area-inset-top (Dynamic Island / encoche) -->
    <div
      v-if="session"
      class="fixed inset-x-0 top-0 z-40 pointer-events-none"
      :class="heroBg"
      style="height: env(safe-area-inset-top)"
    />

    <!-- Bouton retour flottant sur le hero -->
    <button
      @click="appStore.markProgrammaticBack(); router.push('/')"
      class="absolute top-4 left-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/25 text-white text-lg active:scale-95 transition-transform"
    >‹</button>

    <!-- Détail de la séance -->
    <SessionDetail
      v-if="session"
      :session="session"
      :completed="store.isCompleted(session.id)"
      @toggle="handleToggle"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTrainingStore } from '@/stores/training'
import { getSession } from '@/services/trainingService'
import { getSessionTypeConfig } from '@/constants/sessionTypes'
import { useAppStore } from '@/stores/app'
import SessionDetail from '@/components/SessionDetail.vue'
import confetti from 'canvas-confetti'

const store    = useTrainingStore()
const appStore = useAppStore()
const route    = useRoute()
const router   = useRouter()

// Rendu immédiat depuis les données passées par WeekView, complétion async
const session = ref(history.state?.session ?? null)
const heroBg = computed(() => session.value ? getSessionTypeConfig(session.value.type).heroBg : '')

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
