<script setup>
import { useRouter } from 'vue-router'
import LoginForm from '@/components/LoginForm.vue'

const router = useRouter()

function onSuccess() {
  router.replace('/')
}
</script>

<template>
  <div class="min-h-dvh bg-stone-100 flex flex-col items-center justify-center px-6">

    <div class="w-full max-w-sm">

      <!-- Logo / titre -->
      <div class="text-center mb-10">
        <p class="text-xs font-black tracking-[0.35em] text-stone-400 uppercase mb-2">Momentum</p>
        <h1 class="text-2xl font-black text-stone-800 leading-tight">
          Chaque séance compte.
        </h1>
        <p class="text-sm text-stone-500 mt-1.5 font-medium">La ligne d'arrivée se construit ici.</p>
      </div>

      <!-- Carte formulaire -->
      <div class="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
        <LoginForm @success="onSuccess" />
      </div>

    </div>

  </div>
</template>
