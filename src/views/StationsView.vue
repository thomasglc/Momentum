<template>
  <div class="px-4 py-4 pb-6">
    <h2 class="text-base font-bold text-gray-800 mb-0.5">Les 8 Stations Hyrox</h2>
    <p class="text-xs text-gray-500 mb-4">Format Doubles · Chaque athlète fait la moitié du volume</p>

    <div class="flex flex-col gap-2">
      <div
        v-for="station in stations"
        :key="station.id"
        class="bg-white rounded-xl shadow-sm overflow-hidden"
      >
        <!-- En-tête cliquable -->
        <button
          class="w-full text-left p-4 flex items-center gap-3"
          @click="toggle(station.id)"
        >
          <div class="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-xl flex-shrink-0">
            {{ station.emoji }}
          </div>
          <div class="flex-1 min-w-0">
            <span class="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Station {{ station.id }}</span>
            <p class="font-bold text-gray-800 text-sm leading-tight">{{ station.name }}</p>
            <p class="text-xs text-gray-400 mt-0.5">{{ station.volume }}</p>
          </div>
          <svg
            class="w-4 h-4 text-gray-300 flex-shrink-0 transition-transform duration-200"
            :class="{ 'rotate-180': expanded === station.id }"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <!-- Contenu développé -->
        <div v-if="expanded === station.id" class="border-t border-gray-100 px-4 pb-4 pt-3 flex flex-col gap-3">

          <!-- Description -->
          <p class="text-sm text-gray-600 leading-relaxed">{{ station.description }}</p>

          <!-- Muscles -->
          <div class="flex gap-2 items-start">
            <span class="text-xs font-bold text-purple-500 uppercase tracking-wide w-16 flex-shrink-0 pt-0.5">Muscles</span>
            <p class="text-xs text-gray-600">{{ station.muscles }}</p>
          </div>

          <!-- Poids de course -->
          <div v-if="station.weight" class="bg-amber-50 rounded-lg px-3 py-2">
            <p class="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-0.5">Poids course</p>
            <p class="text-xs text-amber-800 font-medium">{{ station.weight }}</p>
          </div>

          <!-- Alternative -->
          <div class="bg-violet-50 rounded-lg px-3 py-2">
            <p class="text-[10px] font-bold text-violet-600 uppercase tracking-widest mb-0.5">Alternative</p>
            <p class="text-xs text-violet-800">{{ station.alternative }}</p>
          </div>

          <!-- Progression par phase -->
          <div v-if="station.progression">
            <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Progression par phase</p>

            <!-- Toggle Elle / Lui -->
            <div class="flex rounded-lg overflow-hidden border border-gray-200 mb-3 text-xs font-semibold">
              <button
                class="flex-1 py-1.5 transition-colors"
                :class="showElle ? 'bg-pink-500 text-white' : 'bg-white text-gray-400'"
                @click="showElle = true"
              >Elle</button>
              <button
                class="flex-1 py-1.5 transition-colors"
                :class="!showElle ? 'bg-blue-500 text-white' : 'bg-white text-gray-400'"
                @click="showElle = false"
              >Lui</button>
            </div>

            <div class="flex flex-col gap-2">
              <div
                v-for="p in (showElle ? station.progression.elle : station.progression.lui)"
                :key="p.phase"
                class="flex gap-3 items-start"
              >
                <span class="text-xs font-bold text-orange-400 w-16 flex-shrink-0 pt-0.5">{{ p.phase }}</span>
                <div>
                  <p class="text-sm font-bold text-gray-800">{{ p.label }}</p>
                  <p v-if="p.note" class="text-xs text-gray-400">{{ p.note }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import stationsData from '@/data/stations.json'

const stations = stationsData.stations
const expanded = ref(null)
const showElle = ref(true)

function toggle(id) {
  expanded.value = expanded.value === id ? null : id
  showElle.value = true
}
</script>
