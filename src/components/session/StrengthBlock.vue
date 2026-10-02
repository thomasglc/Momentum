<template>
  <section>
    <!-- Le bloc n'est plus un cadre : un intitulé, puis une carte par exercice -->
    <header class="flex items-baseline justify-between gap-3 px-1 mb-2">
      <h4 class="text-xs font-bold uppercase tracking-wider text-stone-500 truncate">{{ block.note || 'Force' }}</h4>
      <span v-if="rest" class="flex-shrink-0 text-xs font-semibold text-stone-400">repos {{ rest }}</span>
    </header>

    <div class="space-y-2">
      <ExerciseLogCard
        v-for="line in block.rows"
        :key="line.id"
        :line="line"
        :rest-sec="block.restSec"
        @open="openLine = $event"
      />
    </div>

    <ExerciseSheet v-if="openLine" :line="openLine" :rest-sec="block.restSec" @close="openLine = null" />
  </section>
</template>

<script setup>
import { computed, shallowRef } from 'vue'
import { formatRest } from '@/utils/setLogs'
import ExerciseLogCard from './ExerciseLogCard.vue'
import ExerciseSheet from './ExerciseSheet.vue'

const props = defineProps({
  block: { type: Object, required: true }, // { restSec, note, rows } issu de structuredDetailToBlock
})

const openLine = shallowRef(null) // ligne dont la fiche est ouverte
const rest = computed(() => formatRest(props.block.restSec))
</script>
