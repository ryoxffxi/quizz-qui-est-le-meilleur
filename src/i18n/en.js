// English translations. {placeholders} are filled by t(key, vars).
export default {
  // Game identity
  app_name: 'Quizz',
  app_subtitle: 'Who’s the best?',
  app_title: 'Quizz - Who’s the best?',
  footer_follow: 'Follow us on Instagram',
  cookie_text:
    'We use cookies to run the site and, with your consent, to measure audience. Your choice.',
  cookie_detail:
    'Essential cookies keep the site working. Audience-measurement cookies are only enabled with your consent. You can change your mind anytime via “Cookies” at the bottom of the page.',
  cookie_accept: 'Accept',
  cookie_reject: 'Decline',
  cookie_more: 'Learn more',
  cookie_manage: 'Cookies',

  // Header / misc
  sound_on: 'Mute',
  sound_off: 'Unmute',
  lang_switch: 'Change language',

  // Home
  tagline:
    'Brush up on general knowledge, movies and manga — all while challenging your friends.',
  mode_label: 'Game mode',
  mode_solo: '📖 Solo practice',
  mode_challenge: '⚡ Challenge a friend',
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

  // Navigation
  quit: '← Quit',
  back: '← Back',
  home: '🏠 Home',

  // Solo quiz — flow
  hint_next: 'Tap anywhere to go to the next one.',
  hint_choose: 'Tap an answer to select it.',
  hint_validate: 'Tap your answer again to confirm.',
  feedback_correct: '✅ Correct!',
  feedback_wrong: '❌ Wrong!',
  next_question: 'Next question',
  see_recap: 'See recap',
  solo_topbar: 'Set {b}/{tb} · {i}/{n}',
  lot_label: 'Set {b} / {tb}',
  continue_solo: 'Continue ({n} new questions)',
  challenge_a_friend: '⚡ Challenge a friend',

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

  // Challenge — setup
  challenge_title: '⚡ Challenge a friend',
  setup_sub:
    'Play your game, then share a link with a friend: they’ll get the same questions and you’ll compare scores round by round.',
  pseudo_label: 'Your nickname',
  pseudo_ph_host: 'e.g. Alex',
  pseudo_ph_join: 'e.g. Sam',
  rounds_label: 'Number of rounds',
  rounds_help: '{n} rounds · {q} questions, all different',
  rounds_help_one: '{n} round · {q} questions, all different',
  launch_challenge: 'Start the challenge',
  simulate_friend: '🤖 Try with a simulated friend',
  default_host: 'Player 1',
  default_join: 'Player 2',
  default_friend: 'A friend',

  // Challenge — invite
  invite_invalid: 'Invalid challenge link 😕',
  invite_title: '{host} challenged you! ⚔️',
  invite_sub:
    'Take on the challenge on "{cat}" — {rounds} ({q} questions): you’ll play the exact same questions, then compare scores round by round.',
  accept_challenge: 'Accept the challenge',

  // Challenge — in game
  challenge_topbar: 'Round {r}/{mr} · Q{i}/{n}',
  answer_saved: 'Answer saved… 🤫',
  continue_challenge: 'Continue ({n} new questions)',

  // Challenge — results (titles)
  result_tie_final: '🤝 Perfect tie!',
  result_win_final: '🏆 You won!',
  result_lose_final: '😅 {opp} wins',
  result_tie_lead: '🤝 It’s a tie!',
  result_lead: '🏆 You’re ahead!',
  result_behind: '⚡ {opp} is ahead',
  result_round_done: '✅ Round complete!',
  result_challenge_done: '🎉 Challenge complete!',
  round_cumulative: 'Round {r} / {mr} · cumulative score',
  round_gain: 'Round {r} / {mr} · +{g} this round',
  round_gain_short: '+{g} this round',
  points_suffix: ' pts',

  // Play-link sharing (host)
  share_play_title: '🔗 Share this link with your friend',
  share_play_sub:
    'They’ll play the exact same questions, then you’ll compare scores round by round.',
  copy: 'Copy',
  copied: '✓ Copied',

  // Result sharing
  share_result_title: '📤 Share your result',
  share_copy_link: '🔗 Copy result link',
  share_link_copied: '✓ Link copied',
  share_as_image: '🖼️ Share as image',
  share_generating: '⏳ Generating…',
  share_downloaded: 'Image downloaded ✓',
  share_image_error: 'Couldn’t generate the image 😕',
  share_native_title: 'Quizz - Who’s the best?',
  share_native_text: 'I challenge you on Quizz — can you beat me? 🎯',
  share_native_image_text: 'My Quizz result 🎯 Your turn!',

  // Result view (shared-link conversion page)
  result_invalid: 'Invalid result link 😕',
  result_solo_label: 'Solo practice · {diff}',
  result_solo_play: '🎯 Play on Quizz',
  landing_intro: 'This score was made on Quizz 👇',
  landing_challenge: '⚔️ Challenge a friend',
  landing_play: '🎯 Play now',
  concept_title: '💡 What is Quizz?',
  concept_text:
    'Fun quizzes to test your knowledge — solo or against your friends. Free, no account.',
  result_duel_win: '🏆 {name} wins!',
  result_duel_tie: '🤝 Perfect tie!',
  result_rounds_diff: '{rounds} · {diff}',
  result_play_own: '⚡ Start my own challenge',
  round_word: 'Round',
  rounds_count: '{n} rounds',
  rounds_count_one: '{n} round',

  // Image card
  card_solo_kicker: '📖 SOLO PRACTICE',
  card_duel_kicker: '⚔️ FRIEND CHALLENGE',
  card_my_score: 'My score',
  card_points: 'points',
  card_success_rate: '{pct}% correct',
  card_win: '🏆 {name} wins!',
  card_tie: '🤝 Perfect tie!',
  card_detail: 'BREAKDOWN · {rounds}',
  card_round: 'Round {i}',
  card_rounds_n: '{n} ROUNDS',
  card_rounds_one: '{n} ROUND',
  card_cta_duel: 'Your turn — can you beat it?',
  card_cta_solo: 'Think you can do better?',
  card_play_cta: 'Play free at',
}
