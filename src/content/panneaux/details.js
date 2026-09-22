// Champs éditoriaux des panneaux, fusionnés dans SIGNS à l'export (signs.js).
//
// Clé = id du panneau. Trois champs, tous facultatifs :
//   short  : nom court (35 caractères max) pour les noms de plus de 45
//            caractères, utilisé dans les boutons d'option et les cartes.
//   alt    : description NEUTRE pour les lecteurs d'écran (forme, couleur,
//            picto), sans jamais donner le nom ni la signification : elle est
//            lue dans le quiz, où le nom est la réponse.
//   detail : 2 ou 3 phrases de complément (où on le rencontre, ce qui change
//            pour le conducteur, l'erreur classique).
//
// Un atelier contenu complète ce fichier ; les entrées ci-dessous couvrent
// déjà les panneaux les plus courants. Jamais de tiret long dans les textes.
export const DETAILS = {
  // ===== Priorité =====
  ab1: {
    alt: 'Triangle à bord rouge, croix noire en X au centre',
    detail:
      "C'est le régime par défaut de toute intersection sans signalisation. Le panneau ne fait que le rappeler à un endroit où il est facile de l'oublier, souvent hors agglomération.",
  },
  ab2: {
    alt: 'Triangle à bord rouge, trait vertical épais coupé par un trait horizontal fin',
    detail:
      "La priorité n'est acquise que pour l'intersection annoncée : au croisement suivant, sans nouveau panneau, la priorité à droite reprend.",
  },
  ab3a: {
    alt: 'Triangle à bord rouge pointe en bas, fond blanc, sans dessin',
    detail:
      "Sa forme inversée le rend reconnaissable de dos ou sous la neige. Il se combine souvent avec une ligne de pointillés blancs au sol : c'est là qu'il faut s'arrêter si un véhicule arrive.",
  },
  ab4: {
    alt: 'Octogone rouge avec le mot STOP en lettres blanches',
    detail:
      "L'arrêt se marque roues immobiles, à la limite de la chaussée abordée, même quand la visibilité est parfaite. Ne pas s'arrêter complètement est une infraction, pas une nuance.",
  },
  ab6: {
    alt: 'Losange blanc avec un losange jaune au centre',
  },
  ab7: {
    alt: 'Losange blanc avec un losange jaune au centre, barré d\'une bande noire',
  },
  b15: {
    short: 'Cédez le passage au sens inverse',
    alt: 'Rond à bord rouge, flèche noire montante et flèche rouge descendante côte à côte',
  },
  c18: {
    short: 'Priorité sur le sens inverse',
    alt: 'Carré bleu, flèche blanche montante et flèche rouge descendante côte à côte',
  },

  // ===== Interdiction =====
  b0: {
    alt: 'Rond blanc cerclé de rouge, sans dessin',
  },
  b1: {
    alt: 'Disque rouge traversé d\'une barre horizontale blanche',
    detail:
      "On le trouve à l'entrée des rues à sens unique, côté sortie. S'y engager vous met face aux véhicules qui arrivent : c'est l'une des infractions les plus dangereuses de la circulation urbaine.",
  },
  b14_50: {
    alt: 'Rond blanc cerclé de rouge avec le nombre 50 en noir',
  },
  b6a1: {
    alt: 'Rond bleu cerclé de rouge, barré d\'une diagonale rouge',
  },
  b6d: {
    alt: 'Rond bleu cerclé de rouge, barré de deux diagonales rouges en croix',
  },
  b30: {
    alt: 'Panneau blanc carré, rond rouge avec le nombre 30, mot ZONE en dessous',
  },
  b2a: {
    short: 'Interdit de tourner à gauche',
    alt: 'Rond blanc cerclé de rouge, flèche noire tournant vers la gauche, barrée de rouge',
  },
  b2c: {
    short: 'Demi-tour interdit',
    alt: 'Rond blanc cerclé de rouge, flèche noire en demi-tour, barrée de rouge',
  },
  b3: {
    alt: 'Rond blanc cerclé de rouge, deux voitures vues de face, la gauche rouge, la droite noire',
  },
  b8: {
    short: 'Transport de marchandises interdit',
    alt: 'Rond blanc cerclé de rouge, silhouette noire de camion',
  },
  b9a: {
    alt: 'Rond blanc cerclé de rouge, silhouette noire de piéton',
  },
  b9b: {
    alt: 'Rond blanc cerclé de rouge, silhouette noire de vélo',
  },
  b12: {
    short: 'Hauteur limitée à 3,5 m',
    alt: 'Rond blanc cerclé de rouge, mention 3,5 m entre deux triangles noirs pointés l\'un vers l\'autre',
  },
  b16: {
    alt: 'Rond blanc cerclé de rouge, silhouette noire d\'un avertisseur sonore',
  },

  // ===== Fin de prescription =====
  b31: {
    alt: 'Rond blanc à liseré fin, barré d\'une bande noire en diagonale',
  },
  b33_50: {
    alt: 'Rond blanc avec le nombre 50 en gris, barré d\'une bande noire en diagonale',
  },
  b51: {
    alt: 'Panneau blanc carré, rond gris avec le nombre 30 et le mot ZONE, barré en diagonale',
  },
  b34: {
    alt: 'Rond blanc, deux voitures grises vues de face, barré d\'une bande noire en diagonale',
  },
  b40: {
    alt: 'Rond bleu, vélo blanc, barré d\'une bande rouge en diagonale',
  },

  // ===== Obligation =====
  b21b: {
    alt: 'Rond bleu, flèche blanche pointée vers le haut',
  },
  b21c1: {
    alt: 'Rond bleu, flèche blanche pointée vers la droite',
  },
  b21a1: {
    alt: 'Rond bleu, flèche blanche inclinée vers le bas à droite',
  },
  b25: {
    alt: 'Rond bleu avec le nombre 30 en blanc',
  },
  b22a: {
    alt: 'Rond bleu, vélo blanc',
  },
  b22b: {
    alt: 'Rond bleu, adulte et enfant blancs se tenant par la main',
  },
  b26: {
    alt: 'Rond bleu, roue blanche entourée d\'une chaîne',
  },
  b27a: {
    short: 'Voie réservée aux bus',
    alt: 'Rond bleu, silhouette blanche d\'autobus',
  },

  // ===== Indication =====
  c1a: {
    alt: 'Carré bleu avec la lettre P en blanc',
  },
  c12: {
    alt: 'Carré bleu, longue flèche blanche pointée vers le haut',
  },
  c13a: {
    alt: 'Carré bleu, trait blanc vertical terminé par une barre rouge horizontale',
  },
  c4a: {
    alt: 'Carré bleu avec le nombre 90 en blanc',
  },
  c20a: {
    alt: 'Carré bleu, triangle blanc contenant un piéton noir sur des bandes',
  },
  c107: {
    alt: 'Carré bleu, silhouette blanche de voiture vue de face',
  },
  c207: {
    alt: 'Carré bleu, deux chaussées blanches séparées par un pont',
  },
  c111: {
    alt: 'Carré bleu, entrée de tunnel blanche en arche avec une voiture',
  },

  // ===== Danger =====
  a1a: {
    alt: 'Triangle à bord rouge, ligne noire qui tourne vers la droite',
  },
  a2a: {
    alt: 'Triangle à bord rouge, bosse noire arrondie sur une ligne',
  },
  a3: {
    alt: 'Triangle à bord rouge, deux traits noirs qui se rapprochent vers le haut',
  },
  a4: {
    alt: 'Triangle à bord rouge, voiture noire de travers avec des traces sinueuses',
  },
  a7: {
    alt: 'Triangle à bord rouge, barrière noire à dents',
  },
  a8: {
    alt: 'Triangle à bord rouge, locomotive noire vue de côté',
  },
  a15a1: {
    alt: 'Triangle à bord rouge, silhouette noire de vache',
  },
  a15b: {
    alt: 'Triangle à bord rouge, silhouette noire de cerf qui bondit',
  },
  a18: {
    alt: 'Triangle à bord rouge, deux flèches noires verticales en sens opposés',
  },
  a19: {
    alt: 'Triangle à bord rouge, rochers noirs qui dévalent une paroi',
  },
  a21: {
    alt: 'Triangle à bord rouge, vélo noir',
  },
  a24: {
    alt: 'Triangle à bord rouge, manche à air rouge et blanche sur un mât',
  },
  a1c: {
    short: 'Virages, le premier à droite',
    alt: 'Triangle à bord rouge, ligne noire ondulée',
  },
  a13a: {
    alt: 'Triangle à bord rouge, deux enfants noirs qui courent',
  },
  a13b: {
    alt: 'Triangle à bord rouge, piéton noir sur des bandes',
  },
  a14: {
    alt: 'Triangle à bord rouge, point d\'exclamation noir',
  },
  a16: {
    alt: 'Triangle à bord rouge, voiture noire sur une pente avec la mention 10 %',
  },
  a17: {
    alt: 'Triangle à bord rouge, trois ronds rouge, jaune et vert alignés',
  },
  ak5: {
    alt: 'Triangle à bord rouge sur fond jaune, silhouette noire d\'un homme qui pelle',
  },
}
