// Audit d'intégrité des banques de questions.
//
//   node scripts/audit-questions.mjs            → toutes les banques
//   node scripts/audit-questions.mjs manga-anime → une seule
//
// Contrôle, pour chaque banque :
//   · ids uniques et bien formés
//   · les 4 langues présentes et non vides (question, options, explication)
//   · exactement 4 options par langue, sans doublon interne
//   · `correct` entier dans 0-3
//   · difficulty dans facile|expert
//   · doublons EXACTS de question (texte FR normalisé)
//   · quasi-doublons : même question à quelques mots près, ou même jeu de
//     réponses proposé pour deux questions différentes
//
// Sort en code 1 si une ERREUR est trouvée. Les quasi-doublons sont des
// AVERTISSEMENTS : ils demandent un œil humain, pas un rejet automatique.

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const CONTENT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content')
const LANGS = ['fr', 'en', 'es', 'pt']
const DIFFICULTIES = ['facile', 'expert']

// Banques volontairement monolingues : le code de la route et les panneaux sont
// propres à la France (`frOnly` dans content/index.js). Exiger en/es/pt ici
// signalerait des centaines de fausses erreurs.
const BANQUES_FR_SEUL = new Set(['code-route', 'panneaux-quiz'])

const cible = process.argv[2]
const fichiers = readdirSync(CONTENT)
  .filter((f) => f.endsWith('.json') && f !== 'counts.json')
  .filter((f) => !cible || f === `${cible}.json`)
  .sort()

if (!fichiers.length) {
  console.error(cible ? `banque introuvable : ${cible}` : 'aucune banque trouvée')
  process.exit(1)
}

function normalise(texte) {
  return String(texte)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// Similarité par mots communs (Jaccard) : simple, lisible, suffisant pour
// repérer « Qui a peint la Joconde ? » vs « Qui a peint la Joconde (Mona Lisa) ? ».
function similarite(a, b) {
  const A = new Set(normalise(a).split(' '))
  const B = new Set(normalise(b).split(' '))
  const commun = [...A].filter((m) => B.has(m)).length
  return commun / (A.size + B.size - commun)
}

const SEUIL_PROCHE = 0.8

let totalErreurs = 0
let totalAvertissements = 0

for (const fichier of fichiers) {
  const nom = fichier.replace(/\.json$/, '')
  const banque = JSON.parse(readFileSync(join(CONTENT, fichier), 'utf8'))
  const langues = BANQUES_FR_SEUL.has(nom) ? ['fr'] : LANGS
  const erreurs = []
  const avertissements = []
  const ids = new Set()

  banque.forEach((q, i) => {
    const ou = `${q.id || `#${i}`}`
    if (!q.id) erreurs.push(`${ou} : id manquant`)
    else if (ids.has(q.id)) erreurs.push(`${ou} : id en double`)
    else ids.add(q.id)

    if (!DIFFICULTIES.includes(q.difficulty))
      erreurs.push(`${ou} : difficulty « ${q.difficulty} »`)
    if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct > 3)
      erreurs.push(`${ou} : correct = ${q.correct}`)

    for (const lang of langues) {
      if (!q.question?.[lang]?.trim()) erreurs.push(`${ou} : question.${lang} vide`)
      if (!q.explanation?.[lang]?.trim()) erreurs.push(`${ou} : explanation.${lang} vide`)
      const options = q.options?.[lang]
      if (!Array.isArray(options) || options.length !== 4) {
        erreurs.push(`${ou} : options.${lang} ≠ 4 entrées`)
        continue
      }
      if (options.some((o) => !String(o).trim()))
        erreurs.push(`${ou} : options.${lang} contient une entrée vide`)
      if (new Set(options.map(normalise)).size !== 4)
        erreurs.push(`${ou} : options.${lang} contient des doublons`)
    }
  })

  // Doublons exacts. Deux ajustements pour la banque à images (panneaux) :
  //   · l'énoncé y est volontairement générique (« Que signifie ce panneau ? »)
  //     — c'est l'IMAGE qui pose la question, donc elle entre dans la clé ;
  //   · un même panneau existe en facile ET en expert (intrus hors famille vs
  //     pièges dans la même famille), donc la difficulté aussi.
  const cleDe = (q) =>
    `${q.image || ''}|${q.difficulty}|${normalise(q.question?.fr || '')}`
  const parTexte = new Map()
  banque.forEach((q) => {
    const cle = cleDe(q)
    if (!parTexte.has(cle)) parTexte.set(cle, [])
    parTexte.get(cle).push(q.id)
  })
  for (const [, groupe] of parTexte) {
    if (groupe.length > 1) erreurs.push(`doublon exact : ${groupe.join(' = ')}`)
  }

  // Quasi-doublons. Deux signaux :
  //   · énoncés très proches mot à mot ;
  //   · mêmes 4 réponses ET même bonne réponse ET énoncés qui se recoupent.
  //
  // Le seul partage des réponses ne suffit PAS : « Qui a réalisé E.T. ? » et
  // « Qui a réalisé Jurassic Park ? » ont les mêmes choix et la même réponse
  // (Spielberg) tout en étant deux questions légitimes. De même, toutes les
  // questions de vitesse du code partagent le quatuor 80/90/110/130. On exige
  // donc en plus un recoupement des énoncés.
  const RECOUPEMENT_MIN = 0.5
  const signes = new Map()
  const vues = new Set()
  banque.forEach((q) => {
    const options = q.options?.fr
    if (!Array.isArray(options)) return
    const signe = options.map(normalise).sort().join('|')
    if (!signes.has(signe)) signes.set(signe, [])
    signes.get(signe).push(q)
  })
  for (const [, groupe] of signes) {
    if (groupe.length < 2) continue
    for (let i = 0; i < groupe.length; i++) {
      for (let j = i + 1; j < groupe.length; j++) {
        // Comparer le TEXTE de la bonne réponse, pas son index : deux questions
        // peuvent proposer les mêmes 4 choix dans un ordre différent, auquel cas
        // des index égaux désignent des réponses différentes.
        const bonne = (q) => normalise(q.options.fr[q.correct])
        if (bonne(groupe[i]) !== bonne(groupe[j])) continue
        const s = similarite(groupe[i].question.fr, groupe[j].question.fr)
        if (s < RECOUPEMENT_MIN) continue
        const paire = `${groupe[i].id}/${groupe[j].id}`
        vues.add(paire)
        avertissements.push(
          `doublon probable (mêmes réponses, énoncés à ${Math.round(s * 100)} %) ${paire}\n` +
            `      · ${groupe[i].question.fr}\n` +
            `      · ${groupe[j].question.fr}`,
        )
      }
    }
  }

  const textes = banque.map((q) => ({ id: q.id, fr: q.question?.fr || '' }))
  for (let i = 0; i < textes.length; i++) {
    for (let j = i + 1; j < textes.length; j++) {
      if (normalise(textes[i].fr) === normalise(textes[j].fr)) continue // déjà en erreur
      if (vues.has(`${textes[i].id}/${textes[j].id}`)) continue // déjà signalé ci-dessus
      const s = similarite(textes[i].fr, textes[j].fr)
      if (s >= SEUIL_PROCHE) {
        avertissements.push(
          `énoncés proches (${Math.round(s * 100)} %) ${textes[i].id} / ${textes[j].id}\n` +
            `      · ${textes[i].fr}\n` +
            `      · ${textes[j].fr}`,
        )
      }
    }
  }

  const compte = (d) => banque.filter((q) => q.difficulty === d).length
  const etat = erreurs.length ? '❌' : avertissements.length ? '⚠️ ' : '✅'
  console.log(
    `${etat} ${nom.padEnd(18)} ${String(banque.length).padStart(4)} questions ` +
      `(facile ${compte('facile')}, expert ${compte('expert')})`,
  )
  erreurs.forEach((e) => console.log(`    ERREUR  ${e}`))
  avertissements.forEach((a) => console.log(`    ATTENTION ${a}`))

  totalErreurs += erreurs.length
  totalAvertissements += avertissements.length
}

console.log(
  `\n${totalErreurs} erreur(s), ${totalAvertissements} avertissement(s).`,
)
process.exit(totalErreurs ? 1 : 0)
