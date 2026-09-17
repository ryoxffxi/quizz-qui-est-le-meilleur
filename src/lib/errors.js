// Banque d'erreurs persistante, par catégorie : les questions ratées y entrent,
// et en sortent après deux bonnes réponses consécutives. Sert au mode
// « Mes erreurs » et au bouton « Rejouer mes erreurs (n) ».
// Clé : quizz_errors_<cat> → { [id]: { fails, okStreak, last } }.
const KEY = (cat) => `quizz_errors_${cat}`
const REMOVE_AFTER = 2 // bonnes réponses consécutives avant retrait

function load(cat) {
  try {
    const raw = localStorage.getItem(KEY(cat))
    if (raw) {
      const obj = JSON.parse(raw)
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj
    }
  } catch {
    /* localStorage indisponible ou contenu illisible */
  }
  return {}
}

function save(cat, obj) {
  try {
    if (Object.keys(obj).length === 0) localStorage.removeItem(KEY(cat))
    else localStorage.setItem(KEY(cat), JSON.stringify(obj))
  } catch {
    /* ignore */
  }
}

// Mauvaise réponse : la question entre (ou reste) dans la banque.
export function recordFail(cat, id) {
  if (!cat || !id) return
  const bank = load(cat)
  const cur = bank[id] || { fails: 0, okStreak: 0, last: null }
  bank[id] = { fails: cur.fails + 1, okStreak: 0, last: new Date().toISOString() }
  save(cat, bank)
}

// Bonne réponse : deuxième réussite consécutive → la question est retirée.
// Sans effet si la question n'est pas dans la banque.
export function recordSuccess(cat, id) {
  if (!cat || !id) return
  const bank = load(cat)
  const cur = bank[id]
  if (!cur) return
  const okStreak = (cur.okStreak || 0) + 1
  if (okStreak >= REMOVE_AFTER) delete bank[id]
  else bank[id] = { ...cur, okStreak, last: new Date().toISOString() }
  save(cat, bank)
}

// Ids à revoir, les plus ratées d'abord (puis les plus récentes).
// `validIds` (Set ou itérable d'ids, facultatif) : ids présents dans la banque
// de questions courante. Les entrées qui n'y figurent plus (questions retirées
// ou renommées par une vague de contenu) sont ignorées ET purgées du stockage,
// pour que countErrors et « Rejouer mes erreurs (n) » restent justes.
export function getErrorIds(cat, validIds) {
  let bank = load(cat)
  if (validIds != null) {
    const valid = validIds instanceof Set ? validIds : new Set(validIds)
    const stale = Object.keys(bank).filter((id) => !valid.has(id))
    if (stale.length > 0) {
      bank = { ...bank }
      for (const id of stale) delete bank[id]
      save(cat, bank)
    }
  }
  return Object.keys(bank).sort((a, b) => {
    const d = (bank[b].fails || 0) - (bank[a].fails || 0)
    if (d !== 0) return d
    return String(bank[b].last || '').localeCompare(String(bank[a].last || ''))
  })
}

export function countErrors(cat) {
  return Object.keys(load(cat)).length
}

export function clearErrors(cat) {
  save(cat, {})
}
