<template>
  <div class="px-4 py-4 pb-6">
    <h2 class="text-base font-bold text-gray-800 mb-0.5">Mon plan</h2>

    <p v-if="status === 'error'" role="alert" class="text-sm text-red-600 mt-4">
      Plan indisponible pour le moment.
    </p>
    <p v-else-if="!overview" class="py-16 text-center text-sm text-stone-400">Chargement du plan…</p>

    <template v-else>
      <p class="text-xs text-gray-500 mb-4">{{ subtitle }}</p>

      <div class="flex flex-col gap-2">
        <section v-for="phase in phases" :key="phase.id" class="bg-white rounded-xl shadow-sm overflow-hidden">

          <!-- En-tête de phase -->
          <button
            type="button"
            class="w-full text-left p-4 flex items-center gap-3"
            :aria-expanded="expanded === phase.id"
            @click="toggle(phase.id)"
          >
            <div class="w-2 self-stretch rounded-full flex-shrink-0" :class="phase.style.bar" />
            <div class="flex-1 min-w-0">
              <p class="text-[10px] font-bold uppercase tracking-widest mb-0.5" :class="phase.style.text">
                Phase {{ phase.id }} · {{ phase.weeksLabel }}
              </p>
              <p class="font-bold text-gray-800 text-sm">{{ phase.name }}</p>
              <p v-if="phase.dates" class="text-xs text-gray-400 mt-0.5">{{ phase.dates }}</p>
            </div>
            <span
              v-if="phase.isCurrent"
              class="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-orange-100 text-orange-600"
            >En cours</span>
            <svg
              class="w-4 h-4 text-gray-300 flex-shrink-0 transition-transform duration-200"
              :class="{ 'rotate-180': expanded === phase.id }"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <!-- Semaines de la phase -->
          <ul v-if="expanded === phase.id" class="border-t border-gray-100 divide-y divide-gray-50">
            <li v-for="week in phase.weeks" :key="week.number">
              <button
                type="button"
                class="w-full flex items-center gap-3 px-4 py-2.5 text-left active:bg-stone-50 transition-colors"
                @click="goToWeek(week.number)"
              >
                <span
                  class="w-8 flex-shrink-0 text-xs font-bold tabular-nums"
                  :class="week.isToday ? 'text-orange-500' : 'text-gray-500'"
                >S{{ week.number }}</span>
                <span class="flex-1 min-w-0">
                  <span class="block text-xs font-semibold text-gray-700 truncate">{{ week.theme || `Semaine ${week.number}` }}</span>
                  <span v-if="week.dates" class="block text-[11px] text-gray-400">{{ week.dates }}</span>
                </span>
                <span v-if="week.isDeload" class="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">Décharge</span>
                <span v-if="week.isToday" class="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">Cette semaine</span>
              </button>
            </li>
          </ul>
        </section>
      </div>

      <p v-if="overview.lastWeek < overview.totalWeeks" class="text-xs text-stone-400 text-center mt-4">
        Les semaines {{ overview.lastWeek + 1 }} à {{ overview.totalWeeks }} ne sont pas encore programmées.
      </p>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { useTrainingStore } from '@/stores/training'
import { getPlanOverview } from '@/services/trainingService'
import { getPhaseConfig } from '@/constants/phaseConfig'
import { weekDates } from '@/utils/planCalendar'

const router = useRouter()
const store  = useTrainingStore()

const overview = shallowRef(null) // { startDate, raceDate, totalWeeks, lastWeek, phases }
const status   = shallowRef('loading')
const expanded = shallowRef(null)

// La semaine du jour n'a de sens que si le plan est en cours
const todayWeek = computed(() => (store.planState?.status === 'running' ? store.todayWeekNumber : null))

const formatDay = (iso, withYear = false) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) })
const formatRange = (start, end, withYear = false) => `${formatDay(start, withYear)} – ${formatDay(end, withYear)}`

const phases = computed(() =>
  (overview.value?.phases ?? []).map(phase => ({
    ...phase,
    style: getPhaseConfig(phase.id),
    weeksLabel: phase.firstWeek === phase.lastWeek ? `semaine ${phase.firstWeek}` : `semaines ${phase.firstWeek}–${phase.lastWeek}`,
    dates: phase.startDate ? formatRange(phase.startDate, phase.endDate) : '',
    isCurrent: todayWeek.value != null && todayWeek.value >= phase.firstWeek && todayWeek.value <= phase.lastWeek,
    weeks: phase.weeks.map(week => ({
      ...week,
      dates: week.startDate ? formatRange(week.startDate, week.endDate) : '',
      isToday: week.number === todayWeek.value,
    })),
  }))
)

const subtitle = computed(() => {
  const { phases: list, totalWeeks, startDate } = overview.value
  const parts = [`${list.length} phase${list.length > 1 ? 's' : ''}`, `${totalWeeks} semaines`]
  if (startDate) parts.push(formatRange(startDate, weekDates(startDate, totalWeeks).endDate, true))
  return parts.join(' · ')
})

function toggle(id) {
  expanded.value = expanded.value === id ? null : id
}

function goToWeek(weekNumber) {
  store.setWeek(weekNumber)
  router.push('/')
}

onMounted(async () => {
  try {
    overview.value = await getPlanOverview()
    // On ouvre la phase en cours, sinon la première
    expanded.value = (phases.value.find(p => p.isCurrent) ?? phases.value[0])?.id ?? null
    status.value = 'ready'
  } catch {
    status.value = 'error'
  }
})
</script>
