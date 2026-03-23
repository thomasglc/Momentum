# Hyrox Planner

Application mobile-first pour suivre un plan de préparation Hyrox sur 12 semaines.

## Lancer le projet

```bash
npm install
npm run dev
```

Ouvrir `http://localhost:5173` dans le navigateur.

## Structure du JSON (`src/data/plan.json`)

```json
{
  "plan": { "id", "name", "startDate", "totalWeeks" },
  "weeks": [
    {
      "weekNumber": 1,
      "theme": "Mise en route",
      "sessions": [
        {
          "id": "w1-s1",
          "day": "Lundi",
          "type": "running | strength | hyrox",
          "title": "...",
          "duration": 45,
          "intensity": "Z2",
          "description": "...",
          "details": ["étape 1", "étape 2"]
        }
      ]
    }
  ]
}
```

## Brancher une vraie API

Modifier **uniquement** `src/services/trainingService.js` :

```js
export async function getPlan() {
  return await fetch('/api/plan').then(r => r.json())
}
```

Les composants ne changent pas — ils consomment la même forme de données.
