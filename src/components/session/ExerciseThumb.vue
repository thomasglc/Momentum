<template>
  <!-- Taille et arrondi viennent des classes posées par le parent -->
  <span
    class="inline-flex items-center justify-center overflow-hidden flex-shrink-0"
    :class="{ 'bg-stone-100': showImage }"
  >
    <img
      v-if="showImage"
      :src="images[0]"
      :alt="alt"
      loading="lazy"
      decoding="async"
      class="w-full h-full object-cover"
      @error="failed = true"
    />
    <span v-else aria-hidden="true">{{ emoji }}</span>
  </span>
</template>

<script setup>
import { computed, shallowRef, watch } from 'vue'

const props = defineProps({
  images: { type: Array,  default: () => [] }, // URL du catalogue ; la première sert de vignette
  emoji:  { type: String, default: '⚡' },     // repli sans image ou si elle ne charge pas
  alt:    { type: String, default: '' },
})

const failed = shallowRef(false)
watch(() => props.images[0], () => { failed.value = false })

const showImage = computed(() => !!props.images[0] && !failed.value)
</script>
