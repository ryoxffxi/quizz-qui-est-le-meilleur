// Chantier design : modales (<Dialog>), paywall, pages légales, sélecteurs.
// La clé générique `close` est fournie par les dictionnaires principaux ;
// les composants retombent sur `paywall_close` si elle manque.
export default {
  fr: {
    paywall_manage: 'Gérer mon abonnement',
    paywall_portal_fail: 'Portail indisponible pour le moment. Réessaie un peu plus tard.',
    paywall_loading: 'Redirection vers le paiement…',
    legal_updated: 'Dernière mise à jour : {date}',
    donate_thanks_title: 'Merci !',
    seg_mode_label: 'Mode de jeu',
    seg_diff_label: 'Niveau',
  },
  en: {
    paywall_manage: 'Manage my subscription',
    paywall_portal_fail: 'The portal is unavailable right now. Please try again later.',
    paywall_loading: 'Redirecting to payment…',
    legal_updated: 'Last updated: {date}',
    donate_thanks_title: 'Thank you!',
    seg_mode_label: 'Game mode',
    seg_diff_label: 'Level',
  },
  es: {
    paywall_manage: 'Gestionar mi suscripción',
    paywall_portal_fail: 'El portal no está disponible ahora mismo. Inténtalo más tarde.',
    paywall_loading: 'Redirigiendo al pago…',
    legal_updated: 'Última actualización: {date}',
    donate_thanks_title: '¡Gracias!',
    seg_mode_label: 'Modo de juego',
    seg_diff_label: 'Nivel',
  },
  pt: {
    paywall_manage: 'Gerenciar minha assinatura',
    paywall_portal_fail: 'O portal está indisponível no momento. Tente de novo mais tarde.',
    paywall_loading: 'Redirecionando para o pagamento…',
    legal_updated: 'Última atualização: {date}',
    donate_thanks_title: 'Obrigado!',
    seg_mode_label: 'Modo de jogo',
    seg_diff_label: 'Nível',
  },
}
