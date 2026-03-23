import { createRouter, createWebHashHistory } from 'vue-router'
import WeekView from '@/views/WeekView.vue'
import SessionView from '@/views/SessionView.vue'

const routes = [
  { path: '/', component: WeekView },
  { path: '/session/:id', component: SessionView }
]

export default createRouter({
  history: createWebHashHistory(),
  routes
})
