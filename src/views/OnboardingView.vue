<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTrainingStore } from '@/stores/training'
import OnboardingForm from '@/components/OnboardingForm.vue'

const router  = useRouter()
const auth    = useAuthStore()
const training = useTrainingStore()

function onSuccess() {
  syncPaceToStore()
  router.replace('/')
}

function syncPaceToStore() {
  const { gender, ten_km_time_sec } = auth.user ?? {}
  if (!ten_km_time_sec) return
  const who = gender === 'femme' ? 'elle' : 'lui'
  training.setTenKmTime(who, ten_km_time_sec)
}
</script>

<template>
  <div class="min-h-screen bg-stone-100 flex flex-col items-center justify-center px-6">
    <div class="w-full max-w-sm">

      <div class="text-center mb-8">
        <p class="text-xs font-black tracking-[0.35em] text-stone-400 uppercase mb-2">Momentum</p>
        <h1 class="text-2xl font-black text-stone-800 leading-tight">
          Parle-nous de toi
        </h1>
        <p class="text-sm text-stone-500 mt-1.5">Pour calibrer tes allures de course.</p>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
        <OnboardingForm @success="onSuccess" />
      </div>

    </div>
  </div>
</template>
