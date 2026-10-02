<template>
  <div class="pb-6">
    <!-- En-tête : sous-page de l'onglet Profil -->
    <div class="sticky top-0 z-10 bg-stone-100 border-b border-stone-200 px-4 py-3 flex items-center gap-3">
      <button
        @click="goBack"
        class="w-8 h-8 flex items-center justify-center rounded-full text-stone-500 active:bg-stone-200 transition-colors -ml-1"
        aria-label="Retour"
      >
        <Icon icon="ion:chevron-back" class="text-xl" />
      </button>
      <h1 class="text-base font-black text-stone-800 tracking-tight">Les 8 stations Hyrox</h1>
    </div>

    <p class="px-4 pt-4 pb-3 text-xs text-stone-500">{{ subtitle }}</p>

    <div class="px-4 flex flex-col gap-2">
      <StationCard
        v-for="station in stations"
        :key="station.id"
        :station="station"
        :expanded="expandedId === station.id"
        @toggle="toggle(station.id)"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useTrainingStore } from '@/stores/training'
import { useAppStore } from '@/stores/app'
import StationCard from '@/components/StationCard.vue'
import stationsData from '@/data/stations.json'

const router     = useRouter()
const appStore   = useAppStore()
const store      = useTrainingStore()
const stations   = stationsData.stations
const subtitle   = computed(() => (store.isSolo
  ? 'Format Solo · tu fais les 8 stations en entier'
  : 'Format Doubles · chaque athlète fait la moitié du volume'))
const expandedId = ref(null)

function toggle(id) {
  expandedId.value = expandedId.value === id ? null : id
}

function goBack() {
  appStore.markProgrammaticBack()
  router.push('/profil')
}
</script>
