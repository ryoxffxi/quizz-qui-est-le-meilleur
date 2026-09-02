# Quizz - Qui est le meilleur ? 🎯

Site de quiz fun et mobile-first pour tester ses connaissances, seul ou en défi
entre potes — sans compte. Thème sombre, transitions douces, effets sonores
générés via la Web Audio API.

## Lancer en local

```bash
npm install      # une seule fois
npm run dev      # serveur de développement
```

Ouvre ensuite **http://localhost:5173/**

## Build de production

```bash
npm run build    # génère le dossier dist/
npm run preview  # prévisualise le build de production
```

## Déploiement

Déploiement automatique sur Cloudflare Workers (assets statiques + Worker
premium) à chaque push sur `main`, via GitHub Actions (`.github/workflows/deploy.yml`).
`npm run build` enchaîne : compteurs de questions → build Vite → pages statiques.

## Pages statiques (SEO, examen AdSense)

L'app est une SPA : sans JavaScript, le HTML brut était vide. Deux mécanismes
donnent un vrai contenu aux robots et aux navigateurs sans JS :

- `scripts/vite-plugin-home-shell.mjs` pré-remplit `<div id="root">` de l'accueil
  (React le remplace au montage) ;
- `scripts/build-pages.mjs` (`npm run pages`, après `vite build`) génère dans `dist/`
  les fiches des 62 panneaux (`/panneaux/<id>`), une page par thème avec des
  exemples de questions (`/quiz/<catégorie>`), `/a-propos`, `/contact`,
  `/confidentialite`, `/conditions` et le `sitemap.xml` complet.

Les textes partagés (catégories, contact) sont dans `scripts/site-data.mjs`.
Les pages statiques renvoient vers le jeu par des liens profonds :
`/?jouer=<catégorie>&niveau=facile|expert` et `/?onglet=panneaux`.

## Organisation du contenu

Les questions sont rangées dans `src/content/`, **un fichier JSON par
catégorie**. Chaque question suit ce format exact :

```json
{
  "id": "manga_0001",
  "category": "manga-anime",
  "difficulty": "facile",
  "tier": "free",
  "question": "…",
  "options": ["…", "…", "…", "…"],
  "correct": 0,
  "explanation": "…"
}
```

- `difficulty` : `"facile"` ou `"expert"`
- `tier` : `"free"` ou `"account"`
- `correct` : index de la bonne réponse (0 à 3)
- `id` : unique et stable (ex. `manga_0001`)

Pour ajouter une catégorie : créer un nouveau fichier JSON dans `src/content/`
puis l'enregistrer dans `src/content/index.js` (label, emoji, dégradé).

## Modes de jeu

- **Réviser solo** : toute la banque de la catégorie, réponse modifiable avant
  validation, correction immédiate + explication, récap des erreurs à la fin.
- **Défi entre potes** : 5 questions, chronomètre par question (10 s en Facile,
  7 s en Expert) avec barre qui se vide, score pondéré par la vitesse façon
  Kahoot, pas de correction immédiate, puis écran « Toi vs un ami »
  (score de l'ami simulé pour l'instant).
