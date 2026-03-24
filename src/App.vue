<template>
  <div class="min-h-screen bg-gray-50">

    <!-- Header fixe -->
    <header class="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
      <div class="max-w-[480px] mx-auto px-4 py-3">
        <h1 class="text-center text-sm font-bold tracking-widest text-gray-800 uppercase">
          Momentum
        </h1>
      </div>
    </header>

    <!-- Contenu -->
    <main class="max-w-[480px] mx-auto pt-12 pb-16">
      <RouterView v-slot="{ Component }">
        <Transition name="fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>

    <!-- Bottom Tab Nav -->
    <nav class="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
      <div class="max-w-[480px] mx-auto flex">
        <RouterLink
          v-for="tab in tabs"
          :key="tab.id"
          :to="tab.to"
          class="flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors"
          :class="activeTab === tab.id ? 'text-orange-500' : 'text-gray-400'"
        >
          <span class="text-lg leading-none">{{ tab.icon }}</span>
          <span class="text-[10px] font-semibold">{{ tab.label }}</span>
        </RouterLink>
      </div>
    </nav>

  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useTrainingStore } from '@/stores/training'
import { getPlan } from '@/services/trainingService'
import { getCurrentWeekNumber } from '@/utils/dateUtils'

const store = useTrainingStore()
const route = useRoute()

const tabs = [
  { id: 'programme', label: 'Programme', to: '/',         icon: '📅' },
  { id: 'stations',  label: 'Stations',  to: '/stations', icon: '🏋️' },
  { id: 'phases',    label: 'Phases',    to: '/phases',   icon: '📊' },
  { id: 'guide',     label: 'Guide',     to: '/guide',    icon: '📖' },
]

// '/session/:id' maps to the Programme tab
const activeTab = computed(() => {
  const path = route.path
  if (path.startsWith('/stations')) return 'stations'
  if (path.startsWith('/phases'))   return 'phases'
  if (path.startsWith('/guide'))    return 'guide'
  return 'programme'
})

onMounted(async () => {
  store.initFromLocalStorage()
  const plan = await getPlan()
  store.setWeek(getCurrentWeekNumber(plan.plan.startDate, plan.plan.totalWeeks))
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
