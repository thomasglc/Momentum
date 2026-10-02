<template>
  <section>
    <h2 class="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Semaines</h2>

    <div class="flex flex-col gap-2">
      <section v-for="group in phases" :key="group.key" class="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">

        <!-- En-tête de phase -->
        <button
          type="button"
          class="w-full text-left p-4 flex items-center gap-3"
          :aria-expanded="expanded === group.key"
          @click="toggle(group.key)"
        >
          <span class="w-2 self-stretch rounded-full flex-shrink-0" :class="group.style.bar" />
          <span class="flex-1 min-w-0">
            <span class="block text-xs font-bold uppercase tracking-wider mb-0.5" :class="group.style.text">{{ group.heading }}</span>
            <span class="block font-bold text-stone-800 text-sm">{{ group.name }}</span>
            <span v-if="group.dates" class="block text-xs text-stone-500 mt-0.5">{{ group.dates }}</span>
          </span>
          <span
            v-if="group.isCurrent"
            class="flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600"
          >En cours</span>
          <svg
            class="w-4 h-4 text-stone-300 flex-shrink-0 transition-transform duration-200"
            :class="{ 'rotate-180': expanded === group.key }"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <!-- Semaines de la phase -->
        <ul v-if="expanded === group.key" class="border-t border-stone-100 divide-y divide-stone-100">
          <li v-for="week in group.weeks" :key="week.number">
            <button
              type="button"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left active:bg-stone-50 transition-colors"
              @click="emit('open', week.number)"
            >
              <span
                class="w-8 flex-shrink-0 text-sm font-bold tabular-nums"
                :class="week.isToday ? 'text-orange-500' : 'text-stone-500'"
              >S{{ week.number }}</span>
              <span class="flex-1 min-w-0">
                <span class="block text-sm font-semibold text-stone-700 truncate">{{ week.theme || `Semaine ${week.number}` }}</span>
                <span v-if="week.dates" class="block text-xs text-stone-500">{{ week.dates }}</span>
              </span>
              <span v-if="week.isDeload" class="flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">Décharge</span>
              <span
                v-if="week.total > 0"
                class="flex-shrink-0 w-10 text-right text-sm font-bold tabular-nums"
                :class="week.done === week.total ? 'text-emerald-600' : week.done > 0 ? 'text-stone-700' : 'text-stone-300'"
                :aria-label="`${week.done} séances validées sur ${week.total}`"
              >{{ week.done }}/{{ week.total }}</span>
            </button>
          </li>
        </ul>
      </section>
    </div>

    <p v-if="unwritten" class="text-xs text-stone-500 text-center mt-3">{{ unwritten }}</p>
  </section>
</template>

<script setup>
import { computed, shallowRef, watch } from 'vue'

const props = defineProps({
  groups:    { type: Array,  required: true }, // [{ phase, name, style, entries }] : la frise groupée par phase
  todayWeek: { type: Number, default: null },  // semaine du jour, quand le plan est en cours
})

const emit = defineEmits(['open'])

const formatDay = iso => new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
const formatRange = (start, end) => (start && end ? `${formatDay(start)} – ${formatDay(end)}` : '')

// Seules les semaines écrites se listent ; les autres sont annoncées en une phrase
const phases = computed(() => props.groups
  .filter(group => group.entries.some(entry => entry.written))
  .map((group) => {
    const first = group.entries[0]
    const last = group.entries.at(-1)
    const range = first.number === last.number ? `semaine ${first.number}` : `semaines ${first.number}–${last.number}`
    return {
      key: first.number, // une phase peut manquer (null) : la première semaine du groupe l'identifie
      phase: group.phase,
      name: group.name,
      style: group.style,
      heading: group.phase ? `Phase ${group.phase} · ${range}` : range,
      dates: formatRange(first.startDate, last.endDate),
      isCurrent: props.todayWeek != null && props.todayWeek >= first.number && props.todayWeek <= last.number,
      weeks: group.entries.map(entry => ({
        ...entry,
        dates: formatRange(entry.startDate, entry.endDate),
        isToday: entry.number === props.todayWeek,
      })),
    }
  }))

const unwritten = computed(() => {
  const numbers = props.groups.flatMap(group => group.entries).filter(entry => !entry.written).map(entry => entry.number)
  if (!numbers.length) return ''
  return numbers.length === 1
    ? `La semaine ${numbers[0]} n'est pas encore programmée.`
    : `Les semaines ${numbers[0]} à ${numbers.at(-1)} ne sont pas encore programmées.`
})

// Phase ouverte (clé du groupe) ; null : toutes fermées. À l'arrivée, on ouvre la phase en cours, sinon la première.
const expanded = shallowRef(undefined)
watch(phases, (list) => {
  if (expanded.value !== undefined || !list.length) return
  expanded.value = (list.find(group => group.isCurrent) ?? list[0]).key
}, { immediate: true })

function toggle(key) {
  expanded.value = expanded.value === key ? null : key
}
</script>
