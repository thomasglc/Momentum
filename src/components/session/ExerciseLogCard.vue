<template>
  <article
    ref="card"
    class="bg-white rounded-2xl border overflow-hidden scroll-mt-4 scroll-mb-44 transition-shadow"
    :class="open ? 'border-blue-200 shadow-md' : 'border-stone-100 shadow-sm'"
  >
    <div class="flex items-center gap-3 p-3">
      <!-- Vignette : ouvre la fiche (photos, conseil, historique) -->
      <button
        type="button"
        class="relative flex-shrink-0 active:opacity-70 transition-opacity"
        :aria-label="`${line.name} : technique et historique`"
        @click="emit('open', line)"
      >
        <ExerciseThumb :images="line.images" :emoji="emoji" :alt="line.name" class="w-12 h-12 rounded-xl text-2xl" />
        <span
          v-if="allDone"
          class="absolute -right-1 -bottom-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-2 ring-white"
        >
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="4" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
      </button>

      <!-- Le reste de l'en-tête ouvre ou replie l'exercice -->
      <button
        type="button"
        class="flex-1 min-w-0 flex items-center gap-2 text-left"
        :aria-expanded="open"
        @click="flow.toggleLine(line.id)"
      >
        <span class="flex-1 min-w-0">
          <span class="block text-[15px] font-bold text-stone-900 leading-tight line-clamp-2">{{ line.name }}</span>
          <span class="block mt-0.5 text-xs truncate" :class="doneCount && !open ? 'font-semibold text-emerald-700' : 'text-stone-500'">
            {{ subtitle }}
          </span>
        </span>
        <span
          class="flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full tabular-nums"
          :class="allDone ? 'bg-emerald-100 text-emerald-700' : doneCount ? 'bg-blue-50 text-blue-700' : 'bg-stone-100 text-stone-500'"
        >{{ doneCount }}/{{ plannedCount }}</span>
        <svg
          class="w-4 h-4 flex-shrink-0 text-stone-300 transition-transform duration-200"
          :class="{ 'rotate-180': open }"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>

    <div v-if="open" class="px-2 pb-3">
      <!-- Repères de l'exercice -->
      <div v-if="chips.length" class="flex flex-wrap gap-1.5 px-1 mb-2.5">
        <span
          v-for="chip in chips"
          :key="chip"
          class="text-xs font-semibold text-stone-600 bg-stone-100 rounded-full px-2.5 py-1"
        >{{ chip }}</span>
      </div>

      <!-- Tableau des séries -->
      <div class="px-1 pb-1 text-xs font-medium text-stone-400" :class="SET_GRID" aria-hidden="true">
        <span />
        <span>Précédent</span>
        <span class="text-center">kg</span>
        <span class="text-center">{{ timed ? 'sec' : 'reps' }}</span>
        <span />
      </div>

      <SetRow
        v-for="row in rows"
        :key="row.setNumber"
        :line="line"
        :row="row"
        :next="row.setNumber === nextSetNumber"
        :disabled="!store.ready || busy"
        @save="save"
        @remove="remove"
        @invalid="error = $event"
      />

      <div class="flex items-center justify-between gap-3 px-1 pt-2">
        <button type="button" class="py-1 text-sm font-semibold text-blue-600 active:opacity-60" @click="extra++">
          + Ajouter une série
        </button>
        <button v-if="canRemoveLast" type="button" class="py-1 text-sm text-stone-500 active:opacity-60" @click="extra--">
          Retirer la dernière
        </button>
        <button v-else type="button" class="py-1 text-sm font-semibold text-stone-500 active:opacity-60" @click="emit('open', line)">
          Technique et historique ›
        </button>
      </div>

      <p v-if="error" role="alert" class="mx-1 mt-2 text-xs font-medium text-red-600">{{ error }}</p>
    </div>
  </article>
</template>

<script setup>
import { computed, inject, nextTick, shallowRef, watch } from 'vue'
import { useSetLogStore } from '@/stores/setLogs'
import { useWorkoutStore } from '@/stores/workout'
import { exerciseEmoji } from '@/services/sessionParser'
import { buildSetRows, isTimed, summarizeSets } from '@/utils/setLogs'
import { describeLine } from '@/utils/workout'
import { SET_GRID } from './setGrid'
import { SESSION_FLOW } from './sessionFlow'
import ExerciseThumb from './ExerciseThumb.vue'
import SetRow from './SetRow.vue'

const props = defineProps({
  line:    { type: Object, required: true }, // { id, exerciseId, name, sets, reps, durationSec, weightKg, note, images }
  restSec: { type: Number, default: null },  // repos du bloc, lancé quand une série est cochée
})

const emit = defineEmits(['open'])

const store   = useSetLogStore()
const workout = useWorkoutStore()
const flow    = inject(SESSION_FLOW)

const card  = shallowRef(null)
const extra = shallowRef(0)     // séries ajoutées à la main, pas encore enregistrées
const busy  = shallowRef(false) // un enregistrement est en cours pour cette carte
const error = shallowRef('')

const open   = computed(() => flow.openLineId.value === props.line.id)
const timed  = computed(() => isTimed(props.line))
const emoji  = computed(() => exerciseEmoji(props.line.name))
// Objectif (« 3 × 6-8 reps ») et repères restants (« RIR 2 », « par jambe »)
const described = computed(() => describeLine(props.line))
const target = computed(() => described.value.target)
const chips  = computed(() => described.value.chips)

const lineSets = computed(() => store.setsForLine(props.line.id))
const rows = computed(() =>
  buildSetRows(props.line, lineSets.value, store.previous[props.line.exerciseId]?.sets, extra.value)
)

const doneCount    = computed(() => lineSets.value.length)
const plannedCount = computed(() => props.line.sets ?? rows.value.length)
const allDone      = computed(() => doneCount.value > 0 && doneCount.value >= plannedCount.value)
const nextSetNumber = computed(() => rows.value.find(row => !row.logged)?.setNumber ?? null)

// Repliée : ce qui a été fait, sinon ce qui est prévu. Ouverte : l'objectif, les repères sont en dessous.
const subtitle = computed(() => {
  if (open.value) return target.value
  if (doneCount.value) return summarizeSets(lineSets.value)
  return [target.value, ...chips.value].filter(Boolean).join(' · ')
})

const canRemoveLast = computed(() => {
  const last = rows.value.at(-1)
  return extra.value > 0 && !last.planned && !last.logged
})

// Ouverte par un geste ou par la fin de l'exercice précédent : la carte revient à l'écran
watch(() => flow.revealLineId.value, async (id) => {
  if (id !== props.line.id) return
  flow.revealLineId.value = null
  await nextTick()
  card.value?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
})

// L'état ne change qu'après la réponse de Directus : en cas d'échec, la ligne reste comme elle était.
async function run(action) {
  if (busy.value) return
  busy.value  = true
  error.value = ''
  try {
    await action()
  } catch (e) {
    error.value = `Série non enregistrée : ${e?.message ?? 'erreur inconnue'}.`
  } finally {
    busy.value = false
  }
}

function save(setNumber, values) {
  // Cocher une nouvelle série lance le repos ; modifier une série déjà cochée ne le relance pas.
  const isNew = !lineSets.value.some(s => s.setNumber === setNumber)
  if (isNew) workout.unlockSound() // dans le geste de l'utilisateur, avant tout appel réseau
  return run(async () => {
    await store.saveSet(props.line, setNumber, values)
    if (!isNew) return
    workout.ensureStarted(store.sessionId)
    workout.startRest(props.restSec, flow.restLabel(props.line.id))
    // Plus aucune série à cocher, ajoutées comprises : on passe à l'exercice suivant
    if (nextSetNumber.value == null) flow.lineDone(props.line.id)
  })
}

const remove = logged => run(async () => {
  await store.removeSet(logged.id)
  workout.skipRest()
})
</script>
