// Banque des panneaux routiers français : familles + définitions.
// Chaque panneau : { id, code (référence officielle), name (réponse de quiz),
// meaning (explication de révision), family, svg }.
// Les formes viennent de shapes.js ; les pictogrammes sont des fragments SVG
// dans le repère 240×240 (voir les zones utiles en tête de shapes.js).

import {
  BLUE,
  ab1,
  ab2,
  cedez,
  danger,
  finObligation,
  finPicto,
  finTout,
  finVitesse,
  finZone30,
  impasse,
  indication,
  interdiction,
  obligation,
  parking,
  prioritaire,
  sensInterdit,
  stop,
  vitesse,
  vitesseMin,
  zone30,
} from './shapes.js'

export const FAMILIES = [
  {
    id: 'danger',
    label: 'Danger',
    emoji: '⚠️',
    desc: 'Triangle à bord rouge : un danger est annoncé environ 150 m avant (50 m en agglomération).',
  },
  {
    id: 'priorite',
    label: 'Priorité',
    emoji: '🔀',
    desc: 'Qui passe en premier : stop, cédez-le-passage, route prioritaire…',
  },
  {
    id: 'interdiction',
    label: 'Interdiction',
    emoji: '🚫',
    desc: 'Rond cerclé de rouge : interdiction dès le panneau.',
  },
  {
    id: 'fin',
    label: "Fin d'interdiction",
    emoji: '⭕',
    desc: "Rond barré : l'interdiction ou l'obligation prend fin.",
  },
  {
    id: 'obligation',
    label: 'Obligation',
    emoji: '🔵',
    desc: 'Rond bleu : obligation dès le panneau.',
  },
  {
    id: 'indication',
    label: 'Indication',
    emoji: 'ℹ️',
    desc: 'Carré bleu : une information ou un aménagement.',
  },
]

// Flèche « obligation » (pointe en haut), réutilisée par rotation.
const ARROW_UP = `<path d="M120 44 L157 98 H134 V180 H106 V98 H83 Z" fill="#fff"/>`
const arrow = (deg) =>
  deg ? `<g transform="rotate(${deg} 120 120)">${ARROW_UP}</g>` : ARROW_UP

export const SIGNS = [
  // ===== Priorité =====
  {
    id: 'ab1',
    code: 'AB1',
    name: 'Intersection à priorité à droite',
    meaning:
      'Annonce une intersection où la priorité à droite s’applique : ralentissez et cédez le passage aux véhicules venant de votre droite.',
    family: 'priorite',
    svg: ab1(),
  },
  {
    id: 'ab2',
    code: 'AB2',
    name: 'Intersection où vous avez la priorité',
    meaning:
      'À la prochaine intersection, les usagers des routes transversales doivent vous céder le passage (priorité ponctuelle).',
    family: 'priorite',
    svg: ab2(),
  },
  {
    id: 'ab3a',
    code: 'AB3a',
    name: 'Cédez le passage',
    meaning:
      'À l’intersection, cédez le passage aux véhicules circulant sur l’autre route. L’arrêt n’est obligatoire que si nécessaire.',
    family: 'priorite',
    svg: cedez(),
  },
  {
    id: 'ab4',
    code: 'AB4',
    name: 'Stop',
    meaning:
      'Arrêt total obligatoire à la limite de la chaussée, même si la voie semble libre. Cédez le passage à tous les véhicules.',
    family: 'priorite',
    svg: stop(),
  },
  {
    id: 'ab6',
    code: 'AB6',
    name: 'Route prioritaire',
    meaning:
      'Vous circulez sur une route prioritaire : vous avez la priorité à toutes les intersections, jusqu’au panneau de fin.',
    family: 'priorite',
    svg: prioritaire(),
  },
  {
    id: 'ab7',
    code: 'AB7',
    name: 'Fin de route prioritaire',
    meaning:
      'Votre route cesse d’être prioritaire : au prochain croisement, le régime normal (priorité à droite) s’applique de nouveau.',
    family: 'priorite',
    svg: prioritaire({ fin: true }),
  },

  // ===== Interdiction =====
  {
    id: 'b0',
    code: 'B0',
    name: 'Circulation interdite à tout véhicule',
    meaning:
      'Accès interdit à tout véhicule, dans les deux sens. À ne pas confondre avec le sens interdit, qui ne vaut que dans un sens.',
    family: 'interdiction',
    svg: interdiction(),
  },
  {
    id: 'b1',
    code: 'B1',
    name: 'Sens interdit',
    meaning:
      'Sens interdit à tout véhicule : ne vous engagez pas, la circulation arrive en face.',
    family: 'interdiction',
    svg: sensInterdit(),
  },
  {
    id: 'b14_50',
    code: 'B14',
    name: 'Limitation de vitesse à 50 km/h',
    meaning:
      'Vitesse maximale autorisée : 50 km/h, dès le panneau et jusqu’à la prochaine intersection ou un panneau qui modifie la limite.',
    family: 'interdiction',
    svg: vitesse(50),
  },
  {
    id: 'b6a1',
    code: 'B6a1',
    name: 'Stationnement interdit',
    meaning:
      'Stationnement interdit du côté du panneau, jusqu’à la prochaine intersection. L’arrêt (immobilisation momentanée, conducteur au volant ou à proximité) reste autorisé.',
    family: 'interdiction',
    svg: interdiction('', { fill: BLUE, slash: true }),
  },
  {
    id: 'b6d',
    code: 'B6d',
    name: 'Arrêt et stationnement interdits',
    meaning:
      'Ni arrêt ni stationnement du côté du panneau, jusqu’à la prochaine intersection.',
    family: 'interdiction',
    svg: interdiction('', { fill: BLUE, cross: true }),
  },

  // ===== Fin d'interdiction =====
  {
    id: 'b31',
    code: 'B31',
    name: 'Fin de toutes les interdictions',
    meaning:
      'Fin de toutes les interdictions signalées en amont pour les véhicules en mouvement (vitesse, dépassement…). La réglementation générale reprend.',
    family: 'fin',
    svg: finTout(),
  },
  {
    id: 'b33_50',
    code: 'B33',
    name: 'Fin de limitation de vitesse à 50 km/h',
    meaning:
      'La limitation à 50 km/h prend fin : la vitesse redevient celle de la réglementation générale du lieu.',
    family: 'fin',
    svg: finVitesse(50),
  },
  {
    id: 'b30',
    code: 'B30',
    name: 'Entrée de zone 30',
    meaning:
      'Vous entrez dans une zone où la vitesse est limitée à 30 km/h sur toutes les voies, jusqu’au panneau de sortie de zone.',
    family: 'interdiction',
    svg: zone30(),
  },
  {
    id: 'b51',
    code: 'B51',
    name: 'Sortie de zone 30',
    meaning:
      'Fin de la zone 30 : la limitation générale du lieu (50 km/h en agglomération) s’applique de nouveau.',
    family: 'fin',
    svg: finZone30(),
  },

  // ===== Obligation =====
  {
    id: 'b21b',
    code: 'B21b',
    name: 'Direction obligatoire : tout droit',
    meaning:
      'À la prochaine intersection, vous devez continuer tout droit : aucun changement de direction autorisé.',
    family: 'obligation',
    svg: obligation(arrow(0)),
  },
  {
    id: 'b21c1',
    code: 'B21c1',
    name: 'Direction obligatoire : à droite',
    meaning:
      'À la prochaine intersection, vous devez obligatoirement tourner à droite.',
    family: 'obligation',
    svg: obligation(arrow(90)),
  },
  {
    id: 'b21a1',
    code: 'B21a1',
    name: 'Contournement obligatoire par la droite',
    meaning:
      'Vous devez passer à droite de l’obstacle ou du terre-plein signalé (sens giratoire, refuge, chantier…).',
    family: 'obligation',
    svg: obligation(arrow(135)),
  },
  {
    id: 'b25',
    code: 'B25',
    name: 'Vitesse minimale obligatoire (30 km/h)',
    meaning:
      'Vous devez circuler à 30 km/h minimum, sauf si les conditions (trafic, météo) l’empêchent.',
    family: 'obligation',
    svg: vitesseMin(30),
  },

  // ===== Indication =====
  {
    id: 'c1a',
    code: 'C1a',
    name: 'Lieu aménagé pour le stationnement',
    meaning:
      'Signale un parking : un emplacement ou un parc aménagé pour stationner.',
    family: 'indication',
    svg: parking(),
  },
  {
    id: 'c12',
    code: 'C12',
    name: 'Sens unique',
    meaning:
      'La circulation se fait en sens unique, dans le sens de la flèche : aucun véhicule ne viendra en face.',
    family: 'indication',
    svg: indication(
      `<path d="M120 40 L150 88 H132 V200 H108 V88 H90 Z" fill="#fff"/>`,
    ),
  },
  {
    id: 'c13a',
    code: 'C13a',
    name: 'Impasse',
    meaning: 'La voie signalée est sans issue (cul-de-sac).',
    family: 'indication',
    svg: impasse(),
  },
  {
    id: 'c4a',
    code: 'C4a',
    name: 'Vitesse conseillée (90 km/h)',
    meaning:
      'Vitesse conseillée, non obligatoire : à adopter par bonnes conditions de circulation et de visibilité.',
    family: 'indication',
    svg: indication(
      `<text x="120" y="156" text-anchor="middle" font-family="-apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif" font-size="96" font-weight="800" fill="#fff">90</text>`,
    ),
  },
  // — Panneaux dessinés (générés par gen-signs.mjs) —
  {
    id: "a1a",
    code: "A1a",
    name: "Virage à droite",
    meaning: "Annonce un virage à droite, à environ 150 m hors agglomération (50 m en ville). Ralentissez avant le virage, serrez à droite et n'entreprenez pas de dépassement.",
    family: "danger",
    svg: danger(`<path d="M108 186 V150 C108 126 119 113 135 113 C146 113 151 119 151 127" fill="none" stroke="#14181d" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>`),
  },
  {
    id: "a1c",
    code: "A1c",
    name: "Succession de virages dont le premier est à droite",
    meaning: "Annonce plusieurs virages rapprochés, le premier tournant à droite. Adaptez votre vitesse sur toute la section, restez bien sur votre voie et ne dépassez pas.",
    family: "danger",
    svg: danger(`<path d="M104 184 V162 C104 144 136 148 136 130 V106" fill="none" stroke="#14181d" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>`),
  },
  {
    id: "a2a",
    code: "A2a",
    name: "Cassis ou dos-d'âne",
    meaning: "Annonce une déformation de la chaussée : creux (cassis) ou bosse (dos-d'âne). Ralentissez fortement pour garder le contrôle du véhicule et ne pas l'endommager.",
    family: "danger",
    svg: danger(`<path d="M82 168 H97 A23 23 0 0 1 143 168 H158 V180 H82 Z" fill="#14181d"/>`),
  },
  {
    id: "a3",
    code: "A3",
    name: "Chaussée rétrécie",
    meaning: "La chaussée se rétrécit par les deux côtés. Ralentissez, serrez à droite et croisez les autres véhicules avec prudence ; évitez tout dépassement.",
    family: "danger",
    svg: danger(`<path d="M89 180 V152 L104 130 V108" fill="none" stroke="#14181d" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/><path d="M151 180 V152 L136 130 V108" fill="none" stroke="#14181d" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>`),
  },
  {
    id: "a4",
    code: "A4",
    name: "Chaussée particulièrement glissante",
    meaning: "Section très glissante (pluie, verglas, gravillons, boue…). Réduisez l'allure, augmentez les distances de sécurité et évitez freinages et coups de volant brusques.",
    family: "danger",
    svg: danger(`<g transform="rotate(19 120 132)"><rect x="104" y="113" width="32" height="16" rx="7" fill="#14181d"/><rect x="96" y="124" width="48" height="18" rx="5" fill="#14181d"/><rect x="98" y="141" width="10" height="8" rx="3" fill="#14181d"/><rect x="132" y="141" width="10" height="8" rx="3" fill="#14181d"/><rect x="109" y="118" width="22" height="6" rx="3" fill="#fff"/></g><path d="M100 146 C90 155 109 162 99 172 C93 178 100 180 95 185" fill="none" stroke="#14181d" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M133 157 C124 164 141 169 133 177 C129 182 141 181 149 185" fill="none" stroke="#14181d" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`),
  },
  {
    id: "a16",
    code: "A16",
    name: "Descente dangereuse",
    meaning: "Annonce une descente à forte pente (ici 10 %). Ralentissez avant la pente, rétrogradez pour utiliser le frein moteur et sollicitez les freins avec modération.",
    family: "danger",
    svg: danger(`<polygon points="158,142 158,184 82,184" fill="#14181d"/><g transform="rotate(-27 128 146)"><path d="M102 152 L102 144 L112 142 L118 134 L133 134 L139 142 L150 144 L150 152 Z" fill="#14181d"/><circle cx="112" cy="155" r="6" fill="#14181d"/><circle cx="140" cy="155" r="6" fill="#14181d"/></g><text x="80" y="178" font-size="24" font-weight="bold" fill="#14181d" font-family="Arial, Helvetica, sans-serif">10%</text>`),
  },
  {
    id: "a13a",
    code: "A13a",
    name: "Endroit fréquenté par les enfants",
    meaning: "Lieu fréquenté par les enfants (école, aire de jeux…). Ralentissez et redoublez de vigilance : un enfant peut s'élancer sur la chaussée à tout moment.",
    family: "danger",
    svg: danger(`<circle cx="100" cy="112" r="9" fill="#14181d"/><path d="M104 123 L112 146 M112 146 L125 158 L121 176 M112 146 L97 159 L86 170 M104 126 L86 137 M104 126 L122 132" fill="none" stroke="#14181d" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><circle cx="139" cy="122" r="7" fill="#14181d"/><polygon points="139,130 126,157 153,157" fill="#14181d"/><path d="M134 157 L128 174 M147 157 L154 172 M139 133 L127 141" fill="none" stroke="#14181d" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`),
  },
  {
    id: "a13b",
    code: "A13b",
    name: "Annonce d'un passage pour piétons",
    meaning: "Annonce un passage pour piétons à environ 150 m (50 m en agglomération). Ralentissez et soyez prêt à vous arrêter pour céder le passage aux piétons engagés.",
    family: "danger",
    svg: danger(`<circle cx="125" cy="111" r="9" fill="#14181d"/><path d="M128 120 L117 146" fill="none" stroke="#14181d" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/><path d="M127 124 L104 136 M127 124 L136 145" fill="none" stroke="#14181d" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M117 146 L99 175 M117 146 L130 160 L137 177" fill="none" stroke="#14181d" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M84 186 L93 186 L98 172 L89 172 Z M99 186 L108 186 L113 172 L104 172 Z M114 186 L123 186 L128 172 L119 172 Z M129 186 L138 186 L143 172 L134 172 Z M144 186 L153 186 L158 172 L149 172 Z" fill="#14181d"/>`),
  },
  {
    id: "a21",
    code: "A21",
    name: "Débouché de cyclistes",
    meaning: "Des cyclistes peuvent déboucher sur la chaussée, venant de droite ou de gauche (sortie de piste ou de bande cyclable). Ralentissez et facilitez leur insertion.",
    family: "danger",
    svg: danger(`<circle cx="100" cy="156" r="17" fill="none" stroke="#14181d" stroke-width="6"/><circle cx="140" cy="156" r="17" fill="none" stroke="#14181d" stroke-width="6"/><path d="M100 156 L110 126 L133 126 L140 156 M140 156 L119 156 L110 126 M133 126 L119 156" stroke="#14181d" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M99 118 L113 122" stroke="#14181d" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M126 118 L139 118" stroke="#14181d" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
  },
  {
    id: "a15a1",
    code: "A15a1",
    name: "Passage d'animaux domestiques",
    meaning: "Traversée possible d'animaux domestiques (vaches, moutons…). Ralentissez et soyez prêt à vous arrêter, notamment à proximité des fermes et des pâturages.",
    family: "danger",
    svg: danger(`<path fill="#14181d" d="M80 131 L92 125 L94 118 L97 124 L100 124 L103 118 L106 125 L142 124 L150 128 L154 136 L152 146 L150 181 L144 181 L144 156 L138 156 L138 181 L132 181 L132 155 L129 159 L123 159 L121 154 L112 152 L110 181 L104 181 L104 152 L100 152 L100 181 L94 181 L94 149 L92 145 L83 143 L80 140 Z"/><path d="M152 138 Q157 144 154 168" stroke="#14181d" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
  },
  {
    id: "a15b",
    code: "A15b",
    name: "Passage d'animaux sauvages",
    meaning: "Traversée possible d'animaux sauvages (cerfs, sangliers…). Réduisez votre allure, surtout de nuit et en forêt, et soyez prêt à freiner : un animal peut surgir brusquement.",
    family: "danger",
    svg: danger(`<path fill="#14181d" d="M80 126 L87 115 L96 112 L104 117 L100 124 L113 132 L129 136 L144 131 L151 128 L157 132 L151 141 L145 154 L118 155 L104 149 L95 135 L83 131 Z"/><path d="M90 114 L94 105 M92 109 L86 105 M97 113 L104 105 M101 108 L108 106" stroke="#14181d" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M103 151 L90 162 L83 171 M110 153 L101 166 L94 178" stroke="#14181d" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M142 152 L153 158 L157 170 M136 154 L142 167 L150 178" stroke="#14181d" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
  },
  {
    id: "a17",
    code: "A17",
    name: "Annonce de feux tricolores",
    meaning: "Des feux tricolores sont implantés plus loin (environ 150 m hors agglomération, 50 m en ville). Ralentissez et préparez-vous à vous arrêter.",
    family: "danger",
    svg: danger(`<circle cx="120" cy="116" r="13" fill="#d0212a" stroke="#14181d" stroke-width="2"/><circle cx="120" cy="144" r="13" fill="#f5b41f" stroke="#14181d" stroke-width="2"/><circle cx="120" cy="172" r="13" fill="#1f9d3a" stroke="#14181d" stroke-width="2"/>`),
  },
  {
    id: "a18",
    code: "A18",
    name: "Circulation dans les deux sens",
    meaning: "La chaussée devient à double sens après une section à sens unique ou à chaussées séparées. Tenez bien votre droite et redoublez de prudence avant tout dépassement.",
    family: "danger",
    svg: danger(`<polygon fill="#14181d" points="104,184 92,163 99,163 99,106 109,106 109,163 116,163"/><polygon fill="#14181d" points="136,106 148,127 141,127 141,184 131,184 131,127 124,127"/>`),
  },
  {
    id: "a19",
    code: "A19",
    name: "Risque de chute de pierres",
    meaning: "Zone où des pierres peuvent tomber ou se trouver sur la chaussée. Ralentissez, surveillez la route et le talus, et évitez de vous arrêter dans la zone exposée.",
    family: "danger",
    svg: danger(`<polygon fill="#14181d" points="134,104 160,186 118,186 125,170 117,160 127,146 121,133 131,122 127,112"/><polygon fill="#14181d" points="106,116 114,119 115,127 108,131 103,124"/><polygon fill="#14181d" points="91,139 100,140 102,148 94,152 88,146"/><polygon fill="#14181d" points="101,158 110,159 112,167 103,171 98,164"/><rect x="80" y="181" width="38" height="4" fill="#14181d"/><path fill="#14181d" d="M87 181 L92 175 L97 181 Z M101 181 L106 176 L111 181 Z"/>`),
  },
  {
    id: "a24",
    code: "A24",
    name: "Vent latéral",
    meaning: "Zone fréquemment exposée à un fort vent latéral (viaduc, plaine, vallée). Ralentissez, tenez fermement le volant et méfiez-vous des écarts, surtout près des deux-roues.",
    family: "danger",
    svg: danger(`<rect x="139" y="106" width="6" height="80" fill="#d0212a"/><polygon fill="#d0212a" points="145,106 88,122 84,128 87,136 145,130"/><polygon fill="#fff" points="126,112 118,115 117,132 125,131"/><polygon fill="#fff" points="110,117 102,119 101,134 109,133"/>`),
  },
  {
    id: "a7",
    code: "A7",
    name: "Passage à niveau muni de barrières",
    meaning: "Annonce un passage à niveau équipé de barrières ou de demi-barrières. Ralentissez et arrêtez-vous si les barrières sont fermées ou en mouvement, ou si le feu rouge clignote.",
    family: "danger",
    svg: danger(`<path fill="#14181d" d="M88 130 L96 114 L104 130 Z M104 130 L112 114 L120 130 Z M120 130 L128 114 L136 130 Z M136 130 L144 114 L152 130 Z"/><rect x="82" y="128" width="76" height="12" fill="#14181d"/><path fill="#14181d" d="M92 140 L100 140 L100 170 L92 170 Z M108 140 L116 140 L116 170 L108 170 Z M124 140 L132 140 L132 170 L124 170 Z M140 140 L148 140 L148 170 L140 170 Z"/><rect x="82" y="168" width="76" height="10" fill="#14181d"/><path fill="#14181d" d="M90 178 L102 178 L102 186 L90 186 Z M106 178 L118 178 L118 186 L106 186 Z M122 178 L134 178 L134 186 L122 186 Z M138 178 L150 178 L150 186 L138 186 Z"/>`),
  },
  {
    id: "a8",
    code: "A8",
    name: "Passage à niveau sans barrière",
    meaning: "Annonce un passage à niveau sans barrière ni demi-barrière. Ralentissez fortement et ne franchissez la voie qu'après vous être assuré qu'aucun train n'approche.",
    family: "danger",
    svg: danger(`<path fill="#14181d" d="M84 170 L84 150 Q84 144 90 144 L124 144 L124 130 L156 130 L156 138 L140 138 L140 154 L154 154 L154 170 Z"/><rect x="94" y="130" width="9" height="16" fill="#14181d"/><path fill="#14181d" d="M92 124 A8 8 0 1 0 108 124 A8 8 0 1 0 92 124 M104 114 A10 10 0 1 0 124 114 A10 10 0 1 0 104 114 M120 112 A10 10 0 1 0 140 112 A10 10 0 1 0 120 112 M136 121 A7 7 0 1 0 150 121 A7 7 0 1 0 136 121"/><path fill="#14181d" d="M90 172 A8 8 0 1 0 106 172 A8 8 0 1 0 90 172 M108 172 A8 8 0 1 0 124 172 A8 8 0 1 0 108 172 M126 172 A8 8 0 1 0 142 172 A8 8 0 1 0 126 172 M142 172 A8 8 0 1 0 158 172 A8 8 0 1 0 142 172"/><rect x="80" y="179" width="80" height="5" fill="#14181d"/>`),
  },
  {
    id: "ak5",
    code: "AK5",
    name: "Travaux",
    meaning: "Annonce une zone de travaux temporaires. Réduisez votre allure, respectez la signalisation temporaire et soyez attentif au personnel et aux engins de chantier.",
    family: "danger",
    svg: danger(`<rect x="80" y="180" width="80" height="5" fill="#14181d"/><circle cx="110" cy="113" r="9" fill="#14181d"/><path d="M108 125 L117 148" stroke="#14181d" stroke-width="13" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M106 128 L128 146 M111 136 L136 153" stroke="#14181d" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M115 148 L99 163 L87 179 M118 149 L123 164 L118 179" stroke="#14181d" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M122 141 L148 168" stroke="#14181d" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path fill="#14181d" d="M124 182 L131 169 L139 159 L147 156 L153 161 L158 170 L160 182 Z"/>`, { fond: '#ffd21f' }),
  },
  {
    id: "a14",
    code: "A14",
    name: "Autres dangers",
    meaning: "Signale un danger sans panneau spécifique ; sa nature est souvent précisée par un panonceau. Ralentissez et tenez-vous prêt à réagir à toute situation.",
    family: "danger",
    svg: danger(`<path d="M108 114 C108 105 112 104 120 104 C128 104 132 105 132 114 L127 147 C126 153 123 155 120 155 C117 155 114 153 113 147 Z" fill="#14181d"/><circle cx="120" cy="172" r="11" fill="#14181d"/>`),
  },
  {
    id: "b15",
    code: "B15",
    name: "Cédez le passage à la circulation venant en sens inverse",
    meaning: "Dans ce passage rétréci, vous n'avez pas la priorité : laissez passer les véhicules venant en face et ne vous engagez que lorsque la voie est libre.",
    family: "priorite",
    svg: interdiction(`<rect x="84" y="72" width="22" height="62" fill="#14181d"/><polygon points="95,172 68,130 122,130" fill="#14181d"/><rect x="139" y="106" width="16" height="64" fill="#d0212a"/><polygon points="147,68 125,110 169,110" fill="#d0212a"/>`),
  },
  {
    id: "c18",
    code: "C18",
    name: "Priorité par rapport à la circulation venant en sens inverse",
    meaning: "Dans ce passage étroit, vous avez la priorité sur les véhicules venant en sens inverse : ce sont eux qui doivent attendre. À l'autre extrémité, le panneau B15 impose de céder le passage.",
    family: "priorite",
    svg: indication(`<polygon points="88,190 67,132 81,132 81,50 95,50 95,132 109,132" fill="#d0212a"/><polygon points="152,50 125,118 141,118 141,190 163,190 163,118 179,118" fill="#fff"/>`),
  },
  {
    id: "b2a",
    code: "B2a",
    name: "Interdiction de tourner à gauche à la prochaine intersection",
    meaning: "À la prochaine intersection, vous ne pouvez pas tourner à gauche. Ce panneau n'interdit que ce mouvement : l'interdiction de faire demi-tour est une prescription distincte, signalée par le panneau B2c.",
    family: "interdiction",
    svg: interdiction(`<path d="M146 168 L146 128 Q146 100 118 100 L102 100" fill="none" stroke="#14181d" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/><polygon points="68,100 104,78 104,122" fill="#14181d"/>`, { slash: true }),
  },
  {
    id: "b2c",
    code: "B2c",
    name: "Interdiction de faire demi-tour jusqu'à la prochaine intersection",
    meaning: "Le demi-tour est interdit sur la route suivie, du panneau jusqu'à la prochaine intersection. Tourner à gauche reste autorisé si rien d'autre ne l'interdit.",
    family: "interdiction",
    svg: interdiction(`<path d="M148 166 L148 110 A26 26 0 0 0 96 110 L96 132" fill="none" stroke="#14181d" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/><polygon points="96,172 74,134 118,134" fill="#14181d"/>`, { slash: true }),
  },
  {
    id: "b3",
    code: "B3",
    name: "Dépassement interdit",
    meaning: "Interdiction de dépasser tout véhicule à moteur, sauf les deux-roues sans side-car. S'applique jusqu'au panneau de fin d'interdiction ou à la prochaine intersection.",
    family: "interdiction",
    svg: interdiction(`<rect x="76" y="94" width="32" height="34" rx="12" fill="#d0212a"/><rect x="69" y="118" width="46" height="46" rx="10" fill="#d0212a"/><rect x="72" y="160" width="11" height="11" rx="3" fill="#d0212a"/><rect x="101" y="160" width="11" height="11" rx="3" fill="#d0212a"/><rect x="132" y="94" width="32" height="34" rx="12" fill="#14181d"/><rect x="125" y="118" width="46" height="46" rx="10" fill="#14181d"/><rect x="128" y="160" width="11" height="11" rx="3" fill="#14181d"/><rect x="157" y="160" width="11" height="11" rx="3" fill="#14181d"/>`),
  },
  {
    id: "b8",
    code: "B8",
    name: "Accès interdit aux véhicules affectés au transport de marchandises",
    meaning: "L'accès est interdit aux véhicules de transport de marchandises. Un panonceau peut limiter l'interdiction à un tonnage donné (ex. : plus de 3,5 t).",
    family: "interdiction",
    svg: interdiction(`<rect x="96" y="84" width="78" height="54" fill="#14181d"/><path d="M66 138 L66 106 Q66 96 76 96 L96 96 L96 138 Z" fill="#14181d"/><circle cx="88" cy="146" r="14" fill="#14181d"/><circle cx="150" cy="146" r="14" fill="#14181d"/>`),
  },
  {
    id: "b9a",
    code: "B9a",
    name: "Accès interdit aux piétons",
    meaning: "Les piétons ne doivent pas s'engager sur cette voie (tunnel, voie rapide…) : ils doivent emprunter un autre itinéraire.",
    family: "interdiction",
    svg: interdiction(`<circle cx="115" cy="75" r="11" fill="#14181d"/><path d="M105 87 L127 87 L130 128 L103 128 Z" fill="#14181d"/><path d="M113 94 L91 116" fill="none" stroke="#14181d" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/><path d="M119 94 L143 121" fill="none" stroke="#14181d" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/><path d="M109 126 L87 164" fill="none" stroke="#14181d" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/><path d="M123 126 L149 158" fill="none" stroke="#14181d" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>`),
  },
  {
    id: "b9b",
    code: "B9b",
    name: "Accès interdit aux cycles",
    meaning: "Il est interdit de circuler à vélo sur cette voie. Le cycliste peut toutefois continuer à pied en poussant son cycle, comme un piéton.",
    family: "interdiction",
    svg: interdiction(`<circle cx="92" cy="140" r="21" fill="none" stroke="#14181d" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><circle cx="148" cy="140" r="21" fill="none" stroke="#14181d" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="M92 140 L106 102 L136 102 L148 140" fill="none" stroke="#14181d" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M136 102 L122 140 L148 140" fill="none" stroke="#14181d" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M128 94 L146 94" fill="none" stroke="#14181d" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="M99 94 L110 94 L107 102" fill="none" stroke="#14181d" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`),
  },
  {
    id: "b12",
    code: "B12",
    name: "Accès interdit aux véhicules de plus de 3,5 m de hauteur, chargement compris",
    meaning: "Interdit à tout véhicule dont la hauteur, chargement compris, dépasse 3,5 m (pont, tunnel, passage couvert). Le conducteur doit connaître la hauteur de son véhicule chargé.",
    family: "interdiction",
    svg: interdiction(`<polygon points="96,68 144,68 120,90" fill="#14181d"/><polygon points="120,150 96,172 144,172" fill="#14181d"/><text x="120" y="136" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="bold" fill="#14181d">3,5m</text>`),
  },
  {
    id: "b16",
    code: "B16",
    name: "Signaux sonores interdits",
    meaning: "L'usage de l'avertisseur sonore est interdit, sauf en cas de danger immédiat pour éviter un accident.",
    family: "interdiction",
    svg: interdiction(`<polygon points="68,90 118,112 118,134 68,158" fill="#14181d"/><rect x="118" y="112" width="38" height="22" fill="#14181d"/><rect x="154" y="107" width="10" height="32" rx="3" fill="#14181d"/>`),
  },
  {
    id: "b34",
    code: "B34",
    name: "Fin d'interdiction de dépasser",
    meaning: "Ce panneau lève l'interdiction de dépasser signalée par le B3 : vous pouvez de nouveau dépasser, en respectant les règles générales du code de la route.",
    family: "fin",
    svg: finPicto(`<rect x="76" y="94" width="32" height="34" rx="12" fill="#8f969e"/><rect x="69" y="118" width="46" height="46" rx="10" fill="#8f969e"/><rect x="72" y="160" width="11" height="11" rx="3" fill="#8f969e"/><rect x="101" y="160" width="11" height="11" rx="3" fill="#8f969e"/><rect x="132" y="94" width="32" height="34" rx="12" fill="#8f969e"/><rect x="125" y="118" width="46" height="46" rx="10" fill="#8f969e"/><rect x="128" y="160" width="11" height="11" rx="3" fill="#8f969e"/><rect x="157" y="160" width="11" height="11" rx="3" fill="#8f969e"/>`),
  },
  {
    id: "b22a",
    code: "B22a",
    name: "Piste ou bande obligatoire pour les cycles",
    meaning: "Les cyclistes doivent emprunter la piste ou la bande cyclable à l'entrée de laquelle le panneau est placé. Les piétons et les autres véhicules n'ont pas le droit de l'emprunter ni de s'y arrêter.",
    family: "obligation",
    svg: obligation(`<circle cx="87" cy="133" r="19" fill="none" stroke="#fff" stroke-width="8"/><circle cx="153" cy="133" r="19" fill="none" stroke="#fff" stroke-width="8"/><circle cx="122" cy="133" r="6" fill="#fff"/><path d="M105 87 L87 133 M100 100 L137 100 M100 100 L122 133 M137 92 L122 133 M137 100 L153 133 M122 133 L153 133" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M93 87 L111 87" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="M129 90 L146 90" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`),
  },
  {
    id: "b40",
    code: "B40",
    name: "Fin de piste ou bande cyclable obligatoire",
    meaning: "L'obligation d'emprunter la piste ou bande cyclable prend fin.",
    family: "fin",
    svg: finObligation(`<circle cx="87" cy="133" r="19" fill="none" stroke="#fff" stroke-width="8"/><circle cx="153" cy="133" r="19" fill="none" stroke="#fff" stroke-width="8"/><circle cx="122" cy="133" r="6" fill="#fff"/><path d="M105 87 L87 133 M100 100 L137 100 M100 100 L122 133 M137 92 L122 133 M137 100 L153 133 M122 133 L153 133" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M93 87 L111 87" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="M129 90 L146 90" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`),
  },
  {
    id: "b22b",
    code: "B22b",
    name: "Chemin obligatoire pour piétons",
    meaning: "Les piétons sont tenus d'emprunter ce chemin qui leur est réservé. Les conducteurs de véhicules et les cavaliers n'ont pas le droit de l'emprunter ni de s'y arrêter.",
    family: "obligation",
    svg: obligation(`<circle cx="97" cy="74" r="10" fill="#fff"/><path d="M90 84 L104 84 L104 174 L98 174 L98 130 L96 130 L96 174 L90 174 Z" fill="#fff"/><path d="M92 89 L85 117 M102 89 L127 122" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="144" cy="112" r="8" fill="#fff"/><path d="M144 121 L133 152 L155 152 Z" fill="#fff"/><path d="M139 128 L127 122 M150 129 L159 141 M140 152 L140 168 M148 152 L148 168" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`),
  },
  {
    id: "b26",
    code: "B26",
    name: "Chaînes à neige obligatoires",
    meaning: "Obligation de circuler avec des chaînes à neige sur au moins deux roues motrices, sur la route enneigée dont le panneau marque l'entrée. S'applique jusqu'au panneau de fin d'obligation.",
    family: "obligation",
    svg: obligation(`<circle cx="120" cy="120" r="34" fill="none" stroke="#fff" stroke-width="16"/><circle cx="120" cy="120" r="52" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-dasharray="10 17"/>`),
  },
  {
    id: "b27a",
    code: "B27a",
    name: "Voie réservée aux véhicules des services réguliers de transport en commun",
    meaning: "Cette voie est réservée aux bus des services réguliers de transport en commun. Les conducteurs des autres véhicules n'ont pas le droit d'y circuler ni de s'y arrêter.",
    family: "obligation",
    svg: obligation(`<path d="M76 96 L176 96 L176 134 L66 134 L64 126 L64 106 Z" fill="#fff"/><circle cx="88" cy="136" r="13" fill="#0a60b6"/><circle cx="143" cy="136" r="13" fill="#0a60b6"/><circle cx="88" cy="136" r="9" fill="#fff"/><circle cx="143" cy="136" r="9" fill="#fff"/><path d="M67 104 L77 101 L77 116 L67 116 Z" fill="#0a60b6"/><rect x="82" y="100" width="19" height="14" rx="2" fill="#0a60b6"/><rect x="105" y="100" width="19" height="14" rx="2" fill="#0a60b6"/><rect x="128" y="100" width="19" height="14" rx="2" fill="#0a60b6"/><rect x="151" y="100" width="18" height="14" rx="2" fill="#0a60b6"/>`),
  },
  {
    id: "c20a",
    code: "C20a",
    name: "Emplacement d'un passage pour piétons",
    meaning: "Signale l'emplacement d'un passage aménagé pour la traversée des piétons. Le conducteur doit céder le passage aux piétons engagés ou manifestant l'intention de traverser, en s'arrêtant au besoin.",
    family: "indication",
    svg: indication(`<polygon points="120,50 193,191 47,191" fill="#fff"/><polygon points="72,154 84,154 87,186 69,186" fill="#14181d"/><polygon points="100,154 112,154 115,186 97,186" fill="#14181d"/><polygon points="128,154 140,154 143,186 125,186" fill="#14181d"/><polygon points="156,154 168,154 171,186 153,186" fill="#14181d"/><path d="M120 132 L100 152 L92 170 M120 132 L134 154 L150 172" stroke="#fff" stroke-width="17" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M120 132 L100 152 L92 170 M120 132 L134 154 L150 172" stroke="#14181d" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M119 98 L121 132" stroke="#14181d" stroke-width="15" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M116 104 L95 122 M124 104 L146 126" stroke="#14181d" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="119" cy="86" r="10" fill="#14181d"/>`),
  },
  {
    id: "c107",
    code: "C107",
    name: "Route à accès réglementé",
    meaning: "Début d'une voie express : accès interdit aux piétons, cycles, cyclomoteurs et véhicules lents ; arrêt, stationnement, demi-tour et marche arrière interdits. Ce panneau ne fixe pas de limitation de vitesse : 110 km/h seulement si les deux chaussées sont séparées par un terre-plein central, sinon 80 km/h par défaut.",
    family: "indication",
    svg: indication(`<polygon points="98,66 142,66 156,120 84,120" fill="#fff"/><rect x="62" y="112" width="116" height="48" rx="10" fill="#fff"/><rect x="76" y="150" width="26" height="28" fill="#fff"/><rect x="138" y="150" width="26" height="28" fill="#fff"/><polygon points="100,76 140,76 150,108 90,108" fill="#0a60b6"/><circle cx="84" cy="138" r="9" fill="#0a60b6"/><circle cx="156" cy="138" r="9" fill="#0a60b6"/>`),
  },
  {
    id: "c207",
    code: "C207",
    name: "Début d'une section d'autoroute",
    meaning: "Indique le début d'une autoroute et de ses règles : accès réservé aux véhicules à moteur rapides ; arrêt, demi-tour et marche arrière interdits. Vitesse limitée à 130 km/h par défaut.",
    family: "indication",
    svg: indication(`<rect x="46" y="86" width="148" height="15" fill="#fff"/><rect x="48" y="101" width="14" height="22" fill="#fff"/><rect x="178" y="101" width="14" height="22" fill="#fff"/><polygon points="84,50 102,50 106,86 78,86" fill="#fff"/><polygon points="138,50 156,50 162,86 134,86" fill="#fff"/><polygon points="76,112 106,112 98,190 56,190" fill="#fff"/><polygon points="134,112 164,112 184,190 142,190" fill="#fff"/>`),
  },
  {
    id: "c111",
    code: "C111",
    name: "Entrée d'un tunnel",
    meaning: "Signale l'entrée d'un tunnel : allumage des feux de croisement obligatoire ; demi-tour, arrêt et stationnement interdits hors emplacements d'urgence. Respectez les distances de sécurité.",
    family: "indication",
    svg: indication(`<path d="M64 184 V120 A56 56 0 0 1 176 120 V184 H154 V124 A34 36 0 0 0 86 124 V184 Z" fill="#fff"/><path d="M86 184 V124 A34 36 0 0 1 154 124 V184 Z" fill="#14181d"/><path d="M103 184 V172 C103 163 110 156 120 156 C130 156 137 163 137 172 V184 Z" fill="#fff"/>`),
  },
]

// Les pictogrammes des autres panneaux (danger, véhicules, piétons…) sont
// ajoutés par familles dans ce même tableau — voir la génération assistée.

const byId = new Map(SIGNS.map((s) => [s.id, s]))
export const getSign = (id) => byId.get(id)
