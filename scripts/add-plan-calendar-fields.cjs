// scripts/add-plan-calendar-fields.cjs
// Ajoute à la collection plans :
//   - total_weeks : longueur du plan en semaines, course comprise. Avec la date de course de l'athlète,
//     elle permet de calculer SA semaine courante (calendrier par athlète).
//   - phase_names : noms des phases par numéro, ex. { "1": "Force", "2": "Volume" }. Vide = noms par défaut.
// Les valeurs initiales ne sont posées que là où le champ est vide.
//   DIRECTUS_URL=… DIRECTUS_TOKEN=… node scripts/add-plan-calendar-fields.cjs          simulation
//   DIRECTUS_URL=… DIRECTUS_TOKEN=… node scripts/add-plan-calendar-fields.cjs --write  écrit
const { api, DIRECTUS_URL } = require('./_directus.cjs')

const WRITE = process.argv.includes('--write')

const FIELDS = [
  {
    field: 'total_weeks',
    type: 'integer',
    meta: { interface: 'input', note: 'Longueur du plan en semaines, course comprise. Sert à calculer la semaine de chaque athlète depuis sa date de course.' },
    schema: { is_nullable: true },
  },
  {
    field: 'phase_names',
    type: 'json',
    meta: { interface: 'input-code', special: ['cast-json'], options: { language: 'json' }, note: 'Noms des phases par numéro : { "1": "Force", "2": "Volume" }. Vide = noms par défaut.' },
    schema: { is_nullable: true },
  },
]

// Valeurs initiales propres à un plan : identifiant, confirmé par un mot de son titre.
// Les autres plans reçoivent comme longueur leur dernière semaine écrite.
const INITIAL = {
  5: { title: /solo/i, total_weeks: 19, phase_names: { 1: 'Force', 2: 'Volume', 3: 'Spé Hyrox', 4: 'Affûtage' } },
}

async function main() {
  console.log(`Directus : ${DIRECTUS_URL} — ${WRITE ? 'ÉCRITURE' : 'simulation (ajouter --write pour écrire)'}`)

  // 1. Champs
  const existing = (await api('GET', '/fields/plans')).map(f => f.field)
  for (const field of FIELDS) {
    if (existing.includes(field.field)) { console.log(`Champ plans.${field.field} déjà présent — skip`); continue }
    if (WRITE) await api('POST', '/fields/plans', field)
    console.log(`${WRITE ? 'Champ créé' : 'Champ à créer'} : plans.${field.field}`)
  }

  // 2. Valeurs initiales
  const plans = await api('GET', '/items/plans?fields=*&limit=-1&sort=id')
  const weeks = await api('GET', '/items/weeks?fields=plan_id,week_number&limit=-1')
  for (const plan of plans) {
    const lastWeek = weeks.filter(w => w.plan_id === plan.id).reduce((max, w) => Math.max(max, w.week_number), 0)
    const initial = INITIAL[plan.id]?.title.test(plan.title) ? INITIAL[plan.id] : null
    const patch = {}
    if (plan.total_weeks == null) {
      const total = initial?.total_weeks ?? lastWeek
      if (total > 0) patch.total_weeks = total
    }
    if (plan.phase_names == null && initial?.phase_names) patch.phase_names = initial.phase_names
    if (!Object.keys(patch).length) { console.log(`Plan #${plan.id} « ${plan.title.trim()} » : rien à poser`); continue }
    if (WRITE) await api('PATCH', `/items/plans/${plan.id}`, patch)
    console.log(`Plan #${plan.id} « ${plan.title.trim()} » (${lastWeek} semaines écrites) ${WRITE ? '←' : 'recevrait'} ${JSON.stringify(patch)}`)
  }

  // 3. Relecture
  if (WRITE) {
    const after = await api('GET', '/items/plans?fields=id,title,total_weeks,phase_names&limit=-1&sort=id')
    for (const p of after) console.log(`  #${p.id} total_weeks=${p.total_weeks} phase_names=${JSON.stringify(p.phase_names)}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
