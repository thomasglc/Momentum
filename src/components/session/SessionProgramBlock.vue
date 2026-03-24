<template>
  <!-- Warmup -->
  <div v-if="block.type === 'warmup'" class="rounded-xl overflow-hidden border border-orange-100">
    <div class="flex items-center gap-2 px-3 py-2 bg-orange-100">
      <span>🔥</span>
      <span class="text-xs font-bold text-orange-700 uppercase tracking-wide">{{ block.header }}</span>
    </div>
    <div v-if="block.content" class="px-3 py-2 bg-orange-50">
      <p class="text-xs text-gray-700 leading-relaxed">{{ block.content }}</p>
    </div>
  </div>

  <!-- Cooldown -->
  <div v-else-if="block.type === 'cooldown'" class="rounded-xl overflow-hidden border border-teal-100">
    <div class="flex items-center gap-2 px-3 py-2 bg-teal-100">
      <span>💧</span>
      <span class="text-xs font-bold text-teal-700 uppercase tracking-wide">{{ block.header }}</span>
    </div>
    <div v-if="block.content" class="px-3 py-2 bg-teal-50">
      <p class="text-xs text-gray-700 leading-relaxed">{{ block.content }}</p>
    </div>
  </div>

  <!-- Circuit / Strength / Finisher — exercise grid -->
  <ExerciseGrid
    v-else-if="block.type === 'circuit' || block.type === 'strength' || block.type === 'finisher'"
    :variant="block.type"
    :header="block.header"
    :exercises="block.exercises"
    :content="block.content"
  />

  <!-- Interval (running) — pace cards -->
  <div v-else-if="block.type === 'interval'" class="rounded-xl border border-emerald-200 overflow-hidden">
    <div class="flex items-center gap-2 px-3 py-2 bg-emerald-100">
      <span>🏃</span>
      <span class="text-xs font-bold text-emerald-800 uppercase tracking-wide">{{ block.header }}</span>
    </div>
    <div class="px-2 py-2 bg-emerald-50 flex gap-2">
      <div class="flex-1 bg-white rounded-lg px-2 py-2 text-center border border-emerald-100">
        <p class="text-[10px] text-gray-400 font-semibold mb-0.5">👨 LUI</p>
        <p class="text-sm font-bold text-emerald-700">{{ block.paces.lui }}</p>
      </div>
      <div class="flex-1 bg-white rounded-lg px-2 py-2 text-center border border-emerald-100">
        <p class="text-[10px] text-gray-400 font-semibold mb-0.5">👩 ELLE</p>
        <p class="text-sm font-bold text-emerald-700">{{ block.paces.elle }}</p>
      </div>
    </div>
    <div v-if="block.note" class="px-3 py-1.5 bg-emerald-50 border-t border-emerald-100">
      <p class="text-[11px] text-gray-500">{{ block.note }}</p>
    </div>
  </div>

  <!-- Pace line (lui/elle standalone) -->
  <div v-else-if="block.type === 'pace'" class="flex gap-2 px-1">
    <div class="flex-1 bg-emerald-50 rounded-lg px-2 py-2 text-center border border-emerald-100">
      <p class="text-[10px] text-gray-400 font-semibold mb-0.5">👨 LUI</p>
      <p class="text-sm font-bold text-emerald-700">{{ block.paces.lui }}</p>
    </div>
    <div class="flex-1 bg-emerald-50 rounded-lg px-2 py-2 text-center border border-emerald-100">
      <p class="text-[10px] text-gray-400 font-semibold mb-0.5">👩 ELLE</p>
      <p class="text-sm font-bold text-emerald-700">{{ block.paces.elle }}</p>
    </div>
  </div>

  <!-- Generic section (header + text) -->
  <div v-else-if="block.type === 'section'" class="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5">
    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{{ block.header }}</p>
    <p class="text-xs text-gray-700 leading-relaxed">{{ block.content }}</p>
  </div>

  <!-- Plain text bullet -->
  <div v-else class="flex items-start gap-2.5 px-1 py-0.5">
    <span class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5"></span>
    <p class="text-sm text-gray-700 leading-relaxed">{{ block.content }}</p>
  </div>
</template>

<script setup>
import ExerciseGrid from './ExerciseGrid.vue'

defineProps({
  block: { type: Object, required: true },
})
</script>
