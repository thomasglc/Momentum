<template>
  <div v-if="session" class="px-4 py-4">

    <!-- Badges type + optionnel -->
    <div class="flex items-center gap-2 mb-3 flex-wrap">
      <span class="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full" :class="badgeClass">
        {{ typeLabel }}
      </span>
      <span
        v-if="session.optional"
        class="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-500"
      >Optionnel</span>
    </div>

    <!-- Titre + meta -->
    <h2 class="text-xl font-bold text-gray-900 mb-1">{{ session.title }}</h2>
    <div class="flex items-center gap-3 text-sm text-gray-500 mb-4 flex-wrap">
      <span>{{ session.day }}</span>
      <template v-if="session.duration > 0">
        <span>·</span>
        <span>{{ session.duration }} min</span>
      </template>
      <span>·</span>
      <span class="font-medium" :class="intensityColor">{{ session.intensity }}</span>
    </div>

    <!-- Note optionnel -->
    <div v-if="session.optional" class="mb-4 bg-violet-50 border-l-4 border-violet-300 rounded-r-lg px-3 py-2">
      <p class="text-xs text-violet-700">Cette séance est <strong>optionnelle</strong>. À faire uniquement si vous vous sentez bien — le repos complet prime toujours.</p>
    </div>

    <!-- Description -->
    <p class="text-sm text-gray-600 mb-5 leading-relaxed">{{ session.description }}</p>

    <!-- Détails / exercices -->
    <div v-if="session.details && session.details.length > 0" class="mb-6">
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

    <!-- Bouton valider (pas pour les jours de repos pur) -->
    <button
      v-if="session.duration > 0 || session.type === 'race'"
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
    pendingBtn: 'bg-emerald-500 text-white'
  },
  strength: {
    label: 'Renforcement',
    badgeClass: 'bg-blue-100 text-blue-700',
    bulletClass: 'bg-blue-100 text-blue-700',
    intensityColor: 'text-blue-600',
    completedBtn: 'bg-blue-100 text-blue-700 border border-blue-300',
    pendingBtn: 'bg-blue-500 text-white'
  },
  hyrox: {
    label: 'Hyrox',
    badgeClass: 'bg-amber-100 text-amber-700',
    bulletClass: 'bg-amber-100 text-amber-700',
    intensityColor: 'text-amber-600',
    completedBtn: 'bg-amber-100 text-amber-700 border border-amber-300',
    pendingBtn: 'bg-amber-500 text-white'
  },
  brick: {
    label: 'Brick',
    badgeClass: 'bg-cyan-100 text-cyan-700',
    bulletClass: 'bg-cyan-100 text-cyan-700',
    intensityColor: 'text-cyan-600',
    completedBtn: 'bg-cyan-100 text-cyan-700 border border-cyan-300',
    pendingBtn: 'bg-cyan-500 text-white'
  },
  mobility: {
    label: 'Mobilité',
    badgeClass: 'bg-violet-100 text-violet-700',
    bulletClass: 'bg-violet-100 text-violet-700',
    intensityColor: 'text-violet-600',
    completedBtn: 'bg-violet-100 text-violet-700 border border-violet-300',
    pendingBtn: 'bg-violet-500 text-white'
  },
  recovery: {
    label: 'Récupération',
    badgeClass: 'bg-gray-100 text-gray-600',
    bulletClass: 'bg-gray-100 text-gray-600',
    intensityColor: 'text-gray-500',
    completedBtn: 'bg-gray-100 text-gray-600 border border-gray-300',
    pendingBtn: 'bg-gray-400 text-white'
  },
  race: {
    label: '🏁 Race Day',
    badgeClass: 'bg-red-100 text-red-700',
    bulletClass: 'bg-red-100 text-red-700',
    intensityColor: 'text-red-600',
    completedBtn: 'bg-red-100 text-red-700 border border-red-300',
    pendingBtn: 'bg-red-500 text-white'
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
