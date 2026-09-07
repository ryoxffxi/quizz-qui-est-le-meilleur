# Dictionnaires par fonctionnalité

Chaque fichier de ce dossier exporte par défaut `{ fr: {...}, en: {...}, es: {...}, pt: {...} }`.
Les clés sont fusionnées dans les dictionnaires principaux (`src/i18n/fr.js`, etc.) au chargement.
Règle : une fonctionnalité = un fichier (ex. `exam.js`, `daily.js`), les 4 langues à parité.
Une clé définie ici NE DOIT PAS exister dans les dictionnaires principaux.
