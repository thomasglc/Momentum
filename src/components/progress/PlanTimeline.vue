<template>
  <section class="bg-white rounded-2xl shadow-sm border border-stone-100 p-4">
    <div class="flex items-baseline justify-between gap-3">
      <h2 class="text-xs font-bold uppercase tracking-wider text-stone-400">Mon plan</h2>
      <span v-if="countdown" class="text-xs font-bold text-orange-500 tabular-nums">{{ countdown }}</span>
    </div>
    <p class="text-lg font-black text-stone-900 leading-tight mt-1">{{ headline }}</p>
    <p v-if="dates" class="text-xs text-stone-500 mt-0.5">{{ dates }}</p>

    <!-- Une case par semaine, groupées par phase -->
    <div class="flex gap-2 mt-4" role="img" :aria-label="summary">
      <div
        v-for="group in groups"
        :key="group.entries[0].number"
        class="flex gap-1 min-w-0"
        :style="{ flexGrow: group.entries.length, flexBasis: 0 }"
      >
        <span
          v-for="entry in group.entries"
          :key="entry.number"
          class="h-6 flex-1 rounded-md"
          :class="cellClass(entry, group.style)"
        />
      </div>
    </div>

    <ul class="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-stone-500">
      <li v-for="item in legend" :key="item.label" class="flex items-center gap-1.5">
        <span class="w-3 h-3 rounded-[4px]" :class="item.class" aria-hidden="true" />{{ item.label }}
      </li>
    </ul>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  groups:     { type: Array,  required: true }, // [{ phase, name, style, entries }] : la frise groupée par phase
  state:      { type: Object, default: null },  // état du plan ; null sans calendrier
  startDate:  { type: String, default: null },
  endDate:    { type: String, default: null },  // dimanche de la dernière semaine du plan
  totalWeeks: { type: Number, default: 0 },
})

const entries = computed(() => props.groups.flatMap(group => group.entries))
const count = state => entries.value.filter(entry => entry.state === state).length

const countdown = computed(() => {
  const days = props.state?.daysToRace
  if (days == null || days < 0) return ''
  return days === 0 ? 'Jour J' : `J-${days}`
})

const headline = computed(() => {
  const state = props.state
  if (!state) return `${props.totalWeeks} semaines`
  if (state.status === 'done') return 'Plan terminé'
  if (state.status === 'before') return `${props.totalWeeks} semaines jusqu'à ta course`
  return `Semaine ${state.weekNumber} sur ${props.totalWeeks}`
})

const formatDay = iso => new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
const dates = computed(() => (props.startDate && props.endDate ? `${formatDay(props.startDate)} – ${formatDay(props.endDate)}` : ''))

// La couleur dit la phase, son intensité dit où en est la semaine
function cellClass(entry, style) {
  if (!entry.written) return 'border border-dashed border-stone-300'
  if (entry.state === 'done') return style.cell
  if (entry.state === 'partial') return style.cellPartial
  if (entry.state === 'missed' || entry.state === 'none') return 'bg-stone-200'
  if (entry.state === 'current') {
    const fill = entry.total > 0 && entry.done === entry.total ? style.cell : entry.done > 0 ? style.cellPartial : style.cellTint
    return `${fill} ring-2 ring-slate-900 ring-offset-2`
  }
  return style.cellTint
}

// La légende ne montre que ce qui figure sur la frise, aux couleurs de la phase en cours (sinon de la première)
const legend = computed(() => {
  const group = props.groups.find(g => g.entries.some(entry => entry.state === 'current'))
    ?? props.groups.find(g => g.entries.some(entry => entry.written))
  const style = group?.style
  if (!style) return []
  return [
    count('done') ? { label: 'faite', class: style.cell } : null,
    count('partial') ? { label: 'entamée', class: style.cellPartial } : null,
    // « non validée » plutôt que « manquée » : on ne sait pas si l'athlète s'est entraîné sans cocher
    count('missed') ? { label: 'non validée', class: 'bg-stone-200' } : null,
    count('current') ? { label: 'en cours', class: `${style.cellTint} ring-2 ring-slate-900 ring-offset-1` } : null,
    count('upcoming') ? { label: 'à venir', class: style.cellTint } : null,
    entries.value.some(entry => !entry.written) ? { label: 'pas encore programmée', class: 'border border-dashed border-stone-300' } : null,
  ].filter(Boolean)
})

const summary = computed(() => {
  const done = count('done')
  return `${entries.value.length} semaines, dont ${done} ${done > 1 ? 'faites' : 'faite'}`
})
</script>
