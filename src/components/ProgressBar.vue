<template>
  <div class="px-4 pt-4 pb-2">
    <div class="flex justify-between items-center mb-1">
      <span class="text-xs text-gray-500 font-medium">Progression</span>
      <span class="text-xs font-semibold text-gray-700">{{ progress }}%</span>
    </div>
    <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        class="h-2 rounded-full transition-all duration-500"
        :class="barColor"
        :style="{ width: progress + '%' }"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

/** @type {{ progress: number }} */
const props = defineProps({
  progress: {
    type: Number,
    required: true
  }
})

const barColor = computed(() => {
  if (props.progress === 100) return 'bg-emerald-500'
  if (props.progress >= 50) return 'bg-amber-400'
  return 'bg-blue-400'
})
</script>
