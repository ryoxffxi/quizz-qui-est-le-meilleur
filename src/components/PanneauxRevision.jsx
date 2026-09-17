import { useEffect, useId, useRef, useState } from 'react'
import Segmented from './Segmented'
import SignImage from './SignImage'
import Dialog from './Dialog'
import { IconX } from './icons'
import { FAMILIES, SIGNS, getSign } from '../content/panneaux/signs'
import { confusionsBySign } from '../content/panneaux/confusions'
import { countQuestions } from '../content'
import { stats as flashStats } from '../lib/flashcards'
import { sound } from '../lib/sound'
import { useI18n } from '../i18n'
import '../styles/panneaux.css'

// Onglet « Panneaux » : révision par famille (galerie + fiche dans la modale
// commune <Dialog>), quiz par famille, et entrée vers les flashcards. Contenu
// FR uniquement.
//
// Props :
//   onStartQuiz({ mode:'solo'|'challenge', difficulty, imageFamily? })
//   onFlashcards()  -> le shell ouvre /flashcards
const NAMES_KEY = 'quizz_panneaux_names'

// Table symétrique des pièges, calculée une fois (pure, ~40 paires).
const CONFUSIONS = confusionsBySign(SIGNS.map((s) => s.id))

function readNames() {
  try {
    return localStorage.getItem(NAMES_KEY) === '1'
  } catch {
    return false
  }
}
function writeNames(value) {
  try {
    if (value) localStorage.setItem(NAMES_KEY, '1')
    else localStorage.removeItem(NAMES_KEY)
  } catch {
    /* navigation privée : le réglage ne survivra pas, sans gravité */
  }
}

export default function PanneauxRevision({ onStartQuiz, onFlashcards }) {
  const { t } = useI18n()
  const titleId = useId()
  const [difficulty, setDifficulty] = useState('facile')
  const [familyId, setFamilyId] = useState(FAMILIES[0].id)
  const [openId, setOpenId] = useState(null)
  const [showNames, setShowNames] = useState(readNames)
  // Lu une fois au montage : l'onglet est remonté au retour des flashcards.
  const [flash] = useState(() => flashStats())
  const moveRef = useRef(null) // move() du rendu courant, lu par l'écouteur clavier

  const family = FAMILIES.find((f) => f.id === familyId)
  const signs = SIGNS.filter((s) => s.family === familyId)
  const open = openId ? getSign(openId) : null
  const openIndex = open ? signs.findIndex((s) => s.id === openId) : -1
  const twins = open ? CONFUSIONS[open.id] || [] : []
  const isOpen = open != null

  // Questions disponibles pour cette famille : chaque panneau produit le même
  // nombre de questions, on répartit donc le total du manifeste au prorata.
  const familyQuestions = Math.round(
    (countQuestions('panneaux', difficulty) * signs.length) / SIGNS.length,
  )

  // Fermeture (bouton, voile, Échap) : <Dialog> appelle onClose, l'état passe
  // à null et la modale se démonte ; Dialog rend alors le focus à l'élément
  // qui avait le focus à l'ouverture (la carte de la galerie, voir openSign).
  function closeDialog() {
    setOpenId(null)
  }

  function openSign(id, trigger) {
    sound.select()
    // Safari ne focalise pas un bouton au clic : on le fait ici pour que
    // <Dialog> retrouve bien cette carte à la fermeture.
    if (trigger && typeof trigger.focus === 'function') trigger.focus({ preventScroll: true })
    setOpenId(id)
  }

  // Un jumeau peut appartenir à une autre famille : on suit le panneau.
  function openTwin(id) {
    sound.select()
    setFamilyId(getSign(id).family)
    setOpenId(id)
  }

  function pickFamily(id) {
    sound.select()
    setFamilyId(id)
    setOpenId(null)
  }

  function move(delta) {
    if (openIndex < 0) return
    sound.select()
    setOpenId(signs[(openIndex + delta + signs.length) % signs.length].id)
  }

  // Flèches ← / → pendant la fiche. Le focus initial est sur la carte de la
  // modale (posé par <Dialog>), hors de notre arbre : on écoute le document.
  // Sous showModal, le reste de la page est inerte, donc toute touche vient
  // de la fiche. Écouteur posé à l'ouverture, retiré à la fermeture.
  useEffect(() => {
    moveRef.current = move
  })
  useEffect(() => {
    if (!isOpen) return undefined
    function onKey(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        moveRef.current?.(-1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        moveRef.current?.(1)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen])

  function toggleNames(e) {
    const value = e.target.checked
    setShowNames(value)
    writeNames(value)
  }

  return (
    <div className="panneaux">
      <section className="pan-cta">
        <p className="pan-cta-title">{t('panneaux_quiz_title')}</p>
        <p className="pan-cta-sub">{t('panneaux_quiz_sub')}</p>
        <Segmented
          value={difficulty}
          onChange={setDifficulty}
          accent={difficulty === 'expert' ? 'var(--danger)' : 'var(--accent)'}
          options={[
            { value: 'facile', label: t('diff_facile') },
            { value: 'expert', label: t('diff_expert') },
          ]}
        />
        <div className="pan-cta-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              sound.select()
              onStartQuiz({ mode: 'solo', difficulty })
            }}
          >
            {t('panneaux_quiz_cta')}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              sound.select()
              onStartQuiz({ mode: 'challenge', difficulty })
            }}
          >
            {t('challenge_a_friend')}
          </button>
        </div>
      </section>

      <button
        type="button"
        className="pan-flash-entry"
        onClick={() => {
          sound.select()
          onFlashcards?.()
        }}
      >
        <span className="pan-flash-icon" aria-hidden="true">
          🃏
        </span>
        <span className="pan-flash-text">
          <b>
            {flash.due > 0
              ? t('pan_flash_entry', { n: flash.due })
              : t('pan_flash_entry_none')}
          </b>
          <span>{t('pan_flash_sub', { learned: flash.learned, total: flash.total })}</span>
        </span>
        <span className="pan-flash-chevron" aria-hidden="true">
          ›
        </span>
      </button>

      <section className="pan-browse">
        <div className="pan-tools">
          <span className="field-label">{t('panneaux_browse')}</span>
          <label className="pan-switch">
            <input type="checkbox" role="switch" checked={showNames} onChange={toggleNames} />
            <span className="pan-switch-track" aria-hidden="true" />
            <span>{t('pan_names_toggle')}</span>
          </label>
        </div>

        <div className="fam-chips" role="group" aria-label={t('panneaux_browse')}>
          {FAMILIES.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={f.id === familyId}
              className={`fam-chip ${f.id === familyId ? 'active' : ''}`}
              onClick={() => pickFamily(f.id)}
            >
              {f.emoji} {f.label}
            </button>
          ))}
        </div>

        <p className="fam-desc">
          {family.desc}{' '}
          <span className="fam-count">{t('panneaux_count', { n: signs.length })}</span>
        </p>

        <div className="fam-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              sound.select()
              onStartQuiz({ mode: 'solo', difficulty, imageFamily: familyId })
            }}
          >
            {t('pan_family_quiz', { family: family.label, n: familyQuestions })}
          </button>
        </div>

        <div className="sign-grid">
          {signs.map((s) => (
            <button
              key={s.id}
              type="button"
              className="sign-card"
              onClick={(e) => openSign(s.id, e.currentTarget)}
            >
              <SignImage id={s.id} alt={showNames ? s.name : s.alt || s.name} />
              <span className="sign-code">{s.code}</span>
              {showNames && <span className="sign-card-name">{s.short || s.name}</span>}
            </button>
          ))}
        </div>
      </section>

      {/* Fiche : modale commune (Échap, focus piégé, voile, retour du focus). */}
      <Dialog open={isOpen} onClose={closeDialog} labelledBy={titleId} className="modal-sign">
        {open && (
          <>
            <button type="button" className="modal-x" onClick={closeDialog} aria-label={t('close')}>
              <IconX size={18} />
            </button>
            <SignImage id={open.id} className="sign-big" alt={open.alt || open.name} />
            <span className="sign-badge">{open.code}</span>
            <h3 id={titleId} className="sign-name">
              {open.name}
            </h3>
            <p className="sign-meaning">{open.meaning}</p>
            {open.detail && <p className="sign-detail">{open.detail}</p>}

            {twins.length > 0 && (
              <section className="sign-confusions" aria-labelledby="sign-confusions-title">
                <h4 id="sign-confusions-title">{t('sign_confusions')}</h4>
                <ul>
                  {twins.map(({ id, tip }) => {
                    const other = getSign(id)
                    return (
                      <li key={id} className="sign-twin">
                        <button
                          type="button"
                          className="sign-twin-card"
                          aria-label={t('sign_twin_open', { code: other.code })}
                          onClick={() => openTwin(id)}
                        >
                          <SignImage id={id} alt="" />
                          <span className="sign-code">{other.code}</span>
                        </button>
                        <p className="sign-twin-tip">
                          <b>{t('sign_confusion_with', { code: open.code, other: other.code })}</b>{' '}
                          {tip}
                        </p>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}

            <div className="sign-links">
              <a className="btn btn-secondary" href={`/panneaux/${open.id}`}>
                {t('sign_full_sheet')}
              </a>
            </div>

            <div className="sign-nav">
              <button
                type="button"
                className="btn btn-secondary"
                aria-label={t('sign_prev')}
                onClick={() => move(-1)}
              >
                ←
              </button>
              <span className="sign-nav-pos">
                {openIndex + 1} / {signs.length}
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                aria-label={t('sign_next')}
                onClick={() => move(1)}
              >
                →
              </button>
            </div>
            <p className="sign-nav-hint">{t('sign_nav_hint')}</p>
          </>
        )}
      </Dialog>
    </div>
  )
}
