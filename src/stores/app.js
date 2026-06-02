import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const ready = ref(false)
  function setReady() { ready.value = true }
  function reset()    { ready.value = false }
  return { ready, setReady, reset }
})
