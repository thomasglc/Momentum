<template>
  <!-- Téléporté : la vue vit dans un conteneur à overflow masqué et transformé pendant les transitions -->
  <Teleport to="body">
    <div class="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true" :aria-label="title">
      <div class="absolute inset-0 bg-black/40 sheet-fade" @click="emit('close')" />

      <div
        class="relative w-full max-w-[480px] max-h-[88dvh] overflow-y-auto overscroll-contain bg-white rounded-t-3xl shadow-xl sheet-up"
        style="padding-bottom: calc(1.25rem + env(safe-area-inset-bottom))"
      >
        <div class="sticky top-0 z-10 flex items-start justify-between gap-3 px-4 pt-4 pb-3 bg-white">
          <h3 class="text-lg font-black text-stone-800 leading-tight tracking-tight">{{ title }}</h3>
          <button
            type="button"
            class="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-stone-100 text-stone-500 text-lg active:scale-95 transition-transform"
            aria-label="Fermer"
            @click="emit('close')"
          >×</button>
        </div>

        <div class="px-4">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { onBeforeUnmount, onMounted } from 'vue'

defineProps({
  title: { type: String, required: true },
})

const emit = defineEmits(['close'])

const onKeydown = (event) => { if (event.key === 'Escape') emit('close') }

let previousOverflow = ''

onMounted(() => {
  // La page ne défile pas derrière le panneau
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.body.style.overflow = previousOverflow
  document.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.sheet-up   { animation: sheet-up 240ms cubic-bezier(0.25, 0.46, 0.45, 0.94); }
.sheet-fade { animation: sheet-fade 240ms ease; }

@keyframes sheet-up {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
@keyframes sheet-fade {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .sheet-up, .sheet-fade { animation: none; }
}
</style>
