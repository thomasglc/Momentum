<template>
  <div class="flex items-center justify-between px-4 py-3">
    <button
      @click="emit('prev')"
      :disabled="!canGoPrev"
      class="w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-200 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-transform"
    >
      &#8249;
    </button>

    <div class="text-center">
      <p class="text-xs text-gray-400 uppercase tracking-wider font-medium">Semaine {{ weekNumber }}</p>
      <p class="text-sm font-semibold text-gray-800">{{ theme }}</p>
    </div>

    <button
      @click="emit('next')"
      :disabled="!canGoNext"
      class="w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-200 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-transform"
    >
      &#8250;
    </button>
  </div>
</template>

<script setup>
/** @type {{ weekNumber: number, theme: string, canGoPrev: boolean, canGoNext: boolean }} */
defineProps({
  weekNumber: { type: Number, required: true },
  theme: { type: String, required: true },
  canGoPrev: { type: Boolean, default: false },
  canGoNext: { type: Boolean, default: false }
})

const emit = defineEmits(['prev', 'next'])
</script>
