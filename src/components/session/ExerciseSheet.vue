<template>
  <BottomSheet :title="line.name" @close="emit('close')">
    <!-- Photos : alternent pour montrer le mouvement -->
    <div v-if="line.images.length" class="relative aspect-[3/2] rounded-2xl overflow-hidden bg-stone-100">
      <img
        v-for="(src, i) in line.images"
        :key="src"
        :src="src"
        :alt="`${line.name}, photo ${i + 1}`"
        class="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
        :class="i === frame ? 'opacity-100' : 'opacity-0'"
      />
    </div>

    <!-- L'objectif, puis les repères en pastilles -->
    <p v-if="target" class="mt-3 text-xl font-black text-stone-900 tabular-nums leading-tight">{{ target }}</p>
    <div v-if="chips.length" class="flex flex-wrap gap-1.5 mt-2">
      <span v-for="chip in chips" :key="chip" class="text-xs font-semibold text-stone-600 bg-stone-100 rounded-full px-2.5 py-1">{{ chip }}</span>
    </div>
    <p v-if="line.tip" class="mt-3 text-sm text-stone-700 leading-relaxed bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">{{ line.tip }}</p>

    <div v-if="status === 'loading'" class="mt-5 space-y-2 animate-pulse" aria-hidden="true">
      <div class="h-20 bg-stone-100 rounded-xl" />
      <div class="h-12 bg-stone-100 rounded-xl" />
    </div>
    <p v-else-if="status === 'error'" role="alert" class="mt-5 text-sm text-red-600">
      Historique indisponible pour le moment.
    </p>
    <p v-else-if="!entries.length" class="mt-5 text-sm text-stone-500">
      Aucune série enregistrée pour cet exercice.
    </p>

    <template v-else>
      <!-- Tendance : la meilleure série de chaque séance -->
      <section v-if="bars.length > 1" class="mt-5">
        <div class="flex items-baseline justify-between gap-3 mb-2">
          <h4 class="text-xs uppercase tracking-wider font-bold text-stone-400">Progression</h4>
          <p class="text-sm font-bold text-stone-900 tabular-nums">{{ trendLabel }}</p>
        </div>
        <div class="flex items-end gap-1.5 h-16" role="img" :aria-label="`Meilleure série des ${bars.length} dernières séances : ${trendLabel}`">
          <span
            v-for="(bar, i) in bars"
            :key="bar.key"
            class="flex-1 max-w-10 rounded-t-md"
            :class="i === bars.length - 1 ? 'bg-blue-500' : 'bg-blue-200'"
            :style="{ height: bar.height }"
          />
        </div>
      </section>

      <h4 class="mt-5 mb-2 text-xs uppercase tracking-wider font-bold text-stone-400">Historique</h4>
      <ul class="divide-y divide-stone-100 border-y border-stone-100">
        <li v-for="entry in entries" :key="entry.key" class="py-2.5">
          <p class="text-xs font-semibold text-stone-500 first-letter:uppercase">{{ entry.day }}</p>
          <p class="mt-0.5 text-sm font-semibold text-stone-800 tabular-nums leading-relaxed">{{ entry.summary }}</p>
        </li>
      </ul>
    </template>
  </BottomSheet>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { useSetLogStore } from '@/stores/setLogs'
import { formatNumber, formatRest, historyTrend, summarizeSets } from '@/utils/setLogs'
import { describeLine } from '@/utils/workout'
import BottomSheet from './BottomSheet.vue'

const FRAME_INTERVAL_MS = 1100

const props = defineProps({
  line:    { type: Object, required: true }, // ligne d'exercice structurée
  restSec: { type: Number, default: null },  // repos du bloc
})

const emit = defineEmits(['close'])

const store = useSetLogStore()

const frame   = shallowRef(0)
const status  = shallowRef('loading') // loading | ready | error
const history = shallowRef([])        // séances passées de l'exercice, la plus récente d'abord

const described = computed(() => describeLine(props.line))
const target = computed(() => described.value.target)
const chips = computed(() => [
  ...described.value.chips,
  props.restSec ? `repos ${formatRest(props.restSec)}` : '',
].filter(Boolean))

const formatDay = iso =>
  new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

const entries = computed(() => history.value.map(session => ({
  key: session.key,
  day: formatDay(session.date),
  summary: summarizeSets(session.sets),
})))

// Hauteur des barres entre le minimum et le maximum affichés, pour que la progression se voie
const trend = computed(() => historyTrend(history.value))
const bars = computed(() => {
  const values = trend.value.points.map(point => point.value)
  const min = Math.min(...values)
  const span = Math.max(...values) - min
  return trend.value.points.map(point => ({
    key: point.key,
    height: `${span ? 30 + Math.round(((point.value - min) / span) * 70) : 100}%`,
  }))
})
const trendLabel = computed(() => {
  const { unit, points } = trend.value
  const suffix = { kg: 'kg', reps: 'reps', s: 's' }[unit]
  const first = points[0].value
  const last = points.at(-1).value
  return first === last ? `${formatNumber(last)} ${suffix}` : `${formatNumber(first)} → ${formatNumber(last)} ${suffix}`
})

async function loadHistory() {
  if (props.line.exerciseId == null) { status.value = 'ready'; return }
  try {
    history.value = await store.loadHistory(props.line.exerciseId)
    status.value = 'ready'
  } catch {
    status.value = 'error'
  }
}

let frameTimer = null

onMounted(() => {
  if (props.line.images.length > 1) {
    frameTimer = setInterval(() => { frame.value = (frame.value + 1) % props.line.images.length }, FRAME_INTERVAL_MS)
  }
  loadHistory()
})

onBeforeUnmount(() => clearInterval(frameTimer))
</script>
