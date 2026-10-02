<template>
  <button
    type="button"
    class="w-full text-left bg-white rounded-2xl shadow-sm border border-stone-100 p-4 transition-transform active:scale-[0.99]"
    @click="emit('open')"
  >
    <span class="flex items-baseline justify-between gap-3 mb-3">
      <span class="text-xs font-bold uppercase tracking-wider text-stone-400">Depuis le début</span>
      <span class="text-xs font-semibold text-orange-500">Ma progression ›</span>
    </span>

    <span v-if="streak > 0" class="block text-sm font-bold text-stone-800 mb-3">
      <span aria-hidden="true">🔥</span> {{ streakLabel }}
    </span>

    <span v-if="stats.length" class="grid grid-cols-3 gap-2">
      <span v-for="stat in stats" :key="stat.label" class="block">
        <span class="block text-lg font-black text-stone-900 tabular-nums leading-tight whitespace-nowrap">{{ stat.value }}</span>
        <span class="block text-xs text-stone-500">{{ stat.label }}</span>
      </span>
    </span>
    <span v-else class="block text-sm text-stone-500">Valide ta première séance pour lancer ton suivi.</span>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { formatHours, formatTonnage } from '@/utils/progress'

const props = defineProps({
  streak:       { type: Number, default: 0 }, // semaines complètes d'affilée
  sessionsDone: { type: Number, default: 0 },
  minutes:      { type: Number, default: 0 }, // durées prévues des séances validées
  volumeKg:     { type: Number, default: 0 },
})

const emit = defineEmits(['open'])

const streakLabel = computed(() =>
  (props.streak === 1 ? '1 semaine complète' : `${props.streak} semaines complètes d'affilée`))

// Un total nul n'apprend rien : on ne l'affiche pas
const stats = computed(() => {
  if (!props.sessionsDone) return []
  return [
    { value: String(props.sessionsDone), label: props.sessionsDone > 1 ? 'séances' : 'séance' },
    props.minutes > 0 ? { value: formatHours(props.minutes), label: 'd\'entraînement' } : null,
    props.volumeKg > 0 ? { value: formatTonnage(props.volumeKg), label: props.volumeKg >= 1000 ? 'levées' : 'levés' } : null,
  ].filter(Boolean)
})
</script>
