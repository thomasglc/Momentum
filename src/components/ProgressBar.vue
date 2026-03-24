<template>
  <div class="px-4 pt-3 pb-2">
    <div class="flex justify-between items-center mb-1.5">
      <span class="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Progression</span>
      <span class="text-xs font-bold" :class="progress === 100 ? 'text-emerald-500' : 'text-stone-600'">{{ progress }}%</span>
    </div>
    <div class="h-1.5 bg-stone-200 rounded-full overflow-hidden">
      <div
        class="h-1.5 rounded-full transition-all duration-500"
        :class="progress === 100 ? 'bg-emerald-500' : 'bg-orange-500'"
        :style="{ width: progress + '%' }"
      />
    </div>
  </div>
</template>

<script setup>
defineProps({
  progress: { type: Number, required: true }
})
</script>
