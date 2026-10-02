<template>
  <div class="px-2 py-1.5 rounded-lg transition-colors" :class="[SET_GRID, row.logged ? 'bg-emerald-50' : '']">
    <span class="text-xs font-bold text-center" :class="row.logged ? 'text-emerald-600' : 'text-stone-400'">
      {{ row.setNumber }}
    </span>

    <!-- Série précédente : la toucher la recopie dans les champs -->
    <button
      type="button"
      class="text-left text-[11px] leading-tight truncate"
      :class="row.previous ? 'text-stone-500 active:text-blue-600' : 'text-stone-300'"
      :disabled="!row.previous || disabled"
      :aria-label="row.previous ? `Reprendre la série précédente : ${previousLabel}` : 'Pas de série précédente'"
      @click="copyPrevious"
    >{{ previousLabel }}</button>

    <input
      v-model="weight"
      type="text"
      inputmode="decimal"
      autocomplete="off"
      :placeholder="weightPlaceholder"
      :disabled="disabled"
      :aria-label="`Série ${row.setNumber} : charge en kg`"
      :class="INPUT"
      @change="commitEdit"
    />
    <input
      v-model="value"
      type="text"
      inputmode="numeric"
      autocomplete="off"
      :placeholder="valuePlaceholder"
      :disabled="disabled"
      :aria-label="`Série ${row.setNumber} : ${timed ? 'durée en secondes' : 'reps'}`"
      :class="INPUT"
      @change="commitEdit"
    />

    <button
      type="button"
      class="w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors active:scale-95 disabled:opacity-50"
      :class="row.logged ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-stone-200 bg-white text-stone-300'"
      :disabled="disabled"
      :aria-pressed="!!row.logged"
      :aria-label="row.logged ? `Annuler la série ${row.setNumber}` : `Valider la série ${row.setNumber}`"
      @click="toggle"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </button>
  </div>
</template>

<script setup>
import { computed, shallowRef, watch } from 'vue'
import { formatNumber, formatSetCompact, isTimed, resolveSetValues } from '@/utils/setLogs'
import { SET_GRID } from './setGrid'

const INPUT = 'w-full min-w-0 h-9 rounded-lg border border-stone-200 bg-white px-1 text-center font-semibold text-stone-800 '
  + 'placeholder:text-stone-300 placeholder:font-normal focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-60'

const props = defineProps({
  line:     { type: Object,  required: true },  // ligne d'exercice prévue
  row:      { type: Object,  required: true },  // { setNumber, logged, previous, planned }
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['save', 'remove', 'invalid'])

const weight = shallowRef('')
const value  = shallowRef('') // reps, ou secondes pour une ligne en durée

const timed  = computed(() => isTimed(props.line))
const mainOf = set => (timed.value ? set?.durationSec : set?.reps)
const fill = (set) => {
  weight.value = formatNumber(set.weightKg)
  value.value  = String(mainOf(set) ?? '')
}

// Une série enregistrée remplit les champs avec ce qui a été retenu ;
// la décocher les laisse tels quels pour pouvoir la recocher.
watch(() => props.row.logged, (logged) => { if (logged) fill(logged) }, { immediate: true })

const previousLabel     = computed(() => (props.row.previous ? formatSetCompact(props.row.previous) : '—'))
const weightPlaceholder = computed(() => formatNumber(props.row.previous?.weightKg ?? props.line.weightKg) || '–')
const valuePlaceholder  = computed(() => String(mainOf(props.row.previous) ?? mainOf(props.line) ?? '') || '–')

// Champ vide = valeur proposée en filigrane (série précédente, sinon prévu)
function resolve() {
  const values = resolveSetValues(props.line, props.row, { weight: weight.value, value: value.value })
  if (!values) emit('invalid', timed.value ? 'Indique une durée en secondes.' : 'Indique un nombre de reps.')
  return values
}

function toggle() {
  if (props.row.logged) { emit('remove', props.row.logged); return }
  const values = resolve()
  if (values) emit('save', props.row.setNumber, values)
}

// Modifier une série déjà cochée la met à jour
function commitEdit() {
  const logged = props.row.logged
  if (!logged) return
  const values = resolve()
  if (!values) return
  const changed = values.weightKg !== logged.weightKg || values.reps !== logged.reps || values.durationSec !== logged.durationSec
  if (changed) emit('save', props.row.setNumber, values)
}

function copyPrevious() {
  if (!props.row.previous) return
  fill(props.row.previous)
  commitEdit()
}
</script>
