<template>
  <div v-if="session">

    <!-- Header island -->
    <div class="px-4 pt-3 pb-0">
      <div class="rounded-2xl shadow-lg" :class="cfg.heroBg">
        <div class="px-4 pt-4 pb-5">

          <!-- Rangée 1 : bouton retour ← | badges → -->
          <div class="flex items-center justify-between mb-4">
            <button
              @click="emit('back')"
              class="w-8 h-8 flex items-center justify-center rounded-full bg-white/15 text-white text-lg active:scale-95 transition-transform flex-shrink-0"
              aria-label="Retour"
            >‹</button>

            <div class="flex items-center gap-1.5 flex-wrap justify-end">
              <span v-if="session.optional"
                class="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white/15 text-white/80">
                Optionnel
              </span>
              <span class="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/20 text-white flex items-center gap-1">
                <span>{{ cfg.icon }}</span>{{ cfg.label }}
              </span>
            </div>
          </div>

          <!-- Titre -->
          <h2 class="text-[1.6rem] font-black text-white leading-tight tracking-tight mb-3">
            {{ session.title }}
          </h2>

          <!-- Rangée 3 : jour · durée · intensité -->
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-sm font-medium text-white/70">{{ session.day }}</span>
            <template v-if="session.duration > 0">
              <span class="text-white/30">·</span>
              <span class="text-sm text-white/70">{{ session.duration }} min</span>
            </template>
            <template v-if="session.intensityScore">
              <span class="text-white/30">·</span>
              <span class="flex items-center gap-0.5">
                <span
                  v-for="n in 5" :key="n"
                  class="w-2 h-2 rounded-full"
                  :class="n * 2 <= session.intensityScore ? 'bg-white' : 'bg-white/20'"
                />
              </span>
            </template>
          </div>

        </div>
      </div>
    </div>

    <!-- Body -->
    <div class="px-4 py-4">

      <!-- Note optionnelle -->
      <div v-if="session.optional" class="mb-4 bg-violet-50 border-l-4 border-violet-300 rounded-r-lg px-3 py-2">
        <p class="text-xs text-violet-700">
          Cette séance est <strong>optionnelle</strong>. À faire uniquement si vous vous sentez bien — le repos complet prime toujours.
        </p>
      </div>

      <!-- Description -->
      <p class="text-sm text-stone-600 mb-4 leading-relaxed">{{ session.description }}</p>

      <!-- Coach tip -->
      <div v-if="session.coachTip" class="mb-4 flex items-start gap-2.5 bg-stone-50 border border-stone-200 rounded-xl px-3 py-3">
        <span class="text-base flex-shrink-0">💬</span>
        <p class="text-xs text-stone-600 leading-relaxed italic">{{ session.coachTip }}</p>
      </div>

      <!-- Graphique allures (running uniquement) -->
      <SessionPaceChart
        v-if="session.type === 'running' && session.structuredDetails?.length"
        :structuredDetails="session.structuredDetails"
        :resolvePace="resolvePace"
      />

      <!-- Skeleton programme (structuredDetails pas encore chargés) -->
      <div v-if="session.structuredDetails === undefined" class="mb-6 animate-pulse">
        <div class="h-3 bg-stone-200 rounded w-20 mb-3" />
        <div class="space-y-2">
          <div class="h-11 bg-stone-200 rounded-xl" />
          <div class="h-20 bg-stone-200 rounded-xl" />
          <div class="h-11 bg-stone-200 rounded-xl" />
          <div class="h-16 bg-stone-200 rounded-xl" />
        </div>
      </div>

      <!-- Programme -->
      <div v-else-if="visibleBlocks.length" class="mb-6">
        <h3 class="text-xs uppercase tracking-widest font-semibold text-stone-400 mb-3">Programme</h3>
        <div class="space-y-2">
          <SessionProgramBlock
            v-for="(block, i) in visibleBlocks"
            :key="i"
            :block="block"
          />
        </div>
      </div>

      <!-- Bouton valider -->
      <button
        @click="emit('toggle')"
        class="w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98]"
        :class="completed ? cfg.completedBtn : cfg.pendingBtn"
      >
        {{ completed ? '✓ Séance validée — Annuler' : 'Valider la séance' }}
      </button>

    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getSessionTypeConfig } from '@/constants/sessionTypes'
import { structuredDetailToBlock, extractRunningSegmentsFromStructured } from '@/services/sessionParser'
import { paceForZone } from '@/utils/paceCalculator'
import { useTrainingStore } from '@/stores/training'
import SessionPaceChart    from './session/SessionPaceChart.vue'
import SessionProgramBlock from './session/SessionProgramBlock.vue'

const props = defineProps({
  session:   { type: Object,  required: true },
  completed: { type: Boolean, default: false },
})

const emit = defineEmits(['toggle', 'back'])

const store = useTrainingStore()

function resolvePace(zone) {
  return {
    lui:  paceForZone(zone, store.tenKmTimeLui),
    elle: paceForZone(zone, store.tenKmTimeElle),
  }
}

const cfg = computed(() => getSessionTypeConfig(props.session?.type))
const parsedBlocks = computed(() => (props.session?.structuredDetails ?? []).map(d => structuredDetailToBlock(d, resolvePace)))

// La timeline du graphique couvre déjà ces blocs pour les séances running
const CHART_COVERED = new Set(['warmup', 'cooldown', 'interval', 'run_segment', 'pace'])
const hasPaceChart = computed(() => props.session?.type === 'running' && props.session?.structuredDetails?.length > 0)
const visibleBlocks = computed(() =>
  hasPaceChart.value ? parsedBlocks.value.filter(b => !CHART_COVERED.has(b.type)) : parsedBlocks.value
)
</script>
