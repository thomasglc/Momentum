<template>
  <!-- Texte long : deux lignes, déplié au toucher. La taille et la couleur viennent du parent. -->
  <component
    :is="long ? 'button' : 'p'"
    :type="long ? 'button' : undefined"
    class="block w-full text-left"
    :aria-expanded="long ? open : undefined"
    @click="toggle"
  >
    <span :class="{ 'line-clamp-2': long && !open }">{{ text }}</span>
    <span v-if="long" class="block mt-0.5 font-semibold opacity-70">{{ open ? 'Réduire' : 'Lire la suite' }}</span>
  </component>
</template>

<script setup>
import { computed, shallowRef } from 'vue'
import { isLong } from '@/utils/text'

const props = defineProps({
  text: { type: String, required: true },
  max:  { type: Number, default: 90 }, // au-delà, le texte est coupé
})

const open = shallowRef(false)
const long = computed(() => isLong(props.text, props.max))

function toggle() {
  if (long.value) open.value = !open.value
}
</script>
