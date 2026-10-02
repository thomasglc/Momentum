<template>
  <div class="px-4 py-4 pb-6 flex flex-col gap-4">
    <h1 class="text-base font-bold text-stone-800">Ma progression</h1>

    <!-- Chargement -->
    <div v-if="progress.status === 'idle' || progress.status === 'loading'" class="flex flex-col gap-4 animate-pulse" aria-hidden="true">
      <div class="h-40 bg-stone-200 rounded-2xl" />
      <div class="grid grid-cols-2 gap-2">
        <div v-for="n in 4" :key="n" class="h-24 bg-stone-200 rounded-2xl" />
      </div>
      <div class="h-32 bg-stone-200 rounded-2xl" />
    </div>

    <div
      v-else-if="progress.status === 'error'"
      role="alert"
      class="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3"
    >
      <p class="flex-1 text-sm text-red-700">Progression indisponible pour le moment.</p>
      <button type="button" class="flex-shrink-0 text-sm font-semibold text-red-700 underline" @click="progress.load()">Réessayer</button>
    </div>

    <template v-else>
      <PlanTimeline
        :groups="groups"
        :state="training.planState"
        :start-date="training.plan?.startDate ?? null"
        :end-date="endDate"
        :total-weeks="progress.timeline.length"
      />
      <StatTiles :totals="progress.totals" :volume-kg="progress.volumeKg" :volume-unknown="progress.setsFailed" />
      <LoadList :loads="progress.loads" :failed="progress.setsFailed" />
      <PlanWeeks :groups="groups" :today-week="todayWeek" @open="goToWeek" />
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTrainingStore } from '@/stores/training'
import { useProgressStore } from '@/stores/progress'
import { getPhaseConfig } from '@/constants/phaseConfig'
import { groupByPhase } from '@/utils/progress'
import { weekDates } from '@/utils/planCalendar'
import PlanTimeline from '@/components/progress/PlanTimeline.vue'
import StatTiles from '@/components/progress/StatTiles.vue'
import LoadList from '@/components/progress/LoadList.vue'
import PlanWeeks from '@/components/progress/PlanWeeks.vue'

const router   = useRouter()
const training = useTrainingStore()
const progress = useProgressStore()

onMounted(() => progress.load())

// La frise groupée par phase, avec le nom et les couleurs de chacune
const groups = computed(() => groupByPhase(progress.timeline).map(group => ({
  ...group,
  name: group.phase ? training.phaseName(group.phase) || `Phase ${group.phase}` : 'Semaines',
  style: getPhaseConfig(group.phase),
})))

// La semaine du jour n'a de sens que si le plan est en cours
const todayWeek = computed(() => (training.planState?.status === 'running' ? training.todayWeekNumber : null))

const endDate = computed(() => {
  const start = training.plan?.startDate
  return start && progress.timeline.length ? weekDates(start, progress.timeline.length).endDate : null
})

function goToWeek(weekNumber) {
  training.setWeek(weekNumber)
  router.push('/programme')
}
</script>
