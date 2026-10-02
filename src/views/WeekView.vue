<template>
  <div class="pt-1 pb-4">
    <!-- Navigation semaines -->
    <WeekNav
      :weekNumber="store.currentWeekNumber"
      :todayWeekNumber="store.todayWeekNumber"
      :showToday="planRunning"
      :theme="currentWeek?.theme || ''"
      :dateRange="formatDateRange(currentWeek?.startDate, currentWeek?.endDate)"
      :phase="currentWeek?.phase || null"
      :phaseName="currentWeek?.phase ? store.phaseName(currentWeek.phase) : ''"
      :isDeload="currentWeek?.isDeload || false"
      :canGoPrev="store.currentWeekNumber > 1"
      :canGoNext="store.currentWeekNumber < lastWeek"
      @prev="store.setWeek(store.currentWeekNumber - 1)"
      @next="store.setWeek(store.currentWeekNumber + 1)"
      @goToCurrent="store.setWeek(store.todayWeekNumber)"
    />

    <!-- État du plan : pas encore commencé, ou terminé -->
    <p
      v-if="planBanner"
      role="status"
      class="mx-4 mt-3 rounded-xl px-3 py-2 text-xs font-medium"
      :class="planBanner.tone"
    >{{ planBanner.text }}</p>

    <template v-if="currentWeek">
      <!-- Barre de progression (séances obligatoires uniquement) -->
      <ProgressBar :progress="progress" />

      <!-- Note de la semaine -->
      <div
        v-if="currentWeek.weekNote"
        class="mx-4 mt-3 bg-orange-50 border-l-4 border-orange-400 rounded-r-lg px-3 py-2"
      >
        <ClampText :text="currentWeek.weekNote" class="text-xs text-orange-800" />
      </div>

      <!-- Liste des séances -->
      <div class="px-4 mt-3 flex flex-col gap-2.5">
        <SessionCard
          v-for="session in currentWeek.sessions"
          :key="session.id"
          :session="session"
          :completed="store.isCompleted(session.id)"
          @click="router.push({ path: `/session/${session.id}`, state: { session } })"
        />
      </div>
    </template>

    <!-- Semaine du calendrier que le coach n'a pas encore écrite -->
    <div v-else-if="loaded" class="flex items-center justify-center py-16 px-8">
      <p class="text-sm text-stone-400 text-center">La semaine {{ store.currentWeekNumber }} n'est pas encore programmée.</p>
    </div>

    <!-- État de chargement -->
    <div v-else class="flex items-center justify-center py-16">
      <p class="text-sm text-stone-400">Chargement du plan…</p>
    </div>
  </div>
</template>

<script setup>
import { ref, shallowRef, computed, watch, onMounted, nextTick } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { useTrainingStore } from '@/stores/training'
import { getWeek } from '@/services/trainingService'
import WeekNav from '@/components/WeekNav.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import SessionCard from '@/components/SessionCard.vue'
import ClampText from '@/components/ClampText.vue'

const store = useTrainingStore()
const router = useRouter()

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc']
function formatDateRange(startDate, endDate) {
  if (!startDate || !endDate) return ''
  const s = new Date(startDate), e = new Date(endDate)
  const sd = s.getDate(), sm = MONTHS[s.getMonth()]
  const ed = e.getDate(), em = MONTHS[e.getMonth()]
  return s.getMonth() === e.getMonth() ? `${sd}–${ed} ${sm}` : `${sd} ${sm} – ${ed} ${em}`
}

// Remplacée d'un bloc, jamais modifiée : ses séances restent des objets simples,
// que le routeur peut transmettre à la page de séance
const currentWeek = shallowRef(null)
const loaded = ref(false)

// On navigue jusqu'à la dernière semaine écrite, pas jusqu'à la fin théorique du plan
const lastWeek = computed(() => store.plan?.lastWeek ?? 1)

const planRunning = computed(() => store.planState?.status === 'running')

const planBanner = computed(() => {
  const state = store.planState
  if (!state || !store.plan?.startDate) return null
  if (state.status === 'before') {
    const day = new Date(`${store.plan.startDate}T00:00:00`)
      .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    const wait = state.daysToStart === 1 ? 'demain' : `dans ${state.daysToStart} jours`
    return { tone: 'bg-blue-50 text-blue-800', text: `Ton plan commence ${day}, ${wait}.` }
  }
  if (state.status === 'done') {
    return { tone: 'bg-emerald-50 text-emerald-800', text: 'Ton plan est terminé. Bravo pour le chemin parcouru.' }
  }
  return null
})

async function loadWeek(n) {
  loaded.value = false
  const week = await getWeek(n)
  if (n !== store.currentWeekNumber) return // l'athlète a déjà changé de semaine
  currentWeek.value = week
  loaded.value = true
}

onBeforeRouteLeave(() => {
  sessionStorage.setItem('weekScrollY', String(window.scrollY))
})

onMounted(async () => {
  await loadWeek(store.currentWeekNumber)
  const saved = parseInt(sessionStorage.getItem('weekScrollY') || '0', 10)
  if (saved) {
    await nextTick()
    window.scrollTo({ top: saved, behavior: 'instant' })
    sessionStorage.removeItem('weekScrollY')
  }
})

watch(() => store.currentWeekNumber, (n) => loadWeek(n))

// Progression basée sur les séances obligatoires uniquement
const progress = computed(() => {
  const sessions = currentWeek.value?.sessions || []
  const mandatory = sessions.filter(s => !s.optional)
  if (mandatory.length === 0) return 0
  const done = mandatory.filter(s => store.isCompleted(s.id)).length
  return Math.round((done / mandatory.length) * 100)
})
</script>
