// Mémoire locale des duels (clé quizz_duels) et du pseudo (clé quizz_pseudo).
// Aucun compte : tout reste sur l'appareil. Sert à la section « Mes duels » de
// l'accueil et à la revanche (adversaire mémorisé).
//
// Duel : { seed, cat, diff, opponent, myScores, theirScores, date, status }
//   status : 'sent'     = j'ai lancé un défi (lien partagé, en attente)
//            'played'   = j'ai joué le défi de quelqu'un
//            'answered' = quelqu'un a répondu à mon défi (lien de résultat ouvert)
const KEY = 'quizz_duels'
const PSEUDO_KEY = 'quizz_pseudo'
export const DUELS_MAX = 50
const STATUSES = ['sent', 'played', 'answered']

const isInt = (v) => Number.isInteger(v)
const scores = (v) => (Array.isArray(v) ? v.filter((x) => Number.isFinite(x)) : [])

// Ramène une entrée lue à une forme sûre, ou null si inutilisable.
function normalize(raw) {
  if (!raw || typeof raw !== 'object') return null
  if (!isInt(raw.seed) || typeof raw.cat !== 'string' || typeof raw.diff !== 'string') return null
  return {
    seed: raw.seed,
    cat: raw.cat,
    diff: raw.diff,
    opponent: typeof raw.opponent === 'string' ? raw.opponent : null,
    myScores: scores(raw.myScores),
    theirScores: scores(raw.theirScores),
    date: typeof raw.date === 'string' ? raw.date : '',
    status: STATUSES.includes(raw.status) ? raw.status : 'sent',
  }
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return arr.map(normalize).filter(Boolean).slice(0, DUELS_MAX)
    }
  } catch {
    /* localStorage indisponible ou contenu illisible */
  }
  return []
}

function save(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* navigation privée ou quota : l'historique ne survivra pas, sans gravité */
  }
}

// Historique, le plus récent d'abord (copie modifiable).
export function getDuels() {
  return load()
}

// Duel identifié par (seed, cat, diff), ou null.
export function findDuel(seed, cat, diff) {
  return load().find((d) => d.seed === seed && d.cat === cat && d.diff === diff) || null
}

// Ajoute ou met à jour un duel (même graine + catégorie + difficulté = même
// duel) : les champs fournis écrasent les anciens, l'entrée remonte en tête,
// et la liste est plafonnée à DUELS_MAX. Renvoie la liste à jour.
export function recordDuel(duel) {
  const entry = normalize({ ...duel, date: duel?.date || new Date().toISOString() })
  if (!entry) return load()
  const list = load()
  const i = list.findIndex(
    (d) => d.seed === entry.seed && d.cat === entry.cat && d.diff === entry.diff,
  )
  let merged = entry
  if (i >= 0) {
    const prev = list[i]
    merged = {
      ...prev,
      ...entry,
      // Ne pas effacer ce qu'on savait déjà par un champ vide.
      opponent: entry.opponent ?? prev.opponent,
      myScores: entry.myScores.length ? entry.myScores : prev.myScores,
      theirScores: entry.theirScores.length ? entry.theirScores : prev.theirScores,
    }
    list.splice(i, 1)
  }
  list.unshift(merged)
  const trimmed = list.slice(0, DUELS_MAX)
  save(trimmed)
  return trimmed
}

export function clearDuels() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

// ===== Pseudo mémorisé =====

export function getPseudo() {
  try {
    const v = localStorage.getItem(PSEUDO_KEY)
    return typeof v === 'string' ? v.slice(0, 20) : ''
  } catch {
    return ''
  }
}

// Mémorise le pseudo saisi (vide = oubli).
export function setPseudo(name) {
  try {
    const v = String(name || '').trim().slice(0, 20)
    if (v) localStorage.setItem(PSEUDO_KEY, v)
    else localStorage.removeItem(PSEUDO_KEY)
  } catch {
    /* ignore */
  }
}
