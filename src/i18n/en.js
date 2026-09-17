// English translations. {placeholders} are filled by t(key, vars).
// No em dash (U+2014): use a colon, a comma or a full stop.
// Plurals: tn(key, n) looks for key_one / key_other before falling back to key.
export default {
  // Game identity
  app_name: 'Quizz',
  app_subtitle: 'Who’s the best?',
  app_title: 'Quizz - Who’s the best?',
  cookie_text:
    'This site uses cookies to work. Audience measurement (cookie-free, Cloudflare) is only enabled with your consent.',
  cookie_detail:
    'Google AdSense ads follow the choice you make in Google’s consent message, which you can reopen from Privacy. You can change your mind about audience measurement anytime via “Cookies” at the bottom of the page.',
  cookie_accept: 'Accept',
  cookie_reject: 'Decline',
  cookie_more: 'Learn more',
  cookie_manage: 'Cookies',
  footer_privacy: 'Privacy',
  footer_terms: 'Terms',

  // Generic (buttons, states): reuse these before adding a dedicated key
  close: 'Close',
  back: '← Back',
  home: 'Home',
  share: 'Share',
  copy: 'Copy',
  copied: '✓ Copied',
  retry: 'Try again',
  cancel: 'Cancel',
  confirm: 'Confirm',
  continue: 'Continue',
  yes: 'Yes',
  no: 'No',
  later: 'Later',
  today: 'Today',
  streak_days: '{n} days in a row',
  streak_days_one: '{n} day in a row',
  best_score: 'Best score',
  new_record: 'New record!',

  // Premium / advertising
  upsell_premium: 'Go Premium (ad-free)',
  paywall_title: 'Quizz Premium',
  paywall_sub: 'Support the game and enjoy a 100% ad-free experience.',
  paywall_feature_noads: 'Zero ads',
  paywall_feature_all: 'Even on the mock exam and the daily challenge',
  paywall_feature_support: 'You support the creator 💜',
  plan_monthly_name: 'Monthly',
  plan_monthly_price: '€2',
  plan_monthly_period: '/ month',
  plan_lifetime_name: 'Lifetime',
  plan_lifetime_price: '€9.99',
  plan_lifetime_period: 'one-time payment',
  plan_lifetime_badge: 'Best value',
  paywall_subscribe: 'Subscribe',
  paywall_buy: 'Buy lifetime',
  paywall_soon: 'Payment coming very soon, thanks for your patience!',
  premium_active: 'Premium active, thank you! 💜',
  result_ad_label: 'Advertisement',
  promo_noads_text: 'Tired of ads?',
  promo_noads_cta: 'Go ad-free',

  // Header / misc
  sound_on: 'Mute',
  sound_off: 'Unmute',
  lang_switch: 'Change language',

  // Home
  mode_label: 'Game mode',
  mode_solo: 'Solo practice',
  mode_challenge: 'Challenge a friend',
  help_solo: 'Solo: full bank in sets of 10, instant feedback, no timer.',
  help_challenge:
    'Challenge: rounds of 5 timed questions, speed-based scoring, and link duels.',
  difficulty_label: 'Difficulty',
  diff_facile: 'Easy',
  diff_expert: 'Expert',
  choose_category: 'Choose a category',
  questions_count: '{n} questions',

  // Categories
  cat_culture: 'General Knowledge',
  cat_manga: 'Manga & Anime',
  cat_route: 'Code de la route',
  cat_cinema: 'Movies & Series',
  cat_panneaux: 'Road signs',

  // Panneaux tab (French driving-code revision, FR only)
  home_tab_quiz: 'Quiz',
  home_tab_panneaux: 'Road signs',
  panneaux_quiz_title: 'The road-signs quiz',
  panneaux_quiz_sub:
    'Signs only, each shown with its picture: can you recognize them all?',
  panneaux_quiz_cta: 'Start the signs quiz',
  panneaux_browse: 'Review by family',
  panneaux_count: '{n} signs',
  sign_prev: 'Previous sign',
  sign_next: 'Next sign',

  // Navigation
  quit: '← Quit',

  // Solo quiz: flow
  hint_next: 'Tap anywhere to go to the next one.',
  hint_choose: 'Tap an answer to select it.',
  feedback_correct: '✓ Correct!',
  feedback_wrong: '✗ Wrong!',
  next_question: 'Next question',
  see_recap: 'See recap',
  challenge_a_friend: 'Challenge a friend',

  // Mistakes recap
  recap_perfect: '🎉 No mistakes, flawless!',
  recap_title: 'Your mistakes ({n})',
  recap_your_answer: 'Your answer: {ans}',
  recap_no_answer: 'No answer given',
  recap_correct_answer: 'Correct answer: {ans}',

  // Personality (by score)
  personality_genius: 'A genius 🤯',
  personality_good: 'Not bad at all 👏',
  personality_bad: 'Ouch... time to study 😅',

  // Challenge: setup
  challenge_title: 'Challenge a friend',
  setup_sub:
    'Play your game, then share a link with a friend: they’ll get the same questions and you’ll compare scores round by round.',
  pseudo_label: 'Your nickname',
  pseudo_ph_host: 'e.g. Alex',
  pseudo_ph_join: 'e.g. Sam',
  rounds_label: 'Number of rounds',
  rounds_help: '{n} rounds · {q} questions, all different',
  rounds_help_one: '{n} round · {q} questions, all different',
  launch_challenge: 'Start the challenge',
  default_host: 'Player 1',
  default_join: 'Player 2',
  default_friend: 'A friend',

  // Challenge: invite
  invite_invalid: 'Invalid challenge link 😕',
  invite_title: '{host} challenged you! ⚔️',
  invite_sub:
    'Take on the challenge on “{cat}”, {rounds} ({q} questions): you’ll play the exact same questions, then compare scores round by round.',
  accept_challenge: 'Accept the challenge',

  // Challenge: in game
  challenge_topbar: 'Round {r}/{mr} · Q{i}/{n}',
  answer_saved: 'Answer saved… 🤫',
  continue_challenge: 'Continue ({n} new questions)',

  // Challenge: results (titles)
  result_tie_final: '🤝 Perfect tie!',
  result_win_final: '🏆 You won!',
  result_lose_final: '😅 {opp} wins',
  result_tie_lead: '🤝 It’s a tie!',
  result_lead: '🏆 You’re ahead!',
  result_behind: '{opp} is ahead',
  result_round_done: '✓ Round complete!',
  result_challenge_done: '🎉 Challenge complete!',
  round_cumulative: 'Round {r} / {mr} · cumulative score',
  round_gain: 'Round {r} / {mr} · +{g} this round',
  round_gain_short: '+{g} this round',
  points_suffix: ' pts',

  // Play-link sharing (host)
  share_play_title: 'Share this link with your friend',
  share_play_sub:
    'They’ll play the exact same questions, then you’ll compare scores round by round.',

  // Result sharing (the native share title is app_title)
  share_result_title: 'Share your result',
  share_generating: 'Generating…',

  // Result view (shared-link conversion page)
  result_invalid: 'Invalid result link 😕',
  result_solo_label: 'Solo practice · {diff}',
  landing_intro: 'This score was made on Quizz 👇',
  landing_challenge: '⚔️ Challenge a friend',
  landing_play: 'Play now',
  concept_title: '💡 What is Quizz?',
  concept_text:
    'Fun quizzes to test your knowledge, solo or against your friends. Free, no account.',
  result_duel_win: '🏆 {name} wins!',
  result_duel_tie: '🤝 Perfect tie!',
  rounds_count: '{n} rounds',
  rounds_count_one: '{n} round',

  // Image card
  card_solo_kicker: 'SOLO PRACTICE',
  card_duel_kicker: '⚔️ FRIEND CHALLENGE',
  card_points: 'points',
  card_success_rate: '{pct}% correct',
  card_win: '🏆 {name} wins!',
  card_tie: '🤝 Perfect tie!',
  card_detail: 'BREAKDOWN · {rounds}',
  card_round: 'Round {i}',
  card_rounds_n: '{n} ROUNDS',
  card_rounds_one: '{n} ROUND',
  card_cta_duel: 'Your turn: can you beat it?',
  card_cta_solo: 'Think you can do better?',
  card_play_cta: 'Play free at',
  // Design v2 (themes + stat tiles)
  theme_toggle: 'Switch theme',
  hero_sub: 'Study hard, or challenge a friend',
  tile_answered: 'questions played',
  tile_correct: 'correct answers',
  tile_precision: 'accuracy',

  // Donation (support)
  donate_footer: 'Support',
  donate_title: 'Support Quizz 💜',
  donate_sub: 'A small donation helps the game grow (servers, new questions). Thank you!',
  donate_custom: 'Custom amount (€)',
  donate_cta: 'Donate €{n}',
  donate_thanks: 'Thank you so much for your support! The game grows thanks to you. 💜',

  // Question bank loading (separate chunk)
  bank_loading: 'Loading questions…',
  bank_error: 'Could not load the questions. Please check your connection.',
  bank_retry: 'Try again',

  // Home tagline + links to the static pages (about, contact)
  home_tagline: 'Free quiz, no account: {n} questions, {k} themes, solo or as a challenge with friends.',
  footer_about: 'About',
  footer_contact: 'Contact',
}
