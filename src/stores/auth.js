import { shallowRef, computed } from 'vue'
import { defineStore } from 'pinia'

const LS_KEY = 'momentum-auth-token'
const DIRECTUS_URL = 'http://localhost:8056'

export const useAuthStore = defineStore('auth', () => {
  const token = shallowRef(localStorage.getItem(LS_KEY) ?? null)
  const user  = shallowRef(null)

  const isAuthenticated = computed(() => !!token.value)
  const profileComplete = computed(() =>
    !!user.value?.gender && !!user.value?.ten_km_time_sec
  )

  // Résolu une seule fois après le premier chargement du profil
  let _initPromise = null
  function init() {
    if (_initPromise) return _initPromise
    _initPromise = token.value ? fetchProfile() : Promise.resolve()
    return _initPromise
  }

  async function _getDirectusUser() {
    const res = await fetch(`${DIRECTUS_URL}/users/me?fields=id,first_name,last_name`, {
      headers: { Authorization: `Bearer ${token.value}` },
    })
    return (await res.json()).data ?? null
  }

  async function fetchProfile() {
    if (!token.value) return
    const me = await _getDirectusUser()
    if (!me) return
    const url = new URL(`${DIRECTUS_URL}/items/athlete_profiles`)
    url.searchParams.set('filter[directus_user_id][_eq]', me.id)
    url.searchParams.set('fields', 'id,name,gender,ten_km_time_sec,plan_id')
    url.searchParams.set('limit', '1')
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token.value}` },
    })
    if (!res.ok) return
    const rows = (await res.json()).data
    const profile = rows.length ? rows[0] : {}
    user.value = {
      ...profile,
      directus_user_id: me.id,
      first_name: me.first_name,
      last_name: me.last_name,
    }
  }

  async function saveProfile(gender, tenKmTimeSec) {
    const userId = user.value?.directus_user_id ?? (await _getDirectusUser())?.id
    const planRes = await fetch(`${DIRECTUS_URL}/items/plans?limit=1&fields=id`, {
      headers: { Authorization: `Bearer ${token.value}` },
    })
    const planId = (await planRes.json()).data?.[0]?.id

    const body = { gender, ten_km_time_sec: tenKmTimeSec, directus_user_id: userId, plan_id: planId, name: userId }
    const existingId = user.value?.id

    const res = await fetch(
      existingId ? `${DIRECTUS_URL}/items/athlete_profiles/${existingId}` : `${DIRECTUS_URL}/items/athlete_profiles`,
      {
        method: existingId ? 'PATCH' : 'POST',
        headers: { Authorization: `Bearer ${token.value}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    )
    if (!res.ok) throw new Error('Erreur lors de la sauvegarde')
    const saved = (await res.json()).data
    user.value = { ...user.value, ...saved, directus_user_id: userId }
  }

  async function login(email, password) {
    const res = await fetch(`${DIRECTUS_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.errors?.[0]?.message ?? 'Identifiants incorrects')
    token.value = json.data.access_token
    localStorage.setItem(LS_KEY, token.value)
    await fetchProfile()
  }

  function logout() {
    token.value = null
    user.value  = null
    localStorage.removeItem(LS_KEY)
  }

  return { token, user, isAuthenticated, profileComplete, init, login, logout, fetchProfile, saveProfile }
})
