// Traducciones en español. Los {placeholders} se rellenan con t(clave, vars).
export default {
  // Identidad del juego
  app_name: 'Quizz',
  app_subtitle: '¿Quién es el mejor?',
  app_title: 'Quizz - ¿Quién es el mejor?',

  // Cabecera / varios
  sound_on: 'Silenciar',
  sound_off: 'Activar sonido',
  lang_switch: 'Cambiar de idioma',

  // Inicio
  tagline:
    'Repasa tu cultura general, el cine y el manga — desafiando a tus amigos.',
  mode_label: 'Modo de juego',
  mode_solo: '📖 Práctica en solitario',
  mode_challenge: '⚡ Desafía a un amigo',
  help_solo: 'Solitario: banco completo en grupos de 10, corrección inmediata, sin cronómetro.',
  help_challenge:
    'Desafío: rondas de 5 preguntas cronometradas, puntuación por velocidad y duelos por enlace.',
  difficulty_label: 'Dificultad',
  diff_facile: 'Fácil',
  diff_expert: 'Experto',
  choose_category: 'Elige una categoría',
  questions_count: '{n} preguntas',

  // Categorías
  cat_culture: 'Cultura General',
  cat_manga: 'Manga y Anime',
  cat_route: 'Code de la route',
  cat_cinema: 'Cine y Series',

  // Navegación
  quit: '← Salir',
  back: '← Atrás',
  home: '🏠 Inicio',

  // Quiz en solitario — desarrollo
  hint_next: 'Toca en cualquier lugar para pasar a la siguiente.',
  hint_choose: 'Toca una respuesta para elegirla.',
  hint_validate: 'Toca de nuevo tu respuesta para confirmar.',
  feedback_correct: '✅ ¡Correcto!',
  feedback_wrong: '❌ ¡Fallaste!',
  next_question: 'Siguiente pregunta',
  see_recap: 'Ver resumen',
  solo_topbar: 'Grupo {b}/{tb} · {i}/{n}',
  lot_label: 'Grupo {b} / {tb}',
  continue_solo: 'Continuar ({n} preguntas nuevas)',
  challenge_a_friend: '⚡ Desafía a un amigo',

  // Resumen de errores
  recap_perfect: '🎉 ¡Sin errores, perfecto!',
  recap_title: 'Tus errores ({n})',
  recap_your_answer: 'Tu respuesta: {ans}',
  recap_no_answer: 'Sin respuesta',
  recap_correct_answer: 'Respuesta correcta: {ans}',

  // Personalidad (según la puntuación)
  personality_genius: 'Un genio 🤯',
  personality_good: '¡Nada mal! 👏',
  personality_bad: 'Ay... toca repasar 😅',

  // Desafío — configuración
  challenge_title: '⚡ Desafía a un amigo',
  setup_sub:
    'Juega tu partida y comparte un enlace con un amigo: jugará las mismas preguntas y compararéis vuestras puntuaciones ronda a ronda.',
  pseudo_label: 'Tu apodo',
  pseudo_ph_host: 'Ej: Alex',
  pseudo_ph_join: 'Ej: Sam',
  rounds_label: 'Número de rondas',
  rounds_help: '{n} rondas · {q} preguntas, todas distintas',
  rounds_help_one: '{n} ronda · {q} preguntas, todas distintas',
  launch_challenge: 'Empezar el desafío',
  simulate_friend: '🤖 Probar con un amigo simulado',
  default_host: 'Jugador 1',
  default_join: 'Jugador 2',
  default_friend: 'Un amigo',

  // Desafío — invitación
  invite_invalid: 'Enlace de desafío no válido 😕',
  invite_title: '¡{host} te ha desafiado! ⚔️',
  invite_sub:
    'Acepta el desafío en «{cat}» — {rounds} ({q} preguntas): jugarás exactamente las mismas preguntas y luego compararéis las puntuaciones ronda a ronda.',
  accept_challenge: 'Aceptar el desafío',

  // Desafío — en juego
  challenge_topbar: 'Ronda {r}/{mr} · P{i}/{n}',
  answer_saved: 'Respuesta guardada… 🤫',
  continue_challenge: 'Continuar ({n} preguntas nuevas)',

  // Desafío — resultados (títulos)
  result_tie_final: '🤝 ¡Empate perfecto!',
  result_win_final: '🏆 ¡Has ganado!',
  result_lose_final: '😅 Gana {opp}',
  result_tie_lead: '🤝 ¡Empatados!',
  result_lead: '🏆 ¡Vas ganando!',
  result_behind: '⚡ {opp} va ganando',
  result_round_done: '✅ ¡Ronda completada!',
  result_challenge_done: '🎉 ¡Desafío completado!',
  round_cumulative: 'Ronda {r} / {mr} · puntuación acumulada',
  round_gain: 'Ronda {r} / {mr} · +{g} esta ronda',
  round_gain_short: '+{g} esta ronda',
  points_suffix: ' pts',

  // Compartir el enlace de juego (anfitrión)
  share_play_title: '🔗 Comparte este enlace con tu amigo',
  share_play_sub:
    'Jugará exactamente las mismas preguntas y luego compararéis las puntuaciones ronda a ronda.',
  copy: 'Copiar',
  copied: '✓ Copiado',

  // Compartir el resultado
  share_result_title: '📤 Comparte tu resultado',
  share_copy_link: '🔗 Copiar el enlace del resultado',
  share_link_copied: '✓ Enlace copiado',
  share_as_image: '🖼️ Compartir como imagen',
  share_generating: '⏳ Generando…',
  share_downloaded: 'Imagen descargada ✓',
  share_image_error: 'No se pudo generar la imagen 😕',
  share_native_title: 'Quizz - ¿Quién es el mejor?',
  share_native_text: 'Te desafío en Quizz — ¿puedes superarme? 🎯',
  share_native_image_text: 'Mi resultado en Quizz 🎯 ¡Te toca!',

  // Vista de resultado (página de conversión del enlace compartido)
  result_invalid: 'Enlace de resultado no válido 😕',
  result_solo_label: 'Práctica en solitario · {diff}',
  result_solo_play: '🎯 Jugar en Quizz',
  landing_intro: 'Esta puntuación se hizo en Quizz 👇',
  landing_challenge: '⚔️ Desafía a un amigo',
  landing_play: '🎯 Jugar ahora',
  concept_title: '💡 ¿Qué es Quizz?',
  concept_text:
    'Cuestionarios divertidos para poner a prueba tus conocimientos, solo o contra tus amigos. Gratis, sin cuenta.',
  result_duel_win: '🏆 ¡Gana {name}!',
  result_duel_tie: '🤝 ¡Empate perfecto!',
  result_rounds_diff: '{rounds} · {diff}',
  result_play_own: '⚡ Empezar mi propio desafío',
  round_word: 'Ronda',
  rounds_count: '{n} rondas',
  rounds_count_one: '{n} ronda',

  // Tarjeta de imagen
  card_solo_kicker: '📖 PRÁCTICA EN SOLITARIO',
  card_duel_kicker: '⚔️ DESAFÍO ENTRE AMIGOS',
  card_my_score: 'Mi puntuación',
  card_points: 'puntos',
  card_success_rate: '{pct}% de aciertos',
  card_win: '🏆 ¡Gana {name}!',
  card_tie: '🤝 ¡Empate perfecto!',
  card_detail: 'DETALLE · {rounds}',
  card_round: 'Ronda {i}',
  card_rounds_n: '{n} RONDAS',
  card_rounds_one: '{n} RONDA',
  card_cta_duel: 'Te toca, ¿lo superas?',
  card_cta_solo: '¿Crees que puedes hacerlo mejor?',
  card_play_cta: 'Juega gratis en',
}
