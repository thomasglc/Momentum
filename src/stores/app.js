import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const ready          = ref(false)
  const loading        = ref(false)
  const transitionName = ref('fade')

  function startLoading() { loading.value = true }
  function setReady()     { ready.value = true; loading.value = false }
  function reset()        { ready.value = false }

  // Gestes natifs iOS (swipe-back) : popstate ET hashchange pour le hash routing
  // Les navigations forward sont toujours programmatiques (pas de geste natif).
  // Les navigations back sont soit programmatiques (bouton app) soit natives (swipe iOS).
  // On marque explicitement les back programmatiques — tout le reste est natif → instant.
  let _programmaticBack = false
  function markProgrammaticBack() { _programmaticBack = true }

  function resolveTransition(toDepth, fromDepth) {
    if (toDepth > fromDepth) return 'slide-forward'
    if (toDepth < fromDepth) {
      if (_programmaticBack) { _programmaticBack = false; return 'slide-back' }
      return 'instant'
    }
    return 'fade'
  }

  return { ready, loading, transitionName, startLoading, setReady, reset, resolveTransition, markProgrammaticBack }
})
