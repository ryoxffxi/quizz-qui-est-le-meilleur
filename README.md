# Quizzo (Quizz, ryo-offc.com)

Jeu de quiz gratuit, sans compte, mobile-first, à jouer seul ou entre potes.
Le code de la route est le thème principal (examen blanc, panneaux, pièges) ;
la culture générale, les mangas et le cinéma complètent la banque, en quatre
langues (français, anglais, espagnol, portugais brésilien). Environ 2 140
questions, chargées catégorie par catégorie.

Pile : React 19, Vite 8, modules ES, Cloudflare Workers (assets statiques +
Worker `worker/index.js`), base D1 pour le premium. Aucune dépendance runtime
en dehors de React, lucide-react et html-to-image.

## Modes de jeu

- **Solo** : lots de 10 questions, correction immédiate avec explication, sans
  chrono. Les questions déjà vues ne reviennent pas avant la fin de la banque
  (mémoire par catégorie et niveau dans le navigateur).
- **Défi entre potes** : manches de 5 questions chronométrées (10 s en Facile,
  7 s en Expert), score pondéré par la vitesse. Le lien de résultat contient une
  graine : l'ami rejoue exactement les mêmes questions dans le même ordre.
- **Examen blanc** (code de la route) : 40 questions dont 8 de panneaux, 20 s
  par question, reçu à partir de 35 bonnes réponses, sans correction pendant
  l'épreuve. Une moyenne de 37 ou plus sur les trois derniers examens blancs
  signale que le joueur est prêt.
- **Défi du jour** : 10 questions identiques pour tout le monde, une fois par
  jour, avec série de jours joués.
- **Mes erreurs** : les questions ratées sont conservées par catégorie et
  rejouées ; deux bonnes réponses d'affilée retirent une question de la liste.
- **Panneaux** : révision des 62 panneaux essentiels par famille (fiche,
  visuel SVG, signification, pièges) et **flashcards**.

Deux niveaux partout (Facile, Expert). Pas de compte, pas de classement. La
seule monétisation est l'offre sans publicité (Premium via Stripe, voir
`PREMIUM-SETUP.md`), masquée tant que `PREMIUM_LIVE` est à `false`.

## Architecture

- `src/App.jsx` : coquille, routage (chemins de l'app ci-dessous), modales.
- `src/components/` : écrans (SoloQuiz, ChallengeQuiz, ExamQuiz, DailyQuiz,
  Flashcards, ErrorRecap, PanneauxRevision, SignImage, ShareCard...).
- `src/lib/` : logique pure. `quiz.js` (mélange, paquets à graine FNV-1a +
  mulberry32), `game.js` (constantes et score), `stats.js` (statistiques,
  série, historique), `errors.js` (banque d'erreurs), `revision.js` (questions
  vues), `share.js` (partage natif ou presse-papier), `sound.js` (Web Audio),
  `analytics.js` (`track()` par `sendBeacon` vers `/api/ev`, sans cookie).
- `src/content/` : **banques paresseuses**. Chaque catégorie est un fichier
  JSON importé dynamiquement (`load: () => import(...)`) : un chunk par banque,
  téléchargé seulement quand on joue la catégorie. `counts.json` (généré) donne
  les compteurs sans charger les banques. `panneaux/` porte les 62 panneaux
  (`signs.js` + `details.js` + `confusions.js`), `legal.js` le texte légal
  complet (source unique des pages légales, app et statiques).
- `src/i18n/` : `fr.js`, `en.js`, `es.js`, `pt.js` + `parts/<feature>.js`
  (fusionnés automatiquement dans `t()`).
- `src/styles/<feature>.css` : styles par fonctionnalité ; `src/index.css`
  porte les tokens (`--accent`, `--surface`, `--text`, `--radius`...).
- `worker/index.js` : `/api/*` (Stripe Checkout, webhook, entitlement,
  événements), réécriture des chemins de l'app vers `index.html`, `404.html`
  pour le reste (`not_found_handling: "404-page"`).
- `scripts/` : outillage de build et de contenu (voir plus bas).
- PWA : `public/manifest.webmanifest` et icônes dans `public/icons/`
  (installable sur l'écran d'accueil, plein écran sur iOS). `public/_headers`
  fixe le cache (assets hachés et polices immuables un an, manifeste et
  éventuel `sw.js` toujours revalidés) et les en-têtes de sécurité (nosniff,
  Referrer-Policy, Permissions-Policy, X-Frame-Options).

### Pages statiques (SEO, examen AdSense)

L'app est une SPA : sans JavaScript, le HTML brut était vide. Deux mécanismes
donnent un vrai contenu aux robots et aux navigateurs sans JS :

- `scripts/vite-plugin-home-shell.mjs` pré-remplit `<div id="root">` de
  l'accueil (H1 ciblé, cartes vers les chemins de l'app, blocs inertes aux
  classes de l'app pour éviter le saut de mise en page) et remplace `{{TOTAL}}`
  dans `index.html` par le nombre de questions. React remplace la coquille au
  montage.
- `scripts/build-pages.mjs` (`npm run pages`, après `vite build`) génère dans
  `dist/` : `/quiz/` (hub), `/quiz/<catégorie>`,
  `/code-de-la-route/examen-blanc`, `/panneaux/`, `/panneaux/<id>`,
  `/panneaux/pieges`, `/a-propos`, `/contact`, `/confidentialite`,
  `/conditions`, `/404.html` et `sitemap.xml` (avec `lastmod` lu dans
  l'historique git de chaque source, repli sur la date du build).

Les textes partagés (catégories, faits sur l'examen, thèmes officiels,
contrat d'URL) sont dans `scripts/site-data.mjs`. Les pages sans contenu
éditorial (contact, légal, 404) ne chargent pas AdSense.

## Contrat d'URL

Chemins de l'app (servis par `index.html`, réécrits par le Worker) :

```
/                                   accueil
/jouer/<cat>/<facile|expert>        solo
/defi/<cat>/<facile|expert>         défi entre potes
/examen                             examen blanc
/quotidien                          défi du jour
/erreurs/<cat>                      mes erreurs
/revision/panneaux                  révision des panneaux
/flashcards                         flashcards
```

Hash conservés sur `/` : `#defi=...` (invitation) et `#resultat=...`
(résultat partagé). Anciens liens profonds toujours acceptés :
`/?jouer=<cat>&niveau=...` et `/?onglet=panneaux`.

Pages statiques : `/panneaux/`, `/panneaux/<id>`, `/panneaux/pieges`,
`/quiz/`, `/quiz/<cat>`, `/code-de-la-route/examen-blanc`, `/a-propos`,
`/contact`, `/confidentialite`, `/conditions`, `/404.html`.

Catégories : `code-route`, `panneaux`, `culture-generale`, `manga-anime`,
`cinema-series` (ids stables, ils voyagent dans les liens partagés).

## Format des questions

Un fichier JSON par catégorie dans `src/content/`. Champs :

```json
{
  "id": "route_0042",
  "category": "code-route",
  "difficulty": "facile",
  "theme": "circulation",
  "question": { "fr": "...", "en": "...", "es": "...", "pt": "..." },
  "options": { "fr": ["...", "...", "...", "..."], "en": ["..."], "es": ["..."], "pt": ["..."] },
  "correct": 0,
  "explanation": { "fr": "...", "en": "...", "es": "...", "pt": "..." },
  "image": "b15",
  "optionImages": ["b15", "c18", "ab4", "ab3a"]
}
```

- `difficulty` : `facile` ou `expert`.
- `question`, `options`, `explanation` : objets par langue (`fr` obligatoire ;
  les catégories `code-route` et `panneaux` n'ont que le français).
- `correct` : index de la bonne réponse dans `options` (0 à 3). L'app permute
  les options à chaque partie et recalcule `correct`.
- `image` (facultatif) : id de panneau (`src/content/panneaux/signs.js`),
  affiché au-dessus de la question.
- `optionImages` (facultatif) : quatre ids de panneaux alignés sur `options`,
  qui restent les noms (texte masqué visuellement, conservé pour l'accessibilité).
- `theme` (code de la route) : l'un des 10 thèmes officiels de l'examen
  (`EXAM_THEMES` dans `scripts/site-data.mjs`).
- `id` : unique et stable ; on ne renumérote jamais (`scripts/remove-questions.mjs`).

Pour ajouter une catégorie : créer le JSON, l'enregistrer dans
`src/content/index.js` (id, banque, clé i18n, emoji, dégradé, import
dynamique) et dans `CATS` de `scripts/site-data.mjs`, puis `npm run counts`.

## Scripts npm

| Script | Rôle |
| --- | --- |
| `dev` | serveur de développement Vite (http://localhost:5173/) |
| `build` | `counts` puis `vite build`, `pages` et `size` |
| `preview` | prévisualise `dist/` |
| `lint` | ESLint |
| `test`, `test:watch` | Vitest (`src/**/*.test.js`, `scripts/**/*.test.mjs`, `worker/**/*.test.js`) |
| `check` | lint + tests + audit des banques |
| `qa` | contrôle complet avant déploiement : `check` puis `build` (compteurs, Vite, pages, taille) |
| `counts` | régénère `src/content/counts.json` (après chaque ajout de questions) |
| `audit` | intégrité des banques (ids, 4 langues, doublons, quasi-doublons) |
| `panneaux` | régénère `src/content/panneaux-quiz.json` depuis les panneaux |
| `pages` | pages statiques + sitemap dans `dist/` (après `vite build`) |
| `size` | échoue si `dist/assets/index-*.js` dépasse 320 000 octets (`BUNDLE_MAX` pour ajuster) |
| `events` | rapport d'usage lu dans la table D1 `events` (`--days 30`, `--local`), wrangler connecté |
| `i18n` | clés de traduction orphelines (`--fix` pour les retirer) |

Autres outils : `scripts/merge-questions.mjs` (fusion d'une vague de
questions), `scripts/remove-questions.mjs`, `scripts/panneaux-sheet.mjs`
(planche-contact des SVG).

## Lancer en local

```bash
npm install
npm run dev
```

Le Worker se teste avec `npx wrangler dev` après `npm run build` (variables
locales dans `.dev.vars`, jamais versionné).

## Déploiement

GitHub Actions (`.github/workflows/deploy.yml`) à chaque push sur `main` :
Node lu dans `.nvmrc`, `npm ci`, `npm run lint`, `npm test`, `npm run build`,
puis `npx wrangler deploy` (wrangler est une devDependency épinglée). Un seul
déploiement à la fois (`concurrency: deploy-prod`). Secrets GitHub :
`CLOUDFLARE_API_TOKEN` (Workers Scripts:Edit) et `CLOUDFLARE_ACCOUNT_ID`.

Le Worker sert `dist/` : chemins de l'app vers `index.html` (200), le reste
vers `404.html` (404), `/api/*` en JavaScript. `robots.txt` interdit `/api/`.

## Règles de contenu

- Jamais de tiret long (U+2014) dans un texte affiché : deux-points, virgule
  ou point. `build-pages` avertit s'il en trouve un.
- Les questions et explications du code de la route vouvoient (ton de
  l'épreuve) ; le reste de l'interface tutoie en français.
- Portugais du Brésil ; quatre langues à parité pour toute nouvelle clé i18n.
- Une explication courte par question ; pas de question sans explication.
- Les ids de questions et de catégories ne changent jamais.
- Pas de nouvelle dépendance npm sans raison forte ; le bundle d'accueil doit
  rester sous 320 kB.
