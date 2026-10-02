<template>
  <section>
    <h2 class="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Mes charges</h2>

    <p v-if="failed" role="alert" class="bg-white rounded-2xl border border-stone-100 px-4 py-4 text-sm text-stone-500">
      Charges indisponibles pour le moment.
    </p>
    <p v-else-if="!loads.length" class="bg-white rounded-2xl border border-stone-100 px-4 py-4 text-sm text-stone-500">
      Tes charges apparaîtront ici après ta première séance de muscu enregistrée.
    </p>

    <template v-else>
      <ul class="bg-white rounded-2xl shadow-sm border border-stone-100 divide-y divide-stone-100 overflow-hidden">
        <li v-for="load in visible" :key="load.exerciseId" class="px-4 py-3 flex items-center gap-3">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-stone-800 truncate">{{ load.name }}</p>
            <p class="text-xs text-stone-500">{{ load.sessions }} {{ load.sessions > 1 ? 'séances' : 'séance' }}</p>
          </div>
          <p class="flex-shrink-0 text-sm font-bold text-stone-900 tabular-nums whitespace-nowrap">{{ load.range }}</p>
          <span
            v-if="load.delta"
            class="flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full tabular-nums whitespace-nowrap"
            :class="load.up ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'"
          >{{ load.delta }}</span>
        </li>
      </ul>
      <button
        v-if="loads.length > LIMIT"
        type="button"
        class="w-full mt-2 py-2.5 text-sm font-semibold text-stone-600 rounded-xl active:bg-stone-200 transition-colors"
        @click="showAll = !showAll"
      >{{ showAll ? 'Réduire' : `Voir les ${loads.length} exercices` }}</button>
    </template>
  </section>
</template>

<script setup>
import { computed, shallowRef } from 'vue'
import { formatNumber } from '@/utils/setLogs'

const props = defineProps({
  loads:  { type: Array,   required: true }, // résultat de exerciseProgress (utils/progress)
  failed: { type: Boolean, default: false }, // séries non chargées
})

const LIMIT = 6
const showAll = shallowRef(false)

const UNIT = { kg: 'kg', reps: 'reps', s: 's' }
const round1 = n => Math.round(n * 10) / 10

const rows = computed(() => props.loads.map((load) => {
  const unit = UNIT[load.unit]
  const diff = round1(load.last - load.first)
  return {
    ...load,
    range: diff ? `${formatNumber(load.first)} → ${formatNumber(load.last)} ${unit}` : `${formatNumber(load.last)} ${unit}`,
    delta: diff ? `${diff > 0 ? '+' : '−'}${formatNumber(Math.abs(diff))}` : '',
    up: diff > 0,
  }
}))

const visible = computed(() => (showAll.value ? rows.value : rows.value.slice(0, LIMIT)))
</script>
