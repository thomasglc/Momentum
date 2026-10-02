import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addDays } from '../src/utils/planCalendar.js'
import {
  DAYS, sessionDate, weekCompletion, weekDays, focusSession, completeWeekStreak, planTotals,
  planTimeline, groupByPhase, toProgressSet, exerciseProgress, totalVolumeKg, formatHours, formatTonnage,
} from '../src/utils/progress.js'

// ── Plan d'essai : trois semaines à partir du lundi 5 octobre 2026 ───────────
const START = '2026-10-05'
const session = (id, day, extra = {}) => ({ id, day, type: 'strength', optional: false, title: `Séance ${id}`, duration: 60, ...extra })
const week = (n, sessions, extra = {}) => ({
  weekNumber: n, phase: 1, theme: 'Force', isDeload: false,
  startDate: addDays(START, (n - 1) * 7), endDate: addDays(START, (n - 1) * 7 + 6),
  sessions, ...extra,
})
// Muscu lundi, course mardi (sans durée prévue), muscu mercredi, mobilité optionnelle jeudi, muscu vendredi
const typical = n => week(n, [
  session(n * 10 + 1, 'Lundi'),
  session(n * 10 + 2, 'Mardi', { type: 'running', duration: 0 }),
  session(n * 10 + 3, 'Mercredi'),
  session(n * 10 + 4, 'Jeudi', { type: 'mobility', optional: true, duration: 20 }),
  session(n * 10 + 5, 'Vendredi'),
])
const WEEKS = [typical(1), typical(2), typical(3)]
const done = (...ids) => { const set = new Set(ids); return id => set.has(id) }
const WEDNESDAY_W2 = '2026-10-14'

// ── date d'une séance ────────────────────────────────────────────────────────
test('sessionDate ajoute le jour au lundi de la semaine', () => {
  assert.equal(DAYS.length, 7)
  assert.equal(sessionDate('2026-10-05', 'Lundi'), '2026-10-05')
  assert.equal(sessionDate('2026-10-05', 'Dimanche'), '2026-10-11')
})
test('sessionDate renvoie null sans calendrier ou pour un jour inconnu', () => {
  assert.equal(sessionDate(null, 'Lundi'), null)
  assert.equal(sessionDate('2026-10-05', 'Lundy'), null)
})

// ── semaine complète ─────────────────────────────────────────────────────────
test('weekCompletion ne compte que les séances obligatoires', () => {
  assert.deepEqual(weekCompletion(WEEKS[0], done()), { done: 0, total: 4, complete: false })
  assert.deepEqual(weekCompletion(WEEKS[0], done(14)), { done: 0, total: 4, complete: false })
  assert.deepEqual(weekCompletion(WEEKS[0], done(11, 12, 13)), { done: 3, total: 4, complete: false })
  assert.deepEqual(weekCompletion(WEEKS[0], done(11, 12, 13, 15)), { done: 4, total: 4, complete: true })
})
test('weekCompletion : une semaine sans séance obligatoire n\'est jamais complète', () => {
  const bonusOnly = week(1, [session(1, 'Jeudi', { optional: true })])
  assert.deepEqual(weekCompletion(bonusOnly, done(1)), { done: 0, total: 0, complete: false })
  assert.deepEqual(weekCompletion(null, done()), { done: 0, total: 0, complete: false })
})

// ── les sept jours ───────────────────────────────────────────────────────────
test('weekDays donne l\'état de chaque jour, un mercredi', () => {
  const days = weekDays(WEEKS[1], done(21), WEDNESDAY_W2)
  assert.deepEqual(days.map(d => d.letter), ['L', 'M', 'M', 'J', 'V', 'S', 'D'])
  assert.deepEqual(days.map(d => d.state), ['done', 'late', 'todo', 'bonus', 'todo', 'rest', 'rest'])
  assert.deepEqual(days.map(d => d.isToday), [false, false, true, false, false, false, false])
  assert.equal(days[0].date, '2026-10-12')
  assert.equal(days[6].date, '2026-10-18')
  assert.deepEqual(days.map(d => d.sessions.length), [1, 1, 1, 1, 1, 0, 0])
  assert.equal(days[2].sessions[0].id, 23)
})
test('weekDays : une optionnelle validée coche son jour, un jour mixte suit sa séance obligatoire', () => {
  const mixed = week(1, [session(1, 'Lundi'), session(2, 'Lundi', { optional: true }), session(3, 'Jeudi', { optional: true })])
  assert.deepEqual(weekDays(mixed, done(2, 3), '2026-10-05').map(d => d.state).slice(0, 4), ['todo', 'rest', 'rest', 'done'])
  assert.deepEqual(weekDays(mixed, done(1), '2026-10-05').map(d => d.state).slice(0, 4), ['done', 'rest', 'rest', 'bonus'])
})
test('weekDays sans calendrier : ni date, ni jour courant, ni retard', () => {
  const noCalendar = { ...WEEKS[0], startDate: null, endDate: null }
  const days = weekDays(noCalendar, done(11), null)
  assert.deepEqual(days.map(d => d.state), ['done', 'todo', 'todo', 'bonus', 'todo', 'rest', 'rest'])
  assert.ok(days.every(d => d.date === null && d.isToday === false))
})

// ── séance mise en avant ─────────────────────────────────────────────────────
const focusOf = (isDone, today, weeks = WEEKS) => {
  const focus = focusSession(weeks, isDone, today)
  return focus && { kind: focus.kind, id: focus.session.id, week: focus.week.weekNumber, date: focus.date }
}
test('focusSession : la séance du jour passe avant tout', () => {
  assert.deepEqual(focusOf(done(21), WEDNESDAY_W2), { kind: 'today', id: 23, week: 2, date: '2026-10-14' })
})
test('focusSession : séance du jour validée, on propose de rattraper celle de la semaine', () => {
  assert.deepEqual(focusOf(done(21, 23), WEDNESDAY_W2), { kind: 'late', id: 22, week: 2, date: '2026-10-13' })
})
test('focusSession : rien en retard, on annonce la prochaine séance obligatoire', () => {
  assert.deepEqual(focusOf(done(21, 22, 23), WEDNESDAY_W2), { kind: 'next', id: 25, week: 2, date: '2026-10-16' })
})
test('focusSession : jour de repos', () => {
  assert.deepEqual(focusOf(done(21, 22, 23, 25), '2026-10-17'), { kind: 'next', id: 31, week: 3, date: '2026-10-19' })
  assert.deepEqual(focusOf(done(21, 22, 23), '2026-10-17'), { kind: 'late', id: 25, week: 2, date: '2026-10-16' })
})
test('focusSession ne remonte pas aux semaines précédentes', () => {
  assert.deepEqual(focusOf(done(21, 22, 23), WEDNESDAY_W2), { kind: 'next', id: 25, week: 2, date: '2026-10-16' })
})
test('focusSession : une optionnelle du jour est proposée, après un rattrapage obligatoire', () => {
  assert.deepEqual(focusOf(done(21, 22, 23), '2026-10-15'), { kind: 'today', id: 24, week: 2, date: '2026-10-15' })
  assert.deepEqual(focusOf(done(21, 23), '2026-10-15'), { kind: 'late', id: 22, week: 2, date: '2026-10-13' })
})
test('focusSession avant le début du plan annonce la première séance', () => {
  assert.deepEqual(focusOf(done(), '2026-10-02'), { kind: 'next', id: 11, week: 1, date: '2026-10-05' })
})
test('focusSession ne propose rien une fois le plan fini', () => {
  assert.equal(focusOf(done(), '2026-11-02'), null)
  assert.equal(focusOf(done(31, 32, 33, 35), '2026-10-23'), null)
})
test('focusSession sans calendrier propose la première séance obligatoire non validée', () => {
  const noCalendar = WEEKS.map(w => ({ ...w, startDate: null, endDate: null }))
  assert.deepEqual(focusOf(done(11), null, noCalendar), { kind: 'next', id: 12, week: 1, date: null })
  assert.deepEqual(focusOf(done(11, 12, 13, 15), null, noCalendar), { kind: 'next', id: 21, week: 2, date: null })
})
test('focusSession suit l\'ordre des jours, pas l\'ordre de saisie', () => {
  const shuffled = [week(1, [session(3, 'Vendredi'), session(1, 'Lundi'), session(2, 'Mercredi')])]
  assert.deepEqual(focusOf(done(), '2026-10-03', shuffled), { kind: 'next', id: 1, week: 1, date: '2026-10-05' })
})

// ── semaines complètes d'affilée ─────────────────────────────────────────────
const full = n => [n * 10 + 1, n * 10 + 2, n * 10 + 3, n * 10 + 5]
test('completeWeekStreak : la semaine en cours, incomplète, ne casse pas la série', () => {
  assert.equal(completeWeekStreak(WEEKS, done(...full(1), ...full(2), 31), { upTo: 3, inProgress: 3 }), 2)
})
test('completeWeekStreak compte la semaine en cours quand elle est complète', () => {
  assert.equal(completeWeekStreak(WEEKS, done(...full(1), ...full(2), ...full(3)), { upTo: 3, inProgress: 3 }), 3)
})
test('completeWeekStreak s\'arrête à la première semaine passée incomplète', () => {
  assert.equal(completeWeekStreak(WEEKS, done(...full(1), 21, 31), { upTo: 3, inProgress: 3 }), 0)
  assert.equal(completeWeekStreak(WEEKS, done(11, ...full(2), 31), { upTo: 3, inProgress: 3 }), 1)
})
test('completeWeekStreak, plan terminé : la dernière semaine compte comme les autres', () => {
  assert.equal(completeWeekStreak(WEEKS, done(...full(2), ...full(3)), { upTo: 3, inProgress: null }), 2)
  assert.equal(completeWeekStreak(WEEKS, done(...full(1), ...full(2), 31), { upTo: 3, inProgress: null }), 0)
})
test('completeWeekStreak saute une semaine sans séance obligatoire', () => {
  const weeks = [typical(1), week(2, [session(24, 'Jeudi', { optional: true })]), typical(3)]
  assert.equal(completeWeekStreak(weeks, done(...full(1), ...full(3)), { upTo: 3, inProgress: null }), 2)
})
test('completeWeekStreak vaut zéro avant le début du plan', () => {
  assert.equal(completeWeekStreak(WEEKS, done(), { upTo: 0, inProgress: null }), 0)
})

// ── totaux ───────────────────────────────────────────────────────────────────
test('planTotals compte les séances, les minutes prévues et l\'assiduité', () => {
  assert.deepEqual(planTotals(WEEKS, done(11, 12, 13, 14, 21), WEDNESDAY_W2), {
    sessionsDone: 5,   // l'optionnelle compte dans les séances faites
    due: 6,            // 4 obligatoires en semaine 1, lundi et mardi de la semaine 2
    dueDone: 4,
    adherence: 67,
    minutes: 200,      // 60 + 0 + 60 + 20 + 60
  })
})
test('planTotals : une séance validée en avance est échue', () => {
  const totals = planTotals(WEEKS, done(11, 12, 13, 14, 21, 25), WEDNESDAY_W2)
  assert.equal(totals.due, 7)
  assert.equal(totals.dueDone, 5)
  assert.equal(totals.adherence, 71)
})
test('planTotals : la séance du jour ne pèse pas tant qu\'elle n\'est pas validée', () => {
  assert.deepEqual(planTotals(WEEKS, done(), START), { sessionsDone: 0, due: 0, dueDone: 0, adherence: null, minutes: 0 })
})
test('planTotals sans calendrier ne calcule pas d\'assiduité', () => {
  const noCalendar = WEEKS.map(w => ({ ...w, startDate: null, endDate: null }))
  const totals = planTotals(noCalendar, done(11, 12), null)
  assert.equal(totals.sessionsDone, 2)
  assert.equal(totals.adherence, null)
  assert.equal(totals.minutes, 60)
})

// ── frise du plan ────────────────────────────────────────────────────────────
const statesOf = entries => entries.map(e => e.state)
test('planTimeline, plan en cours : une case par semaine du plan, écrite ou non', () => {
  const entries = planTimeline(WEEKS, 5, done(...full(1), 21), { status: 'running', weekNumber: 2 })
  assert.deepEqual(statesOf(entries), ['done', 'current', 'upcoming', 'upcoming', 'upcoming'])
  assert.deepEqual(entries.map(e => e.written), [true, true, true, false, false])
  assert.deepEqual(entries[0], {
    number: 1, written: true, phase: 1, theme: 'Force', isDeload: false,
    startDate: '2026-10-05', endDate: '2026-10-11', done: 4, total: 4, state: 'done',
  })
  assert.deepEqual(entries[1].done, 1)
  assert.deepEqual(entries[4], {
    number: 5, written: false, phase: null, theme: null, isDeload: false,
    startDate: null, endDate: null, done: 0, total: 0, state: 'upcoming',
  })
})
test('planTimeline distingue les semaines passées faites, partielles et manquées', () => {
  const entries = planTimeline(WEEKS, 3, done(21), { status: 'running', weekNumber: 3 })
  assert.deepEqual(statesOf(entries), ['missed', 'partial', 'current'])
})
test('planTimeline avant le début : tout est à venir', () => {
  assert.deepEqual(statesOf(planTimeline(WEEKS, 4, done(), { status: 'before', weekNumber: 1 })), ['upcoming', 'upcoming', 'upcoming', 'upcoming'])
})
test('planTimeline, plan terminé : tout est passé, une semaine non écrite reste neutre', () => {
  const entries = planTimeline(WEEKS, 4, done(...full(1), 21), { status: 'done', weekNumber: 4 })
  assert.deepEqual(statesOf(entries), ['done', 'partial', 'missed', 'none'])
})
test('planTimeline sans calendrier ne juge que ce qui est validé', () => {
  assert.deepEqual(statesOf(planTimeline(WEEKS, 3, done(...full(1), 21), { status: null, weekNumber: 1 })), ['done', 'partial', 'upcoming'])
})
test('planTimeline couvre les semaines écrites au-delà de la longueur annoncée', () => {
  assert.equal(planTimeline(WEEKS, 2, done(), { status: 'before', weekNumber: 1 }).length, 3)
  assert.equal(planTimeline([], 0, done(), { status: null, weekNumber: 1 }).length, 0)
})
test('groupByPhase regroupe les cases consécutives d\'une même phase', () => {
  const entries = [1, 1, 2, null, null].map((phase, i) => ({ number: i + 1, phase }))
  assert.deepEqual(groupByPhase(entries).map(g => [g.phase, g.entries.map(e => e.number)]), [[1, [1, 2]], [2, [3]], [null, [4, 5]]])
  assert.deepEqual(groupByPhase([]), [])
})

// ── charges par exercice ─────────────────────────────────────────────────────
const log = (exerciseId, name, sessionId, date, values) => ({ exerciseId, name, sessionId, date, weightKg: null, reps: null, durationSec: null, ...values })

test('toProgressSet lit une ligne set_logs, exercice déplié ou non', () => {
  const row = { id: 1, session_id: 31, exercise_id: { id: 18, name: 'Front Squat' }, weight_kg: 60, reps: 5, duration_sec: null, date_created: '2026-10-05T18:00:00.000Z' }
  assert.deepEqual(toProgressSet(row), { exerciseId: 18, name: 'Front Squat', sessionId: 31, weightKg: 60, reps: 5, durationSec: null, date: '2026-10-05T18:00:00.000Z' })
  assert.deepEqual(toProgressSet({ ...row, exercise_id: 18 }), { exerciseId: 18, name: null, sessionId: 31, weightKg: 60, reps: 5, durationSec: null, date: '2026-10-05T18:00:00.000Z' })
  assert.equal(toProgressSet({ ...row, exercise_id: null }).exerciseId, null)
})
test('exerciseProgress compare la meilleure série de la première et de la dernière séance', () => {
  const sets = [
    log(18, 'Front Squat', 11, '2026-10-05T18:00:00Z', { weightKg: 60, reps: 5 }),
    log(18, 'Front Squat', 11, '2026-10-05T18:05:00Z', { weightKg: 62.5, reps: 5 }),
    log(18, 'Front Squat', 21, '2026-10-12T18:00:00Z', { weightKg: 70, reps: 3 }),
    log(18, 'Front Squat', 31, '2026-10-19T18:00:00Z', { weightKg: 67.5, reps: 5 }),
  ]
  assert.deepEqual(exerciseProgress(sets), [
    { exerciseId: 18, name: 'Front Squat', unit: 'kg', first: 62.5, last: 67.5, best: 70, sessions: 3, lastDate: '2026-10-19T18:00:00Z' },
  ])
})
test('exerciseProgress mesure en reps sans charge, en secondes pour le gainage', () => {
  const sets = [
    log(10, 'Pull-up', 15, '2026-10-09T18:00:00Z', { reps: 8 }),
    log(10, 'Pull-up', 15, '2026-10-09T18:03:00Z', { reps: 7 }),
    log(10, 'Pull-up', 25, '2026-10-16T18:00:00Z', { reps: 10 }),
    log(11, 'Planche', 15, '2026-10-09T18:30:00Z', { durationSec: 45 }),
    log(11, 'Planche', 25, '2026-10-16T18:30:00Z', { durationSec: 60 }),
  ]
  const progress = exerciseProgress(sets)
  assert.deepEqual(progress.map(p => [p.name, p.unit, p.first, p.last]), [['Planche', 's', 45, 60], ['Pull-up', 'reps', 8, 10]])
})
test('exerciseProgress classe par séance la plus récente et ignore une série sans exercice', () => {
  const sets = [
    log(18, 'Front Squat', 11, '2026-10-05T18:00:00Z', { weightKg: 60, reps: 5 }),
    log(4, 'Romanian Deadlift', 21, '2026-10-12T18:00:00Z', { weightKg: 80, reps: 6 }),
    log(null, null, 21, '2026-10-12T18:10:00Z', { weightKg: 20, reps: 10 }),
  ]
  assert.deepEqual(exerciseProgress(sets).map(p => [p.name, p.sessions, p.first, p.last]), [['Romanian Deadlift', 1, 80, 80], ['Front Squat', 1, 60, 60]])
})
test('exerciseProgress rattache à son jour une série dont la séance a été supprimée, et nomme un exercice sans nom', () => {
  const sets = [
    log(18, null, null, '2026-10-05T18:00:00Z', { weightKg: 60, reps: 5 }),
    log(18, null, null, '2026-10-05T18:05:00Z', { weightKg: 65, reps: 5 }),
    log(18, null, null, '2026-10-12T18:00:00Z', { weightKg: 70, reps: 5 }),
  ]
  assert.deepEqual(exerciseProgress(sets).map(p => [p.name, p.sessions, p.first, p.last]), [['Exercice', 2, 65, 70]])
})
test('exerciseProgress renvoie une liste vide sans série', () => {
  assert.deepEqual(exerciseProgress([]), [])
})

// ── volume et formats ────────────────────────────────────────────────────────
test('totalVolumeKg additionne charge × reps, et rien pour une série sans charge ou en durée', () => {
  const sets = [
    log(18, 'Front Squat', 11, null, { weightKg: 60, reps: 5 }),
    log(18, 'Front Squat', 11, null, { weightKg: 62.5, reps: 5 }),
    log(10, 'Pull-up', 15, null, { reps: 8 }),
    log(11, 'Planche', 15, null, { weightKg: 5, durationSec: 45 }),
  ]
  assert.equal(totalVolumeKg(sets), 612.5)
  assert.equal(totalVolumeKg([]), 0)
})
test('formatHours écrit une durée en minutes puis en heures', () => {
  assert.equal(formatHours(0), '0 min')
  assert.equal(formatHours(45), '45 min')
  assert.equal(formatHours(60), '1 h')
  assert.equal(formatHours(580), '9 h 40')
  assert.equal(formatHours(605), '10 h 05')
})
test('formatTonnage passe en tonnes à partir de 1 000 kg', () => {
  assert.equal(formatTonnage(0), '0 kg')
  assert.equal(formatTonnage(850), '850 kg')
  assert.equal(formatTonnage(999.6), '1 t')
  assert.equal(formatTonnage(1250), '1,3 t')
  assert.equal(formatTonnage(14200), '14,2 t')
  assert.equal(formatTonnage(12000), '12 t')
})
