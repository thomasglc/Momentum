<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header fixe -->
    <header class="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
      <div class="max-w-[480px] mx-auto px-4 py-3">
        <h1 class="text-center text-sm font-bold tracking-widest text-gray-800 uppercase">
          Hyrox Planner
        </h1>
      </div>
    </header>

    <!-- Contenu avec marge pour le header -->
    <main class="max-w-[480px] mx-auto pt-12">
      <RouterView v-slot="{ Component }">
        <Transition name="fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useTrainingStore } from '@/stores/training'
import { getPlan } from '@/services/trainingService'

const store = useTrainingStore()

onMounted(async () => {
  store.initFromLocalStorage()

  // Calcul dynamique de la semaine courante à partir de startDate
  const plan = await getPlan()
  const start = new Date(plan.plan.startDate)
  const today = new Date()
  const diffDays = Math.floor((today - start) / (1000 * 60 * 60 * 24))
  const weekIndex = Math.floor(diffDays / 7) + 1
  const clampedWeek = Math.max(1, Math.min(weekIndex, plan.plan.totalWeeks))
  store.setWeek(clampedWeek)
})
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 200ms ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
