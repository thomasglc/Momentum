import { createRouter, createWebHashHistory } from 'vue-router'
import WeekView from '@/views/WeekView.vue'
import SessionView from '@/views/SessionView.vue'
import StationsView from '@/views/StationsView.vue'
import PhasesView from '@/views/PhasesView.vue'
import GuideView from '@/views/GuideView.vue'

const routes = [
  { path: '/', component: WeekView },
  { path: '/session/:id', component: SessionView },
  { path: '/stations', component: StationsView },
  { path: '/phases', component: PhasesView },
  { path: '/guide', component: GuideView }
]

export default createRouter({
  history: createWebHashHistory(),
  routes
})
