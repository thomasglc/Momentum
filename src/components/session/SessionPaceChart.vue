<template>
  <div class="mb-5">
    <h3 class="text-xs uppercase tracking-widest font-semibold text-gray-400 mb-2">Structure de séance</h3>

    <!-- Bar chart -->
    <div class="flex items-end gap-0.5 rounded-xl bg-gray-100 px-2 pb-2 overflow-hidden" style="height: 72px">
      <div
        v-for="(seg, i) in segments"
        :key="i"
        class="rounded-sm flex-none"
        :style="{
          flex: String(seg.duration),
          minWidth: '5px',
          height: SEG_STYLES[seg.type]?.h || '38%',
          backgroundColor: SEG_STYLES[seg.type]?.color || '#86efac',
        }"
      />
    </div>

    <!-- Legend -->
    <div class="mt-2 flex flex-col gap-1.5">
      <div v-for="(seg, i) in summary" :key="i" class="flex items-center gap-2">
        <div class="w-2 h-5 rounded-sm flex-shrink-0" :style="{ backgroundColor: SEG_STYLES[seg.type]?.color }"></div>
        <div>
          <span class="text-xs font-semibold text-gray-700">{{ SEG_LABELS[seg.type] }}</span>
          <span v-if="seg.count > 1" class="text-xs text-gray-400 ml-1">× {{ seg.count }}</span>
          <span v-if="seg.paces" class="text-xs text-gray-500 ml-1.5">
            — 👨 {{ seg.paces.lui }} · 👩 {{ seg.paces.elle }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { extractRunningSegmentsFromStructured, summarizeSegments } from '@/services/sessionParser'

const props = defineProps({
  structuredDetails: { type: Array, required: true },
})

const SEG_STYLES = {
  warmup:   { color: '#bef264', h: '44%' },
  easy:     { color: '#86efac', h: '36%' },
  tempo:    { color: '#7f1d1d', h: '94%' },
  recovery: { color: '#f9a8d4', h: '22%' },
  cooldown: { color: '#99f6e4', h: '36%' },
}

const SEG_LABELS = {
  warmup:   'Échauffement',
  easy:     'Footing facile',
  tempo:    'Effort / Tempo',
  recovery: 'Récupération',
  cooldown: 'Retour au calme',
}

const segments = computed(() => extractRunningSegmentsFromStructured(props.structuredDetails))
const summary  = computed(() => summarizeSegments(segments.value))
</script>
