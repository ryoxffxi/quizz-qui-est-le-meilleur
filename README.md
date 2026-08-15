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
  Kahoot, pas de correction immédiate. Le défi se joue par lien partagé
  (mêmes questions pour les deux joueurs), avec un écran « Toi vs un ami » ;
  un mode « ami simulé » reste disponible pour tester seul.
- **Panneaux** : révision des panneaux par famille + quiz dédié avec visuels.

## Publicité (AdSense) & Premium

La monétisation est volontairement légère : **une seule pub**, sur l'écran de
résultat après un quiz (`ResultAd`), jamais pendant le jeu ni sur la page
d'arrivée d'un lien partagé. Le Premium retire toute publicité.

État de l'intégration :

- Le script AdSense est chargé depuis `index.html` avec l'ID éditeur
  (`ca-pub-1164405138212191`) — sert aussi à la vérification du site.
- `public/ads.txt` est en place (requis par AdSense, sinon « revenus menacés »).
- Le consentement UE (RGPD) est géré par le CMP certifié de Google :
  AdSense → **Confidentialité et messages** → activer le message consentement.
- Tant qu'aucun bloc d'annonce n'est configuré, aucune pub ne s'affiche :
  l'encart devient une promo Premium.

Pour activer la diffusion (une fois le compte AdSense validé) :

1. AdSense → Annonces → **Par bloc d'annonces** → créer un bloc « Display ».
2. Copier son ID (`data-ad-slot`) dans la variable d'environnement
   `VITE_ADSENSE_SLOT_RESULT` (Cloudflare Pages → Settings → Variables), puis
   redéployer — ou en repli, le coller en dur dans `src/lib/ads.js`.
