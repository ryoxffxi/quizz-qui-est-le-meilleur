import { useState } from 'react'
import Segmented from './Segmented'
import SignImage from './SignImage'
import { FAMILIES, SIGNS } from '../content/panneaux/signs'
import { sound } from '../lib/sound'
import { useI18n } from '../i18n'

// Onglet « Panneaux » : révision par famille (galerie + fiche détaillée)
// et lancement du quiz spécial panneaux. Contenu FR uniquement.
export default function PanneauxRevision({ onStartQuiz }) {
  const { t } = useI18n()
  const [difficulty, setDifficulty] = useState('facile')
  const [familyId, setFamilyId] = useState(FAMILIES[0].id)
  const [openIndex, setOpenIndex] = useState(-1)

  const family = FAMILIES.find((f) => f.id === familyId)
  const signs = SIGNS.filter((s) => s.family === familyId)
  const open = openIndex >= 0 ? signs[openIndex] : null

  function pickFamily(id) {
    sound.select()
    setFamilyId(id)
    setOpenIndex(-1)
  }

  function move(delta) {
    sound.select()
    setOpenIndex((i) => (i + delta + signs.length) % signs.length)
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

      <section className="pan-browse">
        <span className="field-label">{t('panneaux_browse')}</span>
        <div className="fam-chips" role="tablist">
          {FAMILIES.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={f.id === familyId}
              className={`fam-chip ${f.id === familyId ? 'active' : ''}`}
              onClick={() => pickFamily(f.id)}
            >
              {f.emoji} {f.label}
            </button>
          ))}
        </div>

        <p className="fam-desc">
          {family.desc}{' '}
          <span className="fam-count">
            {t('panneaux_count', { n: signs.length })}
          </span>
        </p>

        <div className="sign-grid">
          {signs.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className="sign-card"
              onClick={() => {
                sound.select()
                setOpenIndex(i)
              }}
            >
              <SignImage id={s.id} />
              <span className="sign-code">{s.code}</span>
            </button>
          ))}
        </div>
      </section>

      {open && (
        <div
          className="sign-modal"
          role="dialog"
          aria-modal="true"
          aria-label={open.name}
          onClick={() => setOpenIndex(-1)}
        >
          <div className="sign-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="sign-close"
              aria-label={t('sign_close')}
              onClick={() => setOpenIndex(-1)}
            >
              ✕
            </button>
            <SignImage id={open.id} className="sign-big" />
            <span className="sign-badge">{open.code}</span>
            <h3 className="sign-name">{open.name}</h3>
            <p className="sign-meaning">{open.meaning}</p>
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
          </div>
        </div>
      )}
    </div>
  )
}
