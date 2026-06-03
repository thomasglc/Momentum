import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTrainingStore } from '@/stores/training'
import { useAppStore } from '@/stores/app'
import { prefetchAll } from '@/services/trainingService'
import WeekView from '@/views/WeekView.vue'
import SessionView from '@/views/SessionView.vue'
import StationsView from '@/views/StationsView.vue'
import PhasesView from '@/views/PhasesView.vue'
import GuideView from '@/views/GuideView.vue'
import LoginView from '@/views/LoginView.vue'
import OnboardingView from '@/views/OnboardingView.vue'

const routes = [
  { path: '/login',      component: LoginView,      meta: { public: true } },
  { path: '/onboarding', component: OnboardingView, meta: { onboarding: true } },
  { path: '/', component: WeekView },
  { path: '/session/:id', component: SessionView, meta: { depth: 1 } },
  { path: '/stations', component: StationsView },
  { path: '/phases', component: PhasesView },
  { path: '/guide', component: GuideView },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach(async (to, from) => {
  // Transition résolue en premier, synchrone, avant tout await
  const appStore = useAppStore()
  appStore.transitionName = appStore.resolveTransition(
    to.meta.depth   ?? 0,
    from.meta.depth ?? 0,
  )

  const auth = useAuthStore()
  await auth.init()

  if (to.meta.public)        return
  if (!auth.isAuthenticated) return '/login'
  if (!auth.profileComplete && !to.meta.onboarding) return '/onboarding'
  if (auth.profileComplete  && to.meta.onboarding)  return '/'
  if (to.path === '/login')  return '/'

  if (!appStore.ready) {
    appStore.startLoading() // synchrone → splash visible avant le premier await

    const training = useTrainingStore()
    training.initFromLocalStorage()

    const { gender, ten_km_time_sec } = auth.user ?? {}
    if (ten_km_time_sec) {
      training.setTenKmTime(gender === 'femme' ? 'elle' : 'lui', ten_km_time_sec)
    }

    await training.initCurrentWeek()
    await Promise.all([
      prefetchAll().catch(() => {}),
      new Promise(r => setTimeout(r, 1000)),
    ])
    appStore.setReady()
  }
})

export default router
