<template>
  <div
    class="bg-white rounded-2xl shadow-sm border border-stone-100 p-4 cursor-pointer active:scale-[0.98] transition-all duration-150"
    :class="{ 'opacity-55': completed }"
    @click="emit('click')"
  >
    <div class="flex items-center gap-3">

      <!-- Type icon -->
      <div
        class="w-11 h-11 flex-shrink-0 rounded-xl flex items-center justify-center text-xl"
        :class="cfg.iconBg"
      >{{ cfg.icon }}</div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span class="text-[10px] font-bold uppercase tracking-wider" :class="cfg.labelColor">{{ session.day }}</span>
          <span v-if="session.duration > 0" class="text-[10px] text-stone-400">· {{ session.duration }} min</span>
          <span
            v-if="session.optional"
            class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-400 uppercase tracking-wide"
          >Optionnel</span>
        </div>
        <p class="font-semibold text-stone-800 text-sm leading-snug">{{ session.title }}</p>
        <span v-if="session.intensityScore" class="flex items-center gap-0.5 mt-1.5">
          <span
            v-for="n in 5" :key="n"
            class="w-2 h-2 rounded-full"
            :class="n * 2 <= session.intensityScore ? cfg.dotBg : 'bg-stone-200'"
          />
        </span>
      </div>

      <!-- Completion -->
      <div
        class="w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center border-2 transition-colors"
        :class="completed ? cfg.checkActive : 'border-stone-200'"
      >
        <svg v-if="completed" class="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
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
