import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTrainingStore } from '@/stores/training'
import { useAppStore } from '@/stores/app'
import { prefetchAll } from '@/services/trainingService'
import TodayView from '@/views/TodayView.vue'
import WeekView from '@/views/WeekView.vue'
import ProgressView from '@/views/ProgressView.vue'
import ProfileView from '@/views/ProfileView.vue'
import SessionView from '@/views/SessionView.vue'
import StationsView from '@/views/StationsView.vue'
import LexiqueView from '@/views/LexiqueView.vue'
import LoginView from '@/views/LoginView.vue'
import ChangePasswordView from '@/views/ChangePasswordView.vue'
import OnboardingView from '@/views/OnboardingView.vue'
import TutorialView from '@/views/TutorialView.vue'

// meta.tab : onglet allumé ; meta.depth : 1 pour une page ouverte par-dessus un onglet
const routes = [
  { path: '/login',      component: LoginView,      meta: { public: true } },
  { path: '/change-password', component: ChangePasswordView, meta: { changePassword: true } },
  { path: '/onboarding', component: OnboardingView, meta: { onboarding: true } },
  { path: '/tutorial',   component: TutorialView,   meta: { tutorial: true } },
  { path: '/',            component: TodayView,    meta: { tab: 'today' } },
  { path: '/programme',   component: WeekView,     meta: { tab: 'programme' } },
  { path: '/progression', component: ProgressView, meta: { tab: 'progress' } },
  { path: '/profil',      component: ProfileView,  meta: { tab: 'profile' } },
  { path: '/profil/lexique',  component: LexiqueView,  meta: { tab: 'profile', depth: 1 } },
  { path: '/profil/stations', component: StationsView, meta: { tab: 'profile', depth: 1 } },
  { path: '/session/:id', component: SessionView, meta: { depth: 1 } },
  // Adresses des anciens onglets
  { path: '/phases',        redirect: '/progression' },
  { path: '/guide',         redirect: '/profil' },
  { path: '/guide/lexique', redirect: '/profil/lexique' },
  { path: '/stations',      redirect: '/profil/stations' },
  { path: '/:pathMatch(.*)*', redirect: '/' },
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
  if (!auth.passwordChanged && !to.meta.changePassword) return '/change-password'
  if (to.meta.changePassword) return
  if (!auth.profileComplete && !to.meta.onboarding) return '/onboarding'
  if (auth.profileComplete  && to.meta.onboarding)  return '/'
  if (auth.profileComplete && !auth.user?.tutorial_seen && !to.meta.tutorial) return '/tutorial'
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
    // Les séances se préchargent en tâche de fond : l'accueil n'en dépend pas
    prefetchAll().catch(() => {})
    appStore.setReady()
  }
})

router.afterEach((to) => {
  if (to.meta.tab && !to.meta.depth) useAppStore().visitTab(to.meta.tab, to.path)
})

export default router
