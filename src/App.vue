<template>
  <div class="bg-stone-100 min-h-full" style="padding-top: env(safe-area-inset-top)">

    <!-- Contenu -->
    <main :class="isLoginPage ? '' : 'max-w-[480px] mx-auto'" :style="isLoginPage ? '' : 'padding-bottom: calc(3rem + env(safe-area-inset-bottom))'">
      <RouterView v-slot="{ Component }">
        <Transition name="fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>

    <!-- Bottom Tab Nav -->
    <nav v-if="!isLoginPage" class="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-stone-200" style="padding-bottom: env(safe-area-inset-bottom)">
      <div class="max-w-[480px] mx-auto flex">
        <RouterLink
          v-for="tab in tabs"
          :key="tab.id"
          :to="tab.to"
          class="flex-1 flex flex-col items-center pt-2.5 pb-1 gap-0.5 transition-colors relative"
          :class="activeTab === tab.id ? 'text-orange-500' : 'text-stone-400'"
        >
          <span
            v-if="activeTab === tab.id"
            class="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-orange-500"
          />
          <span class="text-base leading-none">{{ tab.icon }}</span>
          <span class="text-[10px] leading-none font-semibold">{{ tab.label }}</span>
        </RouterLink>
      </div>
    </nav>

  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useTrainingStore } from '@/stores/training'
import { useAuthStore } from '@/stores/auth'
import { getPlan } from '@/services/trainingService'
import { getCurrentWeekNumber } from '@/utils/dateUtils'

const store = useTrainingStore()
const auth  = useAuthStore()
const route = useRoute()

const tabs = [
  { id: 'programme', label: 'Programme', to: '/',         icon: '📅' },
  { id: 'stations',  label: 'Stations',  to: '/stations', icon: '🏋️' },
  { id: 'phases',    label: 'Phases',    to: '/phases',   icon: '📊' },
  { id: 'guide',     label: 'Paramètres', to: '/guide',   icon: '⚙️' },
]

// '/session/:id' maps to the Programme tab
const isLoginPage = computed(() => route.path === '/login' || route.path === '/onboarding')

const activeTab = computed(() => {
  const path = route.path
  if (path.startsWith('/stations')) return 'stations'
  if (path.startsWith('/phases'))   return 'phases'
  if (path.startsWith('/guide'))    return 'guide'
  return 'programme'
})

onMounted(async () => {
  store.initFromLocalStorage()

  // Le profil est déjà chargé par le guard (auth.init()) — on synchronise juste les allures
  const { gender, ten_km_time_sec } = auth.user ?? {}
  if (ten_km_time_sec) {
    store.setTenKmTime(gender === 'femme' ? 'elle' : 'lui', ten_km_time_sec)
  }

  if (auth.isAuthenticated && auth.profileComplete) {
    const plan = await getPlan()
    store.setWeek(getCurrentWeekNumber(plan.plan.startDate, plan.plan.totalWeeks))
  }
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
