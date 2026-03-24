<template>
  <div class="px-4 py-4 pb-6">
    <h2 class="text-base font-bold text-gray-800 mb-0.5">Plan d'Entraînement</h2>
    <p class="text-xs text-gray-500 mb-4">4 phases · 19 semaines · 18 Mai – 27 Sep 2026</p>

    <!-- Barre de phases -->
    <div class="grid grid-cols-4 gap-1 mb-4">
      <button
        v-for="phase in phases"
        :key="phase.id"
        class="rounded-lg p-2 text-center transition-all"
        :class="[phaseStyle(phase.color).bg, expanded === phase.id ? 'ring-2 ring-offset-1 opacity-100' : 'opacity-60']"
        :style="expanded === phase.id ? { ringColor: phaseStyle(phase.color).ringColor } : {}"
        @click="toggle(phase.id)"
      >
        <p class="text-[10px] font-bold uppercase tracking-wide" :class="phaseStyle(phase.color).text">Ph.{{ phase.id }}</p>
        <p class="text-[10px] font-semibold text-gray-700 leading-tight mt-0.5">{{ phase.name }}</p>
      </button>
    </div>

    <!-- Liste des phases -->
    <div class="flex flex-col gap-2">
      <div
        v-for="phase in phases"
        :key="phase.id"
        class="bg-white rounded-xl shadow-sm overflow-hidden"
      >
        <!-- En-tête cliquable -->
        <button
          class="w-full text-left p-4 flex items-center gap-3"
          @click="toggle(phase.id)"
        >
          <div
            class="w-2 self-stretch rounded-full flex-shrink-0"
            :class="phaseStyle(phase.color).bar"
          ></div>
          <div class="flex-1 min-w-0">
            <p class="text-[10px] font-bold uppercase tracking-widest mb-0.5" :class="phaseStyle(phase.color).text">
              Phase {{ phase.id }} · {{ phase.weeks }}
            </p>
            <p class="font-bold text-gray-800 text-sm">{{ phase.name }}</p>
            <p class="text-xs text-gray-400 mt-0.5">{{ phase.dates }} · {{ phase.volume }}</p>
          </div>
          <svg
            class="w-4 h-4 text-gray-300 flex-shrink-0 transition-transform duration-200"
            :class="{ 'rotate-180': expanded === phase.id }"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <!-- Contenu développé -->
        <div v-if="expanded === phase.id" class="border-t border-gray-100 px-4 pb-4 pt-3 flex flex-col gap-4">

          <!-- Objectifs -->
          <div>
            <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Objectifs</p>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="goal in phase.goals"
                :key="goal"
                class="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 font-medium"
              >{{ goal }}</span>
            </div>
          </div>

          <!-- Structure hebdomadaire -->
          <div>
            <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Structure Hebdomadaire</p>
            <div class="flex flex-col gap-1.5">
              <div
                v-for="day in phase.weekStructure"
                :key="day.day"
                class="flex gap-3 items-start"
              >
                <div class="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold" :class="dayTypeStyle(day.type)">
                  {{ day.day.slice(0, 2) }}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-xs text-gray-700 leading-relaxed">{{ day.content }}</p>
                  <p class="text-[10px] text-gray-400 mt-0.5">{{ day.duration }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Note clé -->
          <div class="bg-orange-50 border-l-4 border-orange-400 rounded-r-lg px-3 py-2">
            <p class="text-xs text-orange-800">{{ phase.keyNote }}</p>
          </div>

          <!-- Navigation vers les semaines de la phase -->
          <div>
            <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Semaines de cette phase</p>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="wn in phaseWeekNumbers(phase.id)"
                :key="wn"
                class="text-xs px-3 py-1.5 rounded-lg font-semibold border transition-colors"
                :class="[phaseStyle(phase.color).weekBtn, store.currentWeekNumber === wn ? 'ring-2' : '']"
                @click="goToWeek(wn)"
              >
                S{{ wn }}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTrainingStore } from '@/stores/training'
import phasesData from '@/data/phases.json'
import planData from '@/data/plan.json'

const router = useRouter()
const store = useTrainingStore()

const phases = phasesData.phases
const expanded = ref(1)

function toggle(id) {
  expanded.value = expanded.value === id ? null : id
}

function phaseStyle(color) {
  const map = {
    blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   bar: 'bg-blue-400',   weekBtn: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' },
    green:  { bg: 'bg-emerald-50', text: 'text-emerald-600', bar: 'bg-emerald-400', weekBtn: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-500', bar: 'bg-orange-400', weekBtn: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100' },
    purple: { bg: 'bg-violet-50', text: 'text-violet-600', bar: 'bg-violet-400', weekBtn: 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100' }
  }
  return map[color] || map.blue
}

function dayTypeStyle(type) {
  const map = {
    running: 'bg-emerald-100 text-emerald-700',
    hyrox:   'bg-amber-100 text-amber-700',
    brick:   'bg-cyan-100 text-cyan-700',
    rest:    'bg-gray-100 text-gray-400'
  }
  return map[type] || map.rest
}

// Récupère les numéros de semaine d'une phase depuis le plan
function phaseWeekNumbers(phaseId) {
  return planData.weeks
    .filter(w => w.phase === phaseId)
    .map(w => w.weekNumber)
}

function goToWeek(weekNumber) {
  store.setWeek(weekNumber)
  router.push('/')
}
</script>
