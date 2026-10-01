<template>
  <!-- Téléporté : la vue vit dans un conteneur à overflow masqué et transformé pendant les transitions -->
  <Teleport to="body">
    <div class="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true" :aria-label="line.name">
      <div class="absolute inset-0 bg-black/40 sheet-fade" @click="emit('close')" />

      <div
        class="relative w-full max-w-[480px] max-h-[88dvh] overflow-y-auto overscroll-contain bg-white rounded-t-3xl shadow-xl sheet-up"
        style="padding-bottom: calc(1.25rem + env(safe-area-inset-bottom))"
      >
        <div class="sticky top-0 z-10 flex items-start justify-between gap-3 px-4 pt-4 pb-3 bg-white">
          <h3 class="text-lg font-black text-stone-800 leading-tight tracking-tight">{{ line.name }}</h3>
          <button
            type="button"
            class="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-stone-100 text-stone-500 text-lg active:scale-95 transition-transform"
            aria-label="Fermer"
            @click="emit('close')"
          >×</button>
        </div>

        <div class="px-4">
          <!-- Photo : alterne position de départ et position d'arrivée -->
          <div v-if="line.images.length" class="relative aspect-[3/2] rounded-2xl overflow-hidden bg-stone-100">
            <img
              v-for="(src, i) in line.images"
              :key="src"
              :src="src"
              :alt="`${line.name}, ${FRAME_LABELS[i] ?? ''}`"
              class="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
              :class="i === frame ? 'opacity-100' : 'opacity-0'"
            />
            <span
              v-if="line.images.length > 1"
              class="absolute bottom-2 right-2 text-[10px] font-semibold text-white bg-black/50 rounded-full px-2 py-0.5"
            >{{ FRAME_LABELS[frame] }}</span>
          </div>

          <p v-if="target" class="mt-3 text-sm font-bold text-blue-600">{{ target }}</p>
          <p v-if="line.note" class="mt-0.5 text-xs text-stone-500 leading-relaxed">{{ line.note }}</p>

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
              <p class="text-[11px] font-semibold text-stone-500 capitalize">{{ entry.day }}</p>
              <p class="mt-0.5 text-sm font-medium text-stone-800 leading-relaxed">{{ entry.summary }}</p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { useSetLogStore } from '@/stores/setLogs'
import { formatSet, formatTarget } from '@/utils/setLogs'

const FRAME_LABELS = ['Départ', 'Arrivée']
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

const onKeydown = (event) => { if (event.key === 'Escape') emit('close') }

let frameTimer = null
let previousOverflow = ''

onMounted(() => {
  if (props.line.images.length > 1) {
    frameTimer = setInterval(() => { frame.value = frame.value === 0 ? 1 : 0 }, FRAME_INTERVAL_MS)
  }
  // La page ne défile pas derrière le panneau
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  document.addEventListener('keydown', onKeydown)
  loadHistory()
})

onBeforeUnmount(() => {
  clearInterval(frameTimer)
  document.body.style.overflow = previousOverflow
  document.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.sheet-up   { animation: sheet-up 240ms cubic-bezier(0.25, 0.46, 0.45, 0.94); }
.sheet-fade { animation: sheet-fade 240ms ease; }

@keyframes sheet-up {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
@keyframes sheet-fade {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .sheet-up, .sheet-fade { animation: none; }
}
</style>
