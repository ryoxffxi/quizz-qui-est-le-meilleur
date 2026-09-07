// Les pièges classiques : quels panneaux se confondent, et comment les départager.
//
// POURQUOI CE FICHIER
// Une fiche qui répète la définition officielle n'apprend rien à personne et
// n'apporte rien à Google : la définition est déjà partout. Ce qui manque
// vraiment à quelqu'un qui révise, c'est le tri entre deux panneaux qui se
// ressemblent — c'est là que se perdent les points à l'examen. C'est aussi la
// requête réellement tapée (« différence entre B15 et C18 »).
//
// CONVENTION : une paire est déclarée UNE SEULE FOIS. Le build la symétrise, donc
// la règle doit se lire correctement depuis les deux fiches : on nomme toujours
// les deux codes explicitement, jamais « celui-ci » ou « l'autre ».

export const CONFUSIONS = [
  // ── Danger ───────────────────────────────────────────────────────────────
  {
    a: 'a13a',
    b: 'a13b',
    tip: "A13a montre deux enfants qui courent : c'est un lieu fréquenté par des enfants (école, centre de loisirs), sans passage protégé forcément. A13b montre un piéton sur des bandes blanches : c'est un passage pour piétons qui arrive.",
  },
  {
    a: 'a13b',
    b: 'c20a',
    tip: "Le même dessin, mais pas la même forme, et c'est tout le piège. Le triangle rouge A13b ANNONCE un passage pour piétons plus loin (150 m, 50 m en agglomération). Le carré bleu C20a signale que le passage est ICI, devant vos roues.",
  },
  {
    a: 'a15a1',
    b: 'a15b',
    tip: "A15a1 dessine un animal de ferme : un troupeau domestique, en général accompagné et prévisible. A15b dessine un cervidé qui bondit : du gibier sauvage, qui surgit sans prévenir, surtout à l'aube et au crépuscule.",
  },
  {
    a: 'a7',
    b: 'a8',
    tip: "A7 dessine une barrière : le passage à niveau est gardé, quelque chose vous arrêtera physiquement. A8 dessine une locomotive : rien ne descendra, c'est à vous de regarder et d'écouter avant de vous engager.",
  },
  {
    a: 'a1a',
    b: 'a1c',
    tip: "A1a : un seul virage, vers la droite. A1c : la route serpente, plusieurs virages s'enchaînent et le premier part à droite.",
  },
  {
    a: 'a3',
    b: 'a18',
    tip: "A3 dessine deux bords qui se resserrent : la chaussée rétrécit, la largeur diminue. A18 dessine deux flèches opposées : la route redevient à double sens, vous allez croiser des véhicules de face.",
  },
  {
    a: 'a2a',
    b: 'a16',
    tip: "A2a signale un accident de relief ponctuel : un dos-d'âne ou un creux qu'on franchit en quelques mètres. A16 signale une descente longue et pentue, dont le pourcentage est écrit sur le panneau.",
  },
  {
    a: 'ak5',
    b: 'a14',
    tip: "AK5 annonce un chantier : hommes au travail, engins, revêtement modifié. A14 (point d'exclamation) signale un danger qui n'a pas de panneau dédié ; un panonceau sous le triangle précise alors lequel.",
  },
  {
    a: 'a21',
    b: 'b22a',
    tip: "Triangle A21 : attention, des cyclistes vont déboucher, vous restez maître de votre véhicule. Rond bleu B22a : obligation, cette bande est réservée aux cycles et ils doivent l'emprunter.",
  },
  {
    a: 'a21',
    b: 'b9b',
    tip: "Triangle A21 vous prévient que des cyclistes arrivent. Rond rouge barré B9b, lui, leur interdit l'accès. L'un vous alerte, l'autre les exclut.",
  },

  // ── Priorité ─────────────────────────────────────────────────────────────
  {
    a: 'ab3a',
    b: 'ab4',
    tip: "AB3a (triangle pointe en bas) : cédez le passage. Si la voie est libre, vous passez sans vous arrêter. AB4 (octogone STOP) : arrêt complet obligatoire, roues immobiles, même quand vous voyez que personne ne vient.",
  },
  {
    a: 'ab1',
    b: 'ab2',
    tip: "AB1 (croix) : intersection ordinaire, la priorité à droite s'applique et c'est vous qui cédez. AB2 : la même intersection, mais c'est vous qui avez la priorité.",
  },
  {
    a: 'ab6',
    b: 'ab7',
    tip: "AB6 (losange jaune plein) : vous êtes sur une route prioritaire et vous la gardez à chaque carrefour. AB7 (le même losange barré) : c'est terminé, la priorité à droite reprend ses droits.",
  },
  {
    a: 'b15',
    b: 'c18',
    tip: "Le duo le plus piégeux du code. B15 (rond à bord rouge) : c'est vous qui cédez à ceux d'en face. C18 (carré bleu) : c'est vous qui passez d'abord. Le repère qui ne trompe pas : la flèche ROUGE désigne toujours celui qui doit céder.",
  },
  {
    a: 'ab3a',
    b: 'b15',
    tip: "Les deux vous font céder, mais pas au même endroit. AB3a s'applique à une intersection : vous cédez à la route que vous rejoignez. B15 s'applique à un rétrécissement (pont étroit, chicane) : vous cédez au sens inverse sur la même route.",
  },

  // ── Interdiction ─────────────────────────────────────────────────────────
  {
    a: 'b0',
    b: 'b1',
    tip: "B0 (disque rouge vide) : circulation interdite dans les DEUX sens, personne ne passe. B1 (disque rouge à barre blanche) : interdit dans CE sens seulement, les véhicules d'en face arrivent normalement.",
  },
  {
    a: 'b6a1',
    b: 'c1a',
    tip: "Le couple qui décide si vous pouvez vous garer. C1a (carré bleu, P blanc) : emplacement aménagé, vous stationnez. B6a1 (rond à bord rouge) : stationnement interdit. Bleu autorise, rouge interdit.",
  },
  {
    a: 'a4',
    b: 'b26',
    tip: "A4 (triangle) prévient d'une chaussée glissante et vous laisse juge de votre allure. B26 (rond bleu) impose les chaînes à neige : sans équipement, vous n'avez pas le droit de passer. Le triangle alerte, le rond bleu oblige.",
  },
  {
    a: 'b6a1',
    b: 'b6d',
    tip: "B6a1 (une seule barre) : stationnement interdit, mais l'arrêt reste possible si vous restez au volant. B6d (deux barres croisées) : arrêt ET stationnement interdits, vous ne vous immobilisez pas du tout.",
  },
  {
    a: 'b14_50',
    b: 'b33_50',
    tip: "B14 (chiffre cerclé de rouge) : la limitation commence. B33 (le même chiffre barré en gris) : elle se termine et vous reprenez la vitesse normale de la route.",
  },
  {
    a: 'b14_50',
    b: 'b30',
    tip: "B14 limite la vitesse jusqu'au prochain panneau ou à la prochaine intersection. B30 ouvre une ZONE 30 : la limite vaut sur toutes les rues de la zone jusqu'au panneau de sortie B51, et les piétons y traversent partout.",
  },
  {
    a: 'b14_50',
    b: 'b25',
    tip: "Rond ROUGE B14 : un maximum à ne pas dépasser. Rond BLEU B25 : un minimum à tenir. La couleur du cercle dit tout : rouge interdit, bleu oblige.",
  },
  {
    a: 'b25',
    b: 'c4a',
    tip: "B25 (rond bleu) : vitesse MINIMALE obligatoire, rouler plus lentement est une infraction. C4a (carré bleu) : vitesse CONSEILLÉE, aucune sanction si vous ne la tenez pas.",
  },
  {
    a: 'b2a',
    b: 'b2c',
    tip: "B2a barre une flèche qui tourne : interdit de tourner à gauche à la prochaine intersection. B2c barre une flèche en demi-tour : interdit de faire demi-tour.",
  },
  {
    a: 'b3',
    b: 'b34',
    tip: "B3 (deux voitures dont une rouge) : dépassement interdit. B34 (le même dessin barré) : l'interdiction est levée, vous pouvez de nouveau dépasser si les conditions le permettent.",
  },
  {
    a: 'b9a',
    b: 'b22b',
    tip: "Rond ROUGE B9a : les piétons n'ont pas le droit d'entrer. Rond BLEU B22b : ce chemin leur est au contraire réservé. Même silhouette, message inverse.",
  },
  {
    a: 'b9b',
    b: 'b22a',
    tip: "Rond ROUGE B9b : cycles interdits. Rond BLEU B22a : piste obligatoire pour les cycles. Même vélo dessiné, obligation d'un côté, interdiction de l'autre.",
  },
  {
    a: 'b8',
    b: 'b12',
    tip: "B8 barre un camion : ce sont les véhicules de transport de marchandises qui sont exclus, quelle que soit leur taille. B12 affiche une hauteur : c'est le gabarit qui décide, un camping-car trop haut est concerné aussi.",
  },

  // ── Fin d'interdiction ───────────────────────────────────────────────────
  {
    a: 'b31',
    b: 'b33_50',
    tip: "B31 (disque blanc barré de traits obliques) lève TOUTES les interdictions d'un coup. B33 n'en lève qu'une seule, la limitation de vitesse qu'il rappelle en gris.",
  },
  {
    a: 'b31',
    b: 'b34',
    tip: "B31 lève toutes les interdictions en même temps. B34 ne lève que celle de dépasser : une limitation de vitesse posée avant, elle, continue de s'appliquer.",
  },
  {
    a: 'b30',
    b: 'b51',
    tip: "B30 ouvre la zone 30, B51 la referme. Tant que vous n'avez pas croisé B51, la règle de zone continue de courir, y compris dans les rues adjacentes que vous empruntez.",
  },
  {
    a: 'b40',
    b: 'b22a',
    tip: "B22a (rond bleu) rend la piste cyclable obligatoire. B40 (le même barré) met fin à cette obligation : les cyclistes peuvent revenir sur la chaussée.",
  },

  // ── Obligation ───────────────────────────────────────────────────────────
  {
    a: 'b21b',
    b: 'c12',
    tip: "Rond bleu B21b : vous êtes OBLIGÉ d'aller tout droit, tourner serait une infraction. Carré bleu C12 : la rue est à sens unique, c'est une information sur le sens de circulation, pas un ordre de direction.",
  },
  {
    a: 'b21c1',
    b: 'b21a1',
    tip: "B21c1 : la flèche tourne, vous devez prendre à droite et changer de route. B21a1 : la flèche contourne, vous devez passer à droite d'un obstacle (îlot, terre-plein) en restant sur la même route.",
  },

  // ── Indication ───────────────────────────────────────────────────────────
  {
    a: 'c12',
    b: 'c13a',
    tip: "C12 (longue flèche blanche) : sens unique, la rue traverse et débouche ailleurs. C13a (flèche en T barrée de rouge) : impasse, vous devrez revenir sur vos pas.",
  },
  {
    a: 'c107',
    b: 'c207',
    tip: "C207 marque le début d'une autoroute : règles autoroutières complètes. C107 marque une route à accès réglementé (voie express) : mêmes exclusions pour les véhicules lents, mais ce n'est pas une autoroute et la vitesse y est plus basse.",
  },
]

/**
 * Table symétrique { idPanneau: [{ id, tip }] }.
 *
 * Chaque paire du tableau ci-dessus est déclarée une fois et apparaît des DEUX
 * côtés : impossible qu'une fiche mentionne un piège que la fiche d'en face
 * ignore.
 */
export function confusionsBySign(signIds) {
  const connu = new Set(signIds)
  const table = {}
  const ajouter = (de, vers, tip) => {
    ;(table[de] ||= []).push({ id: vers, tip })
  }
  for (const { a, b, tip } of CONFUSIONS) {
    // Un identifiant qui ne correspond à aucun panneau produirait une fiche
    // muette et un lien mort : on préfère l'échec bruyant du build.
    if (!connu.has(a) || !connu.has(b)) {
      throw new Error(`confusions.js : paire inconnue ${a} / ${b}`)
    }
    ajouter(a, b, tip)
    ajouter(b, a, tip)
  }
  return table
}
