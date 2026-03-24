<template>
  <div
    class="rounded-xl shadow-sm border-l-4 p-4 cursor-pointer active:scale-[0.98] transition-all duration-150"
    :class="[cfg.cardBg, cfg.borderColor, { 'opacity-60': completed }]"
    @click="emit('click')"
  >
    <div class="flex items-start justify-between gap-2">
      <div class="flex-1 min-w-0">
        <!-- Jour, durée et badge optionnel -->
        <div class="flex items-center gap-2 mb-1 flex-wrap">
          <span class="text-xs font-semibold uppercase tracking-wider" :class="cfg.labelColor">{{ session.day }}</span>
          <span v-if="session.duration > 0" class="text-xs text-gray-400">· {{ session.duration }} min</span>
          <span
            v-if="session.optional"
            class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 uppercase tracking-wide"
          >Optionnel</span>
        </div>

        <p class="font-semibold text-gray-800 text-sm leading-snug">{{ session.title }}</p>

        <span
          class="inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium"
          :class="cfg.badgeBg"
        >{{ session.intensity }}</span>
      </div>

      <!-- Icône de complétion -->
      <div
        class="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center border-2 transition-colors"
        :class="completed ? cfg.checkActive : cfg.checkInactive"
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
import { getSessionTypeConfig } from '@/constants/sessionTypes'

const props = defineProps({
  session:   { type: Object,  required: true },
  completed: { type: Boolean, default: false },
})

const emit = defineEmits(['click'])

const cfg = computed(() => getSessionTypeConfig(props.session.type))
</script>
