import { Component } from 'react'
import { translate } from '../i18n'
import { resetScreen } from '../lib/screens'

// Filet local autour d'un écran chargé paresseusement : si son chunk ne se
// charge pas (hors ligne, réseau) ou s'il plante au rendu, on affiche le même
// visuel que BankGate avec « Réessayer » (qui oublie le chargement raté, voir
// resetScreen) et « Accueil », au lieu de l'écran de secours global.
//
// Composant de classe : React n'expose les erreurs de rendu qu'à ce type de
// composant. Textes lus via translate() (pas de hook dans une classe) ; la
// langue courante est synchronisée par LanguageProvider.
export default class ScreenBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
    this.retry = this.retry.bind(this)
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    console.error('Écran impossible à ouvrir :', error)
  }

  retry() {
    if (this.props.name) resetScreen(this.props.name)
    this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false
    return (
      <div className="bank-gate" role="alert">
        <p className="bank-gate-error">
          {offline ? translate('app_offline') : translate('app_screen_error')}
        </p>
        <div className="bank-gate-actions">
          <button type="button" className="btn btn-primary" onClick={this.retry}>
            {translate('bank_retry')}
          </button>
          {this.props.onHome && (
            <button type="button" className="btn btn-secondary" onClick={this.props.onHome}>
              {translate('home')}
            </button>
          )}
        </div>
      </div>
    )
  }
}
