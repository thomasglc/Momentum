<template>
  <div class="bg-stone-100 min-h-full" style="padding-top: env(safe-area-inset-top)">

    <!-- Contenu -->
    <main :class="isLoginPage ? '' : 'max-w-[480px] mx-auto'" :style="isLoginPage ? '' : 'padding-bottom: calc(3rem + env(safe-area-inset-bottom))'">
      <div class="nav-container">
        <RouterView v-slot="{ Component }">
          <Transition :name="transitionName">
            <component :is="Component" :key="$route.path" />
          </Transition>
        </RouterView>
      </div>
    </main>

    <!-- Bottom Tab Nav -->
    <nav v-if="!isLoginPage" class="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-stone-200" style="padding-bottom: max(calc(env(safe-area-inset-bottom) - 20px), 0px)">
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
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTrainingStore } from '@/stores/training'
import { useAuthStore } from '@/stores/auth'

const store = useTrainingStore()
const auth  = useAuthStore()
const route = useRoute()
const router = useRouter()

const transitionName = ref('fade')
router.beforeEach((to, from) => {
  const toDepth   = to.meta.depth   ?? 0
  const fromDepth = from.meta.depth ?? 0
  if      (toDepth > fromDepth) transitionName.value = 'slide-forward'
  else if (toDepth < fromDepth) transitionName.value = 'slide-back'
  else                          transitionName.value = 'fade'
})

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

})
</script>

<style>
/* Conteneur de navigation — dimensions fixes pour que position:absolute fonctionne */
.nav-container {
  position: relative;
  overflow: hidden;
  min-height: calc(100svh - env(safe-area-inset-top));
}

/* Fade (navigation entre onglets) */
.fade-enter-active, .fade-leave-active { transition: opacity 200ms ease; }
.fade-enter-from,   .fade-leave-to     { opacity: 0; }

/* Base commune pour les slides : sort du flux pour superposer les vues */
.slide-forward-enter-active,
.slide-forward-leave-active,
.slide-back-enter-active,
.slide-back-leave-active {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  background: #f5f5f4;
}

/* Forward: session entre par la droite et couvre la semaine */
.slide-forward-enter-active {
  z-index: 2;
  transition: transform 320ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.slide-forward-leave-active {
  z-index: 1;
  transition: transform 320ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.slide-forward-enter-from { transform: translateX(100%); }
.slide-forward-leave-to   { transform: translateX(-25%); }

/* Back: session sort par la droite, semaine réapparaît */
.slide-back-leave-active {
  z-index: 2;
  transition: transform 320ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.slide-back-enter-active {
  z-index: 1;
  transition: transform 320ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.slide-back-leave-to   { transform: translateX(100%); }
.slide-back-enter-from { transform: translateX(-25%); }
</style>
