import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import homeShell from './scripts/vite-plugin-home-shell.mjs'

// https://vite.dev/config/
export default defineConfig({
  // homeShell : pré-remplit <div id="root"> avec un accueil statique lisible
  // sans JavaScript (robots, examen AdSense). React le remplace au montage.
  plugins: [react(), homeShell()],
  build: {
    // Les banques de questions sont des chunks À PART, chargés seulement quand
    // on ouvre leur catégorie (voir src/content/index.js). Elles dépassent donc
    // volontairement 500 kB et grossiront encore à chaque vague de contenu :
    // l'alerte par défaut ne signalerait plus rien d'utile.
    //
    // ⚠️ Le chiffre à surveiller reste le bundle d'ACCUEIL (`index-*.js`),
    // téléchargé par tout le monde : il doit rester autour de 340 kB. S'il
    // grimpe, c'est qu'une banque est repassée en import statique quelque part.
    chunkSizeWarningLimit: 800,
  },
})
