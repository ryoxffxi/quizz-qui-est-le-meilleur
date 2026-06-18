import { Component } from 'react'

// Filet de sécurité global : convertit n'importe quel crash de rendu en un
// écran de secours lisible (au lieu d'une page blanche), avec bouton recharger.
// Texte bilingue FR/EN volontairement statique : on ne peut pas dépendre de
// l'i18n ni du CSS, qui pourraient eux-mêmes être en cause.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // Trace console pour le debug ; aucun service externe.
    console.error('Erreur capturée par ErrorBoundary :', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 24,
          textAlign: 'center',
          background: '#0b0f1a',
          color: '#e5e7eb',
          fontFamily: 'system-ui, -apple-system, Arial, sans-serif',
        }}
      >
        <div style={{ fontSize: '3rem' }}>😵‍💫</div>
        <h1 style={{ fontSize: '1.4rem', margin: 0 }}>Oups, un imprévu</h1>
        <p style={{ maxWidth: 420, lineHeight: 1.5, color: '#9ca3af', margin: 0 }}>
          Une erreur est survenue. Recharge la page pour continuer.
          <br />
          Something went wrong — please reload the page.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: 8,
            padding: '12px 22px',
            fontSize: '1rem',
            fontWeight: 700,
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            cursor: 'pointer',
            background: 'linear-gradient(90deg, #8b5cf6, #ec4899)',
          }}
        >
          Recharger / Reload
        </button>
      </div>
    )
  }
}
