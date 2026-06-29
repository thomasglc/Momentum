<template>
  <div class="bg-stone-100" style="min-height: 100dvh; padding-top: env(safe-area-inset-top)">

    <!-- Splash de démarrage -->
    <Transition name="splash">
      <div
        v-if="appStore.loading && auth.isAuthenticated"
        class="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-stone-100"
        style="padding-top: env(safe-area-inset-top)"
      >
        <img src="/icons/apple-touch-icon-180.png" class="w-16 h-16 rounded-2xl shadow-lg mb-4" alt="Momentum" />
        <p class="text-lg font-black text-stone-800 tracking-tight">Momentum</p>
        <div class="flex gap-2 mt-8">
          <span v-for="i in 3" :key="i" class="w-2 h-2 rounded-full bg-orange-400" :style="`animation: dot-bounce 0.9s ${(i-1)*0.15}s ease-in-out infinite`" />
        </div>
      </div>
    </Transition>

    <!-- Contenu -->
    <main :class="isLoginPage ? '' : 'max-w-[480px] mx-auto'" :style="isLoginPage ? '' : 'padding-bottom: calc(3rem + env(safe-area-inset-bottom))'">
      <div class="nav-container">
        <RouterView v-slot="{ Component }">
          <Transition
            :name="appStore.transitionName"
            @before-leave="onBeforeLeave"
            @leave="onLeave"
            @enter="onEnter"
          >
            <component :is="Component" :key="$route.path" />
          </Transition>
        </RouterView>
      </div>
    </main>

    <!-- Bottom Tab Nav -->
    <nav v-if="!isLoginPage" class="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-stone-200" style="padding-bottom: calc(env(safe-area-inset-bottom) + 6px); transform: translateZ(0); -webkit-transform: translateZ(0)">
      <div class="max-w-[480px] mx-auto flex">
        <RouterLink
          v-for="tab in tabs"
          :key="tab.id"
          :to="tab.to"
          class="flex-1 flex flex-col items-center pt-3.5 pb-2 gap-1.5 transition-colors relative"
          :class="activeTab === tab.id ? 'text-orange-500' : 'text-stone-400'"
        >
          <span
            v-if="activeTab === tab.id"
            class="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-orange-500"
          />
          <Icon :icon="tab.icon" class="text-[22px] leading-none" />
          <span class="text-[10px] leading-none font-semibold">{{ tab.label }}</span>
        </RouterLink>
      </div>
    </nav>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Icon, addCollection } from '@iconify/vue'
import ionIcons from '@iconify-json/ion/icons.json'

addCollection(ionIcons)
import { useTrainingStore } from '@/stores/training'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'

const store    = useTrainingStore()
const auth     = useAuthStore()
const appStore = useAppStore()
const route    = useRoute()
const router   = useRouter()

// Corrige env(safe-area-inset-bottom) qui retourne 0 au premier rendu iOS PWA
onMounted(() => {
  requestAnimationFrame(() => {
    const probe = document.createElement('div')
    probe.style.cssText = 'position:fixed;bottom:0;left:0;padding-bottom:env(safe-area-inset-bottom);opacity:0;pointer-events:none'
    document.body.appendChild(probe)
    document.documentElement.style.setProperty('--sab', getComputedStyle(probe).paddingBottom)
    probe.remove()
  })
})

let _leaveScrollY = 0
let _weekScrollY  = 0

function onBeforeLeave() {
  _leaveScrollY = window.scrollY
  if (appStore.transitionName === 'slide-forward') _weekScrollY = window.scrollY
}
function onLeave(el) {
  if (appStore.transitionName === 'slide-forward' && _leaveScrollY > 0) el.scrollTop = _leaveScrollY
}
function onEnter(el) {
  if (appStore.transitionName === 'slide-back' && _weekScrollY > 0) el.scrollTop = _weekScrollY
}


const tabs = [
  { id: 'programme', label: 'Programme',  to: '/',         icon: 'ion:calendar-outline' },
  { id: 'stations',  label: 'Stations',   to: '/stations', icon: 'ion:barbell-outline' },
  { id: 'phases',    label: 'Phases',     to: '/phases',   icon: 'ion:stats-chart-outline' },
  { id: 'guide',     label: 'Paramètres', to: '/guide',    icon: 'ion:settings-outline' },
]

// '/session/:id' maps to the Programme tab
const isLoginPage = computed(() => ['/login', '/onboarding', '/tutorial', '/change-password'].includes(route.path))

const activeTab = computed(() => {
  const path = route.path
  if (path.startsWith('/stations')) return 'stations'
  if (path.startsWith('/phases'))   return 'phases'
  if (path.startsWith('/guide'))    return 'guide'
  return 'programme'
})

</script>

<style>
/* Splash */
.splash-leave-active { transition: opacity 400ms ease; }
.splash-leave-to     { opacity: 0; }

@keyframes dot-bounce {
  0%, 80%, 100% { transform: translateY(0);    opacity: 0.35; }
  40%           { transform: translateY(-7px); opacity: 1; }
}

/* Conteneur de navigation — dimensions fixes pour que position:absolute fonctionne */
.nav-container {
  position: relative;
  overflow: hidden;
  min-height: 90svh;
}

/* Instant — geste natif iOS, Vue re-render sans animation */
.instant-enter-active,
.instant-leave-active { position: absolute; inset: 0; overflow-y: auto; background: #f5f5f4; }
.instant-enter-active { z-index: 2; }
.instant-leave-active { z-index: 1; }

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
