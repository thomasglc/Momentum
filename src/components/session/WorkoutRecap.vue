<template>
  <BottomSheet title="Séance terminée" @close="emit('close')">
    <p class="mb-4 text-sm text-stone-500 leading-snug">{{ title }}</p>

    <dl class="grid grid-cols-2 gap-2">
      <div v-for="stat in stats" :key="stat.label" class="bg-stone-50 border border-stone-100 rounded-xl px-3 py-2.5">
        <dt class="text-[10px] uppercase tracking-widest font-semibold text-stone-400">{{ stat.label }}</dt>
        <dd class="mt-0.5 text-xl font-black text-stone-800 tabular-nums leading-tight">{{ stat.value }}</dd>
      </div>
    </dl>

    <template v-if="exercises.length">
      <h4 class="mt-5 mb-2 text-xs uppercase tracking-widest font-semibold text-stone-400">Par exercice</h4>
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
    <p v-else class="mt-4 text-xs text-stone-400">Aucune série enregistrée pour cette séance.</p>

    <button
      type="button"
      class="w-full mt-5 py-3 rounded-xl font-semibold text-sm bg-blue-500 text-white active:scale-[0.98] transition-all"
      @click="emit('close')"
    >Terminer</button>
  </BottomSheet>
</template>

<script setup>
import { computed } from 'vue'
import { formatClock, formatKg } from '@/utils/workout'
import BottomSheet from './BottomSheet.vue'

const props = defineProps({
  title:       { type: String, required: true },  // titre de la séance
  durationSec: { type: Number, default: null },   // null si la séance n'a pas été démarrée
  summary:     { type: Object, required: true },  // résultat de summarizeWorkout
})

const emit = defineEmits(['close'])

const stats = computed(() => [
  { label: 'Durée',  value: props.durationSec == null ? '—' : formatClock(props.durationSec) },
  { label: 'Séries', value: `${props.summary.setsDone}/${props.summary.setsPlanned}` },
  { label: 'Volume', value: formatKg(props.summary.volumeKg) },
  { label: 'Reps',   value: String(props.summary.totalReps) },
])

const exercises = computed(() =>
  props.summary.exercises.map(exercise => ({
    ...exercise,
    volume: exercise.volumeKg > 0 ? formatKg(exercise.volumeKg) : '',
  }))
)
</script>
