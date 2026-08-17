import { forwardRef } from 'react'
import { useI18n } from '../i18n'
import { gameHost } from '../lib/challengeLink'
import { personalityKey } from './ResultHero'
import { getTheme } from '../lib/theme'

// Palette de la carte selon l'ambiance ACTIVE de l'utilisateur (design v2).
const CARD_THEMES = {
  volt: { acc: '#d8ff3d', ink: '#10140a', tint: 'rgba(216,255,61,0.12)' },
  crimson: { acc: '#ff4155', ink: '#ffffff', tint: 'rgba(255,65,85,0.14)' },
}

const BG = '#0a0d16'
const SURFACE = 'rgba(255,255,255,0.06)'
const BORDER = 'rgba(255,255,255,0.12)'
const DIM = 'rgba(255,255,255,0.62)'
const DISPLAY =
  "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

// Carte de résultat partageable, format story (1080×1920), design v2 :
// fond sombre, accent de l'ambiance, anneau de score en SVG (fiable pour
// la capture html-to-image). Styles 100 % en ligne.
const ShareCard = forwardRef(function ShareCard({ resultData, category }, ref) {
  const { t } = useI18n()
  const theme = CARD_THEMES[getTheme()] || CARD_THEMES.volt
  const catColor = category.gradient[0]
  const diffLabel = t(`diff_${resultData.d}`)
  const catName = t(category.labelKey)
  const gameUrl = gameHost()
  const cta = resultData.solo ? t('card_cta_solo') : t('card_cta_duel')

  const Header = ({ kicker }) => (
    <div style={{ padding: '84px 80px 0', textAlign: 'center' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 26,
        }}
      >
        <div
          style={{
            width: 108,
            height: 108,
            borderRadius: 30,
            background: theme.acc,
            color: theme.ink,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: DISPLAY,
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          Q
        </div>
        <div
          style={{
            fontFamily: DISPLAY,
            fontSize: 88,
            fontWeight: 700,
            letterSpacing: -2,
            color: '#fff',
          }}
        >
          {t('app_name')}
        </div>
      </div>
      <div
        style={{
          display: 'inline-block',
          marginTop: 36,
          padding: '14px 32px',
          borderRadius: 999,
          background: `color-mix(in srgb, ${catColor} 16%, transparent)`,
          color: catColor,
          fontSize: 38,
          fontWeight: 700,
        }}
      >
        {catName} · {diffLabel}
      </div>
      <div
        style={{
          marginTop: 28,
          fontSize: 40,
          fontWeight: 700,
          letterSpacing: 8,
          color: DIM,
        }}
      >
        {kicker}
      </div>
    </div>
  )

  const shell = (children) => (
    <div
      ref={ref}
      style={{
        width: 1080,
        height: 1920,
        background: `radial-gradient(120% 40% at 50% -5%, ${theme.tint} 0%, transparent 60%), ${BG}`,
        color: '#fff',
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {children}
    </div>
  )

  // ===== Carte SOLO (révision) =====
  if (resultData.solo) {
    const { sc, tot } = resultData
    const pct = tot > 0 ? Math.round((sc / tot) * 100) : 0
    // Anneau SVG : circonférence pour r=210 ≈ 1319.
    const R = 210
    const C = 2 * Math.PI * R
    return shell(
      <>
        <Header kicker={t('card_solo_kicker')} />
        <div
          style={{
            flex: 1,
            padding: '40px 80px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ position: 'relative', width: 520, height: 520 }}>
            <svg width="520" height="520" viewBox="0 0 520 520">
              <circle
                cx="260"
                cy="260"
                r={R}
                fill="none"
                stroke="rgba(255,255,255,0.09)"
                strokeWidth="34"
              />
              <circle
                cx="260"
                cy="260"
                r={R}
                fill="none"
                stroke={theme.acc}
                strokeWidth="34"
                strokeLinecap="round"
                strokeDasharray={`${(C * pct) / 100} ${C}`}
                transform="rotate(-90 260 260)"
              />
            </svg>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: DISPLAY,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <div style={{ fontSize: 170, fontWeight: 700, lineHeight: 1, color: '#fff' }}>
                {sc}
                <span style={{ fontSize: 70, color: DIM }}>/{tot}</span>
              </div>
            </div>
          </div>
          <div
            style={{
              fontFamily: DISPLAY,
              fontSize: 62,
              fontWeight: 700,
              marginTop: 34,
              textAlign: 'center',
            }}
          >
            {t(personalityKey(sc, tot))}
          </div>
          <div
            style={{
              marginTop: 40,
              padding: '18px 44px',
              borderRadius: 999,
              border: `4px solid ${theme.acc}`,
              fontSize: 50,
              fontWeight: 800,
              color: theme.acc,
            }}
          >
            {t('card_success_rate', { pct })}
          </div>
        </div>
        <Bottom cta={cta} url={gameUrl} ctaLabel={t('card_play_cta')} acc={theme.acc} />
      </>,
    )
  }

  // ===== Carte DÉFI (deux joueurs) =====
  const { n, p1, r1, p2, r2 } = resultData
  const s1 = r1.reduce((a, b) => a + b, 0)
  const s2 = r2.reduce((a, b) => a + b, 0)
  const winner = s1 === s2 ? 'tie' : s1 > s2 ? 'p1' : 'p2'
  const rows = Math.max(r1.length, r2.length, n || 0)

  const player = (name, score, isWinner) => (
    <div
      style={{
        flex: 1,
        background: SURFACE,
        border: `4px solid ${isWinner ? theme.acc : BORDER}`,
        borderRadius: 36,
        padding: '44px 24px 40px',
        textAlign: 'center',
      }}
    >
      <div style={{ height: 70, fontSize: 56, lineHeight: 1 }}>
        {isWinner ? '👑' : ''}
      </div>
      <div
        style={{
          fontSize: 46,
          fontWeight: 800,
          color: '#fff',
          marginBottom: 8,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {name}
      </div>
      <div
        style={{
          fontFamily: DISPLAY,
          fontSize: 132,
          fontWeight: 700,
          lineHeight: 1,
          color: isWinner ? theme.acc : '#fff',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {score}
      </div>
      <div style={{ fontSize: 34, color: DIM, marginTop: 10 }}>
        {t('card_points')}
      </div>
    </div>
  )

  return shell(
    <>
      <Header kicker={t('card_duel_kicker')} />
      <div
        style={{
          flex: 1,
          padding: '54px 70px 40px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            fontFamily: DISPLAY,
            fontSize: 60,
            fontWeight: 700,
            textAlign: 'center',
            marginBottom: 40,
            color: theme.acc,
          }}
        >
          {winner === 'tie'
            ? t('card_tie')
            : t('card_win', { name: winner === 'p1' ? p1 : p2 })}
        </div>

        <div style={{ display: 'flex', gap: 28, alignItems: 'stretch' }}>
          {player(p1, s1, winner === 'p1')}
          <div
            style={{
              alignSelf: 'center',
              fontFamily: DISPLAY,
              fontSize: 56,
              fontWeight: 700,
              color: DIM,
            }}
          >
            VS
          </div>
          {player(p2, s2, winner === 'p2')}
        </div>

        <div
          style={{
            marginTop: 56,
            background: SURFACE,
            border: `3px solid ${BORDER}`,
            borderRadius: 30,
            padding: '34px 40px',
          }}
        >
          <div
            style={{
              fontSize: 34,
              fontWeight: 700,
              color: DIM,
              marginBottom: 22,
              letterSpacing: 1,
            }}
          >
            {t('card_detail', {
              rounds: t(rows === 1 ? 'card_rounds_one' : 'card_rounds_n', {
                n: rows,
              }),
            })}
          </div>
          {Array.from({ length: rows }).map((_, i) => {
            const a = r1[i] ?? 0
            const b = r2[i] ?? 0
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 40,
                  fontWeight: 700,
                  padding: '14px 0',
                  borderBottom:
                    i < rows - 1 ? '2px solid rgba(255,255,255,0.08)' : 'none',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                <span
                  style={{
                    color: a >= b ? theme.acc : '#fff',
                    width: 200,
                    textAlign: 'left',
                  }}
                >
                  {a}
                </span>
                <span style={{ fontSize: 30, color: 'rgba(255,255,255,0.5)' }}>
                  {t('card_round', { i: i + 1 })}
                </span>
                <span
                  style={{
                    color: b >= a ? theme.acc : '#fff',
                    width: 200,
                    textAlign: 'right',
                  }}
                >
                  {b}
                </span>
              </div>
            )
          })}
        </div>
      </div>
      <Bottom cta={cta} url={gameUrl} ctaLabel={t('card_play_cta')} acc={theme.acc} />
    </>,
  )
})

// Bandeau d'appel à l'action + URL du jeu (boucle virale / retrouvabilité).
function Bottom({ cta, url, ctaLabel, acc }) {
  return (
    <div style={{ padding: '0 70px 64px' }}>
      <div
        style={{
          background: SURFACE,
          border: `4px solid ${acc}`,
          borderRadius: 30,
          padding: '34px 30px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 54, fontWeight: 900, color: '#fff' }}>{cta}</div>
        <div style={{ marginTop: 18, fontSize: 34, fontWeight: 700, color: DIM }}>
          {ctaLabel}
        </div>
        <div
          style={{
            marginTop: 6,
            fontFamily:
              "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
            fontSize: 48,
            fontWeight: 700,
            color: acc,
          }}
        >
          {url}
        </div>
      </div>
    </div>
  )
}

export default ShareCard
