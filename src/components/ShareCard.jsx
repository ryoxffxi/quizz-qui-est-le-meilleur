import { forwardRef } from 'react'
import { useI18n } from '../i18n'
import { gameHost } from '../lib/challengeLink'
import { personalityKey } from './ResultHero'

const GOLD = '#fde68a'

// Carte de résultat partageable, format story (1080×1920).
// Asset marketing : nom du jeu, score valorisé, appel au défi, URL du jeu.
// Styles 100 % en ligne pour une capture html-to-image fidèle.
const ShareCard = forwardRef(function ShareCard({ resultData, category }, ref) {
  const { t } = useI18n()
  const [g1, g2] = category.gradient
  const diffLabel = t(`diff_${resultData.d}`)
  const catName = t(category.labelKey)
  const gameUrl = gameHost()
  const cta = resultData.solo ? t('card_cta_solo') : t('card_cta_duel')

  const Header = ({ kicker }) => (
    <div
      style={{
        background: `linear-gradient(160deg, ${g1}, ${g2})`,
        padding: '90px 80px 70px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: 92,
          fontWeight: 900,
          letterSpacing: -2,
          color: '#fff',
          textShadow: '0 4px 18px rgba(0,0,0,0.3)',
        }}
      >
        {t('app_name')}
      </div>
      <div
        style={{
          display: 'inline-block',
          marginTop: 26,
          padding: '16px 34px',
          borderRadius: 999,
          background: 'rgba(0,0,0,0.28)',
          fontSize: 40,
          fontWeight: 700,
        }}
      >
        {category.emoji} {catName} · {diffLabel}
      </div>
      <div
        style={{
          marginTop: 30,
          fontSize: 50,
          fontWeight: 800,
          letterSpacing: 6,
          opacity: 0.95,
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
        background: '#0b0f1a',
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
    return shell(
      <>
        <Header kicker={t('card_solo_kicker')} />
        <div
          style={{
            flex: 1,
            padding: '90px 80px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ fontSize: 44, color: 'rgba(255,255,255,0.65)', marginBottom: 20 }}>
            {t('card_my_score')}
          </div>
          <div
            style={{
              fontWeight: 900,
              lineHeight: 1,
              color: GOLD,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <span style={{ fontSize: 320 }}>{sc}</span>
            <span style={{ fontSize: 130, color: 'rgba(255,255,255,0.7)' }}>
              /{tot}
            </span>
          </div>
          <div style={{ fontSize: 60, fontWeight: 800, marginTop: 30 }}>
            {t(personalityKey(sc, tot))}
          </div>
          <div
            style={{
              marginTop: 56,
              padding: '20px 46px',
              borderRadius: 999,
              border: `4px solid ${GOLD}`,
              fontSize: 56,
              fontWeight: 900,
              color: GOLD,
            }}
          >
            {t('card_success_rate', { pct })}
          </div>
        </div>
        <Bottom cta={cta} url={gameUrl} ctaLabel={t('card_play_cta')} />
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
        background: 'rgba(255,255,255,0.08)',
        border: `4px solid ${isWinner ? GOLD : 'rgba(255,255,255,0.14)'}`,
        borderRadius: 36,
        padding: '44px 24px 40px',
        textAlign: 'center',
        boxShadow: isWinner ? `0 0 0 2px ${GOLD} inset` : 'none',
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
          fontSize: 132,
          fontWeight: 900,
          lineHeight: 1,
          color: isWinner ? GOLD : '#fff',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {score}
      </div>
      <div style={{ fontSize: 34, color: 'rgba(255,255,255,0.65)', marginTop: 10 }}>
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
          padding: '64px 70px 40px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            fontSize: 60,
            fontWeight: 900,
            textAlign: 'center',
            marginBottom: 40,
            color: GOLD,
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
              fontSize: 56,
              fontWeight: 900,
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            VS
          </div>
          {player(p2, s2, winner === 'p2')}
        </div>

        <div
          style={{
            marginTop: 56,
            background: 'rgba(255,255,255,0.05)',
            border: '3px solid rgba(255,255,255,0.12)',
            borderRadius: 30,
            padding: '34px 40px',
          }}
        >
          <div
            style={{
              fontSize: 34,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.6)',
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
                }}
              >
                <span style={{ color: a >= b ? GOLD : '#fff', width: 200, textAlign: 'left' }}>
                  {a}
                </span>
                <span style={{ fontSize: 30, color: 'rgba(255,255,255,0.5)' }}>
                  {t('card_round', { i: i + 1 })}
                </span>
                <span style={{ color: b >= a ? GOLD : '#fff', width: 200, textAlign: 'right' }}>
                  {b}
                </span>
              </div>
            )
          })}
        </div>
      </div>
      <Bottom cta={cta} url={gameUrl} ctaLabel={t('card_play_cta')} />
    </>,
  )
})

// Bandeau d'appel à l'action + URL du jeu (boucle virale / retrouvabilité).
function Bottom({ cta, url, ctaLabel }) {
  return (
    <div style={{ padding: '0 70px 64px' }}>
      <div
        style={{
          background: 'rgba(253,230,138,0.1)',
          border: `4px solid ${GOLD}`,
          borderRadius: 30,
          padding: '34px 30px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 54, fontWeight: 900, color: '#fff' }}>{cta}</div>
        <div
          style={{
            marginTop: 18,
            fontSize: 34,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          {ctaLabel}
        </div>
        <div style={{ marginTop: 6, fontSize: 46, fontWeight: 900, color: GOLD }}>
          🎯 {url}
        </div>
      </div>
    </div>
  )
}

export default ShareCard
