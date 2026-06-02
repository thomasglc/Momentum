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
  let _nativeNav = false
  window.addEventListener('popstate', () => { _nativeNav = true }, { passive: true })

  function resolveTransition(toDepth, fromDepth) {
    if (_nativeNav) {
      _nativeNav = false
      return 'instant'
    }
    if (toDepth > fromDepth) return 'slide-forward'
    if (toDepth < fromDepth) return 'slide-back'
    return 'fade'
  }

  return { ready, loading, transitionName, startLoading, setReady, reset, resolveTransition }
})
