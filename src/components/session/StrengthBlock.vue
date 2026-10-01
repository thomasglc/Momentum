<template>
  <section class="rounded-xl overflow-hidden border border-blue-200">
    <header class="flex items-center gap-2 px-3 py-2.5 bg-blue-500">
      <span aria-hidden="true">💪</span>
      <h4 class="text-xs font-bold text-white uppercase tracking-wide">Force</h4>
      <span v-if="rest" class="ml-auto text-[11px] font-semibold text-white bg-white/20 rounded-full px-2 py-0.5">
        repos {{ rest }}
      </span>
    </header>

    <p v-if="block.note" class="px-3 py-2 bg-blue-100/60 border-b border-blue-100 text-[11px] text-blue-900 leading-relaxed">
      {{ block.note }}
    </p>

    <div class="bg-blue-50 p-2 space-y-2">
      <ExerciseLogCard
        v-for="line in block.rows"
        :key="line.id"
        :line="line"
        @open="openLine = $event"
      />
    </div>

    <ExerciseSheet v-if="openLine" :line="openLine" @close="openLine = null" />
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
