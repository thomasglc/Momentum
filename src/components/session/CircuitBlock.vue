<template>
  <section>
    <!-- Un circuit à tours se saisit comme un bloc de muscu : un intitulé, puis une carte par station -->
    <header class="flex items-baseline justify-between gap-3 px-1 mb-2">
      <h4 class="text-xs font-bold uppercase tracking-wider text-stone-500 truncate">{{ title }}</h4>
      <span v-if="rest" class="flex-shrink-0 text-xs font-semibold text-stone-400">repos {{ rest }}</span>
    </header>
    <p v-if="chained" class="px-1 mb-2 text-xs text-stone-500">
      Enchaîne les stations{{ rest ? ' : le repos part quand le tour est bouclé' : '' }}.
    </p>

    <div class="space-y-2">
      <ExerciseLogCard v-for="line in lines" :key="line.id" :line="line" @open="openLine = $event" />
    </div>

    <ExerciseSheet v-if="openLine" :line="openLine" :rest-sec="openLine.restSec" @close="openLine = null" />
  </section>
</template>

<script setup>
import { computed, shallowRef } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { formatRest } from '@/utils/setLogs'
import { circuitLines } from '@/utils/workout'
import ExerciseLogCard from './ExerciseLogCard.vue'
import ExerciseSheet from './ExerciseSheet.vue'

const props = defineProps({
  block: { type: Object, required: true }, // circuit à tours issu de structuredDetailToBlock (voir isLoggableCircuit)
})

const auth = useAuthStore()

const openLine = shallowRef(null) // ligne dont la fiche est ouverte

// Les mêmes lignes que celles que la séance suit pour l'avancement et le repos (utils/workout, loggableLinesOf)
const lines = computed(() => circuitLines(props.block, { female: auth.user?.gender === 'femme' }))
const chained = computed(() => lines.value.length > 1)
const title = computed(() => `Circuit · ${props.block.rounds} ${props.block.rounds > 1 ? 'tours' : 'tour'}`)
const rest = computed(() => formatRest(lines.value[0]?.restSec))
</script>
