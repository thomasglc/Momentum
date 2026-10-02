// scripts/restrict-session-completions.cjs
// Rend les validations de séance privées : avec l'Athlete Policy, un athlète ne lit et ne supprime
// que les validations rattachées à son propre profil. Jusqu'ici, il pouvait lire et supprimer celles de tous.
// La création reste ouverte : Directus ne sait pas contrôler une relation au moment de créer.
//   DIRECTUS_URL=… DIRECTUS_TOKEN=… node scripts/restrict-session-completions.cjs          simulation
//   DIRECTUS_URL=… DIRECTUS_TOKEN=… node scripts/restrict-session-completions.cjs --write  écrit
// Idempotent. L'admin et le CRM ne sont pas concernés.
const { api, DIRECTUS_URL } = require('./_directus.cjs')

const WRITE = process.argv.includes('--write')
const COLLECTION = 'session_completions'
const POLICY_NAME = 'Athlete Policy'
const OWN = { athlete_profile_id: { directus_user_id: { _eq: '$CURRENT_USER' } } }
const ACTIONS = ['read', 'delete']

const count = async (query) => Number((await api('GET', `/items/${COLLECTION}?${query}&aggregate[count]=*`))[0].count)

async function main() {
  console.log(`Directus : ${DIRECTUS_URL} — ${WRITE ? 'ÉCRITURE' : 'simulation (ajouter --write pour écrire)'}`)

  // 1. Contrôle : le filtre par profil donne le même résultat que le filtre direct, profil par profil.
  //    Si ce n'était pas le cas, les athlètes ne verraient plus leurs validations.
  const profiles = await api('GET', '/items/athlete_profiles?fields=id,directus_user_id&limit=-1')
  for (const profile of profiles) {
    const direct = await count(`filter[athlete_profile_id][_eq]=${profile.id}`)
    const viaUser = profile.directus_user_id
      ? await count(`filter[athlete_profile_id][directus_user_id][_eq]=${profile.directus_user_id}`)
      : 0
    if (direct !== viaUser) throw new Error(`Profil #${profile.id} : ${direct} validations en direct, ${viaUser} par le filtre du compte. On n'écrit rien.`)
  }
  console.log(`Contrôle du filtre : identique au filtre direct pour les ${profiles.length} profils`)

  // 2. Droits
  const policies = await api('GET', `/policies?filter[name][_eq]=${encodeURIComponent(POLICY_NAME)}&fields=id`)
  if (policies.length !== 1) throw new Error(`Policy « ${POLICY_NAME} » : ${policies.length} trouvée(s)`)
  const perms = await api('GET', `/permissions?filter[policy][_eq]=${policies[0].id}&filter[collection][_eq]=${COLLECTION}&limit=-1`)
  for (const action of ACTIONS) {
    const perm = perms.find(p => p.action === action)
    if (!perm) throw new Error(`Droit ${action} introuvable sur ${COLLECTION}`)
    if (JSON.stringify(perm.permissions) === JSON.stringify(OWN)) { console.log(`Droit ${action} déjà filtré — skip`); continue }
    if (WRITE) await api('PATCH', `/permissions/${perm.id}`, { permissions: OWN })
    console.log(`Droit ${action} ${WRITE ? 'filtré' : 'à filtrer'} : ${JSON.stringify(perm.permissions)} → ${JSON.stringify(OWN)}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
