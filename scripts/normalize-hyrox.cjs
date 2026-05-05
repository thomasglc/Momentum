const fs = require('fs');
const path = require('path');

const planPath = path.join(__dirname, '../src/data/plan.json');
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));

const warmup10 = { type: 'warmup', durationMin: 10, label: '500m rameur Z1 + mobilité dynamique' };
const warmup5  = { type: 'warmup', durationMin: 5,  label: 'Mobilité dynamique légère' };

const transforms = {
  'w10-hyrox-a': s => {
    s.structuredDetails = [
      warmup10,
      {
        type: 'mini_race',
        rounds: 4,
        runDistanceKm: 1,
        pace: { him: '5:45–6:00/km', her: '6:45–7:00/km' },
        restBetweenRoundsMin: 1.5,
        stations: [
          'SkiErg 400m',
          'RowErg 400m',
          'Wall Balls 40 reps (6kg F / 9kg H)',
          'Farmers Carry 80m + Sandbag Lunges 60m (14kg F / 20kg H)',
        ],
      },
    ];
  },

  'w11-hyrox-a': s => {
    s.structuredDetails = [
      warmup10,
      {
        type: 'mini_race',
        rounds: 4,
        runDistanceKm: 1,
        pace: { him: '5:45–6:00/km', her: '6:45–7:00/km' },
        restBetweenRoundsMin: 1.5,
        stations: [
          'SkiErg 500m',
          'RowErg 500m',
          'Wall Balls 50 reps (6kg F / 9kg H)',
          'Burpee Broad Jumps 80m',
        ],
      },
    ];
  },

  'w12-hyrox-a': s => {
    s.structuredDetails = [
      warmup10,
      {
        type: 'mini_race',
        rounds: 4,
        runDistanceKm: 1,
        pace: { him: '5:45–6:00/km', her: '6:45–7:00/km' },
        restBetweenRoundsMin: 1.5,
        stations: [
          'Sled Push 40m',
          'Sled Pull 40m',
          'Farmers Carry 60m (2×24kg F / 2×28kg H)',
          'Sandbag Lunges 45m (14kg F / 20kg H)',
        ],
      },
    ];
  },

  'w13-hyrox-a': s => {
    s.structuredDetails = [
      warmup10,
      {
        type: 'mini_race',
        rounds: 4,
        runDistanceKm: 1,
        pace: { him: '6:00–6:15/km', her: '7:00–7:15/km' },
        restBetweenRoundsMin: 2,
        stations: [
          'SkiErg 500m',
          'Wall Balls 50 reps (6kg F / 9kg H)',
          'Farmers Carry 60m (2×24kg F / 2×28kg H)',
          'Burpee Broad Jumps 80m',
        ],
      },
    ];
  },

  'w14-hyrox-a': s => {
    s.structuredDetails = [
      warmup10,
      {
        type: 'mini_race',
        rounds: 4,
        runDistanceKm: 1,
        pace: { him: '5:45–6:00/km', her: '6:45–7:00/km' },
        restBetweenRoundsMin: 1.5,
        stations: [
          'Sled Push 40m',
          'Sled Pull 40m',
          'RowErg 500m',
          'Sandbag Lunges 45m (14kg F / 20kg H)',
        ],
      },
    ];
  },

  'w15-hyrox-a': s => {
    s.structuredDetails = [
      warmup10,
      {
        type: 'mini_race',
        rounds: 4,
        runDistanceKm: 1,
        pace: { him: '6:00–6:15/km', her: '7:00–7:15/km' },
        restBetweenRoundsMin: 2,
        stations: [
          'SkiErg 500m',
          'RowErg 500m',
          'Farmers Carry 60m (2×24kg F / 2×28kg H)',
          'Wall Balls 50 reps (6kg F / 9kg H)',
        ],
      },
    ];
  },

  'w16-hyrox-a': s => {
    s.structuredDetails = [
      warmup10,
      {
        type: 'mini_race',
        rounds: 6,
        runDistanceKm: 1,
        pace: { him: '5:45–6:00/km', her: '6:45–7:00/km' },
        restBetweenRoundsMin: 1,
        stations: [
          'SkiErg 500m',
          'RowErg 500m',
          'Sled Push 40m',
          'Wall Balls 50 reps (6kg F / 9kg H)',
          'Farmers Carry 60m (2×24kg F / 2×28kg H)',
          'Sandbag Lunges 45m (14kg F / 20kg H)',
        ],
      },
    ];
  },

  'w16-hyrox-b': s => {
    s.structuredDetails = [
      warmup5,
      {
        type: 'station_activation',
        note: 'Force légère — maintien des automatismes, aucune augmentation de charges',
        stations: [
          'SkiErg 300m (allure détendue)',
          'RowErg 300m (allure détendue)',
          'Wall Balls 30 reps (6kg F / 9kg H)',
          'Farmers Carry 40m (2×20kg F / 2×24kg H)',
        ],
      },
    ];
  },

  'w17-hyrox-a': s => {
    s.structuredDetails = [
      warmup5,
      {
        type: 'station_activation',
        note: 'Volume –40% — technique sur les 8 mouvements, pas d\'effort maximal',
        stations: [
          'SkiErg 200m',
          'RowErg 200m',
          'Sled Push 20m',
          'Sled Pull 20m',
          'Burpee Broad Jumps 40m',
          'Farmers Carry 40m (charges légères)',
          'Sandbag Lunges 30m (charges légères)',
          'Wall Balls 30 reps (charges légères)',
        ],
      },
    ];
  },

  'w18-hyrox-a': s => {
    s.structuredDetails = [
      {
        type: 'station_activation',
        note: 'Activation minimale — maintien des automatismes, aucune fatigue',
        stations: [
          'SkiErg 200m (charges légères)',
          'Wall Balls 20 reps (charges légères)',
          'Farmers Carry 40m (charges légères)',
        ],
      },
    ];
  },

  'w19-hyrox-a': s => {
    s.structuredDetails = [
      {
        type: 'station_activation',
        note: '2 tours légers — activer les muscles uniquement, 5 min de travail effectif',
        rounds: 2,
        stations: [
          'SkiErg 150m',
          'RowErg 150m',
          'Wall Balls 10 reps (charges légères)',
        ],
      },
    ];
  },
};

let modified = 0;
for (const week of plan.weeks) {
  for (const session of week.sessions) {
    if (transforms[session.id]) {
      transforms[session.id](session);
      modified++;
      console.log(`✓ ${session.id}`);
    }
  }
}

fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
console.log(`\nDone: ${modified} sessions normalisées.`);
