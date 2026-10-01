import { useAuthStore } from '@/stores/auth'

const DIRECTUS_URL = import.meta.env.VITE_DIRECTUS_URL || 'http://localhost:8056'

function messageFor(status) {
  if (status === 401) return 'Session expirée'
  if (status === 403) return 'Accès refusé'
  if (status >= 500) return 'Serveur indisponible'
  return `Erreur ${status}`
}

/**
 * Appel authentifié à Directus. Le jeton est rafraîchi une fois si la réponse est 401,
 * pour qu'une saisie faite en cours de séance ne soit pas perdue quand il expire.
 * Lève une Error (avec .status quand le serveur a répondu) si l'appel échoue.
 */
export async function request(method, path, { params, body } = {}) {
  const url = new URL(`${DIRECTUS_URL}${path}`)
  for (const [key, value] of Object.entries(params ?? {})) url.searchParams.append(key, value)

  const auth = useAuthStore()
  let res
  try {
    res = await auth.authedFetch(url.toString(), {
      method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new Error('Pas de connexion')
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
  return res.status === 204 ? null : (await res.json()).data
}
