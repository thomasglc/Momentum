import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTrainingStore } from '@/stores/training'
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
  { path: '/session/:id', component: SessionView },
  { path: '/stations', component: StationsView },
  { path: '/phases', component: PhasesView },
  { path: '/guide', component: GuideView },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.init()
  if (to.meta.public)        return
  if (!auth.isAuthenticated) return '/login'
  if (!auth.profileComplete && !to.meta.onboarding) return '/onboarding'
  if (auth.profileComplete  && to.meta.onboarding)  return '/'
  if (to.path === '/login')  return '/'

  if (auth.isAuthenticated && auth.profileComplete) {
    await useTrainingStore().initCurrentWeek()
  }
})

export default router
