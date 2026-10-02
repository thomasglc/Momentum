<template>
  <section class="bg-white rounded-2xl shadow-sm border border-stone-100 p-4">
    <div class="flex items-baseline justify-between gap-3 mb-3">
      <h2 class="text-xs font-bold uppercase tracking-wider text-stone-400">{{ title }}</h2>
      <p v-if="total > 0" class="text-sm font-bold text-stone-800 tabular-nums">
        {{ done }} / {{ total }} <span class="font-medium text-stone-400">{{ total > 1 ? 'séances' : 'séance' }}</span>
      </p>
    </div>

    <ol class="grid grid-cols-7">
      <li v-for="day in days" :key="day.day" class="flex flex-col items-center gap-1.5">
        <span class="text-xs font-bold" :class="day.isToday ? 'text-orange-500' : 'text-stone-400'">{{ day.letter }}</span>

        <button
          v-if="day.sessions.length"
          type="button"
          class="w-9 h-9 rounded-full flex items-center justify-center text-base leading-none transition-transform active:scale-90"
          :class="dotClass(day)"
          :aria-label="describe(day)"
          @click="emit('open', day.sessions[0])"
        >
          <svg v-if="day.state === 'done'" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span v-else aria-hidden="true">{{ iconOf(day) }}</span>
        </button>

        <!-- Jour de repos -->
        <span v-else class="w-9 h-9 flex items-center justify-center" :aria-label="`${day.day} : repos`">
          <span class="w-1.5 h-1.5 rounded-full" :class="day.isToday ? 'bg-orange-400' : 'bg-stone-300'" />
        </span>
      </li>
    </ol>
  </section>
</template>

<script setup>
import { getSessionTypeConfig } from '@/constants/sessionTypes'

defineProps({
  title: { type: String, default: 'Cette semaine' },
  days:  { type: Array,  required: true }, // sept jours issus de weekDays (utils/progress)
  done:  { type: Number, default: 0 },     // séances obligatoires validées
  total: { type: Number, default: 0 },
})

const emit = defineEmits(['open'])

const STATE_LABEL = { done: 'validée', todo: 'à faire', late: 'à rattraper', bonus: 'optionnelle' }

const iconOf = day => getSessionTypeConfig(day.sessions[0].type).icon

function dotClass(day) {
  if (day.state === 'done') return 'bg-emerald-500 text-white'
  if (day.isToday) return 'bg-white border-2 border-orange-500 ring-4 ring-orange-100'
  if (day.state === 'late') return 'bg-amber-50 border-2 border-amber-400'
  if (day.state === 'bonus') return 'border-2 border-dashed border-stone-200'
  return 'border-2 border-stone-200'
}

function describe(day) {
  const title = day.sessions.map(s => s.title).join(', ')
  return `${day.day} : ${title}, ${STATE_LABEL[day.state] ?? ''}`
}
</script>
