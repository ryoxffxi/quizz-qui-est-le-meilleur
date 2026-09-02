// Plugin Vite : pré-remplit <div id="root"> de index.html avec un accueil
// statique (voir renderHomeShell dans site-data.mjs). Appliqué en dev comme en
// build, à partir des compteurs de questions (src/content/counts.json).
import { readCounts, renderHomeShell } from './site-data.mjs'

export default function homeShell() {
  return {
    name: 'quizz-home-shell',
    transformIndexHtml(html) {
      const shell = renderHomeShell(readCounts())
      if (!html.includes('<div id="root"></div>')) {
        throw new Error('vite-plugin-home-shell : <div id="root"></div> introuvable dans index.html')
      }
      return html.replace('<div id="root"></div>', `<div id="root">${shell}</div>`)
    },
  }
}
