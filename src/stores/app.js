import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const ready   = ref(false)
  const loading = ref(false)

  function startLoading() { loading.value = true }
  function setReady()     { ready.value = true; loading.value = false }
  function reset()        { ready.value = false }

  return { ready, loading, startLoading, setReady, reset }
})
