// scripts/shorten-solo-texts.cjs
// Raccourcit les textes des semaines 1 à 8 du plan « hyrox solo men » (audit UX, action 1.5) :
// note de semaine en une ligne, descriptions qui répètent le titre retirées, conseils au tutoiement,
// notes de bloc et d'exercice réduites à des repères (« RIR 1-2 », « 6-10 reps »).
// L'alternative d'un exercice reste dans sa fiche (note du catalogue) ; le repos s'affiche déjà en tête de bloc.
// Seuls les textes strictement égaux à ceux de l'import d'origine sont remplacés : un texte retouché
// dans le CRM est laissé tel quel et signalé. Relançable.
//   DIRECTUS_URL=… DIRECTUS_TOKEN=… node scripts/shorten-solo-texts.cjs                    simulation
//   DIRECTUS_URL=… DIRECTUS_TOKEN=… node scripts/shorten-solo-texts.cjs --write            écrit
//   DIRECTUS_URL=… DIRECTUS_TOKEN=… node scripts/shorten-solo-texts.cjs --restore --write  remet les anciens textes
// Les anciennes valeurs sont notées dans scripts/shorten-solo-texts.log avant chaque écriture.
const fs = require('node:fs')
const path = require('node:path')
const { api, DIRECTUS_URL } = require('./_directus.cjs')

const WRITE = process.argv.includes('--write')
const RESTORE = process.argv.includes('--restore')
const PLAN_TITLE = 'hyrox solo men'
const JOURNAL = path.join(__dirname, 'shorten-solo-texts.log')

// Espace insécable avant ? : ; ! pour qu'un signe ne parte pas seul à la ligne sur mobile
const fr = (s) => s.replace(/ ([?:;!])/g, ' $1')

// ── Textes de l'import d'origine → nouveaux textes ───────────────────────────
const OLD_NORMAL = 'Polyarticulaires à RIR 1-2, échec autorisé seulement sur l’isolation. Double progression : haut de la fourchette atteint sur toutes les séries → +2,5 kg à la barre ou +1-2 kg par haltère, puis on repart du bas de la fourchette.'
const OLD_S1 = 'Charges de départ : celles calées en S0 à 2-3 RIR. '
const OLD_DELOAD = 'Semaine allégée : −1 série par exercice, mêmes charges.'
// En semaine allégée, la description des séances de muscu répétait la note de la semaine
const withDeload = (s) => [s, `${s} ${OLD_DELOAD}`]

const WEEK_NOTE = new Map([
  [OLD_S1 + OLD_NORMAL, fr('Charges calées en S0. RIR 1-2 = garde 1 à 2 reps en réserve.')],
  [OLD_NORMAL, fr('Haut de fourchette sur toutes les séries ? +2,5 kg barre, +1-2 kg par haltère.')],
  [OLD_DELOAD, fr('Semaine allégée : une série de moins par exercice, mêmes charges.')],
])
const WEEK_NOTE_MAX = 80

// Par séance type (clé du slug w{n}-{clé}-solo) : champ → [anciens textes, nouveau texte]
const SESSION = {
  'muscu-a': {
    description: [withDeload('Jambes lourdes, pecs, dos.'), null],
    coach_tip: [['Polyarticulaires à RIR 1-2. Si la sortie longue a eu lieu la veille, le squat passe à RIR 3 au lieu de 2.'],
      fr('Sortie longue la veille ? Squat à RIR 3 au lieu de 2.')],
  },
  'muscu-b': {
    description: [withDeload('Haut du corps, priorité pecs.'), null],
    // La consigne passe sur le bloc d'isolation, là où elle s'applique
    coach_tip: [['Polyarticulaires à RIR 1-2. Échec autorisé seulement sur l’isolation : écartés et curl.'], null],
  },
  'muscu-c': {
    description: [withDeload('Mixte et spé Hyrox. Séance possible le samedi en alternative.'), 'Possible le samedi à la place du vendredi.'],
    coach_tip: [['Semaine à 2 séances seulement : faire A et B, sauter C, et ajouter si possible le farmer’s carry en fin de B.'],
      fr('Semaine à 2 séances ? Fais A et B, et ajoute le farmer’s carry en fin de B.')],
  },
  'run-a': { description: [['Créneau de course : séance du plan de course perso.'], null] },
  'run-b': { description: [['Créneau de course : séance de fractionné du plan de course perso.'], null] },
  'run-c': {
    description: [['Créneau de course : sortie longue du plan de course perso. Samedi ou dimanche ; repos le dimanche si elle a lieu le samedi.'], 'Samedi ou dimanche.'],
    coach_tip: [['Si elle a lieu le dimanche, le squat du lundi passe à RIR 3 au lieu de 2.'],
      fr('Tu cours le dimanche ? Squat du lundi à RIR 3 au lieu de 2.')],
  },
}

const BLOCK_NOTE = new Map([
  ['Polyarticulaires — repos 2-3 min', 'Polyarticulaires · RIR 1-2'],
  ['Accessoire — repos 1 min 30', 'Accessoire'],
  ['Isolation — repos 1 min 30, échec autorisé', 'Isolation · échec autorisé'],
  ['Gainage — repos 1 min 30', 'Gainage'],
])

const EXERCISE_NOTE = new Map([
  ['RIR 2 · RIR 3 si sortie longue la veille · ou squat arrière', 'RIR 2'],
  ['6-10 reps · ou buste appuyé sur banc incliné', '6-10 reps'],
  ['8-10 reps · poids de corps ou lest léger', '8-10 reps · lest léger possible'],
  ['10-15 reps · RIR 1-2 · disque sur le dos ou gilet', '10-15 reps'],
  ['45-60 s · à lester une fois 60 s tenues', '45-60 s · lester à 60 s'],
])

// ── Lecture ──────────────────────────────────────────────────────────────────
const inList = (ids) => (ids.length ? ids.join(',') : '-1')

async function readPlan() {
  const plans = (await api('GET', '/items/plans?fields=id,title&limit=-1'))
    .filter(p => String(p.title ?? '').trim().toLowerCase() === PLAN_TITLE)
  if (plans.length !== 1) throw new Error(`Plan « ${PLAN_TITLE} » : ${plans.length} trouvé(s)`)
  const plan = plans[0]
  const weeks = await api('GET', `/items/weeks?filter[plan_id][_eq]=${plan.id}&fields=id,week_number,week_note&sort=week_number&limit=-1`)
  const sessions = await api('GET', `/items/sessions?filter[week_id][_in]=${inList(weeks.map(w => w.id))}&fields=id,slug,week_id,description,coach_tip&limit=-1`)
  const sessionBlocks = await api('GET', `/items/session_blocks?filter[session_id][_in]=${inList(sessions.map(s => s.id))}&filter[block_type][_eq]=block_strength&fields=block_id&limit=-1`)
  const blockIds = inList(sessionBlocks.map(b => b.block_id))
  const [blocks, rows] = await Promise.all([
    api('GET', `/items/block_strength?filter[id][_in]=${blockIds}&fields=id,note&limit=-1`),
    api('GET', `/items/block_strength_exercises?filter[block_strength_id][_in]=${blockIds}&fields=id,note&limit=-1`),
  ])
  return { plan, weeks, sessions, blocks, rows }
}

// ── Changements à faire ──────────────────────────────────────────────────────
function planChanges({ weeks, sessions, blocks, rows }) {
  const changes = []
  const untouched = [] // ni l'ancien texte ni le nouveau : retouché à la main, on n'y touche pas

  const newWeekNotes = [...WEEK_NOTE.values()]
  for (const w of weeks) {
    if (WEEK_NOTE.has(w.week_note)) changes.push({ collection: 'weeks', id: w.id, field: 'week_note', before: w.week_note, after: WEEK_NOTE.get(w.week_note) })
    else if (!newWeekNotes.includes(w.week_note)) untouched.push(`S${w.week_number} : note de semaine ${JSON.stringify(w.week_note)}`)
  }

  const weekNumber = new Map(weeks.map(w => [String(w.id), w.week_number]))
  for (const s of sessions) {
    const key = /^w\d+-(.+)-solo$/.exec(s.slug ?? '')?.[1]
    const label = `S${weekNumber.get(String(s.week_id))} ${key ?? s.slug}`
    if (!SESSION[key]) { untouched.push(`${label} : séance hors import`); continue }
    for (const [field, [olds, next]] of Object.entries(SESSION[key])) {
      const current = s[field] ?? null
      if (current === next) continue
      if (olds.includes(current)) changes.push({ collection: 'sessions', id: s.id, field, before: current, after: next })
      else untouched.push(`${label} : ${field} ${JSON.stringify(current)}`)
    }
  }

  // Blocs et exercices : seules les notes listées changent, les autres (« 6-8 reps »…) restent
  for (const b of blocks) if (BLOCK_NOTE.has(b.note)) changes.push({ collection: 'block_strength', id: b.id, field: 'note', before: b.note, after: BLOCK_NOTE.get(b.note) })
  for (const r of rows) if (EXERCISE_NOTE.has(r.note)) changes.push({ collection: 'block_strength_exercises', id: r.id, field: 'note', before: r.note, after: EXERCISE_NOTE.get(r.note) })
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
  for (const g of groups) {
    console.log(`\n${g.collection}.${g.field} × ${g.ids.length}`)
    console.log(`   avant : ${JSON.stringify(g.before)}`)
    console.log(`   après : ${JSON.stringify(g.after)}`)
  }
}

async function apply(groups) {
  for (const g of groups) await api('PATCH', `/items/${g.collection}`, { keys: g.ids, data: { [g.field]: g.after } })
}

async function restore() {
  if (!fs.existsSync(JOURNAL)) throw new Error(`Journal absent : ${JOURNAL}`)
  const saved = fs.readFileSync(JOURNAL, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line))
  // On ne remet un ancien texte que si le texte actuel est bien celui que ce script a écrit
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
  console.log(`\n${WRITE ? 'Remis' : 'À remettre'} : ${back.length} texte(s) sur ${saved.length} notés dans le journal`)
}

async function main() {
  console.log(`Directus : ${DIRECTUS_URL} — ${WRITE ? 'ÉCRITURE' : 'simulation (ajouter --write pour écrire)'}`)
  if (RESTORE) return restore()

  for (const note of WEEK_NOTE.values()) {
    if (note.length > WEEK_NOTE_MAX) throw new Error(`Note de semaine de ${note.length} caractères (${WEEK_NOTE_MAX} au plus) : ${note}`)
  }
  const data = await readPlan()
  console.log(`Plan #${data.plan.id} : ${data.weeks.length} semaines, ${data.sessions.length} séances, ${data.blocks.length} blocs de muscu, ${data.rows.length} lignes d'exercices`)
  const { changes, untouched } = planChanges(data)
  const groups = groupChanges(changes)
  show(groups)
  console.log(`\n${WRITE ? 'Écrit' : 'À écrire'} : ${changes.length} texte(s) en ${groups.length} requête(s)`)
  if (untouched.length) console.log(`\nLaissés tels quels, retouchés à la main (${untouched.length}) :\n  ${untouched.join('\n  ')}`)
  if (!WRITE || !changes.length) return

  const at = new Date().toISOString()
  fs.appendFileSync(JOURNAL, changes.map(c => JSON.stringify({ ...c, at })).join('\n') + '\n')
  await apply(groups)

  // Relecture
  const left = planChanges(await readPlan()).changes.length
  if (left) throw new Error(`${left} texte(s) encore à l'ancienne valeur après écriture`)
  console.log(`Relu : plus aucun ancien texte. Anciennes valeurs : ${JOURNAL}`)
}

main().catch(e => { console.error(e); process.exit(1) })
