import { useEffect, useState } from 'react'
import SignImage from './SignImage'
import { IconCheck, IconX } from './icons'
import { SIGNS, getSign } from '../content/panneaux/signs'
import { confusionsBySign } from '../content/panneaux/confusions'
import {
  FLASH_SESSION_SIZE,
  answer,
  getDueCards,
  loadFlash,
  stats as flashStats,
} from '../lib/flashcards'
import { shuffle } from '../lib/quiz'
import { track } from '../lib/analytics'
import { sound } from '../lib/sound'
import { useI18n } from '../i18n'
import '../styles/panneaux.css'

// Flashcards des panneaux (Leitner, voir src/lib/flashcards.js).
// Session : jusqu'à 20 cartes dues. Recto = le panneau seul ; verso = code,
// nom, signification, pièges. Tap / Espace retourne, ← « je ne savais pas »,
// → « je savais ». Prop : onExit() (retour à l'accueil).
const CONFUSIONS = confusionsBySign(SIGNS.map((s) => s.id))

// Cartes dues d'abord (les plus anciennes), puis nouvelles ; mélangées pour
// ne pas toujours enchaîner la même famille. Pur : sûr en StrictMode.
function pickSession() {
  return shuffle(getDueCards().slice(0, FLASH_SESSION_SIZE))
}

export default function Flashcards({ onExit }) {
  const { t } = useI18n()
  const [cards, setCards] = useState(pickSession)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState(0)
  const [finished, setFinished] = useState(false)
  const [remaining, setRemaining] = useState(0) // cartes encore dues en fin de session

  const cardId = cards[index]
  const sign = cardId ? getSign(cardId) : null

  function flip() {
    if (flipped || !sign) return
    sound.select()
    setFlipped(true)
  }

  function finish(knownCount) {
    track('flash_session', `${knownCount}_${cards.length}`)
    if (knownCount === cards.length) sound.win()
    setRemaining(getDueCards().length)
    setFinished(true)
  }

  function rate(isKnown) {
    if (!flipped || !sign) return
    answer(sign.id, isKnown)
    const total = known + (isKnown ? 1 : 0)
    setKnown(total)
    if (isKnown) sound.correct()
    else sound.wrong()
    if (index + 1 >= cards.length) {
      finish(total)
      return
    }
    setIndex((i) => i + 1)
    setFlipped(false)
  }

  function again() {
    sound.select()
    setCards(pickSession())
    setIndex(0)
    setFlipped(false)
    setKnown(0)
    setFinished(false)
  }

  // Clavier : Espace/Entrée retourne (sauf sur un bouton, qui a déjà son clic),
  // ← / → notent. Réabonné à chaque rendu pour lire l'état courant ; retiré au
  // démontage. Les répétitions (touche maintenue) et les raccourcis avec
  // modificateur (Alt+← = retour navigateur) sont ignorés.
  useEffect(() => {
    if (finished || !sign) return undefined
    function onKey(e) {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return
      const tag = e.target?.tagName
      const onControl = tag === 'BUTTON' || tag === 'A' || tag === 'INPUT'
      if (e.key === ' ' || e.key === 'Enter') {
        if (onControl) return
        e.preventDefault()
        flip()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        rate(false)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        rate(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // ----- Rien à revoir -----
  if (cards.length === 0) {
    const s = flashStats()
    return (
      <div className="quiz flash">
        <div className="quiz-topbar">
          <button type="button" className="btn-ghost" onClick={onExit}>
            {t('quit')}
          </button>
          <span className="quiz-progress">{t('flash_title')}</span>
        </div>
        <div className="flash-end">
          <h2>{t('flash_empty_title')}</h2>
          <p>{t('flash_empty_sub')}</p>
          <div className="stat-tiles">
            <div>
              <b>{s.learned}</b>
              <span>{t('flash_tile_learned')}</span>
            </div>
            <div>
              <b>{s.total}</b>
              <span>{t('flash_tile_total')}</span>
            </div>
          </div>
          <div className="result-actions">
            <button type="button" className="btn btn-primary" onClick={onExit}>
              {t('home')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ----- Bilan -----
  if (finished) {
    const s = flashStats()
    return (
      <div className="quiz flash">
        <div className="quiz-topbar">
          <button type="button" className="btn-ghost" onClick={onExit}>
            {t('quit')}
          </button>
          <span className="quiz-progress">{t('flash_title')}</span>
        </div>
        <div className="flash-end">
          <h2>{t('flash_end_title')}</h2>
          <p className="flash-end-score">
            {known}
            <span>/{cards.length}</span>
          </p>
          <p>{t('flash_end_score', { k: known, n: cards.length })}</p>
          <div className="stat-tiles">
            <div>
              <b>{s.due}</b>
              <span>{t('flash_tile_due')}</span>
            </div>
            <div>
              <b>{s.learned}</b>
              <span>{t('flash_tile_learned')}</span>
            </div>
            <div>
              <b>{s.total}</b>
              <span>{t('flash_tile_total')}</span>
            </div>
          </div>
          <div className="result-actions">
            {remaining > 0 && (
              <button type="button" className="btn btn-primary" onClick={again}>
                {t('flash_again', { n: Math.min(remaining, FLASH_SESSION_SIZE) })}
              </button>
            )}
            <button
              type="button"
              className={`btn ${remaining > 0 ? 'btn-secondary' : 'btn-primary'}`}
              onClick={onExit}
            >
              {t('home')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ----- Carte courante -----
  const box = loadFlash()[sign.id]?.box
  const twins = CONFUSIONS[sign.id] || []

  return (
    <div className="quiz flash">
      <div className="quiz-topbar">
        <button type="button" className="btn-ghost" onClick={onExit}>
          {t('quit')}
        </button>
        <span className="quiz-progress">
          {t('flash_topbar', { i: index + 1, n: cards.length })}
        </span>
      </div>

      <div className="progress-track">
        <div className="progress-fill" style={{ '--fill': index / cards.length }} />
      </div>

      <div className="flash-stage">
        <div className={`flash-card ${flipped ? 'flipped' : ''}`} onClick={flip}>
          <div className="flash-card-inner">
            <div className="flash-face flash-front" aria-hidden={flipped}>
              <SignImage
                id={sign.id}
                className="flash-sign"
                alt={sign.alt || t('flash_sign_alt')}
              />
              <span className="flash-hint">{t('flash_flip_hint')}</span>
            </div>
            <div className="flash-face flash-back" aria-hidden={!flipped}>
              <SignImage id={sign.id} className="flash-sign-small" alt="" />
              <span className="sign-badge">{sign.code}</span>
              <h3 className="flash-name">{sign.name}</h3>
              <p className="flash-meaning">{sign.meaning}</p>
              {twins.map(({ id, tip }) => (
                <p key={id} className="flash-twin">
                  <b>{t('flash_confusion', { code: getSign(id).code })}</b> {tip}
                </p>
              ))}
              <span className="flash-box">
                {box ? t('flash_box', { b: box }) : t('flash_box_new')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {flipped ? (
        <>
          <div className="flash-actions">
            <button
              type="button"
              className="btn btn-secondary flash-btn-no"
              onClick={() => rate(false)}
            >
              <IconX size={16} strokeWidth={2.5} className="flash-btn-icon" />
              {t('flash_unknown')}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => rate(true)}>
              <IconCheck size={16} strokeWidth={2.5} className="flash-btn-icon" />
              {t('flash_known')}
            </button>
          </div>
          <p className="flash-rate-hint">{t('flash_rate_hint')}</p>
        </>
      ) : (
        <div className="flash-actions">
          <button type="button" className="btn btn-primary" onClick={flip}>
            {t('flash_flip')}
          </button>
        </div>
      )}
    </div>
  )
}
