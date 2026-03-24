<template>
  <div class="rounded-xl overflow-hidden" :class="`border ${theme.border}`">
    <!-- Header -->
    <div class="flex items-center gap-2 px-3 py-2.5" :class="theme.headerBg">
      <span>{{ icon }}</span>
      <span class="text-xs font-bold uppercase tracking-wide" :class="theme.headerText">{{ header }}</span>
    </div>

    <!-- Exercise grid -->
    <div v-if="exercises?.length" class="p-2" :class="theme.bodyBg">
      <div class="grid grid-cols-2 gap-1.5">
        <div
          v-for="(ex, i) in exercises"
          :key="i"
          class="bg-white rounded-xl p-2.5 border flex flex-col items-center text-center"
          :class="theme.cardBorder"
        >
          <span class="text-2xl leading-none mb-1.5">{{ ex.emoji }}</span>
          <p class="text-[11px] font-semibold text-gray-700 leading-tight">{{ ex.name }}</p>
          <p v-if="ex.value" class="text-sm font-bold mt-1" :class="theme.valueColor">{{ ex.value }}</p>
          <p v-if="ex.note" class="text-[10px] text-gray-400 mt-0.5 leading-tight">{{ ex.note }}</p>
        </div>
      </div>
    </div>

    <!-- Fallback text (no exercise list parsed) -->
    <div v-else-if="content" class="px-3 py-2" :class="theme.bodyBg">
      <p class="text-xs text-gray-700 leading-relaxed">{{ content }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant:   { type: String, required: true }, // 'circuit' | 'strength' | 'finisher'
  header:    { type: String, required: true },
  exercises: { type: Array,  default: null },
  content:   { type: String, default: null },
})

const THEMES = {
  circuit:  { border: 'border-amber-200', headerBg: 'bg-amber-400',  headerText: 'text-white', bodyBg: 'bg-amber-50', cardBorder: 'border-amber-100', valueColor: 'text-amber-600',  icon: '⚡' },
  strength: { border: 'border-blue-200',  headerBg: 'bg-blue-500',   headerText: 'text-white', bodyBg: 'bg-blue-50',  cardBorder: 'border-blue-100',  valueColor: 'text-blue-600',   icon: '💪' },
  finisher: { border: 'border-red-200',   headerBg: 'bg-red-500',    headerText: 'text-white', bodyBg: 'bg-red-50',   cardBorder: 'border-red-100',   valueColor: 'text-red-600',    icon: '🔥' },
}

const theme = computed(() => THEMES[props.variant] ?? THEMES.circuit)
const icon  = computed(() => theme.value.icon)
</script>
