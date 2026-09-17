// Contrôles qualité PURS partagés par les scripts de contenu (audit, fusion,
// réparations). Aucune lecture de fichier ici : chaque fonction reçoit une
// question ou une banque déjà chargée et renvoie un résultat inspectable.
//
// Conventions :
//   · une « banque » est un tableau de questions { id, category, difficulty,
//     question:{fr,…}, options:{fr:[4],…}, correct:0-3, explanation:{…},
//     image?, optionImages?, theme? } ;
//   · le FR est la langue de référence pour tout ce qui compare des textes
//     (doublons, tautologies) : c'est la seule langue présente dans TOUTES
//     les banques.

export const LANGS = ['fr', 'en', 'es', 'pt']
export const DIFFICULTES = ['facile', 'expert']

// Champs autorisés sur une question. Tout autre champ est une erreur d'audit :
// c'est ainsi qu'on a laissé traîner un `tier` mort sur 320 questions.
export const CLES_CONNUES = [
  'id',
  'category',
  'difficulty',
  'question',
  'options',
  'correct',
  'explanation',
  'image',
  'optionImages',
  'theme',
]

// Le tiret long (U+2014) est banni des textes affichés : deux-points, virgule
// ou point à la place.
export const TIRET_LONG = '—'

// ---------------------------------------------------------------------------
// Texte
// ---------------------------------------------------------------------------

// Minuscules, sans accents, sans ponctuation, espaces simples.
// « Quelle est la capitale ? » → « quelle est la capitale »
export function normalise(texte) {
  return String(texte ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // diacritiques décomposés par NFD
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// Mots vides du français (articles, pronoms, prépositions, formes
// interrogatives) plus le vocabulaire générique des quiz : « quel film »,
// « quelle série », « comment s'appelle » n'apportent rien pour reconnaître
// deux questions qui portent sur la même chose.
export const STOP_WORDS_FR = new Set(
  (
    'le la les l un une des du de d et ou a au aux en dans sur sous par pour avec sans ' +
    'que qui quoi dont ce cet cette ces se sa son ses mon ma mes ton ta tes notre votre leur leurs ' +
    'ne pas plus est sont etait ete etre avoir ai as ont eu il elle ils elles on nous vous je tu y ' +
    'quel quelle quels quelles lequel laquelle lesquels lesquelles comment combien pourquoi ou ' +
    'quand qu s c n t m j si oui non tout tous toute toutes autre autres meme memes ' +
    'peut doit faut fait faire dit appelle appelle t on nom nomme nomment ' +
    'film serie series anime animes manga mangas saga titre oeuvre personnage personnages heros ' +
    'realise realisateur realisatrice joue interprete acteur actrice auteur ' +
    'question reponse exemple generalement souvent principal principale'
  ).split(/\s+/),
)

// Mots-clés d'un texte : tokens normalisés sans les mots vides ni les tokens
// d'une seule lettre. Renvoie un Set (ordre sans importance).
export function motsCles(texte, stop = STOP_WORDS_FR) {
  const mots = normalise(texte).split(' ')
  return new Set(mots.filter((m) => m.length > 1 && !stop.has(m)))
}

// Indice de Jaccard entre deux ensembles (Set ou tableau). 0 si les deux sont
// vides : deux textes sans mots-clés ne se ressemblent pas, ils sont vides.
export function jaccard(a, b) {
  const A = a instanceof Set ? a : new Set(a)
  const B = b instanceof Set ? b : new Set(b)
  if (!A.size && !B.size) return 0
  let commun = 0
  for (const x of A) if (B.has(x)) commun++
  return commun / (A.size + B.size - commun)
}

// Texte de la bonne réponse dans une langue (null si la question est mal formée).
export function bonneReponse(q, lang = 'fr') {
  const options = q?.options?.[lang]
  if (!Array.isArray(options) || !Number.isInteger(q.correct)) return null
  return options[q.correct] ?? null
}

// ---------------------------------------------------------------------------
// Doublons sémantiques
// ---------------------------------------------------------------------------

// Deux questions sont des doublons sémantiques quand elles ont la MÊME bonne
// réponse (FR normalisé) et, au choix :
//   · des mots-clés d'énoncé qui se recoupent (Jaccard ≥ seuil, 0,25 par
//     défaut) : « règle des 2 secondes » posée cinq fois ;
//   · exactement le même jeu de 4 options ET au moins un mot-clé commun. Le
//     seul partage des options ne suffit pas : « Qui a réalisé E.T. ? » et
//     « Qui a réalisé Jurassic Park ? » ont les mêmes choix et la même bonne
//     réponse tout en étant deux questions légitimes.
//
// Renvoie les paires { a, b, score, raison } (ids triés par ordre d'apparition
// dans la banque), score = Jaccard des mots-clés, raison = 'mots-cles' |
// 'options'. Pure : ne modifie rien.
export function doublonsSemantiques(banque, { seuil = 0.25 } = {}) {
  const parReponse = new Map()
  banque.forEach((q, index) => {
    const reponse = bonneReponse(q, 'fr')
    if (reponse == null) return
    const cle = normalise(reponse)
    if (!cle) return
    const entree = {
      index,
      q,
      mots: motsCles(q.question?.fr),
      options: [...(q.options.fr || [])].map(normalise).sort().join('|'),
    }
    if (!parReponse.has(cle)) parReponse.set(cle, [])
    parReponse.get(cle).push(entree)
  })

  const paires = []
  for (const groupe of parReponse.values()) {
    if (groupe.length < 2) continue
    for (let i = 0; i < groupe.length; i++) {
      for (let j = i + 1; j < groupe.length; j++) {
        const A = groupe[i]
        const B = groupe[j]
        const score = jaccard(A.mots, B.mots)
        let raison = null
        if (score >= seuil) raison = 'mots-cles'
        else if (A.options === B.options && score > 0) raison = 'options'
        if (!raison) continue
        paires.push({ a: A.q.id, b: B.q.id, score: Math.round(score * 100) / 100, raison })
      }
    }
  }
  return paires
}

// ---------------------------------------------------------------------------
// Tautologies : la réponse est déjà dans l'énoncé
// ---------------------------------------------------------------------------

// Unités et mots de mesure : « 30 km/h » dans « zone 30 » est une tautologie
// même si « km/h » n'apparaît pas dans l'énoncé.
const UNITES = new Set(
  (
    'km h m s g l cm mm kg ml an ans mois jour jours heure heures minute minutes seconde secondes ' +
    'metre metres kilometre kilometres point points euro euros litre litres fois pour cent'
  ).split(' '),
)

// Mots-outils retirés de la réponse avant comparaison (articles, prépositions).
// Liste volontairement plus courte que STOP_WORDS_FR : ici on ne veut pas
// perdre « nom » ou « personnage » qui peuvent être toute la réponse.
const OUTILS = new Set('le la les l un une des du de et ou a au aux en'.split(' '))

// Tokens d'un texte, élisions retirées AVANT normalisation : « l'équipe 7 »
// donne [equipe, 7] et « la vitamine D » garde son « d » (qui n'est pas un
// « d' » d'élision). Les chiffres isolés sont conservés.
function tokens(texte) {
  return normalise(String(texte ?? '').replace(/(?<![\p{L}])(?:l|d|j|t|s|m|n|c|qu)['’]/giu, ' '))
    .split(' ')
    .filter(Boolean)
}

// Vrai si la bonne réponse (dans `lang`) figure dans l'énoncé :
//   · soit le texte normalisé de la réponse y apparaît tel quel ;
//   · soit tous ses mots (hors mots-outils et unités) y sont déjà. Une réponse
//     purement numérique (« 50 km/h ») n'est jugée que sur le premier critère :
//     « visibilité < 50 m → 50 km/h » est la règle elle-même, pas une fuite.
// Exemples attrapés :
//   « Sur une route (généralement 80 km/h), quelle est la vitesse… ? » → 80 km/h
//   « Quel trésor cherchent les pirates de One Piece ? » → Le One Piece
// Exemption : une question à options illustrées (`optionImages`) demande de
// reconnaître une IMAGE ; le texte des options n'est que son nom accessible et
// figure légitimement dans l'énoncé (« Quel panneau signifie « Stop » ? »).
export function reponseDansEnonce(q, lang = 'fr') {
  if (Array.isArray(q?.optionImages) && q.optionImages.length) return false
  const reponse = bonneReponse(q, lang)
  const enonce = q?.question?.[lang]
  if (!reponse || !enonce) return false
  const reponseNorm = normalise(reponse)
  const enonceNorm = normalise(enonce)
  if (!reponseNorm || !enonceNorm) return false
  if (` ${enonceNorm} `.includes(` ${reponseNorm} `)) return true

  const mots = tokens(reponse).filter((m) => !OUTILS.has(m) && !UNITES.has(m))
  if (!mots.length) return false
  if (mots.every((m) => /^\d+$/.test(m))) return false
  const motsEnonce = new Set(tokens(enonce))
  return mots.every((m) => motsEnonce.has(m))
}

// ---------------------------------------------------------------------------
// Statistiques de banque
// ---------------------------------------------------------------------------

// Part des questions dont la bonne option est STRICTEMENT la plus longue des
// quatre : un joueur qui a compris le truc n'a plus besoin de lire l'énoncé.
// { total, plusLongue, ratio (0-1), ids }
export function optionLaPlusLongue(banque, lang = 'fr') {
  const ids = []
  let total = 0
  for (const q of banque) {
    const options = q?.options?.[lang]
    if (!Array.isArray(options) || !Number.isInteger(q.correct)) continue
    total++
    const bonne = String(options[q.correct] ?? '').length
    const autres = options.filter((_, i) => i !== q.correct).map((o) => String(o).length)
    if (autres.length && autres.every((n) => bonne > n)) ids.push(q.id)
  }
  return { total, plusLongue: ids.length, ratio: total ? ids.length / total : 0, ids }
}

// Répartition de `correct` sur les 4 index. Une banque où 90 % des bonnes
// réponses sont en A trahit le joueur qui clique toujours en haut (et les pages
// statiques qui affichent « A ✓ » partout).
// { comptes:[nA,nB,nC,nD], total, indexMax, partMax (0-1) }
export function distributionCorrect(banque) {
  const comptes = [0, 0, 0, 0]
  let total = 0
  for (const q of banque) {
    if (!Number.isInteger(q?.correct) || q.correct < 0 || q.correct > 3) continue
    comptes[q.correct]++
    total++
  }
  const max = Math.max(...comptes)
  return {
    comptes,
    total,
    indexMax: comptes.indexOf(max),
    partMax: total ? max / total : 0,
  }
}

// ---------------------------------------------------------------------------
// Contrôles unitaires sur une question
// ---------------------------------------------------------------------------

// Champs absents de la liste blanche (ex. `tier`).
export function clesInconnues(q, whitelist = CLES_CONNUES) {
  const ok = new Set(whitelist)
  return Object.keys(q ?? {}).filter((k) => !ok.has(k))
}

// Parcourt question / options / explanation dans toutes les langues et renvoie
// les chemins qui contiennent un tiret long : ['question.fr', 'options.pt[0]'].
export function tiretLong(q) {
  const chemins = []
  for (const champ of ['question', 'explanation']) {
    const valeurs = q?.[champ]
    if (!valeurs || typeof valeurs !== 'object') continue
    for (const [lang, texte] of Object.entries(valeurs)) {
      if (String(texte).includes(TIRET_LONG)) chemins.push(`${champ}.${lang}`)
    }
  }
  const options = q?.options
  if (options && typeof options === 'object') {
    for (const [lang, liste] of Object.entries(options)) {
      if (!Array.isArray(liste)) continue
      liste.forEach((o, i) => {
        if (String(o).includes(TIRET_LONG)) chemins.push(`options.${lang}[${i}]`)
      })
    }
  }
  return chemins
}

// Chiffres romains des siècles (« XIXe siècle » ↔ « 19th century »). Le
// motif commence par I, V ou X pour ne pas prendre « Le » ou « Ce » pour 50 ou 100.
const ROMAINS = { I: 1, V: 5, X: 10, L: 50, C: 100 }
function romainVersArabe(txt) {
  let total = 0
  for (let i = 0; i < txt.length; i++) {
    const v = ROMAINS[txt[i]]
    const suivant = ROMAINS[txt[i + 1]] || 0
    total += v < suivant ? -v : v
  }
  return String(total)
}

// Nombres d'un texte, séparateurs de milliers et décimales retirés :
// « 3 000 km » et « 3,000 km » donnent tous deux « 3000 ». Les titres entre
// guillemets sont ignorés (« Se7en », « The 400 Blows » ne sont pas des faits).
function nombres(texte) {
  const brut = sansTitres(texte).replace(
    /(?<![\p{L}])([IVX][IVXLC]*)(?:er|ème|e)(?![\p{L}])/gu,
    (_, r) => romainVersArabe(r),
  )
  const trouves = brut.match(/\d[\d\s  .,]*\d|\d/g) || []
  return new Set(trouves.map((n) => n.replace(/[\s  .,]/g, '')))
}

// Négations « fortes » seulement : « sans » / « without » sont trop souvent
// rendus par un autre tour (« sans accès à la mer » → « landlocked »), « non »
// est presque toujours un préfixe (« non bissextile » → « non-leap »), et le
// « no » anglais traduit « sans » (« with no sequel ») ou traîne dans une
// romanisation japonaise hors guillemets (« Koe no Katachi »).
const NEGATION_FR =
  /(?<![\p{L}])(?:ne|n)(?:['’]|\s)|(?<![\p{L}])(?:jamais|aucune?|nulle?)(?![\p{L}])/iu
const NEGATION_EN = /(?<![\p{L}])(?:not|never|none|nor|cannot)(?![\p{L}])|n't(?![\p{L}])/iu

// Retire les titres entre guillemets : « Kimetsu no Yaiba » contient un « no »
// japonais qui n'est pas une négation anglaise.
function sansTitres(texte) {
  return String(texte ?? '').replace(/«[^»]*»|"[^"]*"|“[^”]*”/g, ' ')
}

// Compare l'énoncé FR et l'énoncé EN : nombres différents ou négation présente
// d'un seul côté signalent une traduction qui a changé le sens (« 2011 » ajouté
// en anglais, « n'est pas » oublié). Renvoie null si rien à signaler, sinon
// une phrase courte. Ne s'applique pas aux banques FR seul (pas de EN → null).
export function incoherenceFrEn(q) {
  const fr = q?.question?.fr
  const en = q?.question?.en
  if (!fr || !en) return null

  const nFr = nombres(fr)
  const nEn = nombres(en)
  const seulementFr = [...nFr].filter((n) => !nEn.has(n))
  const seulementEn = [...nEn].filter((n) => !nFr.has(n))
  if (seulementFr.length || seulementEn.length) {
    return `nombres différents : FR {${[...nFr].join(', ')}} vs EN {${[...nEn].join(', ')}}`
  }

  const negFr = NEGATION_FR.test(sansTitres(fr))
  const negEn = NEGATION_EN.test(sansTitres(en))
  if (negFr !== negEn) {
    return negFr ? 'négation en FR absente en EN' : 'négation en EN absente en FR'
  }
  return null
}

// ---------------------------------------------------------------------------
// Aléatoire déterministe : copies conformes de src/lib/quiz.js (chantier
// defi-share). Le tirage des Défis et la permutation des options des banques
// doivent rester bit à bit identiques : ne pas « améliorer » l'un sans l'autre.
// ---------------------------------------------------------------------------

// FNV-1a 32 bits d'une chaîne (par unité de code UTF-16).
export function hashString(str) {
  let h = 0x811c9dc5
  const s = String(str)
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

// Générateur pseudo-aléatoire mulberry32 : renvoie une fonction → [0, 1).
export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
