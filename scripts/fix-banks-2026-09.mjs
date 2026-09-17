// Réparations des quatre banques multilingues (culture, manga, cinéma, code de
// la route), septembre 2026. Idempotent et rejouable : chaque étape vérifie
// l'état courant avant d'agir, relancer le script ne change rien de plus.
//
//   node scripts/fix-banks-2026-09.mjs          → applique et écrit
//   node scripts/fix-banks-2026-09.mjs --dry    → montre sans écrire
//
// Étapes, dans l'ordre :
//   a. retire le champ mort `tier` ;
//   b. réparations factuelles ciblées (le texte attendu est vérifié avant de
//      remplacer : un cas qui ne correspond plus est SIGNALÉ, pas forcé) ;
//   c. tutoiement → vouvoiement dans le code de la route (ton de l'examen) ;
//   d. tiret long (U+2014) → deux-points dans un titre, virgule ailleurs ;
//   e. première lettre des options en majuscule (sauf chiffre, symbole, ou
//      marque à casse mixte comme « eXistenZ ») ;
//   f. relabel facile/expert (règle et liste plus bas) ;
//   g. suppressions : tautologies, questions absurdes, doublons sémantiques
//      (pour chaque doublon, l'id gardé et la raison sont journalisés) ;
//   h. permutation des options avec correct recalculé, toutes langues
//      alignées, par mulberry32(hashString(id)) sur un ordre CANONIQUE
//      (options triées par texte FR normalisé) : le résultat ne dépend pas de
//      l'ordre courant, donc rejouer le script ne re-mélange rien.
//
// Journal : scripts/fix-banks-2026-09.log, régénéré à chaque exécution. Il
// décrit l'ÉTAT FINAL (chaque suppression, chaque réparation « en place »), pas
// les actions du passage, pour rester identique d'une exécution à l'autre. Ce
// qui a bougé pendant le passage est affiché en console.
//
// Mesures du premier passage (2026-09-07), pour mémoire :
//   · 320 champs `tier` retirés, 5 textes à tiret long, 12 options passées en
//     majuscule initiale, 33 réparations, 6 énoncés vouvoyés, 74 relabels ;
//   · 102 suppressions : culture 506 → 481, manga 505 → 481, cinéma 505 → 481,
//     code de la route 500 → 471 ;
//   · `correct` était en A dans 1 870 questions sur 2 016 (100 % du code).
//
// Ce que ce script ne fait PAS : réécrire les distracteurs du code de la route
// (un atelier parallèle s'en charge par id, en retrouvant la bonne réponse par
// son texte) ni toucher à panneaux-quiz.json (régénéré ailleurs).

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalise, hashString, mulberry32, TIRET_LONG } from './lib/qa.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CONTENT = join(ROOT, 'src', 'content')
const LOG = join(ROOT, 'scripts', 'fix-banks-2026-09.log')
const BANQUES = ['culture-generale', 'manga-anime', 'cinema-series', 'code-route']

// ---------------------------------------------------------------------------
// Helpers purs (exportés pour les tests)
// ---------------------------------------------------------------------------

// Permute les options d'une question, toutes langues et `optionImages`
// alignées sur les positions FR, et recalcule `correct`. Renvoie une COPIE.
//
// Déterministe ET indépendant de l'ordre courant : on part de l'ordre
// canonique (indices FR triés par texte normalisé, les options FR étant
// uniques), puis un Fisher-Yates alimenté par mulberry32(hashString(id)).
export function permuteOptions(q) {
  const fr = q?.options?.fr
  if (!Array.isArray(fr) || fr.length !== 4 || !Number.isInteger(q.correct)) return q
  const canon = fr
    .map((o, i) => ({ i, cle: normalise(o), brut: String(o) }))
    .sort((a, b) => (a.cle < b.cle ? -1 : a.cle > b.cle ? 1 : a.brut < b.brut ? -1 : a.brut > b.brut ? 1 : 0))
    .map((x) => x.i)
  const alea = mulberry32(hashString(q.id))
  const ordre = [...canon]
  for (let i = ordre.length - 1; i > 0; i--) {
    const j = Math.floor(alea() * (i + 1))
    ;[ordre[i], ordre[j]] = [ordre[j], ordre[i]]
  }
  // ordre[k] = indice d'origine de l'option placée en position k
  const options = {}
  for (const [lang, liste] of Object.entries(q.options)) {
    options[lang] = Array.isArray(liste) && liste.length === 4 ? ordre.map((i) => liste[i]) : liste
  }
  const sortie = { ...q, options, correct: ordre.indexOf(q.correct) }
  if (Array.isArray(q.optionImages) && q.optionImages.length === 4) {
    sortie.optionImages = ordre.map((i) => q.optionImages[i])
  }
  return sortie
}

// Met en majuscule la première lettre d'une option. Ne touche pas aux textes
// qui commencent par un chiffre ou un symbole, ni aux marques à casse mixte
// (« eXistenZ », « iPhone » : minuscule suivie d'une majuscule).
export function majusculeInitiale(texte) {
  const s = String(texte ?? '')
  const m = s.match(/^(\s*)(\p{Ll})(.?)/u)
  if (!m) return s
  if (m[3] && /\p{Lu}/u.test(m[3])) return s
  return m[1] + m[2].toLocaleUpperCase('fr') + s.slice(m[1].length + m[2].length)
}

// Remplace chaque tiret long : par « : » dans un titre (option, ou texte entre
// guillemets « » / " "), par une virgule ailleurs. Les espaces autour du tiret
// sont absorbés : « E.T. [U+2014] O Extraterrestre » → « E.T.: O Extraterrestre »,
// « très peu [U+2014] ce qui a fait » → « très peu, ce qui a fait ».
export function remplaceTiretLong(texte, { titre = false } = {}) {
  const s = String(texte ?? '')
  if (!s.includes(TIRET_LONG)) return s
  let sortie = ''
  let i = 0
  while (i < s.length) {
    const ch = s[i]
    if (ch !== TIRET_LONG) {
      sortie += ch
      i++
      continue
    }
    const ouverts = (sortie.match(/«/g) || []).length - (sortie.match(/»/g) || []).length
    const droits = (sortie.match(/"/g) || []).length % 2 === 1
    const dansTitre = titre || ouverts > 0 || droits
    sortie = sortie.replace(/[\s ]+$/, '')
    i++
    while (s[i] === ' ' || s[i] === ' ') i++
    sortie += dansTitre ? ': ' : ', '
  }
  return sortie
}

// Parcourt tous les textes affichés d'une question (question, options,
// explication, toutes langues) et applique `fn(texte, { option })`.
export function surTousLesTextes(q, fn) {
  for (const champ of ['question', 'explanation']) {
    const valeurs = q[champ]
    if (!valeurs || typeof valeurs !== 'object') continue
    for (const lang of Object.keys(valeurs)) valeurs[lang] = fn(valeurs[lang], { option: false })
  }
  if (q.options && typeof q.options === 'object') {
    for (const lang of Object.keys(q.options)) {
      if (Array.isArray(q.options[lang])) q.options[lang] = q.options[lang].map((o) => fn(o, { option: true }))
    }
  }
}

// ---------------------------------------------------------------------------
// b. Réparations factuelles. Chaque entrée : { id, quoi, avant(q), apres(q),
//    applique(q) }. `apres` vrai → déjà faite ; sinon `avant` vrai → appliquée ;
//    sinon le texte ne correspond plus à ce qui a été vérifié → INATTENDU.
// ---------------------------------------------------------------------------
const REPARATIONS = [
  {
    id: 'route_0248',
    quoi: 'alcool transport en commun : 0,2 g/L (R234-1 II), pas 0 g/L',
    avant: (q) => q.question.fr.includes('0 g/L'),
    apres: (q) => q.question.fr.includes('0,2 g/L'),
    applique: (q) => {
      q.question.fr =
        "Pour quels conducteurs le taux d'alcool maximal est-il abaissé à 0,2 g/L de sang, comme pour un permis probatoire ?"
      q.explanation.fr =
        "Conducteurs de bus, d'autocars et jeunes permis sont soumis au même seuil de 0,2 g/L de sang (article R234-1 du Code de la route), soit pratiquement zéro verre ; les autres conducteurs restent à 0,5 g/L."
    },
  },
  {
    id: 'cinema_0459',
    quoi: 'Dexter est analyste de traces de sang, pas professeur de littérature (aligné sur EN)',
    avant: (q) => q.question.fr.includes('professeur de littérature'),
    apres: (q) => q.question.fr.includes('traces de sang'),
    applique: (q) => {
      q.question.fr =
        "Quelle série met en scène un expert en traces de sang devenu tueur en série qui s'attaque uniquement aux criminels ?"
    },
  },
  {
    id: 'cinema_0466',
    quoi: 'Snowfall : épidémie de crack à Los Angeles, pas un groupe de rap (aligné sur EN)',
    avant: (q) => q.question.fr.includes('groupe de rap'),
    apres: (q) => q.question.fr.includes('crack'),
    applique: (q) => {
      q.question.fr =
        "Quelle série retrace l'explosion du crack et la naissance d'un empire de la drogue à Los Angeles dans les années 1980 ?"
    },
  },
  {
    id: 'cinema_0376',
    quoi: 'Jane Campion est réalisatrice néo-zélandaise, pas actrice française (aligné sur EN)',
    avant: (q) => q.question.fr.includes('actrice française'),
    apres: (q) => q.question.fr.startsWith('Quelle réalisatrice'),
    applique: (q) => {
      q.question.fr = "Quelle réalisatrice a reçu la Palme d'or en 1993 pour « La Leçon de piano » ?"
    },
  },
  {
    id: 'cinema_0341',
    quoi: 'The Killing est une série danoise (scandinave), pas allemande ni française (aligné sur EN)',
    avant: (q) => q.question.fr.includes('allemande, française et scandinave'),
    apres: (q) => q.question.fr.startsWith('Quelle série scandinave'),
    applique: (q) => {
      q.question.fr = 'Quelle série scandinave a lancé la mode du « polar nordique » à la télévision européenne ?'
    },
  },
  {
    id: 'cinema_0340',
    quoi: 'Agnès Varda est cinéaste, pas actrice (les 4 langues)',
    avant: (q) => q.question.fr.includes('actrice française'),
    apres: (q) => q.question.fr.includes('cinéaste française'),
    applique: (q) => {
      q.question.fr = "Quelle cinéaste française a reçu un Oscar d'honneur en 2017 pour l'ensemble de sa carrière ?"
      q.question.en = 'Which French filmmaker received an Honorary Oscar in 2017 for her career?'
      q.question.es = '¿Qué cineasta francesa recibió el Óscar honorífico en 2017 por su carrera?'
      q.question.pt = 'Que cineasta francesa recebeu o Oscar honorário em 2017 pela carreira?'
    },
  },
  {
    id: 'cinema_0314',
    quoi: 'explication : Marty (1955) cumulait déjà Palme et Oscar ; Parasite est le premier film non anglophone oscarisé',
    avant: (q) => q.explanation.fr.includes('premier réalisateur à remporter la Palme'),
    apres: (q) => q.explanation.fr.includes('langue non anglaise'),
    applique: (q) => {
      q.explanation.fr = "« Parasite » (2019) est le premier film en langue non anglaise à remporter l'Oscar du meilleur film."
      q.explanation.en = '"Parasite" (2019) is the first non-English-language film to win the Best Picture Oscar.'
      q.explanation.es = '«Parásitos» (2019) es la primera película de habla no inglesa en ganar el Óscar a mejor película.'
      q.explanation.pt = '«Parasita» (2019) é o primeiro filme em língua não inglesa a ganhar o Oscar de melhor filme.'
    },
  },
  {
    id: 'route_0507',
    quoi: 'explication : franchir un passage à niveau fermé est une contravention de 4e classe, pas un délit',
    avant: (q) => q.explanation.fr.includes('est un délit'),
    apres: (q) => q.explanation.fr.includes('contravention de 4e classe'),
    applique: (q) => {
      q.explanation.fr =
        "Franchir un passage à niveau dont les barrières sont fermées ou en mouvement est une contravention de 4e classe : 135 € d'amende et retrait de 4 points."
    },
  },
  {
    id: 'manga_0508',
    quoi: 'Inumaki a des yeux : il parle avec des ingrédients d onigiri (aligné sur EN)',
    avant: (q) => q.question.fr.includes('né sans yeux'),
    apres: (q) => q.question.fr.includes('onigiri'),
    applique: (q) => {
      q.question.fr = "Dans « Jujutsu Kaisen », quel personnage s'exprime uniquement avec des ingrédients d'onigiri ?"
    },
  },
  {
    id: 'manga_0511',
    quoi: 'Anohana et Ano Hi Mita Hana sont la même œuvre : 2e titre remplacé (aligné sur EN)',
    avant: (q) => q.question.fr.includes('« Ano Hi Mita Hana »'),
    apres: (q) => q.question.fr.includes('The Anthem of the Heart'),
    applique: (q) => {
      q.question.fr = 'Quel studio a produit « Anohana » et « The Anthem of the Heart » ?'
    },
  },
  {
    id: 'manga_0483',
    quoi: 'Panda est en deuxième année ; énoncé réécrit sans citer la réponse (les 4 langues)',
    avant: (q) => q.question.fr.includes('première année'),
    apres: (q) => q.question.fr.includes('deuxième année'),
    applique: (q) => {
      q.question.fr = "Dans « Jujutsu Kaisen », lequel de ces élèves de deuxième année n'est pas un être humain ?"
      q.question.en = 'In "Jujutsu Kaisen", which of these second-year students is not a human being?'
      q.question.es = 'En «Jujutsu Kaisen», ¿cuál de estos estudiantes de segundo año no es un ser humano?'
      q.question.pt = 'Em «Jujutsu Kaisen», qual destes estudantes do segundo ano não é um ser humano?'
    },
  },
  {
    id: 'manga_0335',
    quoi: 'Fruits Basket (2019) est de TMS, pas de A-1 Pictures : remplacé par Erased (A-1 Pictures)',
    avant: (q) => Object.values(q.question).some((t) => t.includes('Fruits Basket')),
    apres: (q) => Object.values(q.question).every((t) => t.includes('Erased') && !t.includes('2019')),
    applique: (q) => {
      for (const lang of Object.keys(q.question)) {
        q.question[lang] = q.question[lang]
          .replace(/«\s*Fruits Basket\s*»\s*\(2019\)/, '« Erased »') // guillemets français (fr, es, pt)
          .replace(/"Fruits Basket"\s*\(2019\)/, '"Erased"') // guillemets droits (en)
      }
    },
  },
  {
    id: 'manga_0335',
    quoi: 'ES/PT : guillemets «Erased» sans espaces intérieurs, comme le reste de la phrase',
    avant: (q) => /«\s+Erased\s+»/.test(q.question.es + q.question.pt),
    apres: (q) => !/«\s+Erased\s+»/.test(q.question.es + q.question.pt),
    applique: (q) => {
      for (const lang of ['es', 'pt']) q.question[lang] = q.question[lang].replace(/«\s+Erased\s+»/, '«Erased»')
    },
  },
  {
    id: 'manga_0504',
    quoi: 'Zankyou = Terror in Resonance (deux options identiques) : distracteur remplacé',
    avant: (q) => q.options.fr.includes('Zankyou'),
    apres: (q) => q.options.fr.includes('Aldnoah.Zero'),
    applique: (q) => {
      for (const lang of Object.keys(q.options)) {
        q.options[lang] = q.options[lang].map((o) => (o === 'Zankyou' ? 'Aldnoah.Zero' : o))
      }
    },
  },
  {
    id: 'manga_0500',
    quoi: 'Higurashi date de 2006 : « 2011 » retiré des traductions',
    avant: (q) => /2011/.test(q.question.en),
    apres: (q) => !/2011/.test(q.question.en + q.question.es + q.question.pt),
    applique: (q) => {
      q.question.en = 'Which anime centres on a curse tied to a rural village and a summer visit?'
      q.question.es = '¿Qué anime gira en torno a una maldición en un pueblo rural y una visita de verano?'
      q.question.pt = 'Que anime gira em torno de uma maldição numa aldeia rural e uma visita de verão?'
    },
  },
  {
    id: 'manga_0324',
    quoi: 'explication FR reformulée (tournure inversée peu naturelle)',
    avant: (q) => q.explanation.fr.startsWith('De Gainax sont ensuite issus'),
    apres: (q) => q.explanation.fr.includes('sont nés plus tard'),
    applique: (q) => {
      q.explanation.fr = "Studio Khara (fondé par Hideaki Anno) et Studio Trigger sont nés plus tard d'anciens de Gainax."
    },
  },
  {
    id: 'manga_0477',
    quoi: 'explication FR reformulée',
    avant: (q) => q.explanation.fr.includes("qu'il nomme « revival »"),
    apres: (q) => q.explanation.fr.includes('le ramène'),
    applique: (q) => {
      q.explanation.fr = "Ce phénomène, qu'il appelle « Revival », le ramène parfois dix-huit ans en arrière."
    },
  },
  {
    id: 'route_0353',
    quoi: 'tautologie : la réponse (80 km/h) figurait entre parenthèses dans l énoncé',
    avant: (q) => q.question.fr.includes('(généralement 80 km/h)'),
    apres: (q) => !q.question.fr.includes('généralement'),
    applique: (q) => {
      q.question.fr =
        'Sur une route hors agglomération à double sens sans séparateur central, quelle est la vitesse maximale par temps de pluie ?'
    },
  },
  {
    id: 'route_0415',
    quoi: 'tautologie (« par an » dans l énoncé et la réponse) et formulation bancale',
    avant: (q) => q.question.fr.includes('rémunérateur en points'),
    apres: (q) => q.question.fr.includes('fréquence'),
    applique: (q) => {
      q.question.fr =
        'À quelle fréquence maximale un stage de sensibilisation permet-il de récupérer des points sur le permis ?'
    },
  },
  {
    id: 'manga_0134',
    quoi: 'tautologie : « One Piece » dans l énoncé (les 4 langues)',
    avant: (q) => q.question.fr.includes('« One Piece »'),
    apres: (q) => q.question.fr.includes('Gol D. Roger'),
    applique: (q) => {
      q.question.fr = "Comment s'appelle le trésor légendaire laissé par Gol D. Roger, que tous les pirates recherchent ?"
      q.question.en = 'What is the legendary treasure left by Gol D. Roger, which every pirate seeks, called?'
      q.question.es = '¿Cómo se llama el tesoro legendario dejado por Gol D. Roger que todos los piratas buscan?'
      q.question.pt = 'Como se chama o tesouro lendário deixado por Gol D. Roger que todos os piratas procuram?'
    },
  },
  {
    id: 'manga_0005',
    quoi: 'tautologie : « Death Note » dans l énoncé (les 4 langues)',
    avant: (q) => q.question.fr.startsWith('Dans « Death Note »'),
    apres: (q) => q.question.fr.includes('Light Yagami'),
    applique: (q) => {
      q.question.fr = 'Quel cahier permet à Light Yagami de tuer quiconque dont il y inscrit le nom ?'
      q.question.en = 'Which notebook lets Light Yagami kill anyone whose name he writes in it?'
      q.question.es = '¿Qué cuaderno permite a Light Yagami matar a cualquiera cuyo nombre escriba en él?'
      q.question.pt = 'Que caderno permite a Light Yagami matar qualquer pessoa cujo nome ele escreva nele?'
    },
  },
  {
    id: 'manga_0007',
    quoi: 'tautologie : « Titans » dans le titre cité (les 4 langues)',
    avant: (q) => q.question.fr.includes("« L'Attaque des Titans »"),
    apres: (q) => q.question.fr.includes('Isayama'),
    applique: (q) => {
      q.question.fr =
        "Dans l'œuvre de Hajime Isayama, contre quelles créatures géantes l'humanité se bat-elle derrière ses murs ?"
      q.question.en = "In Hajime Isayama's series, which giant creatures does humanity fight from behind its walls?"
      q.question.es = 'En la obra de Hajime Isayama, ¿contra qué criaturas gigantes lucha la humanidad tras sus muros?'
      q.question.pt = 'Na obra de Hajime Isayama, contra que criaturas gigantes a humanidade luta atrás de seus muros?'
    },
  },
  {
    id: 'manga_0021',
    quoi: 'tautologie : « Fairy Tail » dans l énoncé (les 4 langues)',
    avant: (q) => q.question.fr.includes('« Fairy Tail »'),
    apres: (q) => q.question.fr.includes('Natsu'),
    applique: (q) => {
      q.question.fr = 'À quelle guilde de magiciens appartiennent Natsu Dragnir et Lucy Heartfilia ?'
      q.question.en = "Which wizards' guild do Natsu Dragneel and Lucy Heartfilia belong to?"
      q.question.es = '¿A qué gremio de magos pertenecen Natsu Dragneel y Lucy Heartfilia?'
      q.question.pt = 'A que guilda de magos pertencem Natsu Dragneel e Lucy Heartfilia?'
    },
  },
  {
    id: 'manga_0234',
    quoi: 'tautologie : « Code Geass » dans l énoncé (les 4 langues)',
    avant: (q) => q.question.fr.startsWith('Dans Code Geass'),
    apres: (q) => q.question.fr.includes('Lamperouge'),
    applique: (q) => {
      q.question.fr = "Comment s'appelle le pouvoir que Lelouch Lamperouge reçoit de C.C. ?"
      q.question.en = 'What is the name of the power Lelouch Lamperouge receives from C.C.?'
      q.question.es = '¿Cómo se llama el poder que Lelouch Lamperouge recibe de C.C.?'
      q.question.pt = 'Qual é o nome do poder que Lelouch Lamperouge recebe de C.C.?'
    },
  },
  {
    id: 'manga_0268',
    quoi: 'tautologie : « Kuroko s Basket » dans l énoncé (les 4 langues, explication déplacée)',
    avant: (q) => q.question.fr.includes("« Kuroko's Basket »"),
    apres: (q) => q.question.fr.includes('Tetsuya'),
    applique: (q) => {
      q.question.fr = 'Quel sport pratique Tetsuya Kuroko, le « joueur fantôme » de la Génération des Miracles ?'
      q.question.en = 'Which sport does Tetsuya Kuroko, the "phantom player" of the Generation of Miracles, play?'
      q.question.es = '¿Qué deporte practica Tetsuya Kuroko, el «jugador fantasma» de la Generación de los Milagros?'
      q.question.pt = 'Que esporte pratica Tetsuya Kuroko, o «jogador fantasma» da Geração dos Milagres?'
      q.explanation.fr = "Dans « Kuroko's Basket », Kuroko mise sur la passe et la discrétion plutôt que sur la puissance."
      q.explanation.en = 'In "Kuroko\'s Basketball", Kuroko relies on passing and misdirection rather than power.'
      q.explanation.es = 'En «Kuroko no Basket», Kuroko apuesta por el pase y la discreción más que por la potencia.'
      q.explanation.pt = 'Em «Kuroko no Basket», Kuroko aposta no passe e na discrição em vez da potência.'
    },
  },
  {
    id: 'culture_0476',
    quoi: 'tautologie : « stade » et « France » dans l énoncé (les 4 langues, explication déplacée)',
    avant: (q) => q.question.fr.includes('plus grand stade de France'),
    apres: (q) => q.question.fr.includes('Hexagone'),
    applique: (q) => {
      q.question.fr = "Quel stade, construit à Saint-Denis pour la Coupe du monde 1998, est le plus grand de l'Hexagone ?"
      q.question.en = 'Which stadium, built in Saint-Denis for the 1998 World Cup, is the largest in the country?'
      q.question.es = '¿Qué estadio, construido en Saint-Denis para el Mundial de 1998, es el más grande del país?'
      q.question.pt = 'Que estádio, construído em Saint-Denis para a Copa do Mundo de 1998, é o maior do país?'
      q.explanation.fr = 'Il accueille plus de 80 000 spectateurs pour le football, le rugby et les grands concerts.'
      q.explanation.en = 'It holds over 80,000 spectators for football, rugby and major concerts.'
      q.explanation.es = 'Acoge a más de 80 000 espectadores para fútbol, rugby y grandes conciertos.'
      q.explanation.pt = 'Recebe mais de 80 000 espectadores para futebol, rúgbi e grandes shows.'
    },
  },
  {
    id: 'culture_0508',
    quoi: 'absurde : « quelle plante produit le lin ? → le lin » (les 4 langues)',
    avant: (q) => q.question.fr.includes('fibres du lin'),
    apres: (q) => q.question.fr.includes('fleurs bleues'),
    applique: (q) => {
      q.question.fr =
        'Quelle plante aux fleurs bleues, dont la France est le premier producteur mondial, fournit une fibre textile réputée ?'
      q.question.en =
        "Which blue-flowered plant, of which France is the world's leading producer, yields a prized textile fibre?"
      q.question.es =
        '¿Qué planta de flores azules, de la que Francia es el primer productor mundial, da una fibra textil apreciada?'
      q.question.pt =
        'Que planta de flores azuis, da qual a França é o maior produtor mundial, fornece uma fibra têxtil valorizada?'
      q.explanation.fr = 'Le lin textile est surtout cultivé en Normandie ; sa fibre donne un tissu léger et résistant.'
      q.explanation.en = 'Textile flax is grown mainly in Normandy; its fibre makes a light, hard-wearing linen cloth.'
      q.explanation.es = 'El lino textil se cultiva sobre todo en Normandía; su fibra da un tejido ligero y resistente.'
      q.explanation.pt = 'O linho têxtil é cultivado sobretudo na Normandia; sua fibra dá um tecido leve e resistente.'
    },
  },
  {
    id: 'cinema_0154',
    quoi: 'tautologie : « la Bête » dans le titre cité (les 4 langues)',
    avant: (q) => q.question.fr.includes('« La Belle et la Bête »'),
    apres: (q) => q.question.fr.includes('1991'),
    applique: (q) => {
      q.question.fr =
        'Dans le classique Disney de 1991 où Belle rencontre un prince maudit, en quoi ce dernier a-t-il été transformé ?'
      q.question.en = 'In the 1991 Disney classic where Belle meets a cursed prince, what has he been turned into?'
      q.question.es =
        'En el clásico de Disney de 1991 en el que Bella conoce a un príncipe maldito, ¿en qué ha sido convertido?'
      q.question.pt =
        'No clássico da Disney de 1991 em que Bela conhece um príncipe amaldiçoado, em que ele foi transformado?'
    },
  },
  {
    id: 'cinema_0290',
    quoi: 'tautologie : « 1917 » dans l énoncé (les 4 langues)',
    avant: (q) => q.question.fr.includes('deux soldats de 1917'),
    apres: (q) => !q.question.fr.includes('1917'),
    applique: (q) => {
      q.question.fr = 'Quel film de guerre de Sam Mendes (2019) est monté pour ressembler à un unique plan-séquence ?'
      q.question.en = 'Which Sam Mendes war film (2019) is edited to look like a single continuous shot?'
      q.question.es = '¿Qué película bélica de Sam Mendes (2019) está montada para parecer un único plano secuencia?'
      q.question.pt = 'Que filme de guerra de Sam Mendes (2019) é montado para parecer um único plano-sequência?'
    },
  },
  {
    id: 'cinema_0409',
    quoi: 'tautologie : « dictateur » dans l énoncé (les 4 langues)',
    avant: (q) => q.question.fr.includes('tourne en dérision un dictateur'),
    apres: (q) => q.question.fr.includes('Hynkel'),
    applique: (q) => {
      q.question.fr = "Dans quel film de 1940 Chaplin parodie-t-il Hitler sous les traits d'Adenoid Hynkel ?"
      q.question.en = 'In which 1940 film does Chaplin parody Hitler as Adenoid Hynkel?'
      q.question.es = '¿En qué película de 1940 Chaplin parodia a Hitler con el nombre de Adenoid Hynkel?'
      q.question.pt = 'Em que filme de 1940 Chaplin parodia Hitler com o nome de Adenoid Hynkel?'
    },
  },
  {
    id: 'cinema_0432',
    quoi: 'tautologie : « Guillermo del Toro » et « Pinocchio » dans l énoncé (les 4 langues, explication déplacée)',
    avant: (q) => q.question.fr.startsWith("Quel film d'animation de Guillermo del Toro"),
    apres: (q) => q.question.fr.includes('Collodi'),
    applique: (q) => {
      q.question.fr =
        "Quel film d'animation en volume, oscarisé en 2023, transpose le conte de Collodi dans l'Italie fasciste ?"
      q.question.en = "Which stop-motion film, an Oscar winner in 2023, sets Collodi's tale in Fascist Italy?"
      q.question.es =
        '¿Qué película de animación en volumen, ganadora del Óscar en 2023, sitúa el cuento de Collodi en la Italia fascista?'
      q.question.pt =
        'Que filme de animação em stop-motion, vencedor do Oscar em 2023, situa o conto de Collodi na Itália fascista?'
      q.explanation.fr =
        "Guillermo del Toro et Mark Gustafson situent l'histoire sous Mussolini ; le film est sorti sur Netflix fin 2022."
      q.explanation.en =
        'Guillermo del Toro and Mark Gustafson set the story under Mussolini; the film came out on Netflix in late 2022.'
      q.explanation.es =
        'Guillermo del Toro y Mark Gustafson sitúan la historia bajo Mussolini; la película se estrenó en Netflix a finales de 2022.'
      q.explanation.pt =
        'Guillermo del Toro e Mark Gustafson situam a história sob Mussolini; o filme estreou na Netflix no fim de 2022.'
    },
  },
  {
    id: 'culture_0469',
    quoi: 'EN : « (10⁹) » retiré (nombre présent en EN seulement)',
    avant: (q) => q.question.en.includes('(10⁹)'),
    apres: (q) => !q.question.en.includes('10⁹'),
    applique: (q) => {
      q.question.en = 'How many zeros are in one billion?'
    },
  },
  {
    id: 'cinema_0336',
    quoi: 'PT : « 017 » → « 007 » dans le titre de « Dangereusement vôtre »',
    avant: (q) => q.explanation.pt.includes('«017'),
    apres: (q) => q.explanation.pt.includes('«007: Alvo em Movimento»'),
    applique: (q) => {
      q.explanation.pt = q.explanation.pt.replace(
        new RegExp(`«017\\s*${TIRET_LONG}\\s*Alvo em Movimento»`),
        '«007: Alvo em Movimento»',
      )
    },
  },
]

// ---------------------------------------------------------------------------
// c. Tutoiement → vouvoiement (code de la route, ton de l'examen). Chaque
//    entrée : énoncé avant → après, et remplacements d'options si elles
//    tutoient aussi. route_0176 n'est pas listée : supprimée (doublon de 0369).
//    route_0218, 0329, 0354 (signalées) ne tutoient pas à la vérification.
// ---------------------------------------------------------------------------
const VOUVOIEMENT = [
  {
    id: 'route_0206',
    avant: "Avant d'ouvrir ta portière après t'être garé, que dois-tu vérifier ?",
    apres: "Avant d'ouvrir votre portière après vous être garé, que devez-vous vérifier ?",
  },
  {
    id: 'route_0211',
    avant: "Si tu as consommé de l'alcool, quelle est la bonne décision ?",
    apres: "Si vous avez consommé de l'alcool, quelle est la bonne décision ?",
  },
  {
    id: 'route_0241',
    avant: 'Si une moto veut te dépasser, que faut-il faire ?',
    apres: 'Si une moto veut vous dépasser, que faut-il faire ?',
  },
  {
    id: 'route_0245',
    avant: 'Que faire si une ambulance arrive derrière toi, sirène allumée, à un feu rouge ?',
    apres: 'Que faire si une ambulance arrive derrière vous, sirène allumée, à un feu rouge ?',
  },
  {
    id: 'route_0292',
    avant: 'Si un véhicule te suit de très près (te « colle »), que faire ?',
    apres: 'Si un véhicule vous suit de très près (vous « colle »), que faire ?',
    options: {
      'Augmenter ta distance avec le véhicule devant toi': 'Augmenter votre distance avec le véhicule qui vous précède',
      'Te déporter à gauche': 'Vous déporter à gauche',
    },
  },
  {
    id: 'route_0369',
    avant: "Si tu rates ta sortie d'autoroute, que dois-tu faire ?",
    apres: "Si vous ratez votre sortie d'autoroute, que devez-vous faire ?",
  },
]

// ---------------------------------------------------------------------------
// f. Relabel facile/expert. Règle :
//    · expert → facile quand la réponse relève de la culture scolaire ou du
//      grand public (capitale d'un grand pays, monnaie majeure, date-repère,
//      auteur d'un classique, héros d'une saga vue par tous) ;
//    · facile → expert quand la réponse demande un chiffre précis ou un savoir
//      de spécialiste (47 cordes d'une harpe, l'Aconcagua, Phobos, le cyan).
// ---------------------------------------------------------------------------
const VERS_FACILE = [
  'culture_0027', 'culture_0029', 'culture_0031', 'culture_0035', 'culture_0036', 'culture_0038',
  'culture_0039', 'culture_0044', 'culture_0045', 'culture_0047', 'culture_0048', 'culture_0090',
  'culture_0091', 'culture_0092', 'culture_0110', 'culture_0111', 'culture_0129', 'culture_0131',
  'culture_0134', 'culture_0150', 'culture_0152', 'culture_0165', 'culture_0183', 'culture_0359',
  'culture_0360', 'culture_0361',
  'cinema_0041', 'cinema_0043', 'cinema_0044', 'cinema_0048', 'cinema_0050', 'cinema_0090',
  'cinema_0091', 'cinema_0093', 'cinema_0108', 'cinema_0109', 'cinema_0127', 'cinema_0130',
  'cinema_0144', 'cinema_0148', 'cinema_0151', 'cinema_0164', 'cinema_0166', 'cinema_0167',
  'cinema_0186', 'cinema_0368',
  'manga_0027', 'manga_0028', 'manga_0032', 'manga_0037', 'manga_0043', 'manga_0046',
  'manga_0048', 'manga_0093', 'manga_0095', 'manga_0116', 'manga_0134', 'manga_0147',
  'manga_0149', 'manga_0150', 'manga_0165',
]
const VERS_EXPERT = [
  'culture_0193', 'culture_0297', 'culture_0310', 'culture_0384', 'culture_0389', 'culture_0427',
  'culture_0433', 'culture_0437', 'culture_0439', 'culture_0483',
  'cinema_0355', 'cinema_0432',
  'manga_0477',
]

// ---------------------------------------------------------------------------
// g. Suppressions : { id, garde (id conservé à la place, ou null), raison }.
//    Planchers : chaque banque ≥ 480 questions (code de la route ≥ 450).
// ---------------------------------------------------------------------------
const D = (id, garde, raison) => ({ id, garde, raison })
const SUPPRESSIONS = [
  // culture-generale : 14 doublons + 11 questions absurdes = 25 (506 → 481)
  D('culture_0022', 'culture_0213', 'doublon sémantique : le cœur pompe le sang'),
  D('culture_0041', 'culture_0307', 'doublon sémantique : le fémur, os le plus long'),
  D('culture_0046', 'culture_0220', 'doublon sémantique : Darwin et la sélection naturelle'),
  D('culture_0050', 'culture_0214', 'doublon sémantique : le CO2 absorbé par la photosynthèse'),
  D('culture_0074', 'culture_0251', 'doublon sémantique : Fleming et la pénicilline'),
  D('culture_0094', 'culture_0225', 'doublon sémantique : Michel-Ange et la chapelle Sixtine'),
  D('culture_0101', 'culture_0319', 'doublon sémantique : 2, plus petit / seul nombre premier pair'),
  D('culture_0112', 'culture_0227', 'doublon sémantique : Van Gogh et La Nuit étoilée'),
  D('culture_0132', 'culture_0216', 'doublon sémantique : 206 os'),
  D('culture_0175', 'culture_0057', 'doublon sémantique : 6 pattes (coccinelle / insecte)'),
  D('culture_0188', 'culture_0247', 'doublon sémantique : Edison et l ampoule'),
  D('culture_0192', 'culture_0080', 'doublon sémantique : Auguste, premier empereur romain'),
  D('culture_0391', 'culture_0261', 'doublon sémantique : 4 cordes (basse / ukulélé / violon)'),
  D('culture_0018', 'culture_0215', 'doublon sémantique : la baleine bleue, plus grand animal'),
  D('culture_0064', null, 'absurde : « Sur quelle planète vivons-nous ? »'),
  D('culture_0086', null, 'absurde : table de multiplication (7 × 8)'),
  D('culture_0089', null, 'absurde : minutes dans deux heures'),
  D('culture_0299', null, 'absurde : calcul de pourcentage (15 % de 200)'),
  D('culture_0141', null, 'absurde : jours dans une semaine'),
  D('culture_0054', null, 'absurde : minutes dans une heure'),
  D('culture_0138', null, 'absurde : secondes dans une minute'),
  D('culture_0118', null, 'absurde : minutes dans une demi-heure'),
  D('culture_0156', null, 'absurde : doigts sur deux mains'),
  D('culture_0011', null, 'absurde : doigts d une main'),
  D('culture_0154', null, 'absurde : pattes d un chat'),
  // manga-anime : 24 doublons (505 → 481)
  D('manga_0118', 'manga_0002', 'doublon sémantique : Konoha, village de Naruto'),
  D('manga_0014', 'manga_0224', 'doublon sémantique : Usagi Tsukino'),
  D('manga_0022', 'manga_0211', 'doublon sémantique : Miyazaki et Le Voyage de Chihiro'),
  D('manga_0098', 'manga_0038', 'doublon sémantique : Miyazaki et Princesse Mononoké'),
  D('manga_0026', 'manga_0194', 'doublon sémantique : le Gomu Gomu no Mi'),
  D('manga_0030', 'manga_0254', 'doublon sémantique : Ufotable et Demon Slayer'),
  D('manga_0071', 'manga_0128', 'doublon sémantique : le Chidori'),
  D('manga_0072', 'manga_0405', 'doublon sémantique : Bones et FMA Brotherhood'),
  D('manga_0080', 'manga_0202', 'doublon sémantique : les Vikings de Vinland Saga'),
  D('manga_0090', 'manga_0245', 'doublon sémantique : Eiichiro Oda'),
  D('manga_0096', 'manga_0375', 'doublon sémantique : Muzan Kibutsuji'),
  D('manga_0109', 'manga_0351', 'doublon sémantique : l Akatsuki'),
  D('manga_0113', 'manga_0497', 'doublon sémantique : Yusuke Murata'),
  D('manga_0132', 'manga_0346', 'doublon sémantique : Satoru Gojo et son bandeau'),
  D('manga_0137', 'manga_0381', 'doublon sémantique : Inosuke et sa tête de sanglier'),
  D('manga_0166', 'manga_0281', 'doublon sémantique : Makoto Shinkai et Your Name'),
  D('manga_0219', 'manga_0325', 'doublon sémantique : Joe Hisaishi'),
  D('manga_0489', 'manga_0292', 'doublon sémantique : Kyoto Animation (A Silent Voice, cf. aussi manga_0229)'),
  D('manga_0378', 'manga_0255', 'doublon sémantique : doujinshi'),
  D('manga_0087', 'manga_0048', 'doublon sémantique : le lycée U.A. (et « village » erroné)'),
  D('manga_0192', 'manga_0008', 'doublon sémantique : les Alters (VF officielle, pas « Dons »)'),
  D('manga_0018', 'manga_0193', 'doublon sémantique : les Hollows'),
  D('manga_0069', 'manga_0320', 'doublon sémantique : Yoshihiro Togashi'),
  D('manga_0073', 'manga_0210', 'doublon sémantique : Kentaro Miura'),
  // cinema-series : 23 doublons + 1 tautologie = 24 (505 → 481)
  D('cinema_0115', 'cinema_0225', 'doublon sémantique : Pixar et Toy Story'),
  D('cinema_0007', 'cinema_0440', 'doublon sémantique : « Vers l infini et au-delà »'),
  D('cinema_0010', 'cinema_0356', 'doublon sémantique : Succession'),
  D('cinema_0011', 'cinema_0107', 'doublon sémantique : Shrek, l ogre vert'),
  D('cinema_0016', 'cinema_0248', 'doublon sémantique : DiCaprio dans Titanic'),
  D('cinema_0019', 'cinema_0237', 'doublon sémantique : le sabre laser'),
  D('cinema_0203', 'cinema_0237', 'doublon sémantique : le sabre laser'),
  D('cinema_0021', 'cinema_0362', 'doublon sémantique : Simba'),
  D('cinema_0226', 'cinema_0362', 'doublon sémantique : Simba'),
  D('cinema_0022', 'cinema_0186', 'doublon sémantique : The Walking Dead'),
  D('cinema_0036', 'cinema_0230', 'doublon sémantique : Vice-versa'),
  D('cinema_0038', 'cinema_0232', 'doublon sémantique : Blanche-Neige, premier long métrage Disney'),
  D('cinema_0042', 'cinema_0469', 'doublon sémantique : Breaking Bad'),
  D('cinema_0047', 'cinema_0417', 'doublon sémantique : Tom Hanks dans Forrest Gump'),
  D('cinema_0071', 'cinema_0331', 'doublon sémantique : Titane, Palme d or 2021'),
  D('cinema_0095', 'cinema_0213', 'doublon sémantique : Friends à New York'),
  D('cinema_0189', 'cinema_0242', 'doublon sémantique : Hitchcock et Psychose'),
  D('cinema_0098', 'cinema_0250', 'doublon sémantique : Peter Jackson'),
  D('cinema_0128', 'cinema_0218', 'doublon sémantique : La Casa de Papel'),
  D('cinema_0199', 'cinema_0283', 'doublon sémantique : Ennio Morricone'),
  D('cinema_0287', 'cinema_0355', 'doublon sémantique : Persepolis'),
  D('cinema_0097', 'cinema_0457', 'doublon sémantique : Les Évadés'),
  D('cinema_0032', 'cinema_0505', 'doublon sémantique : Coppola et Le Parrain'),
  D('cinema_0221', null, 'tautologie : « la série sur rien » de Seinfeld, réponse dans l énoncé'),
  // code-route : 28 doublons + 1 tautologie = 29 (500 → 471)
  D('route_0002', 'route_0365', 'doublon sémantique : 50 km/h en agglomération'),
  D('route_0109', 'route_0354', 'doublon sémantique : 50 km/h sous 50 m de visibilité'),
  D('route_0014', 'route_0085', 'doublon sémantique : téléphone en main interdit'),
  D('route_0018', 'route_0307', 'doublon sémantique : panneaux d autoroute bleus'),
  D('route_0073', 'route_0399', 'doublon sémantique : 110 km/h en permis probatoire'),
  D('route_0044', 'route_0503', 'doublon sémantique : 1,6 mm de rainure'),
  D('route_0046', 'route_0267', 'doublon sémantique : panneau cerf, animaux sauvages'),
  D('route_0067', 'route_0247', 'doublon sémantique : 1 point pour un excès < 20 km/h'),
  D('route_0068', 'route_0126', 'doublon sémantique : 3 points pour le téléphone en main'),
  D('route_0074', 'route_0162', 'doublon sémantique : 3 points pour une ligne continue'),
  D('route_0106', 'route_0505', 'doublon sémantique : 6 points au départ du probatoire'),
  D('route_0076', 'route_0164', 'doublon sémantique : conduire sans assurance est un délit'),
  D('route_0087', 'route_0311', 'doublon sémantique : panneau enfants (école)'),
  D('route_0127', 'route_0395', 'doublon sémantique : distance de freinage × 4'),
  D('route_0066', 'route_0395', 'doublon sémantique : distance de freinage × 4'),
  D('route_0141', 'route_0360', 'doublon sémantique : clignotant droit pour sortir d un rond-point'),
  D('route_0176', 'route_0369', 'doublon sémantique : sortie d autoroute ratée'),
  D('route_0187', 'route_0352', 'doublon sémantique : 110 → 100 km/h sous la pluie'),
  D('route_0255', 'route_0335', 'doublon sémantique : ligne jaune continue'),
  D('route_0362', 'route_0264', 'doublon sémantique : on double par la gauche'),
  D('route_0277', 'route_0323', 'doublon sémantique : vitesse minimale obligatoire (rond bleu)'),
  D('route_0285', 'route_0328', 'doublon sémantique : losange jaune, route prioritaire'),
  D('route_0490', 'route_0185', 'doublon sémantique : car scolaire, descente d enfants'),
  D('route_0256', 'route_0456', 'doublon sémantique : protéger, alerter, secourir'),
  D('route_0131', 'route_0501', 'doublon sémantique : premier contrôle technique à 4 ans'),
  D('route_0418', 'route_0219', 'doublon sémantique : permis B à 17 ans'),
  D('route_0036', 'route_0504', 'doublon sémantique : règle des 2 secondes'),
  D('route_0091', 'route_0504', 'doublon sémantique : règle des 2 secondes'),
  D('route_0078', null, 'tautologie : « zone 30 » dans l énoncé, réponse 30 km/h'),
]

const PLANCHERS = { 'culture-generale': 480, 'manga-anime': 480, 'cinema-series': 480, 'code-route': 450 }

// ---------------------------------------------------------------------------
// Exécution
// ---------------------------------------------------------------------------
export function executer({ dry = false } = {}) {
  const banques = {}
  for (const nom of BANQUES) {
    banques[nom] = JSON.parse(readFileSync(join(CONTENT, `${nom}.json`), 'utf8'))
  }
  const parId = new Map()
  for (const nom of BANQUES) for (const q of banques[nom]) parId.set(q.id, { q, nom })

  const journal = []
  const compteAvant = {}
  const compte = (liste) => ({
    total: liste.length,
    facile: liste.filter((q) => q.difficulty === 'facile').length,
    expert: liste.filter((q) => q.difficulty === 'expert').length,
  })
  for (const nom of BANQUES) compteAvant[nom] = compte(banques[nom])

  // `journal` décrit l'état final (écrit dans le .log, stable d'un passage à
  // l'autre) ; `passage` compte ce qui a bougé cette fois-ci (console).
  const passage = { tier: 0, reparations: 0, vouvoiement: 0, tirets: 0, majuscules: 0, relabels: 0, suppressions: 0 }
  const inattendus = []

  // a. tier
  for (const nom of BANQUES) {
    for (const q of banques[nom]) {
      if ('tier' in q) {
        delete q.tier
        passage.tier++
      }
    }
  }
  journal.push('## a. Champ `tier` : aucune question ne le porte')

  // b. réparations
  journal.push('', '## b. Réparations factuelles (id | état | quoi)')
  for (const r of REPARATIONS) {
    const entree = parId.get(r.id)
    let etat
    if (!entree) etat = 'ABSENTE'
    else if (r.apres(entree.q)) etat = 'en place'
    else if (r.avant(entree.q)) {
      r.applique(entree.q)
      passage.reparations++
      etat = r.apres(entree.q) ? 'en place' : 'À VÉRIFIER (appliquée mais contrôle final négatif)'
    } else etat = 'À VÉRIFIER (texte différent de ce qui a été contrôlé, rien changé)'
    if (etat !== 'en place') inattendus.push(`${r.id} : ${etat}`)
    journal.push(`${r.id} | ${etat} | ${r.quoi}`)
  }

  // c. vouvoiement
  journal.push('', '## c. Vouvoiement (code de la route) : id | état')
  for (const v of VOUVOIEMENT) {
    const entree = parId.get(v.id)
    let etat
    if (!entree) etat = 'ABSENTE'
    else if (entree.q.question.fr === v.apres) etat = 'en place'
    else if (entree.q.question.fr === v.avant) {
      entree.q.question.fr = v.apres
      passage.vouvoiement++
      etat = 'en place'
    } else etat = 'À VÉRIFIER (énoncé différent de ce qui a été contrôlé, rien changé)'
    if (entree && v.options) {
      entree.q.options.fr = entree.q.options.fr.map((o) => v.options[o] ?? o)
    }
    if (etat !== 'en place') inattendus.push(`${v.id} : ${etat}`)
    journal.push(`${v.id} | ${etat}`)
  }

  // d. tirets longs
  let tiretsRestants = 0
  for (const nom of BANQUES) {
    for (const q of banques[nom]) {
      surTousLesTextes(q, (texte, { option }) => {
        const s = String(texte)
        if (!s.includes(TIRET_LONG)) return texte
        passage.tirets++
        const r = remplaceTiretLong(s, { titre: option })
        if (r.includes(TIRET_LONG)) tiretsRestants++
        return r
      })
    }
  }
  journal.push('', `## d. Tirets longs restants dans les textes affichés : ${tiretsRestants}`)

  // e. majuscule initiale des options
  let minusculesRestantes = 0
  for (const nom of BANQUES) {
    for (const q of banques[nom]) {
      for (const lang of Object.keys(q.options)) {
        q.options[lang] = q.options[lang].map((o) => {
          const m = majusculeInitiale(o)
          if (m !== o) passage.majuscules++
          if (/^\s*\p{Ll}/u.test(m) && !/^\s*\p{Ll}\p{Lu}/u.test(m)) minusculesRestantes++
          return m
        })
      }
    }
  }
  journal.push(`## e. Options commençant encore par une minuscule (hors casse mixte) : ${minusculesRestantes}`)

  // f. relabel
  journal.push('', '## f. Relabel (id | difficulté)')
  const relabel = (ids, cible) => {
    for (const id of ids) {
      const entree = parId.get(id)
      if (!entree) {
        journal.push(`${id} | ABSENTE`)
        inattendus.push(`${id} : relabel, ABSENTE`)
        continue
      }
      if (entree.q.difficulty !== cible) passage.relabels++
      entree.q.difficulty = cible
      journal.push(`${id} | ${cible}`)
    }
  }
  relabel(VERS_FACILE, 'facile')
  relabel(VERS_EXPERT, 'expert')

  // g. suppressions
  journal.push('', '## g. Suppressions (banque | id | gardée à la place | raison | état)')
  const aSupprimer = new Map(SUPPRESSIONS.map((s) => [s.id, s]))
  for (const s of SUPPRESSIONS) {
    if (s.garde && aSupprimer.has(s.garde)) throw new Error(`${s.id} : la question gardée ${s.garde} est elle-même supprimée`)
    if (s.garde && !parId.has(s.garde)) inattendus.push(`${s.id} : la question gardée ${s.garde} est introuvable`)
  }
  const prefixeDe = (nom) =>
    nom === 'culture-generale' ? 'culture' : nom === 'manga-anime' ? 'manga' : nom === 'cinema-series' ? 'cinema' : 'route'
  for (const nom of BANQUES) {
    const avant = banques[nom]
    banques[nom] = avant.filter((q) => !aSupprimer.has(q.id))
    passage.suppressions += avant.length - banques[nom].length
    const restantes = new Set(banques[nom].map((q) => q.id))
    for (const s of SUPPRESSIONS) {
      if (!s.id.startsWith(`${prefixeDe(nom)}_`)) continue
      journal.push(`${nom} | ${s.id} | ${s.garde ?? '(aucune)'} | ${s.raison} | ${restantes.has(s.id) ? 'ENCORE PRÉSENTE' : 'absente'}`)
    }
    if (banques[nom].length < PLANCHERS[nom]) {
      throw new Error(`${nom} : ${banques[nom].length} questions, sous le plancher de ${PLANCHERS[nom]}`)
    }
  }

  // h. permutation des options
  for (const nom of BANQUES) banques[nom] = banques[nom].map(permuteOptions)
  const repartition = (liste) => {
    const c = [0, 0, 0, 0]
    for (const q of liste) c[q.correct]++
    return c.join('/')
  }
  journal.push('', '## h. Permutation des options : répartition A/B/C/D de `correct`')
  for (const nom of BANQUES) journal.push(`${nom} | ${repartition(banques[nom])}`)

  // comptes
  journal.push('', '## Comptes après réparation (total | facile | expert)')
  for (const nom of BANQUES) {
    const b = compte(banques[nom])
    journal.push(`${nom} | ${b.total} | ${b.facile} | ${b.expert}`)
  }
  if (inattendus.length) {
    journal.push('', '## À VÉRIFIER')
    for (const x of inattendus) journal.push(x)
  }

  const texte =
    '# fix-banks-2026-09 : état des banques après réparation (régénéré à chaque exécution, stable)\n' +
    '# Décisions du 2026-09-07 ; un doublon = même bonne réponse et énoncés qui se recoupent.\n' +
    '# Avant : culture 506, manga 505, cinéma 505, code de la route 500 (voir l en-tête du script).\n\n' +
    journal.join('\n') +
    '\n'

  const resume = BANQUES.map((nom) => {
    const a = compteAvant[nom]
    const b = compte(banques[nom])
    return `  ${nom.padEnd(18)} ${a.total} → ${b.total} (facile ${a.facile} → ${b.facile}, expert ${a.expert} → ${b.expert})`
  })
  const rapport =
    `Ce passage : tier ${passage.tier}, réparations ${passage.reparations}, vouvoiement ${passage.vouvoiement}, ` +
    `tirets ${passage.tirets}, majuscules ${passage.majuscules}, relabels ${passage.relabels}, suppressions ${passage.suppressions}\n` +
    resume.join('\n')

  if (!dry) {
    for (const nom of BANQUES) {
      writeFileSync(join(CONTENT, `${nom}.json`), JSON.stringify(banques[nom], null, 2) + '\n')
    }
    writeFileSync(LOG, texte)
  }
  return { banques, journal: texte, rapport, inattendus }
}

const estScriptPrincipal = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (estScriptPrincipal) {
  const dry = process.argv.includes('--dry')
  const { journal, rapport, inattendus } = executer({ dry })
  console.log(journal)
  console.log(rapport)
  if (dry) console.log('--dry : rien écrit.')
  else console.log(`✅ banques écrites, journal dans ${LOG.replace(ROOT + '/', '')}`)
  if (inattendus.length) {
    console.error(`⚠️  ${inattendus.length} cas à vérifier (voir la fin du journal).`)
    process.exit(2)
  }
}
