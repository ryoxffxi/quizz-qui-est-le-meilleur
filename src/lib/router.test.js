import { describe, expect, it } from 'vitest'
import { HOME, isCategoryAvailable, isGameScreen, parseLocation, pathFor, titleFor } from './router'
import { encodeChallenge, encodeResult } from './challengeLink'

const loc = (pathname, search = '', hash = '') => ({ pathname, search, hash })
const fr = { lang: 'fr' }
const en = { lang: 'en' }

// Traduction factice : renvoie la clé, lisible dans les assertions.
const t = (key) => ({ app_name: 'Quizz', app_title: 'Quizz - Qui est le meilleur ?' })[key] ?? key

describe('parseLocation : chemins du contrat', () => {
  it('/ → accueil sans onglet imposé', () => {
    expect(parseLocation(loc('/'), fr)).toEqual({ screen: 'home' })
    expect(parseLocation(loc('/', '?source=pwa'), fr)).toEqual({ screen: 'home' })
  })

  it('/revision/panneaux → accueil onglet Panneaux (FR), indisponible hors FR', () => {
    expect(parseLocation(loc('/revision/panneaux'), fr)).toEqual({ screen: 'home', tab: 'panneaux' })
    expect(parseLocation(loc('/revision/panneaux/'), fr)).toEqual({ screen: 'home', tab: 'panneaux' })
    expect(parseLocation(loc('/revision/panneaux'), en)).toEqual({
      screen: 'home',
      notice: 'app_link_unavailable',
    })
  })

  it('/jouer/<cat>/<niveau> → solo', () => {
    expect(parseLocation(loc('/jouer/culture-generale/expert'), fr)).toEqual({
      screen: 'solo',
      categoryId: 'culture-generale',
      difficulty: 'expert',
    })
    expect(parseLocation(loc('/jouer/manga-anime/facile/'), en)).toEqual({
      screen: 'solo',
      categoryId: 'manga-anime',
      difficulty: 'facile',
    })
  })

  it('/jouer avec un niveau inconnu n’est pas une route', () => {
    expect(parseLocation(loc('/jouer/culture-generale/moyen'), fr)).toBeNull()
    expect(parseLocation(loc('/jouer/culture-generale'), fr)).toBeNull()
  })

  it('/erreurs/<cat> → rejouer mes erreurs', () => {
    expect(parseLocation(loc('/erreurs/cinema-series'), fr)).toEqual({
      screen: 'errors',
      categoryId: 'cinema-series',
    })
  })

  it('/defi/<cat>/<niveau> → réglages du défi', () => {
    expect(parseLocation(loc('/defi/code-route/expert'), fr)).toEqual({
      screen: 'challengeSetup',
      categoryId: 'code-route',
      difficulty: 'expert',
    })
  })

  it('/examen et /flashcards existent seulement en français', () => {
    expect(parseLocation(loc('/examen'), fr)).toEqual({ screen: 'exam' })
    expect(parseLocation(loc('/flashcards'), fr)).toEqual({ screen: 'flashcards' })
    expect(parseLocation(loc('/examen'), en)).toEqual({ screen: 'home', notice: 'app_link_unavailable' })
    expect(parseLocation(loc('/flashcards'), { lang: 'es' })).toEqual({
      screen: 'home',
      notice: 'app_link_unavailable',
    })
  })

  it('/quotidien → défi du jour, catégorie de la query si valide', () => {
    expect(parseLocation(loc('/quotidien'), fr)).toEqual({ screen: 'daily', categoryId: null })
    expect(parseLocation(loc('/quotidien', '?cat=manga-anime'), en)).toEqual({
      screen: 'daily',
      categoryId: 'manga-anime',
    })
    // Catégorie inconnue ou réservée au FR : on retombe sur la préférence (null).
    expect(parseLocation(loc('/quotidien', '?cat=bogus'), fr)).toEqual({ screen: 'daily', categoryId: null })
    expect(parseLocation(loc('/quotidien', '?cat=code-route'), en)).toEqual({
      screen: 'daily',
      categoryId: null,
    })
  })

  it('une adresse hors contrat renvoie null', () => {
    expect(parseLocation(loc('/panneaux/ab1'), fr)).toBeNull()
    expect(parseLocation(loc('/a-propos'), fr)).toBeNull()
    expect(parseLocation(loc('/jouer/../culture-generale/facile'), fr)).toBeNull()
  })
})

describe('parseLocation : catégorie inconnue ou réservée au français', () => {
  it('catégorie inconnue → accueil avec message', () => {
    expect(parseLocation(loc('/jouer/bogus/facile'), fr)).toEqual({
      screen: 'home',
      notice: 'app_link_unavailable',
    })
    expect(parseLocation(loc('/erreurs/bogus'), fr)).toEqual({ screen: 'home', notice: 'app_link_unavailable' })
    expect(parseLocation(loc('/defi/bogus/facile'), fr)).toEqual({
      screen: 'home',
      notice: 'app_link_unavailable',
    })
  })

  it('code-route et panneaux hors FR → accueil avec message', () => {
    expect(parseLocation(loc('/jouer/code-route/facile'), en)).toEqual({
      screen: 'home',
      notice: 'app_link_unavailable',
    })
    expect(parseLocation(loc('/defi/panneaux/expert'), { lang: 'pt' })).toEqual({
      screen: 'home',
      notice: 'app_link_unavailable',
    })
    expect(parseLocation(loc('/jouer/code-route/facile'), fr).screen).toBe('solo')
  })

  it('isCategoryAvailable', () => {
    expect(isCategoryAvailable('code-route', 'fr')).toBe(true)
    expect(isCategoryAvailable('code-route', 'en')).toBe(false)
    expect(isCategoryAvailable('culture-generale', 'en')).toBe(true)
    expect(isCategoryAvailable('bogus', 'fr')).toBe(false)
  })
})

describe('parseLocation : anciens liens', () => {
  it('/?jouer=<cat>&niveau=<niveau> → solo', () => {
    expect(parseLocation(loc('/', '?jouer=manga-anime&niveau=expert'), fr)).toEqual({
      screen: 'solo',
      categoryId: 'manga-anime',
      difficulty: 'expert',
    })
    // niveau absent ou inconnu → facile
    expect(parseLocation(loc('/', '?jouer=cinema-series'), fr).difficulty).toBe('facile')
    expect(parseLocation(loc('/', '?jouer=cinema-series&niveau=x'), fr).difficulty).toBe('facile')
  })

  it('/?jouer= avec une catégorie inconnue → accueil avec message', () => {
    expect(parseLocation(loc('/', '?jouer=bogus&niveau=facile'), fr)).toEqual({
      screen: 'home',
      notice: 'app_link_unavailable',
    })
  })

  it('/?onglet=panneaux → accueil onglet Panneaux', () => {
    expect(parseLocation(loc('/', '?onglet=panneaux'), fr)).toEqual({ screen: 'home', tab: 'panneaux' })
    expect(parseLocation(loc('/', '?onglet=panneaux'), en)).toEqual({
      screen: 'home',
      notice: 'app_link_unavailable',
    })
  })
})

describe('parseLocation : hash prioritaire', () => {
  const invite = { p: 'Léa', c: 'culture-generale', d: 'facile', s: 42, n: 3, r: [1000, 900, 0], l: 'fr' }
  const result = { solo: 1, c: 'manga-anime', d: 'expert', l: 'fr', sc: 8, tot: 10, mode: 'solo' }

  it('#defi= ouvre l’invitation, même sur un autre chemin', () => {
    const hash = `#defi=${encodeChallenge(invite)}`
    expect(parseLocation(loc('/', '', hash), fr)).toEqual({ screen: 'invite', invite })
    expect(parseLocation(loc('/jouer/cinema-series/facile', '', hash), fr)).toEqual({
      screen: 'invite',
      invite,
    })
  })

  it('#resultat= ouvre la page de résultat et prime sur #defi=', () => {
    const hash = `#resultat=${encodeResult(result)}&defi=${encodeChallenge(invite)}`
    expect(parseLocation(loc('/', '', hash), fr)).toEqual({ screen: 'result', result })
  })

  it('un défi de code de la route reste lisible hors FR (catégorie existante)', () => {
    const inv = { ...invite, c: 'code-route' }
    expect(parseLocation(loc('/', '', `#defi=${encodeChallenge(inv)}`), en)).toEqual({
      screen: 'invite',
      invite: inv,
    })
  })

  it('hash illisible ou catégorie inconnue → accueil avec message', () => {
    expect(parseLocation(loc('/', '', '#defi=!!!'), fr)).toEqual({
      screen: 'home',
      notice: 'app_link_unavailable',
    })
    const bogus = encodeResult({ ...result, c: 'bogus' })
    expect(parseLocation(loc('/', '', `#resultat=${bogus}`), fr)).toEqual({
      screen: 'home',
      notice: 'app_link_unavailable',
    })
  })
})

describe('pathFor et aller-retour', () => {
  const routes = [
    { screen: 'home' },
    { screen: 'home', tab: 'panneaux' },
    { screen: 'solo', categoryId: 'culture-generale', difficulty: 'expert' },
    { screen: 'errors', categoryId: 'code-route' },
    { screen: 'challengeSetup', categoryId: 'manga-anime', difficulty: 'facile' },
    { screen: 'exam' },
    { screen: 'daily', categoryId: null },
    { screen: 'daily', categoryId: 'cinema-series' },
    { screen: 'flashcards' },
  ]

  it('parse(pathFor(route)) redonne la route', () => {
    for (const route of routes) {
      const path = pathFor(route)
      const url = new URL(path, 'https://quizz.test')
      expect(parseLocation(url, fr)).toEqual(route)
    }
  })

  it('chemins exacts du contrat', () => {
    expect(pathFor({ screen: 'home' })).toBe('/')
    expect(pathFor(HOME)).toBe('/')
    expect(pathFor({ screen: 'home', tab: 'panneaux' })).toBe('/revision/panneaux')
    expect(pathFor({ screen: 'solo', categoryId: 'code-route', difficulty: 'facile' })).toBe(
      '/jouer/code-route/facile',
    )
    expect(pathFor({ screen: 'errors', categoryId: 'code-route' })).toBe('/erreurs/code-route')
    expect(pathFor({ screen: 'challengeSetup', categoryId: 'panneaux', difficulty: 'expert' })).toBe(
      '/defi/panneaux/expert',
    )
    expect(pathFor({ screen: 'exam' })).toBe('/examen')
    expect(pathFor({ screen: 'daily', categoryId: 'manga-anime' })).toBe('/quotidien?cat=manga-anime')
    expect(pathFor({ screen: 'daily' })).toBe('/quotidien')
    expect(pathFor({ screen: 'flashcards' })).toBe('/flashcards')
    expect(pathFor(null)).toBe('/')
    expect(pathFor({ screen: 'inconnu' })).toBe('/')
  })

  it('la partie de défi reste sur /defi/<cat>/<niveau>', () => {
    const config = { categoryId: 'culture-generale', difficulty: 'expert', seed: 1, mode: 'host' }
    expect(pathFor({ screen: 'challenge', config })).toBe('/defi/culture-generale/expert')
    // Une partie rechargée redonne les réglages du défi (pas la partie).
    expect(parseLocation(new URL(pathFor({ screen: 'challenge', config }), 'https://q.test'), fr)).toEqual({
      screen: 'challengeSetup',
      categoryId: 'culture-generale',
      difficulty: 'expert',
    })
  })

  it('invitation et résultat vivent dans le hash de /', () => {
    const invite = { c: 'culture-generale', d: 'facile', s: 7 }
    const result = { solo: 1, c: 'culture-generale', d: 'facile', sc: 3, tot: 10 }
    const pInvite = pathFor({ screen: 'invite', invite })
    const pResult = pathFor({ screen: 'result', result })
    expect(pInvite.startsWith('/#defi=')).toBe(true)
    expect(pResult.startsWith('/#resultat=')).toBe(true)
    expect(parseLocation(new URL(pInvite, 'https://q.test'), fr)).toEqual({ screen: 'invite', invite })
    expect(parseLocation(new URL(pResult, 'https://q.test'), fr)).toEqual({ screen: 'result', result })
  })
})

describe('titleFor', () => {
  it('accueil = titre de l’app, onglet panneaux nommé', () => {
    expect(titleFor({ screen: 'home' }, t)).toBe('Quizz - Qui est le meilleur ?')
    expect(titleFor({ screen: 'home', tab: 'panneaux' }, t)).toBe('cat_panneaux · Quizz')
    expect(titleFor(null, t)).toBe('Quizz - Qui est le meilleur ?')
  })

  it('écrans de jeu : libellés séparés par « · », app en dernier', () => {
    expect(titleFor({ screen: 'solo', categoryId: 'code-route', difficulty: 'facile' }, t)).toBe(
      'cat_route · diff_facile · Quizz',
    )
    expect(titleFor({ screen: 'errors', categoryId: 'manga-anime' }, t)).toBe('errors_title · cat_manga · Quizz')
    expect(titleFor({ screen: 'challengeSetup', categoryId: 'cinema-series', difficulty: 'expert' }, t)).toBe(
      'challenge_title · cat_cinema · diff_expert · Quizz',
    )
    expect(
      titleFor({ screen: 'challenge', config: { categoryId: 'cinema-series', difficulty: 'facile' } }, t),
    ).toBe('challenge_title · cat_cinema · diff_facile · Quizz')
    expect(titleFor({ screen: 'exam' }, t)).toBe('exam_title · Quizz')
    expect(titleFor({ screen: 'daily', categoryId: 'manga-anime' }, t)).toBe('daily_title · cat_manga · Quizz')
    expect(titleFor({ screen: 'daily', categoryId: null }, t)).toBe('daily_title · Quizz')
    expect(titleFor({ screen: 'flashcards' }, t)).toBe('flash_title · Quizz')
    expect(titleFor({ screen: 'invite', invite: { c: 'culture-generale' } }, t)).toBe(
      'challenge_title · cat_culture · Quizz',
    )
    expect(titleFor({ screen: 'result', result: { c: 'bogus' } }, t)).toBe('app_title_result · Quizz')
  })
})

describe('isGameScreen', () => {
  it('écrans en partie (sans footer)', () => {
    for (const s of ['solo', 'errors', 'challenge', 'exam', 'daily', 'flashcards']) {
      expect(isGameScreen(s)).toBe(true)
    }
    for (const s of ['home', 'challengeSetup', 'invite', 'result', undefined]) {
      expect(isGameScreen(s)).toBe(false)
    }
  })
})
