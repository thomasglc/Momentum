<template>
  <div class="pb-8">
    <!-- Bouton retour -->
    <div class="px-4 py-3">
      <button
        @click="router.back()"
        class="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <span>&#8592;</span>
        <span>Retour</span>
      </button>
    </div>

    <!-- Détail de la séance -->
    <SessionDetail
      v-if="session"
      :session="session"
      :completed="store.isCompleted(session.id)"
      @toggle="store.toggleSession(session.id)"
    />

    <!-- État de chargement -->
    <div v-else class="flex items-center justify-center py-16">
      <p class="text-sm text-gray-400">Chargement de la séance…</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTrainingStore } from '@/stores/training'
import { getSession } from '@/services/trainingService'
import SessionDetail from '@/components/SessionDetail.vue'

const store = useTrainingStore()
const route = useRoute()
const router = useRouter()

const session = ref(null)

onMounted(async () => {
  session.value = await getSession(route.params.id)
})
</script>
