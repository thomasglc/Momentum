<template>
  <div class="px-4 pt-3">
    <section class="bg-slate-900 rounded-2xl px-5 py-4 shadow-lg">
      <div class="flex items-center justify-between gap-3 mb-2">
        <p class="text-sm font-medium text-white/60 truncate">{{ greeting }}</p>
        <span
          v-if="countdown"
          class="flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-400 tabular-nums"
        >{{ countdown }}</span>
      </div>

      <h1 class="text-2xl font-black text-white tracking-tight leading-tight">{{ title }}</h1>
      <p v-if="subtitle || isDeload" class="mt-1.5 flex items-center gap-2 flex-wrap">
        <span v-if="subtitle" class="text-sm font-semibold text-orange-400">{{ subtitle }}</span>
        <span
          v-if="isDeload"
          class="text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-400"
        >Décharge</span>
      </p>

      <!-- Une graduation par semaine du plan : passées, en cours, à venir -->
      <div v-if="totalWeeks > 1" class="flex gap-[3px] mt-4" role="img" :aria-label="barLabel">
        <span
          v-for="n in totalWeeks"
          :key="n"
          class="h-1.5 flex-1 rounded-full"
          :class="segmentClass(n)"
        />
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  firstName:  { type: String,  default: '' },
  state:      { type: Object,  default: null }, // { status, weekNumber, daysToStart, daysToRace } ; null sans calendrier
  startDate:  { type: String,  default: null }, // lundi de la semaine 1 pour cet athlète
  totalWeeks: { type: Number,  default: 0 },
  phaseLabel: { type: String,  default: '' },   // « Phase 1 · Force » pour la semaine en cours
  isDeload:   { type: Boolean, default: false },
})

const greeting = computed(() => (props.firstName ? `Bonjour ${props.firstName}` : 'Bonjour'))

const countdown = computed(() => {
  const days = props.state?.daysToRace
  if (days == null || days < 0) return ''
  return days === 0 ? 'Jour J' : `J-${days}`
})

const title = computed(() => {
  const state = props.state
  if (!state) return 'Ton plan'
  if (state.status === 'done') return 'Ton plan est terminé'
  if (state.status === 'before') {
    const day = new Date(`${props.startDate}T00:00:00`)
      .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    return `Ton plan commence ${day}`
  }
  return `Semaine ${state.weekNumber} sur ${props.totalWeeks}`
})

const subtitle = computed(() => {
  const state = props.state
  if (!state) return props.totalWeeks ? `${props.totalWeeks} semaines` : ''
  if (state.status === 'done') return 'Bravo pour le chemin parcouru.'
  if (state.status === 'before') return state.daysToStart === 1 ? 'Demain' : `Dans ${state.daysToStart} jours`
  return props.phaseLabel
})

function segmentClass(n) {
  const state = props.state
  if (!state || state.status === 'before') return 'bg-white/15'
  if (state.status === 'done' || n < state.weekNumber) return 'bg-white/60'
  return n === state.weekNumber ? 'bg-orange-500' : 'bg-white/15'
}

const barLabel = computed(() => {
  const state = props.state
  if (state?.status === 'running') return `Semaine ${state.weekNumber} sur ${props.totalWeeks}`
  return `Plan de ${props.totalWeeks} semaines`
})
</script>
