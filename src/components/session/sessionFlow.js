// Déroulé d'une séance de muscu, fourni par SessionDetail à ses cartes d'exercice (provide / inject) :
//   openLineId    exercice ouvert (un seul à la fois), ou null
//   revealLineId  exercice à ramener à l'écran après une ouverture
//   toggleLine(id)  ouvre ou replie un exercice
//   lineDone(id)    dernière série cochée : passe à l'exercice suivant
//   restLabel(id)   libellé du repos qui suit une série de cet exercice
export const SESSION_FLOW = Symbol('sessionFlow')
