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
    <div v-if="block.paces" class="flex gap-2 px-2 pb-2 bg-orange-50">
      <div class="flex-1 bg-white rounded-lg px-2 py-1.5 text-center border border-orange-100">
        <p class="text-[10px] text-gray-400 font-semibold mb-0.5">👨 LUI</p>
        <p class="text-xs font-bold text-orange-600">{{ block.paces.lui }}</p>
      </div>
      <div class="flex-1 bg-white rounded-lg px-2 py-1.5 text-center border border-orange-100">
        <p class="text-[10px] text-gray-400 font-semibold mb-0.5">👩 ELLE</p>
        <p class="text-xs font-bold text-orange-600">{{ block.paces.elle }}</p>
      </div>
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
      <div v-if="block.note" class="ml-auto flex items-center gap-1 rounded-full px-2 py-0.5" style="background-color: #fce7f3">
        <span class="text-xs">💤</span>
        <span class="text-xs font-semibold" style="color: #9d174d">{{ block.note }}</span>
      </div>
    </div>
    <div v-if="block.paces" class="px-2 py-2 bg-emerald-50 flex gap-2">
      <div class="flex-1 bg-white rounded-lg px-2 py-2 text-center border border-emerald-100">
        <p class="text-[10px] text-gray-400 font-semibold mb-0.5">👨 LUI</p>
        <p class="text-sm font-bold text-emerald-700">{{ block.paces.lui }}</p>
      </div>
      <div class="flex-1 bg-white rounded-lg px-2 py-2 text-center border border-emerald-100">
        <p class="text-[10px] text-gray-400 font-semibold mb-0.5">👩 ELLE</p>
        <p class="text-sm font-bold text-emerald-700">{{ block.paces.elle }}</p>
      </div>
    </div>
  </div>

  <!-- Pace line (lui/elle standalone) -->
  <div v-else-if="block.type === 'pace' && block.paces" class="flex gap-2 px-1">
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

  <!-- Brick run segment -->
  <div v-else-if="block.type === 'brick_run'" class="rounded-xl overflow-hidden border border-emerald-200">
    <div class="flex items-center gap-2 px-3 py-2.5 bg-emerald-500">
      <span>🏃</span>
      <span class="text-xs font-bold text-white uppercase tracking-wide">Course</span>
      <span class="ml-auto text-white font-bold">{{ block.durationMin }} min</span>
    </div>
    <div v-if="block.paces" class="flex gap-2 px-2 py-2 bg-emerald-50">
      <div class="flex-1 bg-white rounded-lg px-2 py-2.5 text-center border border-emerald-100">
        <p class="text-[10px] text-gray-400 font-semibold mb-0.5">👨 LUI</p>
        <p class="text-sm font-bold text-emerald-700">{{ block.paces.lui }}</p>
      </div>
      <div class="flex-1 bg-white rounded-lg px-2 py-2.5 text-center border border-emerald-100">
        <p class="text-[10px] text-gray-400 font-semibold mb-0.5">👩 ELLE</p>
        <p class="text-sm font-bold text-emerald-700">{{ block.paces.elle }}</p>
      </div>
    </div>
    <div v-if="block.note" class="px-3 py-2 bg-emerald-50 border-t border-emerald-100 flex items-start gap-1.5">
      <span class="text-xs">💡</span>
      <p class="text-[11px] text-emerald-800 leading-relaxed">{{ block.note }}</p>
    </div>
  </div>

  <!-- Mini race — N × (Xkm + station) -->
  <div v-else-if="block.type === 'mini_race'" class="rounded-xl overflow-hidden border border-violet-200">
    <div class="flex items-center gap-2 px-3 py-2.5 bg-violet-500">
      <span>⏱</span>
      <span class="text-xs font-bold text-white uppercase tracking-wide">
        {{ block.rounds }} × {{ block.runDistanceKm }} km + Station
      </span>
      <span v-if="block.restBetweenRoundsMin" class="ml-auto text-white/80 text-[11px]">
        repos {{ block.restBetweenRoundsMin }} min
      </span>
    </div>
    <div v-if="block.paces" class="flex gap-2 px-2 pt-2 bg-violet-50">
      <div class="flex-1 bg-white rounded-lg px-2 py-1.5 text-center border border-violet-100">
        <p class="text-[10px] text-gray-400 font-semibold mb-0.5">👨 LUI</p>
        <p class="text-xs font-bold text-violet-700">{{ block.paces.lui }}</p>
      </div>
      <div class="flex-1 bg-white rounded-lg px-2 py-1.5 text-center border border-violet-100">
        <p class="text-[10px] text-gray-400 font-semibold mb-0.5">👩 ELLE</p>
        <p class="text-xs font-bold text-violet-700">{{ block.paces.elle }}</p>
      </div>
    </div>
    <div class="bg-violet-50 p-2 space-y-1.5" :class="block.paces ? 'pt-2' : ''">
      <div
        v-for="(ex, i) in block.stations"
        :key="i"
        class="flex items-center gap-3 bg-white rounded-xl px-3 py-2 border border-violet-100"
      >
        <span class="text-[10px] font-bold text-violet-400 w-4 flex-shrink-0">{{ i + 1 }}</span>
        <span class="text-xl flex-shrink-0">{{ ex.emoji }}</span>
        <p class="text-xs font-semibold text-gray-700 flex-1 leading-tight">{{ ex.name }}</p>
        <span v-if="ex.value" class="text-xs font-bold text-violet-600 flex-shrink-0">{{ ex.value }}</span>
        <span v-if="ex.note" class="text-[10px] text-gray-400 flex-shrink-0">{{ ex.note }}</span>
      </div>
    </div>
  </div>

  <!-- Station activation -->
  <div v-else-if="block.type === 'station_activation'" class="rounded-xl overflow-hidden border border-sky-200">
    <div class="flex items-center gap-2 px-3 py-2.5 bg-sky-400">
      <span>🎯</span>
      <span class="text-xs font-bold text-white uppercase tracking-wide">Activation technique</span>
      <span v-if="block.rounds" class="ml-auto text-white/80 text-[11px]">{{ block.rounds }} tours</span>
    </div>
    <div v-if="block.note" class="px-3 py-2 bg-sky-50 border-b border-sky-100">
      <p class="text-[11px] text-sky-900 leading-relaxed">{{ block.note }}</p>
    </div>
    <div class="bg-sky-50 p-2 space-y-1.5">
      <div
        v-for="(ex, i) in block.stations"
        :key="i"
        class="flex items-center gap-3 bg-white rounded-xl px-3 py-2 border border-sky-100"
      >
        <span class="text-xl flex-shrink-0">{{ ex.emoji }}</span>
        <p class="text-xs font-semibold text-gray-700 flex-1 leading-tight">{{ ex.name }}</p>
        <span v-if="ex.value" class="text-xs font-bold text-sky-600 flex-shrink-0">{{ ex.value }}</span>
        <span v-if="ex.note" class="text-[10px] text-gray-400 flex-shrink-0">{{ ex.note }}</span>
      </div>
    </div>
  </div>

  <!-- Station block (Hyrox stations sequence) -->
  <div v-else-if="block.type === 'station_block'" class="rounded-xl overflow-hidden border border-amber-200">
    <!-- Header -->
    <div class="flex items-center gap-2 px-3 py-2.5 bg-amber-400">
      <span>{{ FORMAT_ICONS[block.brickFormat] ?? '⚡' }}</span>
      <span class="text-xs font-bold text-white uppercase tracking-wide">{{ FORMAT_LABELS[block.brickFormat] ?? 'Stations Hyrox' }}</span>
      <span class="ml-auto text-white/80 text-xs font-semibold">{{ block.exercises.length }} stations</span>
    </div>

    <!-- Format note -->
    <div v-if="block.formatNote" class="px-3 py-2 bg-amber-300/30 border-b border-amber-200">
      <p class="text-[11px] text-amber-900 leading-relaxed">{{ block.formatNote }}</p>
    </div>

    <!-- Ordered sequence (stations annotated with who + inline runs) -->
    <div v-if="block.sequence" class="bg-amber-50 p-2 space-y-1.5">
      <template v-for="(item, i) in block.sequence" :key="i">
        <!-- Station row -->
        <div v-if="item.kind === 'station'" class="flex items-center gap-3 bg-white rounded-xl px-3 py-2 border border-amber-100">
          <span class="text-xl flex-shrink-0">{{ item.emoji }}</span>
          <p class="text-xs font-semibold text-gray-700 flex-1 leading-tight">{{ item.name }}</p>
          <span v-if="item.value" class="text-xs font-bold text-amber-600 flex-shrink-0">{{ item.value }}</span>
          <span v-if="item.who === 'elle'" class="text-[10px] font-bold text-pink-500 flex-shrink-0">👩 Elle</span>
          <span v-else-if="item.who === 'lui'" class="text-[10px] font-bold text-blue-500 flex-shrink-0">👨 Lui</span>
        </div>
        <!-- Run separator (both together) -->
        <div v-else-if="item.kind === 'run'" class="flex items-center gap-2 bg-emerald-50 rounded-lg px-3 py-1.5 border border-emerald-100 mx-1">
          <span class="text-xs">🏃</span>
          <p class="text-xs font-bold text-emerald-700">{{ item.distanceKm }} km — ensemble</p>
          <span v-if="item.pace?.min" class="text-[10px] text-emerald-500 ml-auto">@ {{ item.pace.min }}</span>
        </div>
      </template>
    </div>

    <!-- Follow-the-leader (no sequence): two columns fallback -->
    <div v-else-if="block.brickFormat === 'follow_the_leader' && block.duoRoles" class="bg-amber-50 p-2">
      <div class="grid grid-cols-2 gap-2">
        <div>
          <p class="text-[10px] font-bold text-center text-amber-700 uppercase tracking-wide mb-1.5">👩 Elle commence</p>
          <div v-for="(ex, i) in block.duoRoles.elle" :key="'e'+i"
            class="flex items-center gap-2 bg-white rounded-lg px-2.5 py-2 border border-amber-100 mb-1.5">
            <span class="text-base">{{ ex.emoji }}</span>
            <p class="text-[11px] font-semibold text-gray-700 leading-tight flex-1">{{ ex.name }}</p>
            <span v-if="ex.value" class="text-[11px] font-bold text-amber-600">{{ ex.value }}</span>
          </div>
        </div>
        <div>
          <p class="text-[10px] font-bold text-center text-amber-700 uppercase tracking-wide mb-1.5">👨 Lui commence</p>
          <div v-for="(ex, i) in block.duoRoles.lui" :key="'l'+i"
            class="flex items-center gap-2 bg-white rounded-lg px-2.5 py-2 border border-amber-100 mb-1.5">
            <span class="text-base">{{ ex.emoji }}</span>
            <p class="text-[11px] font-semibold text-gray-700 leading-tight flex-1">{{ ex.name }}</p>
            <span v-if="ex.value" class="text-[11px] font-bold text-amber-600">{{ ex.value }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Standard / EMOM / Pyramid: single column list -->
    <div v-else class="bg-amber-50 p-2 space-y-1.5">
      <div
        v-for="(ex, i) in block.exercises"
        :key="i"
        class="flex items-center gap-3 bg-white rounded-xl px-3 py-2 border border-amber-100"
      >
        <span v-if="block.brickFormat === 'emom'" class="text-[10px] font-bold text-amber-400 w-5 flex-shrink-0">{{ i + 1 }}</span>
        <span class="text-xl flex-shrink-0">{{ ex.emoji }}</span>
        <p class="text-xs font-semibold text-gray-700 flex-1 leading-tight">{{ ex.name }}</p>
        <span v-if="ex.value" class="text-xs font-bold text-amber-600 flex-shrink-0">{{ ex.value }}</span>
        <span v-if="ex.note" class="text-[10px] text-gray-400 flex-shrink-0">{{ ex.note }}</span>
      </div>
    </div>

    <!-- Intercalated runs (legacy: no sequence) -->
    <div v-if="!block.sequence && block.intercalatedRuns?.length" class="px-3 py-2 bg-amber-50 border-t border-amber-100 flex items-center gap-1.5">
      <span class="text-xs">🏃</span>
      <p class="text-[11px] text-amber-800">
        {{ block.intercalatedRuns.length }} × {{ block.intercalatedRuns[0].distanceKm }} km
        <template v-if="block.intercalatedRuns[0].pace">@ {{ block.intercalatedRuns[0].pace.min }}</template>
        intercalé{{ block.intercalatedRuns.length > 1 ? 's' : '' }} entre les stations
      </p>
    </div>
  </div>

  <!-- Run segment (footing, sortie longue, récup active…) -->
  <div v-else-if="block.type === 'run_segment'" class="rounded-xl overflow-hidden border border-emerald-200">
    <div class="flex items-center gap-2 px-3 py-2.5 bg-emerald-500">
      <span>🏃</span>
      <span class="text-xs font-bold text-white uppercase tracking-wide">Course</span>
      <span class="ml-auto text-white font-bold text-sm">{{ block.durationMin }} min</span>
    </div>
    <div v-if="block.label" class="px-3 py-2 bg-emerald-50 border-b border-emerald-100">
      <p class="text-[11px] text-emerald-800">{{ block.label }}</p>
    </div>
    <div v-if="block.paces" class="flex gap-2 px-2 py-2 bg-emerald-50">
      <div class="flex-1 bg-white rounded-lg px-2 py-2 text-center border border-emerald-100">
        <p class="text-[10px] text-gray-400 font-semibold mb-0.5">👨 LUI</p>
        <p class="text-sm font-bold text-emerald-700">{{ block.paces.lui }}</p>
      </div>
      <div class="flex-1 bg-white rounded-lg px-2 py-2 text-center border border-emerald-100">
        <p class="text-[10px] text-gray-400 font-semibold mb-0.5">👩 ELLE</p>
        <p class="text-sm font-bold text-emerald-700">{{ block.paces.elle }}</p>
      </div>
    </div>
  </div>

  <!-- Race advice -->
  <div v-else-if="block.type === 'race_advice'" class="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
    <span class="flex-shrink-0 text-sm mt-0.5">🏁</span>
    <p class="text-xs text-red-800 leading-relaxed">{{ block.label }}</p>
  </div>

  <!-- Plain text bullet -->
  <div v-else class="flex items-start gap-2.5 px-1 py-0.5">
    <span class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5"></span>
    <p class="text-sm text-gray-700 leading-relaxed">{{ block.content }}</p>
  </div>
</template>

<script setup>
import ExerciseGrid from './ExerciseGrid.vue'
import { exerciseEmoji } from '@/services/sessionParser'

defineProps({
  block: { type: Object, required: true },
})

const FORMAT_ICONS = {
  standard:          '⚡',
  pyramid:           '📈',
  follow_the_leader: '🔗',
  emom:              '⏱',
}

const FORMAT_LABELS = {
  standard:          'Stations Hyrox',
  pyramid:           'Pyramid Brick',
  follow_the_leader: 'Follow-the-Leader',
  emom:              'EMOM Brick',
}
</script>
