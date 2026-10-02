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

    <p v-if="target" class="mt-3 text-sm font-bold text-blue-600">{{ target }}</p>
    <p v-if="line.note" class="mt-0.5 text-xs text-stone-500 leading-relaxed">{{ line.note }}</p>
    <p v-if="line.tip" class="mt-2 text-xs text-stone-600 leading-relaxed bg-stone-50 border border-stone-100 rounded-xl px-3 py-2">{{ line.tip }}</p>

    <h4 class="mt-5 mb-2 text-xs uppercase tracking-widest font-semibold text-stone-400">Historique</h4>

    <div v-if="status === 'loading'" class="space-y-2 animate-pulse">
      <div class="h-12 bg-stone-100 rounded-xl" />
      <div class="h-12 bg-stone-100 rounded-xl" />
    </div>
    <p v-else-if="status === 'error'" role="alert" class="text-xs text-red-600">
      Historique indisponible pour le moment.
    </p>
    <p v-else-if="!entries.length" class="text-xs text-stone-400">
      Aucune série enregistrée pour cet exercice.
    </p>
    <ul v-else class="space-y-2">
      <li v-for="entry in entries" :key="entry.key" class="bg-stone-50 border border-stone-100 rounded-xl px-3 py-2">
        <p class="text-[11px] font-semibold text-stone-500 first-letter:uppercase">{{ entry.day }}</p>
        <p class="mt-0.5 text-sm font-medium text-stone-800 leading-relaxed">{{ entry.summary }}</p>
      </li>
    </ul>
  </BottomSheet>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { useSetLogStore } from '@/stores/setLogs'
import { formatSet, formatTarget } from '@/utils/setLogs'
import BottomSheet from './BottomSheet.vue'

const FRAME_INTERVAL_MS = 1100

const props = defineProps({
  line: { type: Object, required: true }, // ligne d'exercice structurée
})

const emit = defineEmits(['close'])

const store = useSetLogStore()

const frame   = shallowRef(0)
const status  = shallowRef('loading') // loading | ready | error
const entries = shallowRef([])        // [{ key, day, summary }]

const target = computed(() => formatTarget(props.line))

const formatDay = iso =>
  new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

async function loadHistory() {
  if (props.line.exerciseId == null) { status.value = 'ready'; return }
  try {
    const history = await store.loadHistory(props.line.exerciseId)
    entries.value = history.map(session => ({
      key: session.key,
      day: formatDay(session.date),
      summary: session.sets.map(formatSet).join(' · '),
    }))
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
