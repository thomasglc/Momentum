<template>
  <div class="px-4 pt-3 pb-0">
    <div class="bg-slate-900 rounded-2xl px-5 py-4 shadow-lg">

      <!-- Top row: phase badge + deload -->
      <div class="flex items-center justify-between mb-3">
        <span
          v-if="phase"
          class="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/10 text-white/70"
        >Ph.{{ phase }} — {{ phaseCfg.name }}</span>
        <span
          v-if="isDeload"
          class="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-400/20 text-emerald-400"
        >Décharge</span>
        <div v-if="!phase && !isDeload" />
      </div>

      <!-- Navigation row -->
      <div class="flex items-center justify-between">
        <button
          @click="emit('prev')"
          :disabled="!canGoPrev"
          class="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white text-xl disabled:opacity-20 active:scale-95 transition-transform"
        >‹</button>

        <div class="text-center">
          <div class="text-5xl font-black text-white tracking-tight leading-none">S{{ weekNumber }}</div>
          <div v-if="dateRange" class="text-[11px] text-white/50 mt-1.5 tracking-wide">{{ dateRange }}</div>
          <div class="text-sm font-semibold text-orange-400 mt-1 leading-snug">{{ theme }}</div>
        </div>

        <button
          @click="emit('next')"
          :disabled="!canGoNext"
          class="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white text-xl disabled:opacity-20 active:scale-95 transition-transform"
        >›</button>
      </div>

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
