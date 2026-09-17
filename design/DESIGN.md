# Design « Arcade sobre » : tokens, classes partagées, règles

Référence pour tout chantier qui touche l'interface. La feuille de base est
`src/index.css` (chantier design) ; chaque écran ajoute son style dans
`src/styles/<feature>.css`, importé par son composant, en réutilisant les
tokens et classes ci-dessous. Maquette d'origine : `design/maquette-v2.html`.

## 1. Tokens (`:root`)

### Ambiances

Deux ambiances commutables par `data-theme` sur `<html>` (posé avant le
premier rendu par `index.html`, persisté sous `quizz_theme`) :

| Token           | Volt (défaut)                | Crimson                      | Rôle                                   |
| --------------- | ---------------------------- | ---------------------------- | -------------------------------------- |
| `--accent`      | `#d8ff3d`                    | `#ff4155`                    | CTA, pouce du segmenté, anneau de score |
| `--accent-ink`  | `#10140a`                    | `#1c0609`                    | Texte POSÉ SUR l'accent (jamais blanc)  |
| `--accent-soft` | `#e9ff8a`                    | `#ff8391`                    | Accent en texte fin (hints, titres h3)  |
| `--accent-tint` | `rgba(216, 255, 61, 0.13)`   | `rgba(255, 65, 85, 0.14)`    | Fonds teintés (option choisie, halos)   |
| `--accent-glow` | `rgba(216, 255, 61, 0.24)`   | `rgba(255, 65, 85, 0.3)`     | Ombres portées de l'accent              |

### Surfaces et textes

| Token             | Valeur                       | Rôle                                   |
| ----------------- | ---------------------------- | -------------------------------------- |
| `--bg`            | `#0a0d16`                    | Fond de page (= `theme_color` PWA)     |
| `--surface`       | `#141927`                    | Cartes                                 |
| `--surface-2`     | `#1b2233`                    | Cartes imbriquées, pistes, chips       |
| `--border`        | `rgba(255, 255, 255, 0.14)`  | Bordure par défaut                     |
| `--border-strong` | `rgba(255, 255, 255, 0.24)`  | Bordure au survol                      |
| `--text`          | `#eef1f8`                    | Texte principal                        |
| `--text-dim`      | `#8b95ad`                    | Texte secondaire (reste AA, voir § 2)  |
| `--good` / `--good-ink` | `#2ee06e` / `#08130b`  | Bonne réponse (fond / encre dessus)    |
| `--bad` / `--bad-ink`   | `#ff4d5e` / `#1a0508`  | Mauvaise réponse                       |
| `--warn`          | `#f59e0b`                    | Score, avertissements                  |
| `--danger`        | `#f43f5e`                    | Actions destructrices                  |

### Teintes de catégorie (`--hue-*`)

Petits signaux (pastille d'icône, `.quiz-cat`, `.hero-cat`), jamais des
aplats. Les MÊMES valeurs sont dans `src/content/index.js` (`gradient[0]`) et
arrivent dans les composants via la variable inline `--cat`.

| Catégorie       | Token            | Valeur    |
| --------------- | ---------------- | --------- |
| Culture G       | `--hue-culture`  | `#8b7cff` |
| Manga / anime   | `--hue-manga`    | `#ff6b9d` |
| Code de la route| `--hue-route`    | `#ffb020` |
| Panneaux        | `--hue-panneaux` | `#2dd4a7` |
| Cinéma / séries | `--hue-cinema`   | `#4cc2ff` |

### Rayons, espacements, typographie, zones sûres

- Rayons : `--radius-xs` 8, `--radius-sm` 14, `--radius-md` 18 (= `--radius`), `--radius-lg` 24.
- Espacements : `--space-1` 4, `--space-2` 8, `--space-3` 12, `--space-4` 16, `--space-5` 24, `--space-6` 32.
- Typo fluide (clamp) : `--fs-xs` (0,74 à 0,8 rem), `--fs-sm` (0,84 à 0,9), `--fs-md` (0,96 à 1,04),
  `--fs-lg` (1,12 à 1,3), `--fs-xl` (1,36 à 1,7), `--fs-display` (1,9 à 2,6). Titres et scores en
  `--font-display` (Space Grotesk auto-hébergée, `public/fonts`).
- Tactile : `--tap` = 44 px (hauteur minimale de toute cible).
- Zones sûres : `--safe-top/right/bottom/left` = `env(safe-area-inset-*)`. Utilisées par `.app`,
  `.topbar-controls`, `.quiz-actions`, `.cookie-banner`, `.modal`.
- Courbes : `--ease` (standard), `--spring` (rebond léger, pour les moments arcade).

## 2. Contrastes mesurés (WCAG 2.x, `node scripts/check-contrast.mjs`)

Le script lit les tokens dans `index.css` et échoue sous le seuil ; le test
`scripts/check-contrast.test.mjs` le verrouille. Valeurs du 07/09/2026 :

| Couple                                   | Ratio    | Seuil |
| ---------------------------------------- | -------- | ----- |
| Volt : `--accent-ink` sur `--accent`     | 16,24:1  | 4,5   |
| Crimson : `--accent-ink` sur `--accent`  | 5,69:1   | 4,5 (le blanc ne faisait que 3,42:1) |
| Volt : `--accent` en texte sur surface   | 15,27:1  | 4,5   |
| Crimson : `--accent` en texte sur surface| 5,12:1   | 4,5   |
| `--accent-soft` sur surface (volt / crimson) | 15,97 / 7,43 | 4,5 |
| `--text` sur `--bg` / `--surface` / `--surface-2` | 17,16 / 15,50 / 14,04 | 4,5 |
| `--text-dim` sur `--bg` / `--surface` / `--surface-2` | 6,47 / 5,84 / 5,29 | 4,5 |
| `--good-ink` sur `--good`, `--bad-ink` sur `--bad` | 10,83 / 6,06 | 4,5 |
| `--good`, `--bad`, `--warn` en texte sur surface | 10,02 / 5,40 / 8,16 | 4,5 |
| `--hue-culture` / manga / route / panneaux / cinema sur surface | 5,36 / 6,55 / 9,58 / 9,25 / 8,74 | 4,5 |

Règle : du texte posé sur l'accent utilise TOUJOURS `--accent-ink` ; l'accent
en texte fin (hint, h3) passe par `--accent-soft`.

## 3. Classes partagées

### Structure

- `.app` : colonne 560 px, marges + zones sûres, `min-height: 100dvh` (repli `100vh`).
  À partir de 900 px : 1080 px, accueil en 2 colonnes (`.home` en grid : marque et
  sélecteurs à gauche, `.categories` à droite ; `.panneaux` sur toute la largeur).
- `.topbar-controls` : contrôles d'en-tête (ambiance, langue, son) en position absolue
  dans `.app`, calés sur les zones sûres. Sous 420 px, `.home-head` réserve 40 px
  au-dessus de la marque pour ne jamais passer dessous ; sous 360 px, `gap` 6 px.
- `.home-head` / `.q-mark` / `.logo` / `.home-title` / `.home-tagline` : marque.
- `.selectors` > `.field` > `.field-label` + composant ; `.field-help`.
- `.sr-only` : texte pour lecteurs d'écran (ex. nom d'une option illustrée).

### Boutons et cibles

- `.btn` (44 px min) + `.btn-primary` (accent / accent-ink) ou `.btn-secondary` ; `.btn:disabled`.
- `.btn-ghost` : bouton texte discret (retour, quitter), 44 px.
- `.btn-copy`, `.noads-promo`, `.insta-link`, `.footer-donate`, `.footer-links button|a`,
  `.cookie-btn`, `.cookie-more`, `.fam-chip`, `.home-tab`, `.seg-opt`, `.lang-item`,
  `.sign-card`, `.sign-nav .btn`, `.recap-toggle`, `.cat-card`, `.option` : tous 44 px min.
- `.modal-x` et `.sign-close` : 36 px visibles, zone de tap étendue à 44 px via `::after`.

### Quiz

- `.quiz` : colonne pleine hauteur (`.quiz-topbar` / `.quiz-body` qui s'étire /
  `.quiz-actions` sticky en bas avec zone sûre). Centré à 640 px sur grand écran.
- `.quiz-topbar` (padding droit réservé au bouton son), `.quiz-progress`, `.quiz-score`.
- `.progress-track` > `.progress-fill` : rempli par `transform: scaleX(var(--fill))`
  (`--fill` de 0 à 1 en style inline ; un `width: n%` inline reste toléré).
- `.timer-track` > `.timer-fill` : UNE animation CSS `drain` (scaleX 1 vers 0, linéaire).
  Le composant pose `animation-duration` en inline (durée de la question), change la
  `key` à chaque question pour relancer, et `animation-play-state: paused` pour figer
  à la validation. `.urgent` passe au rouge. Un `width` inline désactive l'animation
  (compatibilité).
- `.quiz-cat` / `.hero-cat` : pastille de catégorie teintée par `--cat`.
- `.quiz-question`, `.quiz-sign` (panneau de la question).
- `.options` > `.option` (+ `.chosen`, `.correct`, `.wrong`, `.dim`) > `.option-letter` +
  `.option-text` (+ `.sign-image` quand l'option est illustrée). **`.options.grid`** :
  classe posée par le composant quand les 4 options sont courtes ; à partir de 900 px
  elles passent en grille 2 x 2 (sans effet sur mobile).
- `.feedback` (+ `.good` / `.bad`), `.suspense`, `.step-hint`.

### Résultats

- `.result-hero` > `.score-ring` (rempli par `--p`, 0 à 100 ; halo `::after` animé en
  opacité seulement) > `.hero-score` + `.hero-score-total` ; `.hero-personality`,
  `.hero-title`, `.hero-round`.
- `.stat-tiles` (tuiles `b` + `span`), `.result-quote` (+ `.genius` / `.good` / `.bad`),
  `.versus` / `.vs-player` (+ `.winner`), `.recap` / `.recap-item` / `.recap-toggle`,
  `.result-actions`, `.resultshare*`, `.share*`, `.setup-card` / `.result-card`.
- `.result-ad` : visible par défaut (min-height 0) pour qu'AdSense mesure le slot ;
  masqué via `:has(ins[data-ad-status='unfilled'])` ; `.result-ad-label` n'apparaît
  qu'avec `[data-ad-status='filled']`. `.noads-promo` se rend SOUS la pub.

### Modales : `<Dialog>` (`src/components/Dialog.jsx`)

```jsx
const titleId = useId()
<Dialog open={open} onClose={close} labelledBy={titleId} className="modal-xxx">
  <button type="button" className="modal-x" onClick={close} aria-label={closeLabel}>
    <IconX size={18} />
  </button>
  <h2 id={titleId}>…</h2>
</Dialog>
```

`<dialog>` natif + `showModal()` : focus piégé, Échap et clic sur le voile
appellent `onClose`, retour du focus au déclencheur, verrou `body.modal-open`.
Classes : `.modal` (voile plein écran flouté, zones sûres) / `.modal-card`
(carte 460 px, défilable) / `.modal-x`. Paywall, DonateModal et LegalModal
l'utilisent ; la fiche panneau (`.sign-modal*`, `.sign-dialog`) reste à migrer.
Texte du bouton Fermer : `t('close')`, repli `t('paywall_close')`.

### Sélecteurs

- `Segmented` : `role=radiogroup` (`label` ou `labelledBy`) > `.seg-opt[role=radio]`
  (`aria-checked`, focus tournant, flèches, Début/Fin) + `.seg-thumb` décoratif.
- `LanguageSelector` : `.lang-toggle` (`aria-haspopup=listbox`, `aria-expanded`,
  `aria-controls`) + `.lang-menu[role=listbox]` > `li[role=presentation]` >
  `.lang-item[role=option]` ; flèches, Début/Fin, Échap ou Tab referment et rendent
  le focus au bouton.

### Icônes (`src/components/icons.jsx`)

SVG 24, trait 2, `currentColor`, `aria-hidden` : `QMark`, `CatIcon`, `IconBook`,
`IconBolt`, `IconChevronRight/Left/Down`, `IconLink`, `IconHome`, `IconSwatch`,
`IconSoundOn/Off`, `IconCrown`, `IconHeart`, `IconStar`, `IconClose`, `IconCheck`,
`IconX`, `IconFlame`, `IconTrophy`, `IconTarget`, `IconCalendar`, `IconRefresh`,
`IconCards`, `IconTimer`, `IconShare`, `IconInstall`. Plus d'emoji dans les
contrôles (les emoji restent tolérés dans le contenu des questions).

## 4. Règles tactiles et interaction

- Cible minimale 44 x 44 (`min-height: var(--tap)`), `-webkit-tap-highlight-color: transparent`
  sur tout, `touch-action: manipulation` sur `.option`.
- Les `:hover` décoratifs vivent dans `@media (hover: hover) and (pointer: fine)` :
  jamais d'état collant au doigt. Le retour tactile est le `:active` (léger `scale`).
- Focus clavier : `:focus-visible` global (anneau accent, décalé de 2 px) ; les champs
  `.text-input` / `.donate-input` gardent une bordure accent + anneau.
- Zones sûres iOS sur tout ce qui touche les bords (barre du haut, actions du bas,
  bandeau cookies, modales).
- Pas de `maximum-scale` (le zoom reste possible).

## 5. Animation

- Transform et opacity seulement (barre de temps en `scaleX`, halo de l'anneau en
  opacité, jamais de `width`, `box-shadow` ou `height` animés en boucle).
- `prefers-reduced-motion: reduce` : liste ciblée de classes (plus de `* !important`) :
  entrées de page, pop des options, halo, menus et modales coupés ; le compte à rebours
  reste (il est fonctionnel) ; le spinner tourne au ralenti (3 s).
- Aucun `will-change` au repos.
- Keyframes partagées : `fade-up`, `fade-in`, `pop-in`, `pulse`, `modal-pop`, `drain`,
  `ring-glow`, `opt-pop`, `opt-shake`, `lang-pop`, `cookie-slide-up`, `bank-gate-spin`.

## 6. Ajouter un écran

1. Composant dans `src/components/<Ecran>.jsx`, qui `import '../styles/<feature>.css'`.
   N'édite pas `index.css` : réutilise `.quiz`, `.quiz-topbar`, `.btn*`, `.option*`,
   `.result-hero`, `.stat-tiles`, `.recap*`, `.setup-card`, etc.
2. Textes dans `src/i18n/parts/<feature>.js` (`{ fr, en, es, pt }`, quatre langues).
3. Contrôles en `<button type="button">`, cibles 44 px, `aria-label` sur les boutons
   icône, `.sr-only` pour un texte visuellement masqué.
4. Toute modale passe par `<Dialog>` ; tout survol dans `@media (hover: hover)`.
5. Nouvelle animation : transform/opacity, et ajoute sa classe au bloc
   `prefers-reduced-motion` de son propre fichier CSS.
6. Nouvelle couleur : d'abord un token existant ; sinon vérifie le couple avec
   `node scripts/check-contrast.mjs` (ajoute-le à `buildPairs`).

## 7. Icônes d'app et manifeste

- `public/favicon.svg` : pastille volt + Q géométrique en chemins (aucune police).
- `public/icons/` : `icon-192.png`, `icon-512.png` (usage any, coins transparents),
  `icon-maskable-512.png` (fond `#0a0d16`, pastille dans la zone sûre de 80 %),
  `apple-touch-icon.png` (180, plein cadre lime). Régénérer : `node scripts/make-icons.mjs`
  (Chrome headless + Space Grotesk inlinée, repli rsvg-convert).
- `public/manifest.webmanifest` : `id` `/`, `start_url` `/?source=pwa`, `display`
  `standalone`, couleurs `#0a0d16`, `lang` `fr`, catégories education / games.
- `index.html` référence `/manifest.webmanifest`, `/icons/apple-touch-icon.png`,
  `theme-color #0a0d16`.
