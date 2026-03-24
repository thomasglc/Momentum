<template>
  <div class="px-4 py-4 pb-6">
    <h2 class="text-base font-bold text-gray-800 mb-0.5">Les 8 Stations Hyrox</h2>
    <p class="text-xs text-gray-500 mb-4">Format Doubles · Chaque athlète fait la moitié du volume</p>

    <div class="flex flex-col gap-2">
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
import { ref } from 'vue'
import StationCard from '@/components/StationCard.vue'
import stationsData from '@/data/stations.json'

const stations   = stationsData.stations
const expandedId = ref(null)

function toggle(id) {
  expandedId.value = expandedId.value === id ? null : id
}
</script>
