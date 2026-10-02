<template>
  <div class="pb-6">
    <!-- Où j'en suis -->
    <PlanHeader
      :first-name="auth.user?.first_name ?? ''"
      :state="training.planState"
      :start-date="training.plan?.startDate ?? null"
      :total-weeks="training.plan?.totalWeeks ?? 0"
      :phase-label="phaseLabel"
      :is-deload="running && !!progress.week?.isDeload"
    />

    <div class="px-4 mt-3 flex flex-col gap-3">
      <!-- Chargement -->
      <div v-if="progress.status === 'idle' || progress.status === 'loading'" class="flex flex-col gap-3 animate-pulse" aria-hidden="true">
        <div class="h-44 bg-stone-200 rounded-2xl" />
        <div class="h-28 bg-stone-200 rounded-2xl" />
        <div class="h-24 bg-stone-200 rounded-2xl" />
      </div>

      <div
        v-else-if="progress.status === 'error'"
        role="alert"
        class="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3"
      >
        <p class="flex-1 text-sm text-red-700">Programme indisponible pour le moment.</p>
        <button type="button" class="flex-shrink-0 text-sm font-semibold text-red-700 underline" @click="progress.load()">Réessayer</button>
      </div>

      <template v-else>
        <!-- Quoi faire maintenant -->
        <FocusCard
          v-if="progress.focus"
          :focus="progress.focus"
          :context="context"
          :sets-count="focusDetail?.sets ?? 0"
          :first="before"
          @open="openSession"
        />
        <p
          v-else-if="emptyText"
          role="status"
          class="bg-white rounded-2xl shadow-sm border border-stone-100 px-4 py-5 text-sm text-stone-500 text-center"
        >{{ emptyText }}</p>

        <!-- Cette semaine -->
        <WeekDots
          v-if="progress.week && !finished"
          :title="weekTitle"
          :days="progress.days"
          :done="progress.completion.done"
          :total="progress.completion.total"
          @open="openSession"
        />

        <!-- Ce que j'ai accompli -->
        <TotalsCard
          :streak="progress.streak"
          :sessions-done="progress.totals.sessionsDone"
          :minutes="progress.totals.minutes"
          :volume-kg="progress.volumeKg"
          @open="router.push('/progression')"
        />
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTrainingStore } from '@/stores/training'
import { useProgressStore } from '@/stores/progress'
import { getSession } from '@/services/trainingService'
import { strengthLinesOf } from '@/utils/workout'
import PlanHeader from '@/components/today/PlanHeader.vue'
import FocusCard from '@/components/today/FocusCard.vue'
import WeekDots from '@/components/today/WeekDots.vue'
import TotalsCard from '@/components/today/TotalsCard.vue'

const router   = useRouter()
const auth     = useAuthStore()
const training = useTrainingStore()
const progress = useProgressStore()

onMounted(() => progress.load())

const status   = computed(() => training.planState?.status ?? null) // null : plan sans calendrier
const running  = computed(() => status.value === 'running')
const before   = computed(() => status.value === 'before')
const finished = computed(() => status.value === 'done')

const phaseLabel = computed(() => {
  const phase = progress.week?.phase
  if (!running.value || !phase) return ''
  const name = training.phaseName(phase)
  return name ? `Phase ${phase} · ${name}` : `Phase ${phase}`
})

const weekTitle = computed(() => (running.value ? 'Cette semaine' : `Semaine ${training.todayWeekNumber}`))

// Quand la séance proposée n'est pas celle du jour, on dit pourquoi
const context = computed(() => {
  if (!running.value || progress.focus?.kind === 'today') return ''
  const today = progress.days.find(day => day.isToday)
  if (!today) return ''
  if (today.state === 'rest') return 'Repos aujourd\'hui'
  if (today.state === 'done') return 'Séance du jour validée'
  return ''
})

const emptyText = computed(() => {
  if (finished.value) return ''
  if (!progress.weeks?.length) return 'Ton programme n\'est pas encore disponible.'
  if (running.value && !progress.week) return `La semaine ${training.todayWeekNumber} n'est pas encore programmée.`
  return 'Toutes les séances programmées sont validées.'
})

// Détail de la séance mise en avant : nombre de séries, et rendu immédiat à l'ouverture
const focusDetail = shallowRef(null) // { id, sets, session }
watch(() => progress.focus?.session.id ?? null, async (id) => {
  focusDetail.value = null
  if (id == null) return
  try {
    const session = await getSession(id)
    if (progress.focus?.session.id !== id) return
    const sets = strengthLinesOf(session.structuredDetails).reduce((sum, line) => sum + (line.sets ?? 0), 0)
    focusDetail.value = { id, sets, session }
  } catch {} // sans détail, la carte s'affiche sans le nombre de séries
}, { immediate: true })

function openSession(session) {
  const loaded = focusDetail.value?.id === session.id ? focusDetail.value.session : session
  router.push({ path: `/session/${session.id}`, state: { session: loaded } })
}
</script>
