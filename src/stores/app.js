import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'

export const useAppStore = defineStore('app', () => {
  const ready          = ref(false)
  const loading        = ref(false)
  const transitionName = ref('fade')

  // Dernier onglet visité : il reste allumé pendant une séance, et le retour y ramène
  const lastTab = shallowRef({ id: 'today', path: '/' })
  function visitTab(id, path) { lastTab.value = { id, path } }

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

  return { ready, loading, transitionName, lastTab, visitTab, startLoading, setReady, reset, resolveTransition, markProgrammaticBack }
})
