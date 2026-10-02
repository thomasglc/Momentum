<template>
  <!-- Séance de muscu : même présentation que les exercices, un intitulé puis une carte plate -->
  <section v-if="flat">
    <header class="flex items-baseline justify-between gap-3 px-1 mb-2">
      <h4 class="text-xs font-bold uppercase tracking-wider text-stone-500 truncate">{{ title }}</h4>
      <span v-if="rest" class="flex-shrink-0 text-xs font-semibold text-stone-400">{{ rest }}</span>
    </header>
    <ul v-if="exercises?.length" class="bg-white rounded-2xl border border-stone-100 shadow-sm divide-y divide-stone-100 overflow-hidden">
      <li v-for="(ex, i) in rows" :key="i" class="flex items-center gap-3 p-3">
        <ExerciseThumb :images="ex.images" :emoji="ex.emoji" :alt="ex.name" class="w-12 h-12 rounded-xl text-2xl" />
        <div class="flex-1 min-w-0">
          <p class="text-[15px] font-bold text-stone-900 leading-tight truncate">{{ ex.name }}</p>
          <div v-if="ex.chips.length" class="flex flex-wrap gap-1.5 mt-1">
            <span v-for="chip in ex.chips" :key="chip" class="text-xs font-semibold text-stone-600 bg-stone-100 rounded-full px-2 py-0.5">{{ chip }}</span>
          </div>
        </div>
        <span v-if="ex.amount" class="flex-shrink-0 text-base font-black text-stone-900 tabular-nums">{{ ex.amount }}</span>
      </li>
    </ul>
    <p v-else-if="content" class="bg-white rounded-2xl border border-stone-100 shadow-sm px-3 py-2.5 text-sm text-stone-700 leading-relaxed">{{ content }}</p>
  </section>

  <div v-else class="rounded-xl overflow-hidden" :class="`border ${theme.border}`">
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
          <ExerciseThumb
            :images="ex.images"
            :emoji="ex.emoji"
            :alt="ex.name"
            class="mb-1.5 text-2xl leading-none"
            :class="ex.images?.length ? 'w-full aspect-[3/2] rounded-lg' : ''"
          />
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
import { noteChips } from '@/utils/text'
import ExerciseThumb from './ExerciseThumb.vue'

const props = defineProps({
  variant:   { type: String,  required: true }, // 'circuit' | 'strength' | 'finisher'
  header:    { type: String,  required: true },
  exercises: { type: Array,   default: null },
  content:   { type: String,  default: null },
  flat:      { type: Boolean, default: false }, // présentation des séances de muscu
})

const THEMES = {
  circuit:  { border: 'border-amber-200', headerBg: 'bg-amber-400',  headerText: 'text-white', bodyBg: 'bg-amber-50', cardBorder: 'border-amber-100', valueColor: 'text-amber-600',  icon: '⚡' },
  strength: { border: 'border-blue-200',  headerBg: 'bg-blue-500',   headerText: 'text-white', bodyBg: 'bg-blue-50',  cardBorder: 'border-blue-100',  valueColor: 'text-blue-600',   icon: '💪' },
  finisher: { border: 'border-red-200',   headerBg: 'bg-red-500',    headerText: 'text-white', bodyBg: 'bg-red-50',   cardBorder: 'border-red-100',   valueColor: 'text-red-600',    icon: '🔥' },
}

const theme = computed(() => THEMES[props.variant] ?? THEMES.circuit)
const icon  = computed(() => theme.value.icon)

// ── Présentation plate ───────────────────────────────────────────────────────
// L'en-tête arrive en une chaîne : « Circuit × 4 passages — repos 1 min 30 »
const title = computed(() => props.header.split(' — ')[0])
const rest  = computed(() => props.header.split(' — ')[1] ?? '')

// « 30m » devient « 30 m » ; la note « (30-40 m · lourd) » devient des pastilles,
// et une fourchette en tête de note remplace la valeur (« 30-40 m »).
const RANGE = /^\d+\s*-\s*\d+\s*[a-zA-Z]+$/
const rows = computed(() => (props.exercises ?? []).map((ex) => {
  const chips = noteChips((ex.note ?? '').replace(/^\(|\)$/g, ''))
  const range = RANGE.test(chips[0] ?? '') ? chips.shift() : null
  return { ...ex, amount: range ?? (ex.value ?? '').replace(/(\d)([a-zA-Z])/, '$1 $2'), chips }
}))
</script>
