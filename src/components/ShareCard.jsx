import { forwardRef, useMemo } from 'react'
import { useI18n } from '../i18n'
import { buildResultUrl, gameHost } from '../lib/challengeLink'
import { personalityKey } from '../lib/game'
import { qrSvgPath } from '../lib/qr'
import { getTheme } from '../lib/theme'

// Palette de la carte selon l'ambiance ACTIVE de l'utilisateur (design v2).
const CARD_THEMES = {
  volt: { acc: '#d8ff3d', ink: '#10140a', tint: 'rgba(216,255,61,0.12)' },
  crimson: { acc: '#ff4155', ink: '#ffffff', tint: 'rgba(255,65,85,0.14)' },
}

const CARD_BG = '#0a0d16'
const SURFACE = 'rgba(255,255,255,0.06)'
const BORDER = 'rgba(255,255,255,0.12)'
const DIM = 'rgba(255,255,255,0.62)'
const DISPLAY =
  "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
const BODY = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
// Au-delà de ce nombre de manches, le détail passe sur deux colonnes.
const ROWS_ONE_COLUMN = 5

// En-tête : logo, nom du jeu, catégorie + difficulté, libellé du mode.
function Header({ appName, theme, catColor, catName, diffLabel, kicker }) {
  return (
    <div style={{ flexShrink: 0, padding: '84px 80px 0', textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 26 }}>
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
          {appName}
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
      <div style={{ marginTop: 28, fontSize: 40, fontWeight: 700, letterSpacing: 8, color: DIM }}>
        {kicker}
      </div>
    </div>
  )
}

// QR code du lien : noir sur blanc avec une marge de 4 modules (zone de
// silence), en SVG net quelle que soit la taille.
function QrCode({ qr, size }) {
  const m = 4
  const span = qr.size + 2 * m
  return (
    <svg
      width={size}
      height={size}
      viewBox={`${-m} ${-m} ${span} ${span}`}
      shapeRendering="crispEdges"
      style={{ display: 'block', flexShrink: 0, borderRadius: 22 }}
    >
      <rect x={-m} y={-m} width={span} height={span} fill="#fff" />
      <path d={qr.d} fill="#000" />
    </svg>
  )
}

// Bandeau bas : appel à l'action, QR code du lien de résultat et adresse du
// jeu. Jamais rogné : il ne rétrécit pas, c'est le corps qui s'adapte.
function Bottom({ cta, ctaLabel, scanLabel, url, acc, qr }) {
  return (
    <div style={{ flexShrink: 0, padding: '0 70px 64px' }}>
      <div
        style={{
          background: SURFACE,
          border: `4px solid ${acc}`,
          borderRadius: 30,
          padding: '34px 36px',
          display: 'flex',
          alignItems: 'center',
          gap: 36,
        }}
      >
        {qr && <QrCode qr={qr} size={250} />}
        <div style={{ flex: 1, minWidth: 0, textAlign: qr ? 'left' : 'center' }}>
          <div style={{ fontSize: 50, fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>{cta}</div>
          <div style={{ marginTop: 16, fontSize: 32, fontWeight: 700, color: DIM }}>{ctaLabel}</div>
          <div
            style={{
              marginTop: 4,
              fontFamily: DISPLAY,
              fontSize: 44,
              fontWeight: 700,
              color: acc,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {url}
          </div>
          {qr && (
            <div style={{ marginTop: 12, fontSize: 28, fontWeight: 700, color: DIM }}>
              {scanLabel}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Grille emoji (🟩🟥) façon Wordle, sous le score.
function EmojiGrid({ grid }) {
  return (
    <div
      style={{
        marginTop: 30,
        fontSize: 44,
        lineHeight: 1.3,
        letterSpacing: 2,
        whiteSpace: 'pre',
        textAlign: 'center',
      }}
    >
      {grid}
    </div>
  )
}

// Un joueur de la carte Défi.
function Player({ name, score, isWinner, theme, pointsLabel }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        background: SURFACE,
        border: `4px solid ${isWinner ? theme.acc : BORDER}`,
        borderRadius: 36,
        padding: '40px 24px 36px',
        textAlign: 'center',
      }}
    >
      <div style={{ height: 70, fontSize: 56, lineHeight: 1 }}>{isWinner ? '👑' : ''}</div>
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
      <div style={{ fontSize: 34, color: DIM, marginTop: 10 }}>{pointsLabel}</div>
    </div>
  )
}

// Détail manche par manche : une colonne jusqu'à 5 manches, deux au-delà
// (8 manches tiennent ainsi au-dessus du bandeau bas).
function RoundsDetail({ r1, r2, rows, theme, t }) {
  const twoCols = rows > ROWS_ONE_COLUMN
  return (
    <div
      style={{
        marginTop: 44,
        background: SURFACE,
        border: `3px solid ${BORDER}`,
        borderRadius: 30,
        padding: '28px 40px',
      }}
    >
      <div style={{ fontSize: 34, fontWeight: 700, color: DIM, marginBottom: 18, letterSpacing: 1 }}>
        {t('card_detail', {
          rounds: t(rows === 1 ? 'card_rounds_one' : 'card_rounds_n', { n: rows }),
        })}
      </div>
      <div
        style={
          twoCols
            ? { display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 44 }
            : undefined
        }
      >
        {Array.from({ length: rows }).map((_, i) => {
          const a = r1[i] ?? 0
          const b = r2[i] ?? 0
          // Dernière ligne de chaque colonne : pas de filet.
          const last = twoCols ? i >= rows - 2 : i === rows - 1
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                fontSize: twoCols ? 34 : 40,
                fontWeight: 700,
                padding: '12px 0',
                borderBottom: last ? 'none' : '2px solid rgba(255,255,255,0.08)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <span style={{ color: a >= b ? theme.acc : '#fff', minWidth: 110, textAlign: 'left' }}>
                {a}
              </span>
              <span style={{ fontSize: twoCols ? 26 : 30, color: 'rgba(255,255,255,0.5)' }}>
                {t('card_round', { i: i + 1 })}
              </span>
              <span style={{ color: b >= a ? theme.acc : '#fff', minWidth: 110, textAlign: 'right' }}>
                {b}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Carte de résultat partageable, format story (1080×1920), design v2 :
// fond sombre, accent de l'ambiance, anneau de score en SVG (fiable pour
// la capture html-to-image). Styles 100 % en ligne.
//
// resultData solo : { solo: 1, c, d, l?, sc, tot, mode?, grid? }
//   mode ∈ solo | examen | quotidien | erreurs | defi (libellé card_mode_*) ;
//   pour 'defi', sc = points marqués et tot = maximum possible.
// resultData duel : { c, d, l?, n, p1, r1, p2, r2, s? }
const ShareCard = forwardRef(function ShareCard({ resultData, category }, ref) {
  const { t } = useI18n()
  const theme = CARD_THEMES[getTheme()] || CARD_THEMES.volt
  const catColor = category.gradient[0]
  const diffLabel = t(`diff_${resultData.d}`)
  const catName = t(category.labelKey)
  const gameUrl = gameHost()
  const kicker = resultData.mode
    ? t(`card_mode_${resultData.mode}`)
    : resultData.solo
      ? t('card_solo_kicker')
      : t('card_duel_kicker')
  const cta = resultData.solo ? t('card_cta_solo') : t('card_cta_duel')

  // Lien de résultat encodé en QR (null seulement s'il dépassait 2 953 octets).
  const link = buildResultUrl(resultData)
  const qr = useMemo(() => qrSvgPath(link), [link])

  const bottom = (
    <Bottom
      cta={cta}
      ctaLabel={t('card_play_cta')}
      scanLabel={t('defi_card_scan')}
      url={gameUrl}
      acc={theme.acc}
      qr={qr}
    />
  )

  const shell = (children) => (
    <div
      ref={ref}
      style={{
        width: 1080,
        height: 1920,
        background: `radial-gradient(120% 40% at 50% -5%, ${theme.tint} 0%, transparent 60%), ${CARD_BG}`,
        color: '#fff',
        fontFamily: BODY,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <Header
        appName={t('app_name')}
        theme={theme}
        catColor={catColor}
        catName={catName}
        diffLabel={diffLabel}
        kicker={kicker}
      />
      {children}
      {bottom}
    </div>
  )

  // ===== Carte SOLO (révision, examen, quotidien, erreurs, points du défi) =====
  if (resultData.solo) {
    const { sc, tot } = resultData
    const points = resultData.mode === 'defi'
    const pct = tot > 0 ? Math.max(0, Math.min(100, Math.round((sc / tot) * 100))) : 0
    const R = 210
    const C = 2 * Math.PI * R
    return shell(
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          padding: '40px 80px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ position: 'relative', width: 520, height: 520, flexShrink: 0 }}>
          <svg width="520" height="520" viewBox="0 0 520 520">
            <circle cx="260" cy="260" r={R} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="34" />
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
            {points ? (
              <>
                <div style={{ fontSize: 120, fontWeight: 700, lineHeight: 1, color: '#fff' }}>{sc}</div>
                <div style={{ fontSize: 44, color: DIM, marginTop: 10 }}>{t('card_points')}</div>
              </>
            ) : (
              <div style={{ fontSize: 170, fontWeight: 700, lineHeight: 1, color: '#fff' }}>
                {sc}
                <span style={{ fontSize: 70, color: DIM }}>/{tot}</span>
              </div>
            )}
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
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {points ? t('card_points_max', { sc, tot }) : t('card_success_rate', { pct })}
        </div>
        {resultData.grid && <EmojiGrid grid={resultData.grid} />}
      </div>,
    )
  }

  // ===== Carte DÉFI (deux joueurs) =====
  const { n, p1, r1, p2, r2 } = resultData
  const s1 = r1.reduce((a, b) => a + b, 0)
  const s2 = r2.reduce((a, b) => a + b, 0)
  const winner = s1 === s2 ? 'tie' : s1 > s2 ? 'p1' : 'p2'
  const rows = Math.max(r1.length, r2.length, n || 0)

  return shell(
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
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
        {winner === 'tie' ? t('card_tie') : t('card_win', { name: winner === 'p1' ? p1 : p2 })}
      </div>

      <div style={{ display: 'flex', gap: 28, alignItems: 'stretch' }}>
        <Player name={p1} score={s1} isWinner={winner === 'p1'} theme={theme} pointsLabel={t('card_points')} />
        <div style={{ alignSelf: 'center', fontFamily: DISPLAY, fontSize: 56, fontWeight: 700, color: DIM }}>
          VS
        </div>
        <Player name={p2} score={s2} isWinner={winner === 'p2'} theme={theme} pointsLabel={t('card_points')} />
      </div>

      {rows > 0 && <RoundsDetail r1={r1} r2={r2} rows={rows} theme={theme} t={t} />}
    </div>,
  )
})

export default ShareCard
