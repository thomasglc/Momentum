// Déroulé d'une séance de muscu, fourni par SessionDetail à ses cartes d'exercice (provide / inject) :
//   sessionId     séance affichée
//   openLineId    exercice ouvert (un seul à la fois), ou null
//   revealLineId  exercice à ramener à l'écran après une ouverture
//   toggleLine(id)  ouvre ou replie un exercice
//   lineDone(id)    dernière série cochée, ou station d'un circuit faite : passe à la suite
//   restAfter(id)   repos à lancer après une série de cette ligne : { sec, label } (sec vaut 0 sans repos)
export const SESSION_FLOW = Symbol('sessionFlow')
