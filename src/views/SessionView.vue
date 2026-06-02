<template>
  <div class="pb-8 relative">

    <!-- Fond stone-100 fixe derrière l'overlay hero -->
    <div
      v-if="session"
      class="fixed inset-x-0 top-0 z-40 pointer-events-none bg-stone-100"
      style="height: env(safe-area-inset-top)"
    />
    <!-- Couleur hero qui s'estompe au scroll vers le fond stone-100 -->
    <div
      v-if="session"
      class="fixed inset-x-0 top-0 z-41 pointer-events-none"
      :class="heroBg"
      :style="`height: env(safe-area-inset-top); opacity: ${islandOpacity}`"
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
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
const heroBg  = computed(() => session.value ? getSessionTypeConfig(session.value.type).heroBg : '')

// Fondu de l'overlay island : hero → stone-100 sur les ~160px du header
const scrollY = ref(0)
const islandOpacity = computed(() => Math.max(0, 1 - scrollY.value / 160))

function onScroll() { scrollY.value = window.scrollY }
onMounted(async () => {
  window.addEventListener('scroll', onScroll, { passive: true })
  const full = await getSession(route.params.id)
  session.value = full
})
onUnmounted(() => window.removeEventListener('scroll', onScroll))

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
