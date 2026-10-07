import { useAuthStore } from '@/stores/auth'

const DIRECTUS_URL = import.meta.env.VITE_DIRECTUS_URL || 'http://localhost:8056'

function messageFor(status) {
  if (status === 401) return 'Session expirée'
  if (status === 403) return 'Accès refusé'
  if (status >= 500) return 'Serveur indisponible'
  return `Erreur ${status}`
}

const offline = () => new Error('Pas de connexion')

/**
 * Appel authentifié à Directus. Le jeton est rafraîchi une fois si la réponse est 401,
 * pour qu'une saisie faite en cours de séance ne soit pas perdue quand il expire.
 * Lève une Error (avec .status quand le serveur a répondu) si l'appel échoue.
 * timeoutMs : abandonne l'appel passé ce délai, plutôt que de rester pendu sur un réseau faible.
 */
export async function request(method, path, { params, body, timeoutMs } = {}) {
  const url = new URL(`${DIRECTUS_URL}${path}`)
  for (const [key, value] of Object.entries(params ?? {})) url.searchParams.append(key, value)

  const auth = useAuthStore()
  const controller = timeoutMs ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null
  try {
    let res
    try {
      res = await auth.authedFetch(url.toString(), {
        method,
        headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        ...(controller ? { signal: controller.signal } : {}),
      })
    } catch {
      throw offline()
    }

    if (res.status === 401) {
      auth.logout()
      window.location.hash = '/login'
    }
    if (!res.ok) {
      const error = new Error(messageFor(res.status))
      error.status = res.status
      throw error
    }
    if (res.status === 204) return null
    try {
      return (await res.json()).data
    } catch {
      throw offline() // réponse coupée en route : on ne sait pas ce que le serveur a fait
    }
  } finally {
    clearTimeout(timer)
  }
}
