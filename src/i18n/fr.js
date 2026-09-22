// Traductions françaises. Les {placeholders} sont remplacés par t(clé, vars).
// Le FR tutoie le joueur. Aucun tiret long (U+2014) : deux-points, virgule ou point.
// Pluriels : tn(clé, n) cherche clé_one / clé_other avant de retomber sur clé.
export default {
  // Identité du jeu
  app_name: 'Quizz',
  app_subtitle: 'Qui est le meilleur ?',
  app_title: 'Quizz - Qui est le meilleur ?',
  cookie_text:
    'Ce site utilise des cookies pour fonctionner. La mesure d’audience (sans cookie, Cloudflare) n’est activée qu’avec ton accord.',
  cookie_detail:
    'Les annonces Google AdSense sont soumises à ton choix dans le message de consentement Google, que tu peux rouvrir depuis Confidentialité. Tu peux changer d’avis sur la mesure d’audience à tout moment via « Cookies » en bas de page.',
  cookie_accept: 'Accepter',
  cookie_reject: 'Refuser',
  cookie_more: 'En savoir plus',
  cookie_manage: 'Cookies',
  footer_privacy: 'Confidentialité',
  footer_terms: 'Conditions',

  // Génériques (boutons, états) : à réutiliser avant de créer une clé dédiée
  close: 'Fermer',
  back: '← Retour',
  home: 'Accueil',
  share: 'Partager',
  copy: 'Copier',
  copied: '✓ Copié',
  retry: 'Réessayer',
  cancel: 'Annuler',
  confirm: 'Confirmer',
  continue: 'Continuer',
  yes: 'Oui',
  no: 'Non',
  later: 'Plus tard',
  today: 'Aujourd’hui',
  streak_days: '{n} jours de suite',
  streak_days_one: '{n} jour de suite',
  best_score: 'Meilleur score',
  new_record: 'Nouveau record !',

  // Premium / publicité
  upsell_premium: 'Passer en Premium (sans pub)',
  paywall_title: 'Quizz Premium',
  paywall_sub: 'Soutiens le jeu et profite d’une expérience 100 % sans publicité.',
  paywall_feature_noads: 'Zéro publicité',
  paywall_feature_all: 'Même sur l’examen blanc et le défi du jour',
  paywall_feature_support: 'Tu soutiens le créateur 💜',
  plan_monthly_name: 'Mensuel',
  plan_monthly_price: '2 €',
  plan_monthly_period: '/ mois',
  plan_lifetime_name: 'À vie',
  plan_lifetime_price: '9,99 €',
  plan_lifetime_period: 'paiement unique',
  plan_lifetime_badge: 'Le plus avantageux',
  paywall_subscribe: 'S’abonner',
  paywall_buy: 'Acheter à vie',
  paywall_soon: 'Paiement bientôt disponible, merci de ta patience !',
  premium_active: 'Premium actif, merci ! 💜',
  result_ad_label: 'Publicité',
  promo_noads_text: 'Marre des pubs ?',
  promo_noads_cta: 'Passer sans pub',

  // En-tête / divers
  sound_on: 'Couper le son',
  sound_off: 'Activer le son',
  lang_switch: 'Changer de langue',

  // Accueil
  mode_label: 'Mode de jeu',
  mode_solo: 'Réviser solo',
  mode_challenge: 'Défi entre potes',
  help_solo: 'Solo : banque complète par lots de 10, correction immédiate, sans chrono.',
  help_challenge:
    'Défi : manches de 5 questions chronométrées, score à la vitesse, et duel par lien.',
  difficulty_label: 'Difficulté',
  diff_facile: 'Facile',
  diff_expert: 'Expert',
  choose_category: 'Choisis une catégorie',
  questions_count: '{n} questions',

  // Catégories
  cat_culture: 'Culture Générale',
  cat_manga: 'Manga & Animé',
  cat_route: 'Code de la route',
  cat_cinema: 'Cinéma & Séries',
  cat_panneaux: 'Panneaux routiers',

  // Onglet Panneaux (révision du code de la route, FR uniquement)
  home_tab_quiz: 'Quiz',
  home_tab_panneaux: 'Panneaux',
  panneaux_quiz_title: 'Le quiz spécial panneaux',
  panneaux_quiz_sub:
    'Uniquement des panneaux, chacun avec son visuel : sauras-tu tous les reconnaître ?',
  panneaux_quiz_cta: 'Lancer le quiz panneaux',
  panneaux_browse: 'Réviser par famille',
  panneaux_count: '{n} panneaux',
  sign_prev: 'Panneau précédent',
  sign_next: 'Panneau suivant',

  // Navigation
  quit: '← Quitter',

  // Quiz solo : déroulé
  hint_next: 'Clique n’importe où pour passer à la suivante.',
  hint_choose: 'Clique sur une réponse pour la choisir.',
  feedback_correct: '✓ Bonne réponse !',
  feedback_wrong: '✗ Raté !',
  next_question: 'Question suivante',
  see_recap: 'Voir le récap',
  challenge_a_friend: 'Défier un pote',

  // Récap des erreurs
  recap_perfect: '🎉 Aucune erreur, sans-faute !',
  recap_title: 'Tes erreurs ({n})',
  recap_your_answer: 'Ta réponse : {ans}',
  recap_no_answer: 'Aucune réponse donnée',
  recap_correct_answer: 'Bonne réponse : {ans}',

  // Personnalité (selon le score)
  personality_genius: 'Un génie 🤯',
  personality_good: 'Pas mal du tout 👏',
  personality_bad: 'Aïe... faut réviser 😅',

  // Défi : configuration
  challenge_title: 'Défi entre potes',
  setup_sub:
    'Joue ta partie, puis partage un lien à un ami : il jouera les mêmes questions et vous comparerez vos scores manche par manche.',
  pseudo_label: 'Ton pseudo',
  pseudo_ph_host: 'Ex : Alex',
  pseudo_ph_join: 'Ex : Sam',
  rounds_label: 'Nombre de manches',
  rounds_help: '{n} manches · {q} questions, toutes différentes',
  rounds_help_one: '{n} manche · {q} questions, toutes différentes',
  launch_challenge: 'Lancer le défi',
  default_host: 'Joueur 1',
  default_join: 'Joueur 2',
  default_friend: 'Un ami',

  // Défi : invitation
  invite_invalid: 'Lien de défi invalide 😕',
  invite_title: '{host} t’a défié ! ⚔️',
  invite_sub:
    'Relève le défi sur « {cat} » en {rounds} ({q} questions) : tu joueras exactement les mêmes questions, puis vous comparerez vos scores manche par manche.',
  accept_challenge: 'Relever le défi',

  // Défi : en jeu
  challenge_topbar: 'Manche {r}/{mr} · Q{i}/{n}',
  answer_saved: 'Réponse enregistrée… 🤫',
  continue_challenge: 'Continuer ({n} nouvelles questions)',

  // Défi : résultats (titres)
  result_tie_final: '🤝 Égalité parfaite !',
  result_win_final: '🏆 Tu as gagné !',
  result_lose_final: '😅 {opp} l’emporte',
  result_tie_lead: '🤝 À égalité !',
  result_lead: '🏆 Tu mènes !',
  result_behind: '{opp} mène',
  result_round_done: '✓ Manche terminée !',
  result_challenge_done: '🎉 Défi terminé !',
  round_cumulative: 'Manche {r} / {mr} · score cumulé',
  round_gain: 'Manche {r} / {mr} · +{g} cette manche',
  round_gain_short: '+{g} cette manche',
  points_suffix: ' pts',

  // Partage du lien de jeu (hôte)
  share_play_title: 'Partage ce lien à ton pote',
  share_play_sub:
    'Il jouera exactement les mêmes questions, puis vous comparerez vos scores manche par manche.',

  // Partage du résultat (le titre natif du partage est app_title)
  share_result_title: 'Partager ton résultat',
  share_generating: 'Génération…',

  // Vue résultat (page de conversion du lien partagé)
  result_invalid: 'Lien de résultat invalide 😕',
  result_solo_label: 'Révision solo · {diff}',
  landing_intro: 'Ce score a été réalisé sur Quizz 👇',
  landing_challenge: '⚔️ Défier un ami',
  landing_play: 'Jouer maintenant',
  concept_title: '💡 C’est quoi Quizz ?',
  concept_text:
    'Des quiz fun pour tester tes connaissances, en solo ou en défi avec tes amis. Gratuit, sans compte.',
  result_duel_win: '🏆 {name} l’emporte !',
  result_duel_tie: '🤝 Égalité parfaite !',
  rounds_count: '{n} manches',
  rounds_count_one: '{n} manche',

  // Carte image
  card_solo_kicker: 'RÉVISION SOLO',
  card_duel_kicker: '⚔️ DÉFI ENTRE POTES',
  card_points: 'points',
  card_success_rate: '{pct}% de réussite',
  card_win: '🏆 {name} gagne !',
  card_tie: '🤝 Égalité parfaite !',
  card_detail: 'DÉTAIL · {rounds}',
  card_round: 'Manche {i}',
  card_rounds_n: '{n} MANCHES',
  card_rounds_one: '{n} MANCHE',
  card_cta_duel: 'À ton tour : tu fais mieux ?',
  card_cta_solo: 'Sauras-tu faire mieux ?',
  card_play_cta: 'Joue gratuitement sur',
  // Design v2 (ambiances + tuiles de stats)
  theme_toggle: 'Changer d’ambiance',
  hero_sub: 'Révise sérieusement, ou défie un pote',
  tile_answered: 'questions jouées',
  tile_correct: 'bonnes réponses',
  tile_precision: 'précision',

  // Don (soutien)
  donate_footer: 'Soutenir',
  donate_title: 'Soutenir Quizz 💜',
  donate_sub: 'Un petit don pour aider le jeu à grandir (serveurs, nouvelles questions). Merci !',
  donate_custom: 'Montant libre (€)',
  donate_cta: 'Faire un don de {n} €',
  donate_thanks: 'Merci infiniment pour ton soutien ! Le jeu grandit grâce à toi. 💜',

  // Chargement de la banque de questions (chunk séparé)
  bank_loading: 'Chargement des questions…',
  bank_error: 'Impossible de charger les questions. Vérifie ta connexion.',
  bank_retry: 'Réessayer',

  // Accroche de l'accueil + liens vers les pages statiques (à-propos, contact)
  home_tagline: 'Quiz gratuit, sans compte : {n} questions, {k} thèmes, en solo ou en défi entre potes.',
  footer_about: 'À propos',
  footer_contact: 'Contact',
}
