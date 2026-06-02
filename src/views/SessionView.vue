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
      @click="router.back()"
      class="absolute top-4 left-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/25 text-white text-lg active:scale-95 transition-transform"
    >‹</button>

    <!-- Détail de la séance -->
    <SessionDetail
      v-if="session"
      :session="session"
      :completed="store.isCompleted(session.id)"
      @toggle="handleToggle"
    />

    <!-- État de chargement -->
    <div v-else class="flex items-center justify-center py-16">
      <p class="text-sm text-stone-400">Chargement de la séance…</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTrainingStore } from '@/stores/training'
import { getSession } from '@/services/trainingService'
import { getSessionTypeConfig } from '@/constants/sessionTypes'
import SessionDetail from '@/components/SessionDetail.vue'
import confetti from 'canvas-confetti'

const store = useTrainingStore()
const route = useRoute()
const router = useRouter()

const session = ref(null)
const heroBg = computed(() => session.value ? getSessionTypeConfig(session.value.type).heroBg : '')

onMounted(async () => {
  session.value = await getSession(route.params.id)
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
    setTimeout(() => router.back(), 1800)
  }
}
</script>
