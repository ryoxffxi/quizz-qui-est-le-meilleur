// Traduções em português do Brasil (pt-BR, tratamento por « você »).
// Os {placeholders} são preenchidos por t(chave, vars).
// Sem travessão (U+2014): dois-pontos, vírgula ou ponto.
// Plurais: tn(chave, n) procura chave_one / chave_other antes de usar chave.
export default {
  // Identidade do jogo
  app_name: 'Quizz',
  app_subtitle: 'Quem é o melhor?',
  app_title: 'Quizz - Quem é o melhor?',
  cookie_text:
    'Este site usa cookies para funcionar. A medição de audiência (sem cookies, Cloudflare) só é ativada com o seu consentimento.',
  cookie_detail:
    'Os anúncios do Google AdSense seguem a escolha que você faz na mensagem de consentimento do Google, que pode ser reaberta em Privacidade. Você pode mudar de ideia sobre a medição de audiência a qualquer momento em « Cookies », no rodapé.',
  cookie_accept: 'Aceitar',
  cookie_reject: 'Recusar',
  cookie_more: 'Saiba mais',
  cookie_manage: 'Cookies',
  footer_privacy: 'Privacidade',
  footer_terms: 'Termos',

  // Genéricas (botões, estados): reutilize antes de criar uma chave nova
  close: 'Fechar',
  back: '← Voltar',
  home: 'Início',
  share: 'Compartilhar',
  copy: 'Copiar',
  copied: '✓ Copiado',
  retry: 'Tentar de novo',
  cancel: 'Cancelar',
  confirm: 'Confirmar',
  continue: 'Continuar',
  yes: 'Sim',
  no: 'Não',
  later: 'Mais tarde',
  today: 'Hoje',
  streak_days: '{n} dias seguidos',
  streak_days_one: '{n} dia seguido',
  best_score: 'Melhor pontuação',
  new_record: 'Novo recorde!',

  // Premium / publicidade
  upsell_premium: 'Seja Premium (sem anúncios)',
  paywall_title: 'Quizz Premium',
  paywall_sub: 'Apoie o jogo e aproveite uma experiência 100% sem anúncios.',
  paywall_feature_noads: 'Zero anúncios',
  paywall_feature_all: 'Até no simulado e no desafio do dia',
  paywall_feature_support: 'Você apoia o criador 💜',
  plan_monthly_name: 'Mensal',
  plan_monthly_price: '€ 2',
  plan_monthly_period: '/ mês',
  plan_lifetime_name: 'Vitalício',
  plan_lifetime_price: '€ 9,99',
  plan_lifetime_period: 'pagamento único',
  plan_lifetime_badge: 'Melhor custo-benefício',
  paywall_subscribe: 'Assinar',
  paywall_buy: 'Comprar vitalício',
  paywall_soon: 'Pagamento disponível em breve, obrigado pela paciência!',
  premium_active: 'Premium ativo, obrigado! 💜',
  result_ad_label: 'Publicidade',
  promo_noads_text: 'Cansado dos anúncios?',
  promo_noads_cta: 'Remover anúncios',

  // Cabeçalho / diversos
  sound_on: 'Silenciar',
  sound_off: 'Ativar som',
  lang_switch: 'Mudar de idioma',

  // Início
  mode_label: 'Modo de jogo',
  mode_solo: 'Treino solo',
  mode_challenge: 'Desafie um amigo',
  help_solo: 'Solo: banco completo em grupos de 10, correção imediata, sem cronômetro.',
  help_challenge:
    'Desafio: rodadas de 5 perguntas cronometradas, pontuação por velocidade e duelos por link.',
  difficulty_label: 'Dificuldade',
  diff_facile: 'Fácil',
  diff_expert: 'Especialista',
  choose_category: 'Escolha uma categoria',
  questions_count: '{n} perguntas',

  // Categorias
  cat_culture: 'Cultura Geral',
  cat_manga: 'Mangá e Anime',
  cat_route: 'Code de la route',
  cat_cinema: 'Cinema e Séries',
  cat_panneaux: 'Placas de trânsito',

  // Aba Panneaux (revisão do código francês, só em FR)
  home_tab_quiz: 'Quiz',
  home_tab_panneaux: 'Placas',
  panneaux_quiz_title: 'O quiz de placas',
  panneaux_quiz_sub:
    'Só placas, cada uma com a sua imagem: você consegue reconhecer todas?',
  panneaux_quiz_cta: 'Começar o quiz de placas',
  panneaux_browse: 'Revisar por família',
  panneaux_count: '{n} placas',
  sign_prev: 'Placa anterior',
  sign_next: 'Próxima placa',

  // Navegação
  quit: '← Sair',

  // Quiz solo: fluxo
  hint_next: 'Toque em qualquer lugar para ir para a próxima.',
  hint_choose: 'Toque em uma resposta para escolhê-la.',
  feedback_correct: '✓ Correto!',
  feedback_wrong: '✗ Errou!',
  next_question: 'Próxima pergunta',
  see_recap: 'Ver resumo',
  challenge_a_friend: 'Desafie um amigo',

  // Resumo dos erros
  recap_perfect: '🎉 Nenhum erro, impecável!',
  recap_title: 'Seus erros ({n})',
  recap_your_answer: 'Sua resposta: {ans}',
  recap_no_answer: 'Nenhuma resposta dada',
  recap_correct_answer: 'Resposta correta: {ans}',

  // Personalidade (conforme a pontuação)
  personality_genius: 'Um gênio 🤯',
  personality_good: 'Nada mal! 👏',
  personality_bad: 'Ai... precisa estudar 😅',

  // Desafio: configuração
  challenge_title: 'Desafie um amigo',
  setup_sub:
    'Jogue sua partida e compartilhe um link com um amigo: ele jogará as mesmas perguntas e vocês vão comparar as pontuações rodada a rodada.',
  pseudo_label: 'Seu apelido',
  pseudo_ph_host: 'Ex.: Alex',
  pseudo_ph_join: 'Ex.: Sam',
  rounds_label: 'Número de rodadas',
  rounds_help: '{n} rodadas · {q} perguntas, todas diferentes',
  rounds_help_one: '{n} rodada · {q} perguntas, todas diferentes',
  launch_challenge: 'Iniciar o desafio',
  default_host: 'Jogador 1',
  default_join: 'Jogador 2',
  default_friend: 'Um amigo',

  // Desafio: convite
  invite_invalid: 'Link de desafio inválido 😕',
  invite_title: '{host} desafiou você! ⚔️',
  invite_sub:
    'Aceite o desafio em “{cat}”, {rounds} ({q} perguntas): você jogará exatamente as mesmas perguntas e depois vocês vão comparar as pontuações rodada a rodada.',
  accept_challenge: 'Aceitar o desafio',

  // Desafio: em jogo
  challenge_topbar: 'Rodada {r}/{mr} · P{i}/{n}',
  answer_saved: 'Resposta salva… 🤫',
  continue_challenge: 'Continuar ({n} novas perguntas)',

  // Desafio: resultados (títulos)
  result_tie_final: '🤝 Empate perfeito!',
  result_win_final: '🏆 Você venceu!',
  result_lose_final: '😅 {opp} venceu',
  result_tie_lead: '🤝 Empatados!',
  result_lead: '🏆 Você está na frente!',
  result_behind: '{opp} está na frente',
  result_round_done: '✓ Rodada concluída!',
  result_challenge_done: '🎉 Desafio concluído!',
  round_cumulative: 'Rodada {r} / {mr} · pontuação acumulada',
  round_gain: 'Rodada {r} / {mr} · +{g} nesta rodada',
  round_gain_short: '+{g} nesta rodada',
  points_suffix: ' pts',

  // Compartilhar o link de jogo (anfitrião)
  share_play_title: 'Compartilhe este link com seu amigo',
  share_play_sub:
    'Ele jogará exatamente as mesmas perguntas e depois vocês vão comparar as pontuações rodada a rodada.',

  // Compartilhar o resultado (o título do compartilhamento nativo é app_title)
  share_result_title: 'Compartilhe seu resultado',
  share_generating: 'Gerando…',

  // Tela de resultado (página de conversão do link compartilhado)
  result_invalid: 'Link de resultado inválido 😕',
  result_solo_label: 'Treino solo · {diff}',
  landing_intro: 'Esta pontuação foi feita no Quizz 👇',
  landing_challenge: '⚔️ Desafie um amigo',
  landing_play: 'Jogar agora',
  concept_title: '💡 O que é o Quizz?',
  concept_text:
    'Quizzes divertidos para testar seus conhecimentos, sozinho ou contra seus amigos. Grátis, sem conta.',
  result_duel_win: '🏆 {name} venceu!',
  result_duel_tie: '🤝 Empate perfeito!',
  rounds_count: '{n} rodadas',
  rounds_count_one: '{n} rodada',

  // Cartão de imagem
  card_solo_kicker: 'TREINO SOLO',
  card_duel_kicker: '⚔️ DESAFIO ENTRE AMIGOS',
  card_points: 'pontos',
  card_success_rate: '{pct}% de acertos',
  card_win: '🏆 {name} venceu!',
  card_tie: '🤝 Empate perfeito!',
  card_detail: 'DETALHES · {rounds}',
  card_round: 'Rodada {i}',
  card_rounds_n: '{n} RODADAS',
  card_rounds_one: '{n} RODADA',
  card_cta_duel: 'Sua vez: consegue superar?',
  card_cta_solo: 'Acha que consegue fazer melhor?',
  card_play_cta: 'Jogue grátis em',
  // Design v2 (temas + blocos de estatísticas)
  theme_toggle: 'Mudar o tema',
  hero_sub: 'Estude a sério, ou desafie um amigo',
  tile_answered: 'perguntas jogadas',
  tile_correct: 'respostas certas',
  tile_precision: 'precisão',

  // Doação (apoio)
  donate_footer: 'Apoiar',
  donate_title: 'Apoie o Quizz 💜',
  donate_sub: 'Uma pequena doação ajuda o jogo a crescer (servidores, novas perguntas). Obrigado!',
  donate_custom: 'Valor livre (€)',
  donate_cta: 'Doar € {n}',
  donate_thanks: 'Muito obrigado pelo seu apoio! O jogo cresce graças a você. 💜',

  // Carregamento do banco de perguntas (chunk separado)
  bank_loading: 'Carregando as perguntas…',
  bank_error: 'Não foi possível carregar as perguntas. Verifique sua conexão.',
  bank_retry: 'Tentar de novo',

  // Frase de abertura + links para as páginas estáticas (sobre, contato)
  home_tagline: 'Quiz grátis e sem conta: {n} perguntas, {k} temas, sozinho ou em desafio entre amigos.',
  footer_about: 'Sobre',
  footer_contact: 'Contato',
}
