// Boîte d'envoi : ce que l'athlète a fait sur son téléphone et que Directus ne sait pas encore.
// Logique pure (aucun import : testable avec node --test). L'envoi lui-même est dans services/syncQueue.
//
// Une entrée décrit l'état voulu d'une ligne, pas la suite des gestes :
// cocher une série, la corriger puis la décocher ne laisse qu'une entrée, ou aucune.
//
// Entrée : { key, scope, owner, value, id, doubt, rev, at, error }
//   key    identité de la ligne côté métier (« 12:340:2 » : séance, ligne d'exercice, numéro de série)
//   scope  ce qu'il faut relire sur le serveur pour savoir où en est la ligne (la séance)
//   owner  profil de l'athlète qui a fait le geste
//   value  état voulu, ou null si la ligne ne doit plus exister
//   id     identifiant Directus, quand la ligne y existe
//   doubt  le serveur a peut-être déjà la ligne (envoi parti sans réponse, état inconnu) : relire avant de créer
//   rev    compteur des modifications locales, pour reconnaître une réponse devenue périmée
//   at     moment du premier geste (ms) : l'ordre d'envoi
//   error  message quand le serveur a refusé ; inutile de réessayer tout seul

const is = (key, owner) => entry => entry.key === key && entry.owner === owner
const replace = (entries, current, next) => entries.map(entry => (entry === current ? next : entry))
const without = (entries, current) => entries.filter(entry => entry !== current)
// Plus rien à faire sur le serveur ni à retenir : la ligne n'y est pas et ne doit pas y être
const isMoot = entry => entry.value === null && entry.id == null && !entry.doubt

/** Note l'état voulu d'une ligne. `id` : identifiant de la ligne si le serveur l'a déjà. */
export function put(entries, { key, scope, owner, value, id = null, at, doubt = false }) {
  const current = entries.find(is(key, owner))
  const next = current
    ? { ...current, value, id: current.id ?? id, rev: current.rev + 1, error: null }
    : { key, scope, owner, value, id, doubt, rev: 1, at, error: null }
  if (isMoot(next)) return without(entries, current)
  return current ? replace(entries, current, next) : [...entries, next]
}

/** Ce qu'il reste à faire sur le serveur pour une entrée */
export function stepOf(entry) {
  if (entry.doubt) return 'check'
  if (entry.value === null) return entry.id == null ? 'drop' : 'delete'
  return entry.id == null ? 'create' : 'update'
}

function change(entries, key, owner, patch) {
  const current = entries.find(is(key, owner))
  return current ? replace(entries, current, { ...current, ...patch }) : entries
}

/** Une création part : tant que le serveur n'a pas répondu, on ne sait pas si la ligne existe */
export const markSent = (entries, key, owner) => change(entries, key, owner, { doubt: true })

/** Le serveur a répondu non à la création : la ligne n'existe pas */
export const answered = (entries, key, owner) => change(entries, key, owner, { doubt: false })

/** Avant de continuer, relire le serveur (la ligne visée n'y est peut-être plus) */
export const recheck = (entries, key, owner) => change(entries, key, owner, { doubt: true })

/** Le serveur a refusé : l'entrée attend une relance à la main */
export const refuse = (entries, key, owner, message) => change(entries, key, owner, { error: message, doubt: false })

export const retryRefused = (entries, owner) =>
  entries.map(entry => (entry.owner === owner && entry.error ? { ...entry, error: null } : entry))

/** L'athlète abandonne ce que le serveur a refusé */
export const forgetRefused = (entries, owner) => entries.filter(entry => !(entry.owner === owner && entry.error))

/**
 * Le serveur a fait ce qu'on lui demandait à la révision `rev`. `row` : la ligne écrite, null après une suppression.
 * Si l'athlète a changé d'avis entre-temps, l'entrée reste, avec ce qu'on sait maintenant du serveur.
 */
export function settle(entries, key, owner, rev, row) {
  const current = entries.find(is(key, owner))
  if (!current) return entries
  if (current.rev === rev) return without(entries, current)
  const next = { ...current, id: row?.id ?? null, doubt: false }
  return isMoot(next) ? without(entries, current) : replace(entries, current, next)
}

/**
 * Rapproche les entrées d'un périmètre des lignes qu'on vient de lire sur le serveur.
 * rules : { keyOf(ligne), same(valeur voulue, ligne) }
 */
export function reconcile(entries, scope, owner, rows, { keyOf, same }) {
  return entries.flatMap((entry) => {
    if (entry.owner !== owner || entry.scope !== scope) return [entry]
    const row = (entry.id != null && rows.find(r => r.id === entry.id)) || rows.find(r => keyOf(r) === entry.key) || null
    const next = { ...entry, id: row?.id ?? null, doubt: false }
    if (isMoot(next)) return []
    // L'envoi avait réussi sans qu'on le sache
    if (next.value !== null && row && same(next.value, row)) return []
    return [next]
  })
}

/**
 * Une ligne par clé. Deux lignes de même clé sont un doublon : on garde celle qu'on connaît déjà (`known`,
 * des identifiants), sinon la plus ancienne. Une ligne sans clé n'est jamais rapprochée d'une autre.
 * → { rows, extras: identifiants en trop }
 */
export function unique(rows, keyOf, known = []) {
  const knownIds = new Set(known)
  const keeper = new Map()
  for (const row of rows) {
    const key = keyOf(row)
    if (key == null) continue
    const current = keeper.get(key)
    const better = !current
      || (knownIds.has(row.id) !== knownIds.has(current.id) ? knownIds.has(row.id) : row.id < current.id)
    if (better) keeper.set(key, row)
  }
  const kept = rows.filter((row) => {
    const key = keyOf(row)
    return key == null || keeper.get(key) === row
  })
  return { rows: kept, extras: rows.filter(row => !kept.includes(row)).map(row => row.id) }
}

/**
 * Ce que l'écran affiche pour un périmètre : les lignes du serveur, corrigées par ce qui attend d'être envoyé.
 * view : { keyOf(ligne), toRow(entrée) }
 */
export function overlay(rows, entries, scope, owner, { keyOf, toRow }) {
  let out = rows
  for (const entry of entries) {
    if (entry.owner !== owner || entry.scope !== scope) continue
    const matches = row => (entry.id != null && row.id === entry.id) || keyOf(row) === entry.key
    const index = out.findIndex(matches)
    const row = entry.value === null ? [] : [toRow(entry)]
    out = index < 0
      ? [...out, ...row]
      : [...out.slice(0, index), ...row, ...out.slice(index + 1).filter(r => !matches(r))]
  }
  return out
}

/** Prochaine entrée à envoyer pour cet athlète : la plus ancienne, hors refus et hors `skip` (des clés) */
export function nextEntry(entries, owner, skip = new Set()) {
  let next = null
  for (const entry of entries) {
    if (entry.owner !== owner || entry.error || skip.has(entry.key)) continue
    if (!next || entry.at < next.at) next = entry
  }
  return next
}
