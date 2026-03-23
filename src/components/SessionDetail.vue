<template>
  <div v-if="session" class="px-4 py-4">
    <!-- Badge type -->
    <div class="flex items-center gap-2 mb-3">
      <span class="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full" :class="badgeClass">
        {{ typeLabel }}
      </span>
    </div>

    <!-- Titre + meta -->
    <h2 class="text-xl font-bold text-gray-900 mb-1">{{ session.title }}</h2>
    <div class="flex items-center gap-3 text-sm text-gray-500 mb-4">
      <span>{{ session.day }}</span>
      <span>·</span>
      <span>{{ session.duration }} min</span>
      <span>·</span>
      <span class="font-medium" :class="intensityColor">{{ session.intensity }}</span>
    </div>

    <!-- Description -->
    <p class="text-sm text-gray-600 mb-5 leading-relaxed">{{ session.description }}</p>

    <!-- Détails / exercices -->
    <div class="mb-6">
      <h3 class="text-xs uppercase tracking-widest font-semibold text-gray-400 mb-3">Programme</h3>
      <ul class="space-y-2">
        <li
          v-for="(step, i) in session.details"
          :key="i"
          class="flex items-start gap-3 text-sm text-gray-700"
        >
          <span class="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5" :class="bulletClass">
            {{ i + 1 }}
          </span>
          <span>{{ step }}</span>
        </li>
      </ul>
    </div>

    <!-- Bouton valider -->
    <button
      @click="emit('toggle')"
      class="w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98]"
      :class="completed ? completedBtn : pendingBtn"
    >
      {{ completed ? '✓ Séance validée — Annuler' : 'Valider la séance' }}
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

/** @type {{ session: Object, completed: boolean }} */
const props = defineProps({
  session: { type: Object, required: true },
  completed: { type: Boolean, default: false }
})

const emit = defineEmits(['toggle'])

const typeConfig = {
  running: {
    label: 'Course',
    badgeClass: 'bg-emerald-100 text-emerald-700',
    bulletClass: 'bg-emerald-100 text-emerald-700',
    intensityColor: 'text-emerald-600',
    completedBtn: 'bg-emerald-100 text-emerald-700 border border-emerald-300',
    pendingBtn: 'bg-emerald-500 text-white hover:bg-emerald-600'
  },
  strength: {
    label: 'Renforcement',
    badgeClass: 'bg-blue-100 text-blue-700',
    bulletClass: 'bg-blue-100 text-blue-700',
    intensityColor: 'text-blue-600',
    completedBtn: 'bg-blue-100 text-blue-700 border border-blue-300',
    pendingBtn: 'bg-blue-500 text-white hover:bg-blue-600'
  },
  hyrox: {
    label: 'Hyrox',
    badgeClass: 'bg-amber-100 text-amber-700',
    bulletClass: 'bg-amber-100 text-amber-700',
    intensityColor: 'text-amber-600',
    completedBtn: 'bg-amber-100 text-amber-700 border border-amber-300',
    pendingBtn: 'bg-amber-500 text-white hover:bg-amber-600'
  }
}

const config = computed(() => typeConfig[props.session?.type] || typeConfig.running)
const typeLabel = computed(() => config.value.label)
const badgeClass = computed(() => config.value.badgeClass)
const bulletClass = computed(() => config.value.bulletClass)
const intensityColor = computed(() => config.value.intensityColor)
const completedBtn = computed(() => config.value.completedBtn)
const pendingBtn = computed(() => config.value.pendingBtn)
</script>
