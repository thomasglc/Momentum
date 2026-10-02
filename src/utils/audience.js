// À qui s'adresse l'affichage (allures, repères « lui » ou « elle »), selon le format du plan.

/**
 * En double, le format décide. En solo, le même plan sert aux hommes et aux femmes :
 * c'est le genre du profil qui décide. Sans format, on garde le comportement du double mixte.
 */
export function audienceFor(planType, gender) {
  const type = planType ?? 'open_double_mixte'
  if (type === 'open_solo') {
    const elle = gender === 'femme'
    return { isSolo: true, isDuoMixte: false, showLui: !elle, showElle: elle }
  }
  return {
    isSolo: false,
    isDuoMixte: type === 'open_double_mixte',
    showLui: type !== 'open_double_women',
    showElle: type === 'open_double_mixte' || type === 'open_double_women',
  }
}
