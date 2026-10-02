<template>
  <BottomSheet title="Séance validée" @close="finish">
    <p class="mb-4 text-sm text-stone-500 leading-snug">{{ session.title }}</p>

    <!-- Muscu : les chiffres de la séance -->
    <template v-if="workout">
      <dl class="grid grid-cols-2 gap-2">
        <div v-for="stat in workoutStats" :key="stat.label" class="bg-stone-50 border border-stone-100 rounded-xl px-3 py-2.5">
          <dt class="text-xs uppercase tracking-wider font-semibold text-stone-400">{{ stat.label }}</dt>
          <dd class="mt-0.5 text-xl font-black text-stone-800 tabular-nums leading-tight">{{ stat.value }}</dd>
        </div>
      </dl>

      <template v-if="exercises.length">
        <h4 class="mt-5 mb-2 text-xs uppercase tracking-wider font-semibold text-stone-400">Par exercice</h4>
        <ul class="space-y-2">
          <li v-for="exercise in exercises" :key="exercise.lineId" class="bg-stone-50 border border-stone-100 rounded-xl px-3 py-2">
            <div class="flex items-baseline justify-between gap-3">
              <p class="text-sm font-bold text-stone-800 leading-tight">{{ exercise.name }}</p>
              <p v-if="exercise.volume" class="flex-shrink-0 text-xs font-semibold text-blue-600 tabular-nums">{{ exercise.volume }}</p>
            </div>
            <p class="mt-0.5 text-xs text-stone-500 leading-relaxed">{{ exercise.summary }}</p>
          </li>
        </ul>
      </template>
      <p v-else class="mt-4 text-xs text-stone-500">Aucune série enregistrée pour cette séance.</p>
    </template>

    <!-- Autres séances : durée et distance, facultatives. Elles nourrissent les heures et les kilomètres. -->
    <form v-else-if="canNote" @submit.prevent="finish">
      <p class="mb-2 text-xs uppercase tracking-wider font-semibold text-stone-400">Ta séance, si tu veux la noter</p>
      <div class="grid grid-cols-2 gap-2">
        <label class="block">
          <span class="block mb-1 text-xs font-semibold text-stone-500">Durée (min)</span>
          <input
            v-model="minutes"
            type="text"
            inputmode="numeric"
            :placeholder="session.duration > 0 ? String(session.duration) : 'ex. 50'"
            class="w-full border border-stone-200 rounded-xl px-3 py-2.5 tabular-nums focus:outline-none focus:border-orange-400 transition-colors"
          />
        </label>
        <label v-if="withDistance" class="block">
          <span class="block mb-1 text-xs font-semibold text-stone-500">Distance (km)</span>
          <input
            v-model="km"
            type="text"
            inputmode="decimal"
            placeholder="ex. 8,5"
            class="w-full border border-stone-200 rounded-xl px-3 py-2.5 tabular-nums focus:outline-none focus:border-orange-400 transition-colors"
          />
        </label>
      </div>
      <p v-if="inputError" role="alert" class="mt-2 text-xs font-medium text-red-600">{{ inputError }}</p>
    </form>

    <!-- La semaine de la séance : son compte, ou son bilan quand la séance la clôt -->
    <section v-if="week" class="mt-5">
      <div v-if="week.complete" class="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
        <p class="text-xs font-bold uppercase tracking-wider text-emerald-700">Semaine {{ week.weekNumber }} complète</p>
        <p class="mt-0.5 text-lg font-black text-stone-900 leading-tight">{{ headline }}</p>

        <dl class="grid grid-cols-2 gap-2 mt-3">
          <div
            v-for="(stat, index) in weekStats"
            :key="stat.label"
            class="bg-white border border-emerald-100 rounded-xl px-3 py-2"
            :class="{ 'col-span-2': weekStats.length % 2 === 1 && index === weekStats.length - 1 }"
          >
            <dd class="text-lg font-black text-stone-900 tabular-nums leading-tight whitespace-nowrap">{{ stat.value }}</dd>
            <dt class="text-xs text-stone-500">{{ stat.label }}</dt>
          </div>
        </dl>

        <template v-if="gains.length">
          <p class="mt-3 mb-1 text-xs font-bold uppercase tracking-wider text-emerald-700">En hausse</p>
          <ul class="space-y-0.5">
            <li v-for="gain in gains" :key="gain.exerciseId" class="flex items-baseline justify-between gap-3 text-sm">
              <span class="text-stone-700 truncate">{{ gain.name }}</span>
              <span class="flex-shrink-0 font-bold text-stone-900 tabular-nums whitespace-nowrap">{{ gain.range }}</span>
            </li>
          </ul>
        </template>

        <p v-if="outlook" class="mt-3 text-sm text-stone-700">{{ outlook }}</p>
      </div>

      <div v-else class="flex items-center justify-between gap-3 rounded-xl bg-stone-50 border border-stone-100 px-3 py-2.5">
        <span class="text-sm text-stone-600">Semaine {{ week.weekNumber }}</span>
        <span class="text-sm font-bold text-stone-900 tabular-nums">{{ week.done }} / {{ week.total }} séances</span>
      </div>
    </section>

    <p v-if="error" role="alert" class="mt-4 text-sm text-red-600">
      {{ error }}
      <button type="button" class="font-semibold underline" @click="emit('done', null)">Fermer sans noter</button>
    </p>

    <button
      type="button"
      class="w-full mt-5 py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-60"
      :class="cfg.pendingBtn"
      :disabled="saving"
      @click="finish"
    >{{ saving ? 'Enregistrement…' : 'Terminer' }}</button>
  </BottomSheet>
</template>

<script setup>
import { computed, shallowRef } from 'vue'
import { useTrainingStore } from '@/stores/training'
import { getSessionTypeConfig } from '@/constants/sessionTypes'
import { formatClock, formatKg } from '@/utils/workout'
import { formatNumber } from '@/utils/setLogs'
import { formatHours, formatTonnage, parseCompletionDetails } from '@/utils/progress'
import BottomSheet from './BottomSheet.vue'

const props = defineProps({
  session: { type: Object,  required: true },
  workout: { type: Object,  default: null },  // muscu : { durationSec, summary } (summary issu de summarizeWorkout)
  week:    { type: Object,  default: null },  // bilan de la semaine de la séance (store progress, summaryFor)
  canNote: { type: Boolean, default: false }, // Directus sait enregistrer la durée et la distance
  saving:  { type: Boolean, default: false },
  error:   { type: String,  default: '' },    // l'enregistrement de la durée ou de la distance a échoué
})

// done : { durationSec, distanceKm } à enregistrer, ou null s'il n'y a rien à noter
const emit = defineEmits(['done'])

const training = useTrainingStore()
const cfg = computed(() => getSessionTypeConfig(props.session.type))

// ── Muscu ────────────────────────────────────────────────────────────────────
const workoutStats = computed(() => [
  { label: 'Durée',  value: props.workout.durationSec == null ? '—' : formatClock(props.workout.durationSec) },
  { label: 'Séries', value: `${props.workout.summary.setsDone}/${props.workout.summary.setsPlanned}` },
  { label: 'Volume', value: formatKg(props.workout.summary.volumeKg) },
  { label: 'Reps',   value: String(props.workout.summary.totalReps) },
])

const exercises = computed(() =>
  props.workout.summary.exercises.map(exercise => ({
    ...exercise,
    volume: exercise.volumeKg > 0 ? formatKg(exercise.volumeKg) : '',
  }))
)

// ── Durée et distance ────────────────────────────────────────────────────────
const DISTANCE_TYPES = ['running', 'brick', 'hyrox', 'race']
const withDistance = computed(() => DISTANCE_TYPES.includes(props.session.type))
const minutes = shallowRef('')
const km = shallowRef('')
const inputError = shallowRef('')

// Fermer le panneau vaut « Terminer » : ce qui est saisi n'est jamais perdu en silence
function finish() {
  inputError.value = ''
  if (props.workout || !props.canNote) { emit('done', null); return }
  const parsed = parseCompletionDetails({ minutes: minutes.value, km: withDistance.value ? km.value : '' })
  if (!parsed.ok) { inputError.value = parsed.error; return }
  const empty = parsed.durationSec == null && parsed.distanceKm == null
  emit('done', empty ? null : { durationSec: parsed.durationSec, distanceKm: parsed.distanceKm })
}

// ── Bilan de semaine ─────────────────────────────────────────────────────────
const headline = computed(() =>
  (props.week.streak > 1 ? `${props.week.streak} semaines complètes d'affilée` : 'Toutes tes séances sont validées'))

const weekStats = computed(() => [
  { value: String(props.week.sessionsDone), label: props.week.sessionsDone > 1 ? 'séances' : 'séance' },
  props.week.minutes > 0 ? { value: formatHours(props.week.minutes), label: 'd\'entraînement' } : null,
  props.week.volumeKg > 0 ? { value: formatTonnage(props.week.volumeKg), label: props.week.volumeKg >= 1000 ? 'levées' : 'levés' } : null,
  props.week.km > 0 ? { value: `${formatNumber(props.week.km)} km`, label: 'parcourus' } : null,
].filter(Boolean))

const UNIT = { kg: 'kg', reps: 'reps', s: 's' }
const gains = computed(() => props.week.gains.slice(0, 5).map(gain => ({
  ...gain,
  range: `${formatNumber(gain.from)} → ${formatNumber(gain.to)} ${UNIT[gain.unit]}`,
})))

const outlook = computed(() => {
  const { next, phaseChange, last } = props.week.outlook
  if (last) return 'C\'était la dernière semaine de ton plan. Bravo.'
  if (!next) return 'La suite du plan n\'est pas encore programmée.'
  if (phaseChange) {
    const name = training.phaseName(next.phase)
    return `Nouvelle phase la semaine prochaine : ${name || `phase ${next.phase}`}.`
  }
  if (next.isDeload) return `Semaine ${next.weekNumber} : décharge.`
  return next.theme ? `Semaine ${next.weekNumber} : ${next.theme}.` : ''
})
</script>
