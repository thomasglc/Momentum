<template>
  <article class="bg-white rounded-xl border border-blue-100 overflow-hidden">

    <!-- En-tête : la toucher ouvre la fiche de l'exercice -->
    <button
      type="button"
      class="w-full flex items-center gap-3 p-2.5 text-left active:bg-stone-50 transition-colors"
      :aria-label="`${line.name} : voir l'image et l'historique`"
      @click="emit('open', line)"
    >
      <ExerciseThumb :images="line.images" :emoji="emoji" :alt="line.name" class="w-14 h-14 rounded-xl text-2xl" />
      <span class="flex-1 min-w-0">
        <span class="block text-sm font-bold text-stone-800 leading-tight">{{ line.name }}</span>
        <span v-if="target" class="block text-xs font-semibold text-blue-600 mt-0.5">{{ target }}</span>
        <span v-if="chips.length" class="flex flex-wrap gap-1 mt-1">
          <span
            v-for="chip in chips"
            :key="chip"
            class="text-[11px] font-medium text-stone-600 bg-stone-100 rounded-full px-2 py-0.5"
          >{{ chip }}</span>
        </span>
      </span>
      <span
        class="flex-shrink-0 self-start text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums"
        :class="allDone ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'"
      >{{ doneCount }}/{{ plannedCount }}</span>
    </button>

    <!-- Tableau des séries -->
    <div class="px-1.5 pb-2">
      <div class="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-stone-400" :class="SET_GRID" aria-hidden="true">
        <span class="text-center">#</span>
        <span>Précédent</span>
        <span class="text-center">kg</span>
        <span class="text-center">{{ timed ? 's' : 'Reps' }}</span>
        <span />
      </div>

      <SetRow
        v-for="row in rows"
        :key="row.setNumber"
        :line="line"
        :row="row"
        :disabled="!store.ready || busy"
        @save="save"
        @remove="remove"
        @invalid="error = $event"
      />

      <div class="flex items-center justify-between px-2 pt-1.5">
        <button type="button" class="text-xs font-semibold text-blue-600 active:opacity-60" @click="extra++">
          + Ajouter une série
        </button>
        <button v-if="canRemoveLast" type="button" class="text-xs text-stone-400 active:opacity-60" @click="extra--">
          Retirer la dernière
        </button>
      </div>

      <p v-if="error" role="alert" class="mx-2 mt-1.5 text-[11px] text-red-600">{{ error }}</p>
    </div>
  </article>
</template>

<script setup>
import { computed, shallowRef } from 'vue'
import { useSetLogStore } from '@/stores/setLogs'
import { useWorkoutStore } from '@/stores/workout'
import { exerciseEmoji } from '@/services/sessionParser'
import { buildSetRows, formatTarget, isTimed } from '@/utils/setLogs'
import { noteChips } from '@/utils/text'
import { SET_GRID } from './setGrid'
import ExerciseThumb from './ExerciseThumb.vue'
import SetRow from './SetRow.vue'

const props = defineProps({
  line:    { type: Object, required: true }, // { id, exerciseId, name, sets, reps, durationSec, weightKg, note, images }
  restSec: { type: Number, default: null },  // repos du bloc, lancé quand une série est cochée
})

const emit = defineEmits(['open'])

const store   = useSetLogStore()
const workout = useWorkoutStore()

const extra = shallowRef(0)     // séries ajoutées à la main, pas encore enregistrées
const busy  = shallowRef(false) // un enregistrement est en cours pour cette carte
const error = shallowRef('')

const timed  = computed(() => isTimed(props.line))
const emoji  = computed(() => exerciseEmoji(props.line.name))
const target = computed(() => formatTarget(props.line))
const chips  = computed(() => noteChips(props.line.note))

const lineSets = computed(() => store.setsForLine(props.line.id))
const rows = computed(() =>
  buildSetRows(props.line, lineSets.value, store.previous[props.line.exerciseId]?.sets, extra.value)
)

const doneCount    = computed(() => lineSets.value.length)
const plannedCount = computed(() => props.line.sets ?? rows.value.length)
const allDone      = computed(() => doneCount.value > 0 && doneCount.value >= plannedCount.value)

const canRemoveLast = computed(() => {
  const last = rows.value.at(-1)
  return extra.value > 0 && !last.planned && !last.logged
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
    workout.startRest(props.restSec, props.line.name)
  })
}

const remove = logged => run(async () => {
  await store.removeSet(logged.id)
  workout.skipRest()
})
</script>
