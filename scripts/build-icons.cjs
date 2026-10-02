// scripts/build-icons.cjs
// Génère src/icons/ion.json avec les seules icônes utilisées par l'app,
// au lieu d'embarquer le jeu Ionicons complet (1,4 Mo).
//   node scripts/build-icons.cjs
// Pour ajouter une icône : l'ajouter à USED, relancer le script.
const fs = require('node:fs')
const path = require('node:path')

const USED = [
  'home-outline', 'calendar-outline', 'stats-chart-outline', 'person-outline', // onglets
  'chevron-back', 'chevron-down', // retour des sous-pages, lexique
  'play', // démarrer la séance
]

const full = require('@iconify-json/ion/icons.json')
const missing = USED.filter(name => !full.icons[name])
if (missing.length) {
  console.error(`Icônes introuvables dans Ionicons : ${missing.join(', ')}`)
  process.exit(1)
}

const subset = {
  prefix: full.prefix,
  width: full.width,
  height: full.height,
  icons: Object.fromEntries(USED.map(name => [name, full.icons[name]])),
}

const out = path.join(__dirname, '..', 'src', 'icons', 'ion.json')
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, JSON.stringify(subset, null, 2) + '\n')
console.log(`${USED.length} icônes écrites dans ${path.relative(process.cwd(), out)} (${fs.statSync(out).size} octets)`)
