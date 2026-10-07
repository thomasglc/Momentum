<template>
  <!-- Ne s'affiche que si des séries attendent : réseau absent, ou refus du serveur -->
  <div
    v-if="notice"
    role="status"
    class="mx-4 mt-3 flex items-center gap-3 rounded-xl border px-3 py-2"
    :class="refused ? 'bg-red-50 border-red-100 text-red-700' : 'bg-amber-50 border-amber-100 text-amber-800'"
  >
    <p class="flex-1 text-xs font-medium leading-snug">{{ notice.text }}</p>
    <button type="button" :class="ACTION" @click="store.retry()">Réessayer</button>
    <!-- Un refus peut ne jamais passer (séance supprimée) : l'athlète peut y renoncer -->
    <button v-if="refused" type="button" :class="ACTION" @click="store.forget()">Abandonner</button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSetLogStore } from '@/stores/setLogs'
import { syncNotice } from '@/utils/setLogs'

const ACTION = 'flex-shrink-0 py-1 text-xs font-semibold underline active:opacity-60'

const store = useSetLogStore()
const notice = computed(() => syncNotice(store.waiting, store.refused))
const refused = computed(() => notice.value?.tone === 'refused')
</script>
