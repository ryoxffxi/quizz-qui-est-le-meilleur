// Traductions françaises. Les {placeholders} sont remplacés par t(clé, vars).
export default {
  // Identité du jeu
  app_name: 'Quizz',
  app_subtitle: 'Qui est le meilleur ?',
  app_title: 'Quizz - Qui est le meilleur ?',
  footer_follow: 'Suivez-nous sur Instagram',
  cookie_text:
    'On utilise des cookies pour faire fonctionner le site et, avec ton accord, en mesurer l’audience. Tu choisis.',
  cookie_detail:
    'Les cookies essentiels assurent le bon fonctionnement du site. Les cookies de mesure d’audience ne sont activés qu’avec ton accord. Tu peux changer d’avis à tout moment via « Cookies » en bas de page.',
  cookie_accept: 'Accepter',
  cookie_reject: 'Refuser',
  cookie_more: 'En savoir plus',
  cookie_manage: 'Cookies',
  footer_privacy: 'Confidentialité',
  footer_terms: 'Conditions',

  // Premium / publicité
  upsell_premium: 'Passer en Premium (sans pub)',
  paywall_title: 'Quizz Premium',
  paywall_sub: 'Soutiens le jeu et profite d’une expérience 100 % sans publicité.',
  paywall_feature_noads: 'Zéro publicité',
  paywall_feature_all: 'Tout le catalogue de questions',
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
  paywall_soon: 'Paiement bientôt disponible — merci de ta patience !',
  paywall_close: 'Fermer',
  paywall_preview: 'Activer l’aperçu sans pub',
  premium_active: 'Premium actif — merci ! 💜',
  result_ad_label: 'Publicité',
  promo_noads_text: 'Marre des pubs ?',
  promo_noads_cta: 'Passer sans pub',

  // En-tête / divers
  sound_on: 'Couper le son',
  sound_off: 'Activer le son',
  lang_switch: 'Changer de langue',

  // Accueil
  tagline:
    'Révise ton code de la route, ta culture G, le ciné et les mangas — tout en défiant tes amis.',
  mode_label: 'Mode de jeu',
  mode_solo: '📖 Réviser solo',
  mode_challenge: '⚡ Défi entre potes',
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

  // Navigation
  quit: '← Quitter',
  back: '← Retour',
  home: '🏠 Accueil',

  // Quiz solo — déroulé
  hint_next: 'Clique n’importe où pour passer à la suivante.',
  hint_choose: 'Clique sur une réponse pour la choisir.',
  hint_validate: 'Clique à nouveau sur ta réponse pour valider.',
  feedback_correct: '✅ Bonne réponse !',
  feedback_wrong: '❌ Raté !',
  next_question: 'Question suivante',
  see_recap: 'Voir le récap',
  solo_topbar: 'Lot {b}/{tb} · {i}/{n}',
  lot_label: 'Lot {b} / {tb}',
  continue_solo: 'Continuer ({n} nouvelles questions)',
  challenge_a_friend: '⚡ Défier un pote',

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

  // Défi — configuration
  challenge_title: '⚡ Défi entre potes',
  setup_sub:
    'Joue ta partie, puis partage un lien à un ami : il jouera les mêmes questions et vous comparerez vos scores manche par manche.',
  pseudo_label: 'Ton pseudo',
  pseudo_ph_host: 'Ex : Alex',
  pseudo_ph_join: 'Ex : Sam',
  rounds_label: 'Nombre de manches',
  rounds_help: '{n} manches · {q} questions, toutes différentes',
  rounds_help_one: '{n} manche · {q} questions, toutes différentes',
  launch_challenge: 'Lancer le défi',
  simulate_friend: '🤖 Tester en simulant un ami',
  default_host: 'Joueur 1',
  default_join: 'Joueur 2',
  default_friend: 'Un ami',

  // Défi — invitation
  invite_invalid: 'Lien de défi invalide 😕',
  invite_title: '{host} t’a défié ! ⚔️',
  invite_sub:
    'Relève le défi sur « {cat} » en {rounds} ({q} questions) : tu joueras exactement les mêmes questions, puis vous comparerez vos scores manche par manche.',
  accept_challenge: 'Relever le défi',

  // Défi — en jeu
  challenge_topbar: 'Manche {r}/{mr} · Q{i}/{n}',
  answer_saved: 'Réponse enregistrée… 🤫',
  continue_challenge: 'Continuer ({n} nouvelles questions)',

  // Défi — résultats (titres)
  result_tie_final: '🤝 Égalité parfaite !',
  result_win_final: '🏆 Tu as gagné !',
  result_lose_final: '😅 {opp} l’emporte',
  result_tie_lead: '🤝 À égalité !',
  result_lead: '🏆 Tu mènes !',
  result_behind: '⚡ {opp} mène',
  result_round_done: '✅ Manche terminée !',
  result_challenge_done: '🎉 Défi terminé !',
  round_cumulative: 'Manche {r} / {mr} · score cumulé',
  round_gain: 'Manche {r} / {mr} · +{g} cette manche',
  round_gain_short: '+{g} cette manche',
  points_suffix: ' pts',

  // Partage du lien de jeu (hôte)
  share_play_title: '🔗 Partage ce lien à ton pote',
  share_play_sub:
    'Il jouera exactement les mêmes questions, puis vous comparerez vos scores manche par manche.',
  copy: 'Copier',
  copied: '✓ Copié',

  // Partage du résultat
  share_result_title: '📤 Partager ton résultat',
  share_copy_link: '🔗 Copier le lien du résultat',
  share_link_copied: '✓ Lien copié',
  share_as_image: '🖼️ Partager en image',
  share_generating: '⏳ Génération…',
  share_downloaded: 'Image téléchargée ✓',
  share_image_error: 'Impossible de générer l’image 😕',
  share_native_title: 'Quizz - Qui est le meilleur ?',
  share_native_text: 'Je te défie sur Quizz — sauras-tu faire mieux ? 🎯',
  share_native_image_text: 'Mon résultat sur Quizz 🎯 À ton tour !',

  // Vue résultat (page de conversion du lien partagé)
  result_invalid: 'Lien de résultat invalide 😕',
  result_solo_label: 'Révision solo · {diff}',
  result_solo_play: '🎯 Jouer sur Quizz',
  landing_intro: 'Ce score a été réalisé sur Quizz 👇',
  landing_challenge: '⚔️ Défier un ami',
  landing_play: '🎯 Jouer maintenant',
  concept_title: '💡 C’est quoi Quizz ?',
  concept_text:
    'Des quiz fun pour tester tes connaissances — en solo ou en défi avec tes amis. Gratuit, sans compte.',
  result_duel_win: '🏆 {name} l’emporte !',
  result_duel_tie: '🤝 Égalité parfaite !',
  result_rounds_diff: '{rounds} · {diff}',
  result_play_own: '⚡ Lancer mon propre défi',
  round_word: 'Manche',
  rounds_count: '{n} manches',
  rounds_count_one: '{n} manche',

  // Carte image
  card_solo_kicker: '📖 RÉVISION SOLO',
  card_duel_kicker: '⚔️ DÉFI ENTRE POTES',
  card_my_score: 'Mon score',
  card_points: 'points',
  card_success_rate: '{pct}% de réussite',
  card_win: '🏆 {name} gagne !',
  card_tie: '🤝 Égalité parfaite !',
  card_detail: 'DÉTAIL · {rounds}',
  card_round: 'Manche {i}',
  card_rounds_n: '{n} MANCHES',
  card_rounds_one: '{n} MANCHE',
  card_cta_duel: 'À ton tour — tu fais mieux ?',
  card_cta_solo: 'Sauras-tu faire mieux ?',
  card_play_cta: 'Joue gratuitement sur',
}
