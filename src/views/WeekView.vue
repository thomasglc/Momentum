<template>
  <div class="pb-8">
    <!-- Navigation semaines -->
    <WeekNav
      :weekNumber="store.currentWeekNumber"
      :theme="currentWeek?.theme || ''"
      :dateRange="currentWeek?.dateRange || ''"
      :phase="currentWeek?.phase || null"
      :isDeload="currentWeek?.isDeload || false"
      :canGoPrev="store.currentWeekNumber > 1"
      :canGoNext="store.currentWeekNumber < totalWeeks"
      @prev="store.setWeek(store.currentWeekNumber - 1)"
      @next="store.setWeek(store.currentWeekNumber + 1)"
    />

    <!-- Barre de progression (séances obligatoires uniquement) -->
    <ProgressBar :progress="progress" />

    <!-- Note de la semaine -->
    <div
      v-if="currentWeek?.weekNote"
      class="mx-4 mt-2 mb-1 bg-orange-50 border-l-4 border-orange-400 rounded-r-lg px-3 py-2"
    >
      <p class="text-xs text-orange-800">{{ currentWeek.weekNote }}</p>
    </div>

    <!-- Liste des séances -->
    <div v-if="currentWeek" class="px-4 mt-3 flex flex-col gap-3">
      <SessionCard
        v-for="session in currentWeek.sessions"
        :key="session.id"
        :session="session"
        :completed="store.isCompleted(session.id)"
        @click="router.push(`/session/${session.id}`)"
      />
    </div>

    <!-- État de chargement -->
    <div v-else class="flex items-center justify-center py-16">
      <p class="text-sm text-gray-400">Chargement du plan…</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTrainingStore } from '@/stores/training'
import { getPlan, getWeek } from '@/services/trainingService'
import WeekNav from '@/components/WeekNav.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import SessionCard from '@/components/SessionCard.vue'

const store = useTrainingStore()
const router = useRouter()

const currentWeek = ref(null)
const totalWeeks = ref(19)

async function loadWeek(n) {
  currentWeek.value = await getWeek(n)
}

onMounted(async () => {
  const plan = await getPlan()
  totalWeeks.value = plan.plan.totalWeeks
  await loadWeek(store.currentWeekNumber)
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
