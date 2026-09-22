// Plugin Vite : pré-remplit <div id="root"> de index.html avec un accueil
// statique (voir renderHomeShell dans site-data.mjs) et remplace le jeton
// {{TOTAL}} (title, description, JSON-LD) par le nombre de questions, lu dans
// src/content/counts.json. Appliqué en dev comme en build.
import { fmt, readCounts, renderHomeShell, totalQuestions } from './site-data.mjs'

export default function homeShell() {
  return {
    name: 'quizz-home-shell',
    transformIndexHtml(html) {
      const counts = readCounts()
      const shell = renderHomeShell(counts)
      if (!html.includes('<div id="root"></div>')) {
        throw new Error('vite-plugin-home-shell : <div id="root"></div> introuvable dans index.html')
      }
      return html
        .replace(/\{\{TOTAL\}\}/g, fmt(totalQuestions(counts)))
        .replace('<div id="root"></div>', `<div id="root">${shell}</div>`)
    },
  }
}
