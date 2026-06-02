import { shallowRef, computed } from 'vue'
import { defineStore } from 'pinia'
import { useAppStore } from '@/stores/app'
import { clearPlanCache } from '@/services/trainingService'

const LS_TOKEN    = 'momentum-auth-token'
const LS_REFRESH  = 'momentum-auth-refresh'
const LS_ACTIVITY = 'momentum-auth-last-activity'
const DIRECTUS_URL = import.meta.env.VITE_DIRECTUS_URL || 'http://localhost:8056'
const INACTIVITY_LIMIT_MS = 7 * 24 * 60 * 60 * 1000

export const useAuthStore = defineStore('auth', () => {
  const token = shallowRef(localStorage.getItem(LS_TOKEN) ?? null)
  const user  = shallowRef(null)

  const isAuthenticated = computed(() => !!token.value)
  const profileComplete = computed(() =>
    !!user.value?.gender && !!user.value?.ten_km_time_sec
  )

  let _initPromise = null
  function init() {
    if (_initPromise) return _initPromise
    _initPromise = _initialize()
    return _initPromise
  }

  async function _initialize() {
    const lastActivity = localStorage.getItem(LS_ACTIVITY)
    if (lastActivity && Date.now() - Number(lastActivity) > INACTIVITY_LIMIT_MS) {
      logout(); return
    }
    if (!localStorage.getItem(LS_REFRESH) && !token.value) return
    const ok = await _refresh()
    if (!ok) return
    localStorage.setItem(LS_ACTIVITY, Date.now().toString())
    await fetchProfile()
  }

  async function _refresh() {
    const refreshToken = localStorage.getItem(LS_REFRESH)
    if (!refreshToken) return !!token.value
    try {
      const res = await fetch(`${DIRECTUS_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken, mode: 'json' }),
      })
      if (!res.ok) { logout(); return false }
      const { data } = await res.json()
      token.value = data.access_token
      localStorage.setItem(LS_TOKEN, token.value)
      localStorage.setItem(LS_REFRESH, data.refresh_token)
      return true
    } catch {
      return !!token.value
    }
  }

  async function _authedFetch(url, options = {}) {
    const headers = { Authorization: `Bearer ${token.value}`, ...options.headers }
    let res = await fetch(url, { ...options, headers })
    if (res.status === 401) {
      const refreshed = await _refresh()
      if (!refreshed) return res
      res = await fetch(url, { ...options, headers: { Authorization: `Bearer ${token.value}`, ...options.headers } })
    }
    return res
  }

  async function _getDirectusUser() {
    const res = await _authedFetch(`${DIRECTUS_URL}/users/me?fields=id,first_name,last_name`)
    if (!res.ok) return null
    return (await res.json()).data ?? null
  }

  async function fetchProfile() {
    if (!token.value) return
    const me = await _getDirectusUser()
    if (!me) { logout(); return }
    const url = new URL(`${DIRECTUS_URL}/items/athlete_profiles`)
    url.searchParams.set('filter[directus_user_id][_eq]', me.id)
    url.searchParams.set('fields', 'id,name,gender,ten_km_time_sec,plan_id')
    url.searchParams.set('limit', '1')
    const res = await _authedFetch(url.toString())
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
    const planRes = await _authedFetch(`${DIRECTUS_URL}/items/plans?limit=1&fields=id`)
    const planId = (await planRes.json()).data?.[0]?.id

    const body = { gender, ten_km_time_sec: tenKmTimeSec, directus_user_id: userId, plan_id: planId, name: userId }
    const existingId = user.value?.id

    const res = await _authedFetch(
      existingId ? `${DIRECTUS_URL}/items/athlete_profiles/${existingId}` : `${DIRECTUS_URL}/items/athlete_profiles`,
      { method: existingId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
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
    localStorage.setItem(LS_TOKEN, token.value)
    localStorage.setItem(LS_REFRESH, json.data.refresh_token)
    localStorage.setItem(LS_ACTIVITY, Date.now().toString())
    await fetchProfile()
  }

  function logout() {
    token.value = null
    user.value  = null
    localStorage.removeItem(LS_TOKEN)
    localStorage.removeItem(LS_REFRESH)
    localStorage.removeItem(LS_ACTIVITY)
    clearPlanCache()
    useAppStore().reset()
  }

  return { token, user, isAuthenticated, profileComplete, init, login, logout, fetchProfile, saveProfile }
})
