// scripts/set-exercise-images.cjs
// Renseigne image_urls dans exercise_catalog et station_catalog à partir de free-exercise-db
// (github.com/yuhonas/free-exercise-db, Unlicense), servi par jsDelivr et épinglé sur un commit.
// Chaque exercice a deux photos : position de départ (0.jpg) et position d'arrivée (1.jpg).
//   DIRECTUS_URL=… DIRECTUS_TOKEN=… node scripts/set-exercise-images.cjs          simulation
//   DIRECTUS_URL=… DIRECTUS_TOKEN=… node scripts/set-exercise-images.cjs --write  écrit
// Idempotent : une ligne déjà à jour n'est pas réécrite. Prérequis : scripts/add-set-logs.cjs.
const COMMIT = 'f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5'
const BASE = `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@${COMMIT}/exercises`

// Nom dans le catalogue → identifiant free-exercise-db.
// Absent de la table = pas d'équivalent fidèle : l'app garde l'emoji.
const MAPPING = {
  exercise_catalog: {
    'Squat': 'Barbell_Squat',
    'Goblet Squat': 'Goblet_Squat',
    'Box Squat': 'Box_Squat',
    'Romanian Deadlift': 'Romanian_Deadlift',
    'Hip Thrust': 'Barbell_Hip_Thrust',
    'Leg Press': 'Leg_Press',
    'KB Swing': 'One-Arm_Kettlebell_Swings',
    'Tirage Horizontal': 'Seated_Cable_Rows',
    'Strict Press': 'Standing_Military_Press',
    'Pull-up': 'Pullups',
    'Planche': 'Plank',
    'Dead Bug': 'Dead_Bug',
    'Gainage Latéral': 'Side_Bridge',
    'Bench': 'Barbell_Bench_Press_-_Medium_Grip',
    'Deadlift': 'Barbell_Deadlift',
    'Thruster': 'Kettlebell_Thruster',
    'Fente Bulgare': 'Split_Squat_with_Dumbbells',
    'Front Squat': 'Front_Barbell_Squat',
    'Développé Couché Haltères': 'Dumbbell_Bench_Press',
    'Tractions Lestées': 'Weighted_Pull_Ups',
    'Face Pull': 'Face_Pull',
    'Développé Incliné Barre': 'Barbell_Incline_Bench_Press_-_Medium_Grip',
    'Rowing Barre Penché': 'Bent_Over_Barbell_Row',
    'Développé Militaire Haltères': 'Dumbbell_Shoulder_Press',
    'Écarté Incliné Haltères': 'Incline_Dumbbell_Flyes',
    'Curl Biceps': 'Dumbbell_Bicep_Curl',
    'Dips Lestés': 'Dips_-_Chest_Version',
    'Pompes Lestées': 'Pushups',
  },
  // SkiErg, Sled Pull, Burpee Broad Jump et Wall Balls n'ont pas d'équivalent dans la base.
  station_catalog: {
    'RowErg': 'Rowing_Stationary',
    'Sled Push': 'Sled_Push',
    'Farmers Carry': 'Farmers_Walk',
    'Sandbag Lunges': 'Barbell_Walking_Lunge',
    'KB Swing': 'One-Arm_Kettlebell_Swings',
    'Box Jump': 'Front_Box_Jump',
    'Run': 'Running_Treadmill',
  },
}

const urlsOf = id => [`${BASE}/${id}/0.jpg`, `${BASE}/${id}/1.jpg`]

async function main() {
  const { api, DIRECTUS_URL } = require('./_directus.cjs')
  const write = process.argv.includes('--write')
  console.log(`Directus : ${DIRECTUS_URL} — ${write ? 'ÉCRITURE' : 'simulation (ajouter --write pour écrire)'}`)

  let problems = 0
  for (const [collection, mapping] of Object.entries(MAPPING)) {
    const rows = await api('GET', `/items/${collection}?fields=*&limit=-1&sort=id`)
    for (const row of rows) {
      const id = mapping[row.name]
      if (!id) { console.log(`  ${collection} #${row.id} ${row.name} : pas d'image`); continue }
      const urls = urlsOf(id)
      const status = await Promise.all(urls.map(u => fetch(u, { method: 'HEAD' }).then(r => r.status)))
      if (status.some(s => s !== 200)) {
        console.log(`  ✖ ${collection} #${row.id} ${row.name} → ${id} : HTTP ${status.join('/')}`)
        problems++
        continue
      }
      if (JSON.stringify(row.image_urls) === JSON.stringify(urls)) {
        console.log(`  ${collection} #${row.id} ${row.name} : déjà à jour`)
        continue
      }
      if (write) await api('PATCH', `/items/${collection}/${row.id}`, { image_urls: urls })
      console.log(`  ${write ? '✔' : '→'} ${collection} #${row.id} ${row.name} → ${id}`)
    }
    const unknown = Object.keys(mapping).filter(name => !rows.some(r => r.name === name))
    if (unknown.length) {
      console.log(`  ✖ noms absents de ${collection} : ${unknown.join(', ')}`)
      problems += unknown.length
    }
  }
  if (problems) { console.error(`\n${problems} problème(s)`); process.exit(1) }
}

if (require.main === module) main().catch(e => { console.error(e); process.exit(1) })

module.exports = { MAPPING, urlsOf }
