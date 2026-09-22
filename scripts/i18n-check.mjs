// Vérifie la cohérence des dictionnaires i18n (principaux + parts) et des
// textes légaux. Remplace l'ancien i18n-orphans.mjs.
//
//   node scripts/i18n-check.mjs            → rapport, code de sortie 1 en erreur
//   node scripts/i18n-check.mjs --quiet    → erreurs seules (sans avertissements)
//
// ERREURS (bloquantes) :
//   a. clé appelée via t('…') / tn('…') dans src/** absente de tout dictionnaire
//   b. parité des clés entre fr / en / es / pt, pour chaque source (fr = référence)
//   c. placeholders {x} différents d'une langue à l'autre
//   d. tiret long U+2014 dans une valeur (règle du propriétaire : jamais)
//   f. clé définie à la fois dans un dictionnaire principal et dans un part
//      (ou dans deux parts) : la fusion écraserait l'une des deux
//   + src/content/legal.js : 4 langues, même nombre de sections, date ISO, pas de U+2014
// AVERTISSEMENTS :
//   e. clé déclarée que plus aucun code n'utilise (hors PREFIXES_DYNAMIQUES)
//   + préfixe dynamique t(`xxx_${…}`) qui n'est pas dans PREFIXES_DYNAMIQUES
//
// Les fonctions sont pures et exportées (testées par i18n-check.test.mjs) ; seul
// main() lit le dépôt.

import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const LANGS = ['fr', 'en', 'es', 'pt']

// Clés assemblées à la volée dans le code (`diff_${d}`, personalityKey()…) :
// elles ne peuvent pas être repérées par recherche de texte, on ne les signale
// jamais comme inutilisées.
export const PREFIXES_DYNAMIQUES = [
  'diff_',
  'personality_',
  'cat_',
  'card_mode_',
  'rounds_',
  'questions_count',
  'panneaux_count',
  'theme_',
  'exam_theme_',
]

const TIRET_LONG = '—'
const RE_CLE = /^[a-zA-Z0-9_]+$/

// ---------------------------------------------------------------------------
// 1. Analyse des sources : quelles clés le code appelle-t-il ?
// ---------------------------------------------------------------------------

// Lit le premier argument d'un appel à partir de la position qui suit « ( » :
// s'arrête à la virgule ou à la parenthèse fermante de premier niveau, en
// respectant les chaînes et les imbrications. Renvoie { texte, fin }.
function lirePremierArgument(source, depuis) {
  let profondeur = 0
  let i = depuis
  while (i < source.length) {
    const c = source[i]
    if (c === "'" || c === '"' || c === '`') {
      // Saute la chaîne entière (échappements compris).
      const ouverture = c
      i++
      while (i < source.length && source[i] !== ouverture) {
        if (source[i] === '\\') i++
        i++
      }
      i++
      continue
    }
    if (c === '(' || c === '[' || c === '{') profondeur++
    else if (c === ')' || c === ']' || c === '}') {
      if (profondeur === 0) return { texte: source.slice(depuis, i), fin: i }
      profondeur--
    } else if (c === ',' && profondeur === 0) {
      return { texte: source.slice(depuis, i), fin: i }
    }
    i++
  }
  return { texte: source.slice(depuis), fin: source.length }
}

function numeroLigne(source, index) {
  let n = 1
  for (let i = 0; i < index && i < source.length; i++) if (source[i] === '\n') n++
  return n
}

// Extrait les clés passées à t() / tn() : littéraux simples, ternaires
// (`t(x ? 'a' : 'b')`), repli (`t(k || 'a')`). Un gabarit `t(\`diff_${d}\`)`
// donne un « préfixe dynamique » (à couvrir par PREFIXES_DYNAMIQUES).
// Renvoie { appels: [{ cle, fichier, ligne }], prefixes: [{ prefixe, fichier, ligne }] }.
export function extraireAppels(source, fichier = '') {
  const appels = []
  const prefixes = []
  const re = /(?<![\w.$])tn?\(/g
  let m
  while ((m = re.exec(source))) {
    const debut = m.index + m[0].length
    const { texte } = lirePremierArgument(source, debut)
    const ligne = numeroLigne(source, m.index)
    for (const lit of texte.matchAll(/(['"])([a-zA-Z0-9_]+)\1/g)) {
      appels.push({ cle: lit[2], fichier, ligne })
    }
    for (const gab of texte.matchAll(/`([a-zA-Z0-9_]*)\$\{/g)) {
      prefixes.push({ prefixe: gab[1], fichier, ligne })
    }
  }
  return { appels, prefixes }
}

// Tous les littéraux 'xxx' / "xxx" / `xxx` d'une source qui ressemblent à une
// clé : sert à repérer les clés référencées hors t() (tables de correspondance,
// labelKey…), donc à ne pas les déclarer inutilisées.
export function extraireLitteraux(source) {
  const set = new Set()
  for (const m of source.matchAll(/(['"`])([a-zA-Z0-9_]+)\1/g)) set.add(m[2])
  return set
}

// ---------------------------------------------------------------------------
// 2. Vérification (pure) des dictionnaires
// ---------------------------------------------------------------------------

function placeholders(valeur) {
  return [...String(valeur).matchAll(/\{(\w+)\}/g)]
    .map((m) => m[1])
    .sort()
    .join(',')
}

function couvertParPrefixe(cle, prefixes) {
  return prefixes.some((p) => cle.startsWith(p))
}

// sources : { 'src/i18n/fr.js…': { fr, en, es, pt } } où la première entrée est
// le dictionnaire principal et les suivantes les parts. Chaque valeur d'une
// langue est un objet clé -> chaîne.
// appels / prefixes : sortie cumulée d'extraireAppels ; litteraux : Set.
// Renvoie { erreurs: string[], avertissements: string[], stats }.
export function verifier({
  sources,
  appels = [],
  prefixesDynamiquesAppeles = [],
  litteraux = new Set(),
  prefixes = PREFIXES_DYNAMIQUES,
}) {
  const erreurs = []
  const avertissements = []
  const noms = Object.keys(sources)
  const declarees = new Map() // clé -> nom de la source qui la définit

  for (const nom of noms) {
    const dict = sources[nom] || {}
    const ref = dict.fr || {}
    const clesRef = Object.keys(ref)

    // f. Doublons entre sources (principal / part, ou part / part).
    for (const cle of clesRef) {
      if (declarees.has(cle)) {
        erreurs.push(`clé « ${cle} » définie deux fois : ${declarees.get(cle)} et ${nom}`)
      } else declarees.set(cle, nom)
      if (!RE_CLE.test(cle)) erreurs.push(`clé « ${cle} » invalide dans ${nom} (lettres, chiffres, _)`)
    }

    // b. Parité des clés, fr = référence.
    for (const lang of LANGS) {
      if (!dict[lang]) {
        erreurs.push(`${nom} : langue « ${lang} » absente`)
        continue
      }
      const cles = Object.keys(dict[lang])
      for (const cle of clesRef) {
        if (!(cle in dict[lang])) erreurs.push(`${nom} : clé « ${cle} » manque en ${lang}`)
      }
      for (const cle of cles) {
        if (!(cle in ref)) erreurs.push(`${nom} : clé « ${cle} » en ${lang} n'existe pas en fr`)
      }
    }

    // c. Placeholders identiques ; d. pas de tiret long ; valeurs = chaînes.
    for (const lang of LANGS) {
      const table = dict[lang] || {}
      for (const [cle, valeur] of Object.entries(table)) {
        if (typeof valeur !== 'string') {
          erreurs.push(`${nom} : « ${cle} » (${lang}) n'est pas une chaîne`)
          continue
        }
        if (valeur.includes(TIRET_LONG)) {
          erreurs.push(`${nom} : tiret long (U+2014) dans « ${cle} » (${lang})`)
        }
        if (lang !== 'fr' && cle in ref && placeholders(valeur) !== placeholders(ref[cle])) {
          erreurs.push(
            `${nom} : placeholders de « ${cle} » différents en ${lang} ({${placeholders(valeur)}} vs fr {${placeholders(ref[cle])}})`,
          )
        }
      }
    }
  }

  // a. Clés appelées mais jamais déclarées.
  const appelees = new Set()
  for (const { cle, fichier, ligne } of appels) {
    appelees.add(cle)
    if (!declarees.has(cle)) {
      erreurs.push(`clé manquante « ${cle} » appelée dans ${fichier}:${ligne}`)
    }
  }

  // Préfixes dynamiques rencontrés dans le code : doivent être connus.
  for (const { prefixe, fichier, ligne } of prefixesDynamiquesAppeles) {
    if (!prefixe) continue
    if (!prefixes.some((p) => prefixe.startsWith(p) || p.startsWith(prefixe))) {
      avertissements.push(
        `préfixe dynamique « ${prefixe}… » (${fichier}:${ligne}) absent de PREFIXES_DYNAMIQUES`,
      )
    }
  }

  // e. Clés déclarées que rien n'utilise.
  for (const [cle, nom] of declarees) {
    if (appelees.has(cle) || litteraux.has(cle) || couvertParPrefixe(cle, prefixes)) continue
    avertissements.push(`clé jamais utilisée « ${cle} » (${nom})`)
  }

  return {
    erreurs,
    avertissements,
    stats: { sources: noms.length, cles: declarees.size, appels: appels.length },
  }
}

// Textes légaux : { privacy: { fr: { title, updated, sections } }, terms: … }.
export function verifierLegal(legal) {
  const erreurs = []
  if (!legal || typeof legal !== 'object') return ['legal : export LEGAL introuvable']
  for (const [doc, parLangue] of Object.entries(legal)) {
    const ref = parLangue.fr
    if (!ref) {
      erreurs.push(`legal.${doc} : version fr absente`)
      continue
    }
    for (const lang of LANGS) {
      const d = parLangue[lang]
      if (!d) {
        erreurs.push(`legal.${doc} : langue « ${lang} » absente`)
        continue
      }
      if (typeof d.title !== 'string' || !d.title) erreurs.push(`legal.${doc}.${lang} : title manquant`)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d.updated))) {
        erreurs.push(`legal.${doc}.${lang} : updated doit être une date ISO (AAAA-MM-JJ)`)
      }
      if (!Array.isArray(d.sections)) {
        erreurs.push(`legal.${doc}.${lang} : sections doit être un tableau`)
        continue
      }
      if (d.sections.length !== ref.sections.length) {
        erreurs.push(
          `legal.${doc}.${lang} : ${d.sections.length} section(s) au lieu de ${ref.sections.length} (fr)`,
        )
      }
      d.sections.forEach((s, i) => {
        const [titre, texte] = Array.isArray(s) ? s : []
        const paras = Array.isArray(texte) ? texte : [texte]
        if (typeof titre !== 'string' || !titre || paras.some((p) => typeof p !== 'string' || !p)) {
          erreurs.push(`legal.${doc}.${lang} : section ${i + 1} doit être [titre, paragraphe]`)
        }
        if (/<[a-z/]/i.test([titre, ...paras].join(' '))) {
          erreurs.push(`legal.${doc}.${lang} : section ${i + 1} contient du HTML`)
        }
      })
      if (JSON.stringify(d).includes(TIRET_LONG)) {
        erreurs.push(`legal.${doc}.${lang} : tiret long (U+2014)`)
      }
    }
  }
  return erreurs
}

// ---------------------------------------------------------------------------
// 3. Lecture du dépôt
// ---------------------------------------------------------------------------

function fichiersSource(dir, acc = []) {
  for (const entree of readdirSync(dir, { withFileTypes: true })) {
    const chemin = join(dir, entree.name)
    if (entree.isDirectory()) fichiersSource(chemin, acc)
    else if (/\.(js|jsx)$/.test(entree.name) && !/\.test\.(js|jsx)$/.test(entree.name)) {
      acc.push(chemin)
    }
  }
  return acc
}

export async function chargerDictionnaires(root) {
  const i18n = join(root, 'src', 'i18n')
  const sources = {}
  const principal = {}
  for (const lang of LANGS) {
    principal[lang] = (await import(pathToFileURL(join(i18n, `${lang}.js`)).href)).default
  }
  sources['src/i18n/{fr,en,es,pt}.js'] = principal
  const partsDir = join(i18n, 'parts')
  for (const f of readdirSync(partsDir).filter((f) => f.endsWith('.js')).sort()) {
    const mod = await import(pathToFileURL(join(partsDir, f)).href)
    sources[`src/i18n/parts/${f}`] = mod.default || {}
  }
  return sources
}

export function analyserSources(root) {
  const src = join(root, 'src')
  const exclus = /[\\/]src[\\/]i18n[\\/](fr|en|es|pt)\.js$|[\\/]src[\\/]i18n[\\/]parts[\\/]/
  const appels = []
  const prefixes = []
  const litteraux = new Set()
  let fichiers = 0
  for (const chemin of fichiersSource(src)) {
    if (exclus.test(chemin)) continue
    fichiers++
    const source = readFileSync(chemin, 'utf8')
    const rel = relative(root, chemin)
    const r = extraireAppels(source, rel)
    appels.push(...r.appels)
    prefixes.push(...r.prefixes)
    for (const l of extraireLitteraux(source)) litteraux.add(l)
  }
  return { appels, prefixes, litteraux, fichiers }
}

export async function lancer(root, { quiet = false } = {}) {
  const sources = await chargerDictionnaires(root)
  const { appels, prefixes, litteraux, fichiers } = analyserSources(root)
  const resultat = verifier({ sources, appels, prefixesDynamiquesAppeles: prefixes, litteraux })
  const legal = await import(pathToFileURL(join(root, 'src', 'content', 'legal.js')).href)
  resultat.erreurs.push(...verifierLegal(legal.LEGAL))

  const { erreurs, avertissements, stats } = resultat
  const lignes = [
    `i18n-check : ${stats.cles} clés dans ${stats.sources} source(s), ${stats.appels} appel(s) t()/tn() dans ${fichiers} fichier(s), textes légaux ${Object.keys(legal.LEGAL || {}).length} document(s)`,
  ]
  if (erreurs.length) {
    lignes.push(`✖ ${erreurs.length} erreur(s)`)
    erreurs.forEach((e) => lignes.push(`  · ${e}`))
  }
  if (avertissements.length && !quiet) {
    lignes.push(`⚠ ${avertissements.length} avertissement(s)`)
    avertissements.forEach((a) => lignes.push(`  · ${a}`))
  }
  if (!erreurs.length) lignes.push(avertissements.length ? '✓ aucune erreur' : '✓ tout est cohérent')
  return { ok: erreurs.length === 0, texte: lignes.join('\n'), erreurs, avertissements }
}

async function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..')
  const quiet = process.argv.includes('--quiet')
  const r = await lancer(root, { quiet })
  console.log(r.texte)
  process.exit(r.ok ? 0 : 1)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error(`i18n-check : ${e && e.message ? e.message : e}`)
    process.exit(1)
  })
}
