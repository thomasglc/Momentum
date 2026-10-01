<template>
  <!-- Téléportée : flotte au-dessus de la barre d'onglets, hors du conteneur de la vue -->
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed left-0 right-0 z-40 px-3 pointer-events-none"
      style="bottom: calc(4.75rem + env(safe-area-inset-bottom))"
    >
      <div class="pointer-events-auto mx-auto max-w-[456px] rounded-2xl shadow-lg text-white overflow-hidden transition-colors" :class="tone">

        <!-- Repos en cours -->
        <div v-if="workout.rest" class="px-4 pt-2.5 pb-3">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="text-[10px] font-semibold uppercase tracking-widest text-white/70 truncate">
                Repos · {{ workout.rest.label }}
              </p>
              <p class="mt-0.5 text-3xl font-black tabular-nums leading-none" role="timer">{{ restClock }}</p>
            </div>
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <button type="button" :class="ADJUST" aria-label="Retirer 15 secondes de repos" @click="workout.adjustRest(-15)">−15 s</button>
              <button type="button" :class="ADJUST" aria-label="Ajouter 15 secondes de repos" @click="workout.adjustRest(15)">+15 s</button>
              <button
                type="button"
                class="h-9 px-3 rounded-lg bg-white text-blue-700 text-xs font-bold active:scale-95 transition-transform"
                @click="workout.skipRest()"
              >Passer</button>
            </div>
          </div>
          <div class="mt-2.5 h-1 rounded-full bg-white/20 overflow-hidden" aria-hidden="true">
            <div class="h-full rounded-full bg-white" :style="{ width: progressWidth }" />
          </div>
        </div>

        <!-- Repos terminé -->
        <div v-else-if="workout.restJustDone" class="px-4 py-3 flex items-center justify-between gap-3" role="status">
          <p class="text-sm font-bold">Repos terminé, série suivante</p>
          <p v-if="running" class="text-xs font-semibold tabular-nums text-white/80">{{ elapsedClock }}</p>
        </div>

        <!-- Séance en cours -->
        <div v-else class="px-4 py-2.5 flex items-center justify-between gap-3">
          <p class="text-[11px] font-semibold uppercase tracking-widest text-white/70">Séance en cours</p>
          <p class="text-lg font-black tabular-nums leading-none" role="timer">{{ elapsedClock }}</p>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { useWorkoutStore } from '@/stores/workout'
import { formatClock } from '@/utils/workout'

const ADJUST = 'h-9 px-2.5 rounded-lg bg-white/15 text-xs font-bold tabular-nums active:scale-95 transition-transform'

const props = defineProps({
  sessionId: { type: Number, required: true }, // séance affichée
})

const workout = useWorkoutStore()

const running = computed(() => workout.isRunningFor(props.sessionId))
const visible = computed(() => running.value || !!workout.rest || workout.restJustDone)

const tone = computed(() => {
  if (workout.rest) return 'bg-blue-600'
  return workout.restJustDone ? 'bg-emerald-500' : 'bg-stone-800'
})

const elapsedClock  = computed(() => formatClock(workout.elapsed))
const restClock     = computed(() => formatClock(workout.restRemaining))
const progressWidth = computed(() => `${Math.round(workout.restRatio * 100)}%`)
</script>
