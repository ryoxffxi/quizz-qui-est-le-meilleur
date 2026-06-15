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

## Déploiement sur Cloudflare Pages

Le projet est prêt pour Cloudflare Pages (site 100 % statique) :

- **Build command** : `npm run build`
- **Output directory** : `dist`
- **Node version** : 20+

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
