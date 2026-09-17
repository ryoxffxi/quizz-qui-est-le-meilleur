// Audit d'intégrité des banques de questions.
//
//   node scripts/audit-questions.mjs            → toutes les banques
//   node scripts/audit-questions.mjs manga-anime → une seule
//
// Les contrôles de fond (doublons, tautologies, statistiques) vivent dans
// scripts/lib/qa.mjs et sont partagés avec merge-questions.mjs : ce qui bloque
// une fusion doit aussi apparaître ici, et réciproquement.
//
// ERREURS (code de sortie 1) :
//   · id manquant ou en double ; difficulty hors facile|expert ; correct hors 0-3
//   · langues attendues absentes ou vides (question, options, explication)
//   · autre chose que 4 options par langue, ou deux options identiques
//   · champ inconnu sur une question (ex. l'ancien `tier`) : cf. CLES_CONNUES
//   · tiret long (U+2014) dans un texte affiché
//   · réponse contenue dans l'énoncé (tautologie : la question se répond seule)
//   · doublon EXACT d'énoncé FR (image + difficulté pour la banque à images)
//
// AVERTISSEMENTS (demandent un œil humain, pas un rejet automatique) :
//   · doublons sémantiques : même bonne réponse et énoncés qui se recoupent
//   · bonne option strictement la plus longue dans plus de 35 % de la banque
//   · `correct` concentré sur un seul index (plus de 60 % des questions)
//   · énoncé FR / EN incohérents (nombres ou négations qui diffèrent)

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  LANGS,
  DIFFICULTES,
  normalise,
  clesInconnues,
  tiretLong,
  reponseDansEnonce,
  doublonsSemantiques,
  optionLaPlusLongue,
  distributionCorrect,
  incoherenceFrEn,
} from './lib/qa.mjs'

const CONTENT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content')

// Banques volontairement monolingues : le code de la route et les panneaux sont
// propres à la France (`frOnly` dans content/index.js). Exiger en/es/pt ici
// signalerait des centaines de fausses erreurs.
const BANQUES_FR_SEUL = new Set(['code-route', 'panneaux-quiz'])

// Banque à images : l'énoncé est générique (« Que signifie ce panneau ? »), c'est
// l'IMAGE qui pose la question. Le même panneau existe légitimement en facile et
// en expert, et les questions « inverses » (« Quel panneau signifie X ? ») ont
// toutes la même bonne réponse textuelle deux à deux. Le contrôle des doublons
// sémantiques n'a donc pas de sens ici : seul le doublon exact (image +
// difficulté + énoncé) est vérifié.
const BANQUES_IMAGES = new Set(['panneaux-quiz'])

// Au-delà de cette part, la longueur trahit la bonne réponse.
const SEUIL_PLUS_LONGUE = 0.35
// Au-delà de cette part sur un seul index, le joueur qui clique toujours au
// même endroit est récompensé (et les pages statiques affichent « A ✓ » partout).
const SEUIL_CONCENTRATION = 0.6

const cible = process.argv[2]
const fichiers = readdirSync(CONTENT)
  .filter((f) => f.endsWith('.json') && f !== 'counts.json')
  .filter((f) => !cible || f === `${cible}.json`)
  .sort()

if (!fichiers.length) {
  console.error(cible ? `banque introuvable : ${cible}` : 'aucune banque trouvée')
  process.exit(1)
}

const pourcent = (x) => `${Math.round(x * 100)} %`

let totalErreurs = 0
let totalAvertissements = 0

for (const fichier of fichiers) {
  const nom = fichier.replace(/\.json$/, '')
  const banque = JSON.parse(readFileSync(join(CONTENT, fichier), 'utf8'))
  const langues = BANQUES_FR_SEUL.has(nom) ? ['fr'] : LANGS
  const parId = new Map(banque.map((q) => [q.id, q]))
  const erreurs = []
  const avertissements = []
  const ids = new Set()

  // --- contrôles unitaires ---------------------------------------------------
  banque.forEach((q, i) => {
    const ou = `${q.id || `#${i}`}`
    if (!q.id) erreurs.push(`${ou} : id manquant`)
    else if (ids.has(q.id)) erreurs.push(`${ou} : id en double`)
    else ids.add(q.id)

    if (!DIFFICULTES.includes(q.difficulty))
      erreurs.push(`${ou} : difficulty « ${q.difficulty} »`)
    if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct > 3)
      erreurs.push(`${ou} : correct = ${q.correct}`)

    const inconnues = clesInconnues(q)
    if (inconnues.length) erreurs.push(`${ou} : champ(s) inconnu(s) ${inconnues.join(', ')}`)

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

    const tirets = tiretLong(q)
    if (tirets.length) erreurs.push(`${ou} : tiret long dans ${tirets.join(', ')}`)

    if (reponseDansEnonce(q)) {
      erreurs.push(
        `${ou} : la réponse est dans l'énoncé\n` +
          `      · ${q.question.fr}\n` +
          `      · → ${q.options.fr[q.correct]}`,
      )
    }

    const incoherence = incoherenceFrEn(q)
    if (incoherence) avertissements.push(`${ou} : FR/EN, ${incoherence}`)
  })

  // --- doublons exacts -------------------------------------------------------
  // Pour la banque à images, l'image et la difficulté entrent dans la clé (voir
  // BANQUES_IMAGES) ; ailleurs, l'énoncé FR normalisé suffit.
  const cleDe = (q) =>
    BANQUES_IMAGES.has(nom)
      ? `${q.image || ''}|${q.difficulty}|${normalise(q.question?.fr || '')}`
      : normalise(q.question?.fr || '')
  const parTexte = new Map()
  banque.forEach((q) => {
    const cle = cleDe(q)
    if (!parTexte.has(cle)) parTexte.set(cle, [])
    parTexte.get(cle).push(q.id)
  })
  for (const [, groupe] of parTexte) {
    if (groupe.length > 1) erreurs.push(`doublon exact : ${groupe.join(' = ')}`)
  }

  // --- doublons sémantiques --------------------------------------------------
  if (!BANQUES_IMAGES.has(nom)) {
    for (const p of doublonsSemantiques(banque)) {
      const A = parId.get(p.a)
      const B = parId.get(p.b)
      avertissements.push(
        `doublon sémantique ${p.a} / ${p.b} (${p.raison}, recoupement ${pourcent(p.score)})\n` +
          `      · ${A.question.fr}\n` +
          `      · ${B.question.fr}\n` +
          `      · → ${A.options.fr[A.correct]}`,
      )
    }
  }

  // --- statistiques de banque ------------------------------------------------
  const longue = optionLaPlusLongue(banque)
  if (longue.ratio > SEUIL_PLUS_LONGUE) {
    avertissements.push(
      `bonne option strictement la plus longue dans ${longue.plusLongue}/${longue.total} questions ` +
        `(${pourcent(longue.ratio)}, seuil ${pourcent(SEUIL_PLUS_LONGUE)})`,
    )
  }
  const dist = distributionCorrect(banque)
  if (dist.partMax > SEUIL_CONCENTRATION) {
    avertissements.push(
      `\`correct\` concentré : ${pourcent(dist.partMax)} des bonnes réponses en ${'ABCD'[dist.indexMax]} ` +
        `(répartition A/B/C/D = ${dist.comptes.join('/')}, seuil ${pourcent(SEUIL_CONCENTRATION)})`,
    )
  }

  // --- rapport ---------------------------------------------------------------
  const compte = (d) => banque.filter((q) => q.difficulty === d).length
  const etat = erreurs.length ? '❌' : avertissements.length ? '⚠️ ' : '✅'
  console.log(
    `${etat} ${nom.padEnd(18)} ${String(banque.length).padStart(4)} questions ` +
      `(facile ${compte('facile')}, expert ${compte('expert')}) ` +
      `· correct A/B/C/D = ${dist.comptes.join('/')} · plus longue ${pourcent(longue.ratio)}`,
  )
  erreurs.forEach((e) => console.log(`    ERREUR  ${e}`))
  avertissements.forEach((a) => console.log(`    ATTENTION ${a}`))

  totalErreurs += erreurs.length
  totalAvertissements += avertissements.length
}

console.log(`\n${totalErreurs} erreur(s), ${totalAvertissements} avertissement(s).`)
process.exit(totalErreurs ? 1 : 0)
