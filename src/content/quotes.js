// Banque de citations affichées sur l'écran de résultat (façon Call of Duty
// Mobile en fin de partie), variées selon le niveau de réussite. Multilingue,
// portugais du Brésil. Cinq ambiances, alignées sur les paliers de
// personnalité : genius (100 %), great (80 % et plus), good (60 % et plus),
// meh (40 % et plus), bad (le reste).
export const QUOTES = {
  genius: [
    { fr: 'Sans-faute ! Tu es tout simplement incollable. 🧠', en: 'Flawless! You simply cannot be stumped. 🧠', es: '¡Sin fallos! Sencillamente no hay quien te pille. 🧠', pt: 'Sem erros! Simplesmente imbatível. 🧠' },
    { fr: 'Carton plein, respect total. 🔥', en: 'Perfect score, total respect. 🔥', es: '¡Pleno! Respeto absoluto. 🔥', pt: 'Pontuação perfeita, respeito total. 🔥' },
    { fr: 'Parfait... quelqu’un a révisé ! 😎', en: 'Perfect... someone has been studying! 😎', es: 'Perfecto... ¡alguien ha estudiado! 😎', pt: 'Perfeito... alguém andou estudando! 😎' },
    { fr: 'Un génie parmi nous. 👑', en: 'A genius among us. 👑', es: 'Un genio entre nosotros. 👑', pt: 'Um gênio entre nós. 👑' },
    { fr: 'Zéro faute : talent pur. 🏆', en: 'Zero mistakes: pure talent. 🏆', es: 'Cero fallos: puro talento. 🏆', pt: 'Zero erros: puro talento. 🏆' },
    { fr: 'Maître du quiz, rien à ajouter. ✨', en: 'Quiz master, nothing to add. ✨', es: 'Maestro del quiz, nada que añadir. ✨', pt: 'Mestre do quiz, nada a acrescentar. ✨' },
  ],
  great: [
    { fr: 'Solide. Une seule marche avant le sommet. 🧗', en: 'Solid. One step short of the top. 🧗', es: 'Sólido. A un paso de la cima. 🧗', pt: 'Sólido. A um passo do topo. 🧗' },
    { fr: 'Tu vises juste, presque à chaque tir. 🎯', en: 'You hit the mark almost every shot. 🎯', es: 'Aciertas casi en cada tiro. 🎯', pt: 'Você acerta quase todo tiro. 🎯' },
    { fr: 'Niveau élite. Le sans-faute est à portée. ⚡', en: 'Elite level. The perfect run is within reach. ⚡', es: 'Nivel élite. El pleno está al alcance. ⚡', pt: 'Nível elite. O sem erros está ao alcance. ⚡' },
    { fr: 'Joli score, tu maîtrises ton sujet ! 👏', en: 'Nice score, you know your stuff! 👏', es: '¡Buen resultado, dominas el tema! 👏', pt: 'Belo resultado, você domina o assunto! 👏' },
    { fr: 'Encore un cran et personne ne te suit. 🚀', en: 'One more notch and nobody keeps up. 🚀', es: 'Un escalón más y nadie te sigue. 🚀', pt: 'Mais um degrau e ninguém te acompanha. 🚀' },
  ],
  good: [
    { fr: 'Pas mal du tout, continue comme ça ! 💪', en: 'Not bad at all, keep it up! 💪', es: '¡Nada mal, sigue así! 💪', pt: 'Nada mal, continue assim! 💪' },
    { fr: 'Tu y es presque, encore un petit effort ! 🚀', en: 'You are almost there, one more push! 🚀', es: '¡Casi lo tienes, un último esfuerzo! 🚀', pt: 'Você está quase lá, mais um esforço! 🚀' },
    { fr: 'Bien joué, la prochaine sera meilleure ! 🎯', en: 'Well played, the next one will be better! 🎯', es: '¡Bien jugado, la próxima será mejor! 🎯', pt: 'Bem jogado, a próxima vai ser melhor! 🎯' },
    { fr: 'Tu tiens le bon bout, bravo ! 🌟', en: 'You are on the right track, nice! 🌟', es: '¡Vas por buen camino, bravo! 🌟', pt: 'Você está no caminho certo, mandou bem! 🌟' },
    { fr: 'La base est là. Reste à polir. ✨', en: 'The foundation is there. Now polish it. ✨', es: 'La base está ahí. Falta pulir. ✨', pt: 'A base está aí. Falta polir. ✨' },
  ],
  meh: [
    { fr: 'Moitié-moitié. Le prochain lot tranche. ⚖️', en: 'Half and half. The next set decides. ⚖️', es: 'Mitad y mitad. El próximo grupo decide. ⚖️', pt: 'Meio a meio. A próxima rodada decide. ⚖️' },
    { fr: 'Ça passe de justesse... relis les explications. 📖', en: 'Just scraping by... reread the explanations. 📖', es: 'Aprobado por los pelos... relee las explicaciones. 📖', pt: 'Passou raspando... releia as explicações. 📖' },
    { fr: 'Le potentiel est là, la régularité pas encore. 🎲', en: 'The potential is there, the consistency is not yet. 🎲', es: 'El potencial está, la regularidad todavía no. 🎲', pt: 'O potencial existe, a regularidade ainda não. 🎲' },
    { fr: 'Un lot de plus et ça bascule du bon côté. 🔁', en: 'One more set and it tips the right way. 🔁', es: 'Un grupo más y se inclina hacia el lado bueno. 🔁', pt: 'Mais uma rodada e isso vira para o lado certo. 🔁' },
    { fr: 'Pas de panique, chaque erreur t’apprend un truc. 🙂', en: 'No worries, every mistake teaches you something. 🙂', es: 'Tranqui, cada error te enseña algo. 🙂', pt: 'Calma, cada erro te ensina algo. 🙂' },
  ],
  bad: [
    { fr: 'Tu peux mieux faire, continue de t’entraîner ! 💪', en: 'You can do better, keep practicing! 💪', es: '¡Puedes hacerlo mejor, sigue practicando! 💪', pt: 'Você pode fazer melhor, continue treinando! 💪' },
    { fr: 'Aïe... mais c’est en jouant qu’on apprend ! 📚', en: 'Ouch... but you learn by playing! 📚', es: 'Ay... ¡pero jugando se aprende! 📚', pt: 'Ai... mas é jogando que se aprende! 📚' },
    { fr: 'Rome ne s’est pas faite en un jour, réessaie ! 🌱', en: 'Rome was not built in a day, try again! 🌱', es: 'Roma no se hizo en un día, ¡inténtalo de nuevo! 🌱', pt: 'Roma não foi feita em um dia, tente de novo! 🌱' },
    { fr: 'Courage ! La prochaine partie sera meilleure. ✊', en: 'Chin up! The next round will be better. ✊', es: '¡Ánimo! La próxima partida saldrá mejor. ✊', pt: 'Coragem! A próxima partida vai ser melhor. ✊' },
    { fr: 'L’important, c’est de jouer... et de réviser un peu ! 😅', en: 'What matters is playing... and a little studying! 😅', es: 'Lo importante es jugar... ¡y repasar un poco! 😅', pt: 'O importante é jogar... e estudar um pouco! 😅' },
  ],
}
