import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import homeShell from './scripts/vite-plugin-home-shell.mjs'

// Banques de questions (chunks nommés d'après leur fichier JSON, voir
// src/content/index.js) : jamais pré-cachées, chargées à la demande puis
// gardées par la règle CacheFirst de /assets/. Noms lus dans counts.json.
const BANKS = Object.keys(JSON.parse(readFileSync(new URL('./src/content/counts.json', import.meta.url), 'utf8')))

// Pages statiques produites APRÈS `vite build` par scripts/build-pages.mjs :
// jamais pré-cachées (76 fichiers), servies par le réseau puis mises en cache
// à la visite (NetworkFirst). Même liste que navigateFallbackDenylist.
const STATIC_PAGES = /^\/(panneaux|quiz|code-de-la-route)(\/|$)|^\/(a-propos|contact|confidentialite|conditions|404)(\/|$)/

// https://vite.dev/config/
export default defineConfig({
  // homeShell : pré-remplit <div id="root"> avec un accueil statique lisible
  // sans JavaScript (robots, examen AdSense). React le remplace au montage.
  //
  // VitePWA : service worker dist/sw.js (Workbox generateSW) enregistré à la
  // main par src/lib/pwa.js (injectRegister null) ; le manifeste existe déjà
  // dans public/manifest.webmanifest (manifest: false), référencé par index.html.
  // Mise à jour sur demande (registerType 'prompt') : la nouvelle version
  // attend que le joueur clique « Recharger » (UpdateToast), jamais en partie.
  plugins: [
    react(),
    homeShell(),
    VitePWA({
      strategies: 'generateSW',
      registerType: 'prompt',
      injectRegister: null,
      filename: 'sw.js',
      manifest: false,
      includeAssets: [],
      workbox: {
        // Un seul fichier sw.js (pas de workbox-*.js à part) : /sw.js est en
        // no-cache dans public/_headers, le reste de dist/ est immuable.
        inlineWorkboxRuntime: true,
        cleanupOutdatedCaches: true,
        sourcemap: false,
        // Précache = la coquille et ce qu'il faut pour jouer hors ligne :
        // index.html, TOUS les chunks de l'app (le bundle d'accueil est
        // scindé par Rollup en index-*.js + un chunk partagé i18n-*.js chargé
        // en modulepreload ; les écrans paresseux suivent, ~120 kB), la feuille
        // de style, les polices, les icônes. PAS les banques de questions
        // (globIgnores) ni les 76 pages statiques (écrites après vite build).
        globPatterns: [
          'index.html',
          'assets/*.js',
          'assets/*.css',
          'fonts/*.woff2',
          'icons/*.png',
          'favicon.svg',
          'manifest.webmanifest',
        ],
        globIgnores: BANKS.map((bank) => `assets/${bank}-*.js`),
        // Les routes de l'App (contrat d'URL, worker/routes.js) reçoivent la
        // coquille hors ligne ; tout le reste (API, pages statiques, fichiers)
        // passe au réseau ou aux règles ci-dessous.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/api\//,
          STATIC_PAGES,
          /\.[a-z0-9]{1,5}(\?.*)?$/i,
        ],
        runtimeCaching: [
          {
            // Chunks hachés (écrans, banques, modales) : immuables, un an.
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/assets/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'quizz-assets',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Pages statiques (fiches panneaux, /quiz/…, à-propos…) : réseau
            // d'abord, copie de secours 7 jours.
            urlPattern: ({ url, request, sameOrigin }) =>
              sameOrigin && request.mode === 'navigate' && STATIC_PAGES.test(url.pathname),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'quizz-pages',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    // Les banques de questions sont des chunks À PART, chargés seulement quand
    // on ouvre leur catégorie (voir src/content/index.js). Elles dépassent donc
    // volontairement 500 kB et grossiront encore à chaque vague de contenu :
    // l'alerte par défaut ne signalerait plus rien d'utile.
    //
    // Le chiffre à surveiller reste le bundle d'ACCUEIL (`index-*.js`),
    // téléchargé par tout le monde : les écrans de jeu, les modales et les
    // banques sont chargés paresseusement (src/lib/screens.js). Le garde-fou
    // scripts/check-bundle-size.mjs, en fin de `npm run build`, échoue s'il
    // regrossit (une banque ou un écran repassé en import statique).
    chunkSizeWarningLimit: 800,
  },
})
