<template>
  <div
    class="rounded-xl shadow-sm border-l-4 p-4 cursor-pointer active:scale-[0.98] transition-all duration-150"
    :class="[cardBg, borderColor, { 'opacity-60': completed }]"
    @click="emit('click')"
  >
    <div class="flex items-start justify-between gap-2">
      <div class="flex-1 min-w-0">
        <!-- Jour et durée -->
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xs font-semibold uppercase tracking-wider" :class="labelColor">{{ session.day }}</span>
          <span class="text-xs text-gray-400">· {{ session.duration }} min</span>
        </div>

        <!-- Titre -->
        <p class="font-semibold text-gray-800 text-sm leading-snug">{{ session.title }}</p>

        <!-- Intensité -->
        <span
          class="inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium"
          :class="badgeBg"
        >{{ session.intensity }}</span>
      </div>

      <!-- Icône de complétion -->
      <div
        class="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center border-2 transition-colors"
        :class="completed ? checkActive : checkInactive"
      >
        <svg v-if="completed" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

/** @type {{ session: Object, completed: boolean }} */
const props = defineProps({
  session: { type: Object, required: true },
  completed: { type: Boolean, default: false }
})

const emit = defineEmits(['click'])

// Styles selon le type de séance
const typeStyles = {
  running: {
    cardBg: 'bg-emerald-50',
    borderColor: 'border-emerald-400',
    labelColor: 'text-emerald-600',
    badgeBg: 'bg-emerald-100 text-emerald-700',
    checkActive: 'border-emerald-500 bg-emerald-500 text-white',
    checkInactive: 'border-emerald-300 text-transparent'
  },
  strength: {
    cardBg: 'bg-blue-50',
    borderColor: 'border-blue-400',
    labelColor: 'text-blue-600',
    badgeBg: 'bg-blue-100 text-blue-700',
    checkActive: 'border-blue-500 bg-blue-500 text-white',
    checkInactive: 'border-blue-300 text-transparent'
  },
  hyrox: {
    cardBg: 'bg-amber-50',
    borderColor: 'border-amber-500',
    labelColor: 'text-amber-600',
    badgeBg: 'bg-amber-100 text-amber-700',
    checkActive: 'border-amber-500 bg-amber-500 text-white',
    checkInactive: 'border-amber-300 text-transparent'
  }
}

const styles = computed(() => typeStyles[props.session.type] || typeStyles.running)
const cardBg = computed(() => styles.value.cardBg)
const borderColor = computed(() => styles.value.borderColor)
const labelColor = computed(() => styles.value.labelColor)
const badgeBg = computed(() => styles.value.badgeBg)
const checkActive = computed(() => styles.value.checkActive)
const checkInactive = computed(() => styles.value.checkInactive)
</script>
