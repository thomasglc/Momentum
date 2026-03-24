<template>
  <div class="px-4 pt-3 pb-1">
    <!-- Phase badge -->
    <div class="flex items-center justify-center gap-2 mb-2">
      <span
        v-if="phase"
        class="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full"
        :class="phaseCfg.badge"
      >Phase {{ phase }} — {{ phaseCfg.name }}</span>
      <span
        v-if="isDeload"
        class="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600"
      >Décharge</span>
    </div>

    <!-- Navigation -->
    <div class="flex items-center justify-between">
      <button
        @click="emit('prev')"
        :disabled="!canGoPrev"
        class="w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-200 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-transform"
      >&#8249;</button>

      <div class="text-center">
        <div class="flex items-center justify-center gap-2">
          <p class="text-xs text-gray-400 uppercase tracking-wider font-medium">Semaine {{ weekNumber }}</p>
          <span v-if="dateRange" class="text-xs text-gray-400">· {{ dateRange }}</span>
        </div>
        <p class="text-sm font-semibold text-gray-800 mt-0.5">{{ theme }}</p>
      </div>

      <button
        @click="emit('next')"
        :disabled="!canGoNext"
        class="w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-200 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-transform"
      >&#8250;</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getPhaseConfig } from '@/constants/phaseConfig'

const props = defineProps({
  weekNumber: { type: Number,  required: true },
  theme:      { type: String,  required: true },
  dateRange:  { type: String,  default: '' },
  phase:      { type: Number,  default: null },
  isDeload:   { type: Boolean, default: false },
  canGoPrev:  { type: Boolean, default: false },
  canGoNext:  { type: Boolean, default: false },
})

const emit = defineEmits(['prev', 'next'])

const phaseCfg = computed(() => getPhaseConfig(props.phase))
</script>
