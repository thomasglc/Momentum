// scripts/cap-strength-rest.cjs
// Plafonne à 2 min le repos des blocs de muscu du plan « hyrox solo men », et ramène la durée prévue
// de ses séances de muscu à ce que donne le chrono (retour de Thomas après la semaine 1, 7 octobre 2026).
// Semaine 1 au chrono, avec 2 min 30 de repos : 49 à 59 min. 30 s de moins sur 11 à 14 séries, c'est 5 à 7 min
// gagnées : 50 min par séance, 40 min en semaine allégée.
// Les repos au-dessus de 2 min sont tous plafonnés. Pour les durées, seules celles de l'import (60 min, 50 min
// en semaine allégée) sont remplacées : une durée retouchée dans le CRM est laissée et signalée. Relançable.
//   node scripts/cap-strength-rest.cjs                    simulation
//   node scripts/cap-strength-rest.cjs --write            écrit
//   node scripts/cap-strength-rest.cjs --restore --write  remet les valeurs d'avant
// URL et token : voir scripts/_directus.cjs.
// Les anciennes valeurs sont notées dans scripts/cap-strength-rest.log avant chaque écriture.
const fs = require('node:fs')
const path = require('node:path')
const { api, DIRECTUS_URL } = require('./_directus.cjs')

const WRITE = process.argv.includes('--write')
const RESTORE = process.argv.includes('--restore')
const PLAN_TITLE = 'hyrox solo men'
const JOURNAL = path.join(__dirname, 'cap-strength-rest.log')

const MAX_REST_SEC = 120
// Durée prévue d'une séance de muscu : [celle de l'import, la nouvelle]
const DURATION_MIN = { normal: [60, 50], deload: [50, 40] }

// ── Lecture ──────────────────────────────────────────────────────────────────
const inList = (ids) => (ids.length ? ids.join(',') : '-1')

async function readPlan() {
  const plans = (await api('GET', '/items/plans?fields=id,title&limit=-1'))
    .filter(p => String(p.title ?? '').trim().toLowerCase() === PLAN_TITLE)
  if (plans.length !== 1) throw new Error(`Plan « ${PLAN_TITLE} » : ${plans.length} trouvé(s)`)
  const plan = plans[0]
  const weeks = await api('GET', `/items/weeks?filter[plan_id][_eq]=${plan.id}&fields=id,week_number,is_deload&sort=week_number&limit=-1`)
  const sessions = await api('GET', `/items/sessions?filter[week_id][_in]=${inList(weeks.map(w => w.id))}&fields=id,week_id,day,type,title,duration_min&limit=-1`)
  const links = await api('GET', `/items/session_blocks?filter[session_id][_in]=${inList(sessions.map(s => s.id))}&filter[block_type][_eq]=block_strength&fields=session_id,block_id&limit=-1`)
  const blocks = await api('GET', `/items/block_strength?filter[id][_in]=${inList(links.map(l => l.block_id))}&fields=id,rest_sec,note&limit=-1`)
  return { plan, weeks, sessions, links, blocks }
}

// ── Changements à faire ──────────────────────────────────────────────────────
function planChanges({ weeks, sessions, links, blocks }) {
  const changes = []
  const untouched = [] // durée qui n'est ni celle de l'import ni la nouvelle : retouchée à la main, on n'y touche pas

  for (const block of blocks) {
    if (block.rest_sec > MAX_REST_SEC) changes.push({ collection: 'block_strength', id: block.id, field: 'rest_sec', before: block.rest_sec, after: MAX_REST_SEC })
  }

  const weekOf = new Map(weeks.map(w => [String(w.id), w]))
  const withStrength = new Set(links.map(l => String(l.session_id)))
  for (const session of sessions) {
    if (session.type !== 'strength' || !withStrength.has(String(session.id))) continue
    const week = weekOf.get(String(session.week_id))
    const [imported, wanted] = DURATION_MIN[week.is_deload ? 'deload' : 'normal']
    if (session.duration_min === wanted) continue
    if (session.duration_min === imported) changes.push({ collection: 'sessions', id: session.id, field: 'duration_min', before: imported, after: wanted })
    else untouched.push(`S${week.week_number} ${session.day} « ${session.title} » : ${session.duration_min} min`)
  }
  return { changes, untouched }
}

// Une requête par (collection, champ, avant, après)
function groupChanges(changes) {
  const groups = new Map()
  for (const c of changes) {
    const key = JSON.stringify([c.collection, c.field, c.before, c.after])
    if (!groups.has(key)) groups.set(key, { ...c, ids: [] })
    groups.get(key).ids.push(c.id)
  }
  return [...groups.values()]
}

function show(groups) {
  for (const g of groups) console.log(`${g.collection}.${g.field} : ${g.before} → ${g.after} × ${g.ids.length}`)
}

async function apply(groups) {
  for (const g of groups) await api('PATCH', `/items/${g.collection}`, { keys: g.ids, data: { [g.field]: g.after } })
}

async function restore() {
  if (!fs.existsSync(JOURNAL)) throw new Error(`Journal absent : ${JOURNAL}`)
  const saved = fs.readFileSync(JOURNAL, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line))
  // On ne remet une ancienne valeur que si la valeur actuelle est bien celle que ce script a écrite
  const current = new Map()
  for (const collection of new Set(saved.map(c => c.collection))) {
    const ids = [...new Set(saved.filter(c => c.collection === collection).map(c => c.id))]
    for (const item of await api('GET', `/items/${collection}?filter[id][_in]=${inList(ids)}&limit=-1`)) current.set(`${collection}#${item.id}`, item)
  }
  const back = saved
    .filter(c => (current.get(`${c.collection}#${c.id}`)?.[c.field] ?? null) === c.after)
    .map(c => ({ ...c, before: c.after, after: c.before }))
  const groups = groupChanges(back)
  show(groups)
  if (WRITE) await apply(groups)
  console.log(`\n${WRITE ? 'Remis' : 'À remettre'} : ${back.length} valeur(s) sur ${saved.length} notées dans le journal`)
}

async function main() {
  console.log(`Directus : ${DIRECTUS_URL} — ${WRITE ? 'ÉCRITURE' : 'simulation (ajouter --write pour écrire)'}`)
  if (RESTORE) return restore()

  const data = await readPlan()
  console.log(`Plan #${data.plan.id} : ${data.weeks.length} semaines, ${data.sessions.length} séances, ${data.blocks.length} blocs de muscu`)
  const { changes, untouched } = planChanges(data)
  const groups = groupChanges(changes)
  show(groups)
  console.log(`\n${WRITE ? 'Écrit' : 'À écrire'} : ${changes.length} valeur(s) en ${groups.length} requête(s)`)
  if (untouched.length) console.log(`\nDurées laissées telles quelles, retouchées à la main (${untouched.length}) :\n  ${untouched.join('\n  ')}`)
  if (!WRITE || !changes.length) return

  const at = new Date().toISOString()
  fs.appendFileSync(JOURNAL, changes.map(c => JSON.stringify({ ...c, at })).join('\n') + '\n')
  await apply(groups)

  // Relecture
  const after = await readPlan()
  const left = planChanges(after).changes.length
  if (left) throw new Error(`${left} valeur(s) encore à changer après écriture`)
  const rests = [...new Set(after.blocks.map(b => b.rest_sec))].sort((a, b) => b - a)
  console.log(`Relu : repos des blocs ${rests.join(' s, ')} s. Anciennes valeurs : ${JOURNAL}`)
}

main().catch(e => { console.error(e); process.exit(1) })
