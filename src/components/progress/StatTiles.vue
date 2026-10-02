<template>
  <dl class="grid grid-cols-2 gap-2">
    <div
      v-for="(tile, index) in tiles"
      :key="tile.label"
      class="bg-white rounded-2xl shadow-sm border border-stone-100 px-4 py-3"
      :class="{ 'col-span-2': tiles.length % 2 === 1 && index === tiles.length - 1 }"
    >
      <dt class="text-xs font-bold uppercase tracking-wider text-stone-400">{{ tile.label }}</dt>
      <dd class="mt-1 text-2xl font-black text-stone-900 tabular-nums leading-tight whitespace-nowrap">{{ tile.value }}</dd>
      <dd class="text-xs text-stone-500 leading-snug">{{ tile.hint }}</dd>
    </div>
  </dl>
</template>

<script setup>
import { computed } from 'vue'
import { formatHours, formatTonnage } from '@/utils/progress'
import { formatNumber } from '@/utils/setLogs'

const props = defineProps({
  totals:        { type: Object,  required: true }, // { sessionsDone, due, dueDone, adherence, minutes }
  volumeKg:      { type: Number,  default: 0 },
  volumeUnknown: { type: Boolean, default: false }, // séries non chargées
})

const tiles = computed(() => {
  const { sessionsDone, due, dueDone, adherence, minutes, km } = props.totals
  return [
    { label: 'Séances', value: String(sessionsDone), hint: sessionsDone > 1 ? 'validées' : 'validée' },
    {
      label: 'Assiduité',
      value: adherence == null ? '—' : `${adherence} %`,
      hint: adherence == null ? 'dès ta première séance' : `${dueDone} sur ${due} séances prévues`,
    },
    { label: 'Heures', value: formatHours(minutes), hint: 'durée notée, sinon durée prévue' },
    {
      label: 'Volume',
      value: props.volumeUnknown ? '—' : formatTonnage(props.volumeKg),
      hint: props.volumeUnknown ? 'indisponible pour le moment' : 'levé en muscu',
    },
    // La distance n'apparaît qu'une fois des kilomètres notés
    km > 0 ? { label: 'Distance', value: `${formatNumber(km)} km`, hint: 'parcourus, d\'après tes séances notées' } : null,
  ].filter(Boolean)
})
</script>
