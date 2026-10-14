<template>
  <div class="px-1 pt-1.5">
    <!-- Facultative : repliée en une ligne discrète tant qu'elle est vide -->
    <button
      v-if="!editing"
      type="button"
      class="flex items-center gap-1.5 py-1 text-xs font-medium text-stone-400 active:text-stone-600 disabled:opacity-50"
      :disabled="disabled"
      @click="open"
    >
      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M16.86 4.49l2.65 2.65M4 20l4.24-.94L19.5 7.8a1.87 1.87 0 00-2.65-2.65L5.6 16.4 4 20z" />
      </svg>
      Note pour la prochaine fois
    </button>
    <textarea
      v-else
      ref="field"
      :value="draft"
      rows="2"
      :maxlength="NOTE_MAX"
      :disabled="disabled"
      aria-label="Note pour la prochaine fois"
      placeholder="Ex. : facile, monter la charge la prochaine fois"
      class="block w-full resize-none overflow-hidden rounded-xl bg-stone-50 px-3 py-2 text-sm leading-snug text-stone-800
        placeholder:text-stone-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-400 disabled:opacity-60"
      @input="onInput"
      @blur="commit"
    />
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { NOTE_MAX } from '@/utils/notes'

// Note de la séance sur un exercice, pour la prochaine fois. Pas de bouton d'enregistrement :
// elle part quand l'athlète s'arrête de taper ou quitte le champ. Le parent la garde (stores/exerciseNotes).
const props = defineProps({
  text:     { type: String,  default: '' },    // note enregistrée
  disabled: { type: Boolean, default: false },
})

// save(texte) : à enregistrer tel quel ; un texte vide efface la note
const emit = defineEmits(['save'])

const SAVE_AFTER_MS = 800

const field   = shallowRef(null)
const draft   = shallowRef(props.text)
const editing = shallowRef(!!props.text)
let timer = null

const typing = () => !!field.value && document.activeElement === field.value

// Le champ grandit avec le texte, la note reste lisible en entier
function fit() {
  const el = field.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

// La note enregistrée change ailleurs (relecture de la séance) : on la reprend, sauf pendant la saisie
watch(() => props.text, async (text) => {
  if (typing()) return
  draft.value = text
  if (text) editing.value = true
  await nextTick()
  fit()
})

onMounted(fit)

async function open() {
  editing.value = true
  await nextTick()
  field.value?.focus()
}

function onInput(event) {
  draft.value = event.target.value
  fit()
  clearTimeout(timer)
  timer = setTimeout(commit, SAVE_AFTER_MS)
}

function commit() {
  clearTimeout(timer)
  timer = null
  emit('save', draft.value)
  // Vidée puis quittée : le champ se replie
  if (!draft.value.trim() && !typing()) editing.value = false
}

// Exercice replié pendant la saisie : la note part quand même
onBeforeUnmount(() => {
  if (timer) commit()
})
</script>
