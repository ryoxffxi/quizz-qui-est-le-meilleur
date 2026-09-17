// Textes légaux : source UNIQUE, partagée par la modale de l'app (LegalModal,
// 4 langues) et par les pages statiques /confidentialite et /conditions
// (scripts/build-pages.mjs, français). Structure par document et par langue :
//   { title, updated: 'AAAA-MM-JJ', sections: [[titre, paragraphe], ...] }
// Le paragraphe est du texte brut (une chaîne par section) : les pages
// statiques l'échappent et transforment les URL nues en liens, la modale
// l'affiche tel quel. Pas de HTML, pas de tiret long. Le FR tutoie le joueur.
// Faits vérifiés dans le code : jeton de session 90 jours (worker/index.js
// signToken), table D1 entitlements = email + premium + plan + identifiant
// client Stripe (db/schema.sql), mesure d'audience chargée après accord
// (src/lib/analytics.js), consentement publicitaire par le CMP Google (ads.js).
// Ceci n'est pas un conseil juridique : à relire par l'éditeur.

export const LEGAL_UPDATED = '2026-09-07'

const SITE = 'https://ryo-offc.com'
const INSTAGRAM = 'https://www.instagram.com/ryo.offc/'
const HOST = 'Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, États-Unis, +1 650 319 8930'
const HOST_EN = 'Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, United States, +1 650 319 8930'
const HOST_ES = 'Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, Estados Unidos, +1 650 319 8930'
const HOST_PT = 'Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, Estados Unidos, +1 650 319 8930'
const ADS_OPTOUT = 'https://www.google.com/settings/ads'
const ADS_POLICY = 'https://policies.google.com/technologies/ads'
const ODR = 'https://ec.europa.eu/consumers/odr'
const CNIL = 'https://www.cnil.fr'

export const LEGAL = {
  privacy: {
    fr: {
      title: 'Confidentialité et cookies',
      updated: LEGAL_UPDATED,
      sections: [
        [
          'Éditeur',
          `Ce site (${SITE}) est édité par ryo.offc, créateur indépendant. Contact : Instagram @ryo.offc (${INSTAGRAM}).`,
        ],
        [
          'Hébergement',
          `Le site est hébergé par ${HOST}. Pour servir et protéger le site, Cloudflare traite des données techniques (adresse IP, journaux de sécurité) pendant une courte durée.`,
        ],
        [
          'Données stockées sur ton appareil',
          'Quizz fonctionne sans compte. Ton navigateur conserve seulement, pour toi : la langue, l’ambiance (thème), le réglage du son, tes statistiques de jeu, les questions déjà vues, tes erreurs à retravailler, ton choix de consentement et, si tu es Premium, une copie locale de ce statut. Rien de tout cela ne nous est envoyé. Tu effaces tout en supprimant les données du site dans ton navigateur.',
        ],
        [
          'Mesure d’audience',
          'Avec ton accord uniquement (bandeau à la première visite), le site charge Cloudflare Web Analytics : une mesure sans cookie et sans identifiant, qui ne suit pas d’une visite à l’autre. Tu changes d’avis à tout moment via le lien « Cookies » en bas de page.',
        ],
        [
          'Publicité',
          `Le site affiche des annonces Google AdSense. Google et ses partenaires peuvent déposer des cookies (notamment DoubleClick) pour diffuser, limiter et mesurer les annonces, et pour les personnaliser si tu l’acceptes. Ce choix est recueilli par le message de consentement Google (CMP certifiée), pas par notre bandeau. Le lien « Cookies » en bas de page permet de rouvrir ce message. Tu peux aussi désactiver la personnalisation chez Google : ${ADS_OPTOUT}. Détails sur les technologies publicitaires de Google : ${ADS_POLICY}. Le Premium supprime toute publicité.`,
        ],
        [
          'Premium et paiement',
          'Le paiement est confié à Stripe Payments Europe, Ltd., notre sous-traitant : nous ne voyons jamais ton numéro de carte. Pour retrouver ton achat, nous conservons dans une base Cloudflare D1 : ton adresse e-mail, ton statut Premium, la formule (mensuelle ou à vie) et ton identifiant client Stripe. Ces données servent uniquement à activer le sans-pub, gérer les résiliations, impayés et remboursements. Elles sont gardées tant que ton Premium est actif, puis 12 mois, puis supprimées ; tu peux demander leur suppression plus tôt via le contact. Ton navigateur garde un jeton valable 90 jours qui prouve ton e-mail (aucune donnée bancaire). Le portail client Stripe, accessible depuis l’écran Premium, permet de résilier et de télécharger tes factures.',
        ],
        [
          'Tes droits (RGPD)',
          `Tu disposes d’un droit d’accès, de rectification, d’effacement, d’opposition et de portabilité sur les données qui te concernent. Écris-nous via le contact ci-dessus : réponse sous un mois. Tu peux aussi saisir la CNIL : ${CNIL}.`,
        ],
        [
          'Modifications',
          'Cette page peut évoluer avec le site (nouvelle fonctionnalité, nouveau prestataire). La date en tête indique la dernière version ; un changement important est signalé sur le site.',
        ],
      ],
    },
    en: {
      title: 'Privacy and cookies',
      updated: LEGAL_UPDATED,
      sections: [
        [
          'Publisher',
          `This site (${SITE}) is published by ryo.offc, an independent creator. Contact: Instagram @ryo.offc (${INSTAGRAM}).`,
        ],
        [
          'Hosting',
          `The site is hosted by ${HOST_EN}. To serve and protect the site, Cloudflare processes technical data (IP address, security logs) for a short time.`,
        ],
        [
          'Data stored on your device',
          'Quizz works without an account. Your browser keeps, for you only: the language, the theme, the sound setting, your game statistics, the questions already seen, the mistakes to review, your consent choice and, if you are Premium, a local copy of that status. None of this is sent to us. You erase everything by deleting the site data in your browser.',
        ],
        [
          'Audience measurement',
          'Only with your consent (banner on the first visit), the site loads Cloudflare Web Analytics: a cookie-free measurement without identifiers, which does not track you from one visit to the next. You can change your mind anytime via the “Cookies” link at the bottom of the page.',
        ],
        [
          'Advertising',
          `The site shows Google AdSense ads. Google and its partners may set cookies (notably DoubleClick) to serve, cap and measure ads, and to personalize them if you agree. That choice is collected by Google’s consent message (certified CMP), not by our banner. The “Cookies” link at the bottom of the page reopens that message. You can also turn off personalization at Google: ${ADS_OPTOUT}. Details on Google’s advertising technologies: ${ADS_POLICY}. Premium removes all ads.`,
        ],
        [
          'Premium and payment',
          'Payment is handled by Stripe Payments Europe, Ltd., our processor: we never see your card number. To find your purchase again, we keep in a Cloudflare D1 database: your email address, your Premium status, the plan (monthly or lifetime) and your Stripe customer ID. This data is used only to enable the ad-free experience and to handle cancellations, failed payments and refunds. It is kept while your Premium is active, then for 12 months, then deleted; you can request earlier deletion via the contact. Your browser keeps a 90-day token that proves your email (no banking data). The Stripe customer portal, reachable from the Premium screen, lets you cancel and download your invoices.',
        ],
        [
          'Your rights (GDPR)',
          `You have the right to access, rectify, erase, object to and port the data about you. Write to us via the contact above: reply within one month. You may also lodge a complaint with your data protection authority (in France, the CNIL: ${CNIL}).`,
        ],
        [
          'Changes',
          'This page may evolve with the site (new feature, new provider). The date at the top shows the latest version; a significant change is announced on the site.',
        ],
      ],
    },
    es: {
      title: 'Privacidad y cookies',
      updated: LEGAL_UPDATED,
      sections: [
        [
          'Editor',
          `Este sitio (${SITE}) está editado por ryo.offc, creador independiente. Contacto: Instagram @ryo.offc (${INSTAGRAM}).`,
        ],
        [
          'Alojamiento',
          `El sitio está alojado por ${HOST_ES}. Para servir y proteger el sitio, Cloudflare trata datos técnicos (dirección IP, registros de seguridad) durante un breve periodo.`,
        ],
        [
          'Datos guardados en tu dispositivo',
          'Quizz funciona sin cuenta. Tu navegador guarda, solo para ti: el idioma, el ambiente (tema), el ajuste de sonido, tus estadísticas de juego, las preguntas ya vistas, tus errores por repasar, tu elección de consentimiento y, si eres Premium, una copia local de ese estado. Nada de esto se nos envía. Lo borras todo eliminando los datos del sitio en tu navegador.',
        ],
        [
          'Medición de audiencia',
          'Solo con tu consentimiento (banner en la primera visita), el sitio carga Cloudflare Web Analytics: una medición sin cookies ni identificadores, que no te sigue de una visita a otra. Puedes cambiar de opinión cuando quieras en el enlace «Cookies» al pie de la página.',
        ],
        [
          'Publicidad',
          `El sitio muestra anuncios de Google AdSense. Google y sus socios pueden instalar cookies (en particular DoubleClick) para mostrar, limitar y medir los anuncios, y para personalizarlos si lo aceptas. Esa elección la recoge el mensaje de consentimiento de Google (CMP certificada), no nuestro banner. El enlace «Cookies» al pie de la página vuelve a abrir ese mensaje. También puedes desactivar la personalización en Google: ${ADS_OPTOUT}. Detalles sobre las tecnologías publicitarias de Google: ${ADS_POLICY}. Premium elimina toda la publicidad.`,
        ],
        [
          'Premium y pago',
          'El pago lo gestiona Stripe Payments Europe, Ltd., nuestro encargado del tratamiento: nunca vemos tu número de tarjeta. Para reconocer tu compra, guardamos en una base de datos Cloudflare D1: tu dirección de correo, tu estado Premium, la modalidad (mensual o de por vida) y tu identificador de cliente Stripe. Estos datos sirven únicamente para activar la experiencia sin anuncios y gestionar cancelaciones, impagos y reembolsos. Se conservan mientras tu Premium está activo, después 12 meses, y luego se eliminan; puedes pedir su eliminación antes a través del contacto. Tu navegador guarda un token válido 90 días que acredita tu correo (ningún dato bancario). El portal de cliente de Stripe, accesible desde la pantalla Premium, permite cancelar y descargar tus facturas.',
        ],
        [
          'Tus derechos (RGPD)',
          `Tienes derecho de acceso, rectificación, supresión, oposición y portabilidad sobre tus datos. Escríbenos a través del contacto indicado: respuesta en el plazo de un mes. También puedes reclamar ante tu autoridad de protección de datos (en Francia, la CNIL: ${CNIL}).`,
        ],
        [
          'Modificaciones',
          'Esta página puede evolucionar con el sitio (nueva función, nuevo proveedor). La fecha del encabezado indica la última versión; un cambio importante se anuncia en el sitio.',
        ],
      ],
    },
    pt: {
      title: 'Privacidade e cookies',
      updated: LEGAL_UPDATED,
      sections: [
        [
          'Editor',
          `Este site (${SITE}) é editado por ryo.offc, criador independente. Contato: Instagram @ryo.offc (${INSTAGRAM}).`,
        ],
        [
          'Hospedagem',
          `O site é hospedado pela ${HOST_PT}. Para servir e proteger o site, a Cloudflare trata dados técnicos (endereço IP, registros de segurança) por um curto período.`,
        ],
        [
          'Dados guardados no seu aparelho',
          'O Quizz funciona sem conta. Seu navegador guarda, só para você: o idioma, o tema, o ajuste de som, suas estatísticas de jogo, as perguntas já vistas, seus erros para revisar, sua escolha de consentimento e, se você for Premium, uma cópia local desse status. Nada disso é enviado para nós. Você apaga tudo excluindo os dados do site no navegador.',
        ],
        [
          'Medição de audiência',
          'Somente com o seu consentimento (banner na primeira visita), o site carrega o Cloudflare Web Analytics: uma medição sem cookies e sem identificadores, que não acompanha você de uma visita para outra. Você pode mudar de ideia a qualquer momento no link « Cookies », no rodapé.',
        ],
        [
          'Publicidade',
          `O site exibe anúncios do Google AdSense. O Google e seus parceiros podem instalar cookies (em especial o DoubleClick) para exibir, limitar e medir os anúncios, e para personalizá-los se você aceitar. Essa escolha é coletada pela mensagem de consentimento do Google (CMP certificada), não pelo nosso banner. O link « Cookies » no rodapé reabre essa mensagem. Você também pode desativar a personalização no Google: ${ADS_OPTOUT}. Detalhes sobre as tecnologias de publicidade do Google: ${ADS_POLICY}. O Premium remove toda a publicidade.`,
        ],
        [
          'Premium e pagamento',
          'O pagamento é processado pela Stripe Payments Europe, Ltd., nossa operadora: nunca vemos o número do seu cartão. Para reconhecer sua compra, guardamos em um banco de dados Cloudflare D1: seu endereço de e-mail, seu status Premium, o plano (mensal ou vitalício) e seu identificador de cliente Stripe. Esses dados servem apenas para ativar a experiência sem anúncios e tratar cancelamentos, pagamentos recusados e reembolsos. Eles ficam guardados enquanto seu Premium estiver ativo, depois por 12 meses, e então são excluídos; você pode pedir a exclusão antes pelo contato. Seu navegador guarda um token válido por 90 dias que comprova seu e-mail (nenhum dado bancário). O portal do cliente Stripe, acessível na tela Premium, permite cancelar e baixar suas faturas.',
        ],
        [
          'Seus direitos (RGPD e LGPD)',
          `Você tem direito de acesso, correção, exclusão, oposição e portabilidade dos seus dados. Escreva para nós pelo contato acima: resposta em até um mês. Você também pode recorrer à autoridade de proteção de dados (na França, a CNIL: ${CNIL}).`,
        ],
        [
          'Alterações',
          'Esta página pode evoluir com o site (nova função, novo fornecedor). A data no topo indica a versão mais recente; uma mudança importante é anunciada no site.',
        ],
      ],
    },
  },

  terms: {
    fr: {
      title: 'Conditions d’utilisation',
      updated: LEGAL_UPDATED,
      sections: [
        [
          'Objet',
          'Quizz est un jeu de quiz gratuit, accessible sans compte, édité par ryo.offc. En utilisant le site, tu acceptes ces conditions. Contact : Instagram @ryo.offc.',
        ],
        [
          'Gratuité',
          'Toutes les questions, tous les modes (solo, défi entre potes, examen blanc, défi du jour, mes erreurs, panneaux et flashcards) sont gratuits, sans inscription ni limite de temps.',
        ],
        [
          'Premium : sans publicité',
          'Le Premium a un seul avantage : retirer la publicité, partout, y compris sur l’examen blanc et le défi du jour. Deux formules, au prix affiché au moment de l’achat : un abonnement mensuel à renouvellement tacite, résiliable à tout moment depuis le portail client Stripe (le sans-pub reste actif jusqu’à la fin de la période payée), et une formule à vie réglée en un paiement unique. Le paiement passe par Stripe ; ton statut est lié à l’adresse e-mail saisie au paiement et se retrouve sur un autre appareil avec cette adresse.',
        ],
        [
          'Droit de rétractation',
          'Le sans-pub est un contenu numérique fourni immédiatement après le paiement. Conformément à l’article L221-28 du Code de la consommation, tu acceptes son exécution immédiate et renonces expressément à ton droit de rétractation de 14 jours au moment de payer. Cette renonciation t’est rappelée sur la page de paiement.',
        ],
        [
          'Remboursement',
          'Si un paiement est remboursé, contesté ou annulé (y compris par ta banque), le sans-pub est révoqué. Pour un problème d’activation, écris-nous d’abord : la plupart des cas se règlent en un message.',
        ],
        [
          'Dons',
          'Le bouton « Soutenir » permet un don libre, sans contrepartie : il ne donne pas accès au Premium et n’est pas remboursable, sauf erreur manifeste signalée rapidement.',
        ],
        [
          'Exactitude des questions et responsabilité',
          'Quizz est un outil de révision et de jeu. Les questions, notamment celles du code de la route, sont rédigées avec soin mais peuvent contenir des erreurs ou être dépassées par une évolution de la réglementation. Elles ne remplacent ni la formation en auto-école, ni les textes officiels, ni l’examen lui-même. Signale-nous toute erreur via le contact. Le site est fourni « tel quel », sans garantie de disponibilité ; l’éditeur ne saurait être tenu responsable d’un dommage indirect lié à son utilisation.',
        ],
        [
          'Propriété intellectuelle',
          'Les textes des questions, le code, le design et la marque Quizz appartiennent à ryo.offc. Les visuels de panneaux reproduisent la signalisation routière officielle. Les noms d’œuvres, de marques et de personnages cités dans les questions restent la propriété de leurs ayants droit et ne sont utilisés qu’à des fins de quiz. Usage personnel uniquement : toute réutilisation commerciale des questions demande notre accord écrit.',
        ],
        [
          'Droit applicable',
          `Ces conditions sont soumises au droit français. En cas de litige, contacte-nous d’abord pour trouver une solution amiable. Tu peux aussi utiliser la plateforme européenne de règlement en ligne des litiges : ${ODR}. À défaut d’accord, les tribunaux français sont compétents.`,
        ],
        [
          'Modifications',
          'Ces conditions peuvent évoluer avec le site. La date en tête indique la version en vigueur ; un changement important est signalé sur le site. Continuer à jouer après une mise à jour vaut acceptation.',
        ],
      ],
    },
    en: {
      title: 'Terms of use',
      updated: LEGAL_UPDATED,
      sections: [
        [
          'Purpose',
          'Quizz is a free quiz game, accessible without an account, published by ryo.offc. By using the site, you accept these terms. Contact: Instagram @ryo.offc.',
        ],
        [
          'Free of charge',
          'All questions and all modes (solo, friend challenge, mock exam, daily challenge, my mistakes, road signs and flashcards) are free, with no sign-up and no time limit.',
        ],
        [
          'Premium: ad-free',
          'Premium has a single benefit: removing ads everywhere, including on the mock exam and the daily challenge. Two plans, at the price shown at the time of purchase: a monthly subscription that renews automatically and can be cancelled anytime from the Stripe customer portal (ad-free stays active until the end of the paid period), and a lifetime plan paid once. Payment goes through Stripe; your status is tied to the email address entered at checkout and can be recovered on another device with that address.',
        ],
        [
          'Right of withdrawal',
          'Ad-free is digital content delivered immediately after payment. In accordance with article L221-28 of the French Consumer Code, you agree to its immediate delivery and expressly waive your 14-day right of withdrawal when paying. This waiver is recalled on the payment page.',
        ],
        [
          'Refunds',
          'If a payment is refunded, disputed or cancelled (including by your bank), ad-free is revoked. For an activation problem, write to us first: most cases are solved in one message.',
        ],
        [
          'Donations',
          'The “Support” button allows a free donation with no consideration: it does not grant Premium and is not refundable, except for an obvious error reported promptly.',
        ],
        [
          'Accuracy of questions and liability',
          'Quizz is a study and game tool. The questions, especially those about the French driving code, are written with care but may contain errors or be outdated by a change in regulations. They replace neither driving-school training, nor official texts, nor the exam itself. Report any error via the contact. The site is provided “as is”, without warranty of availability; the publisher cannot be held liable for indirect damage arising from its use.',
        ],
        [
          'Intellectual property',
          'The question texts, code, design and the Quizz name belong to ryo.offc. Road-sign visuals reproduce official road signage. Names of works, brands and characters quoted in questions remain the property of their rights holders and are used for quiz purposes only. Personal use only: any commercial reuse of the questions requires our written consent.',
        ],
        [
          'Governing law',
          `These terms are governed by French law. In case of a dispute, contact us first to find an amicable solution. You may also use the European online dispute resolution platform: ${ODR}. Failing agreement, French courts have jurisdiction.`,
        ],
        [
          'Changes',
          'These terms may evolve with the site. The date at the top shows the version in force; a significant change is announced on the site. Continuing to play after an update means you accept it.',
        ],
      ],
    },
    es: {
      title: 'Condiciones de uso',
      updated: LEGAL_UPDATED,
      sections: [
        [
          'Objeto',
          'Quizz es un juego de preguntas gratuito, accesible sin cuenta, editado por ryo.offc. Al usar el sitio, aceptas estas condiciones. Contacto: Instagram @ryo.offc.',
        ],
        [
          'Gratuidad',
          'Todas las preguntas y todos los modos (solitario, desafío entre amigos, examen de prueba, reto del día, mis errores, señales y flashcards) son gratuitos, sin registro ni límite de tiempo.',
        ],
        [
          'Premium: sin anuncios',
          'Premium tiene una sola ventaja: quitar la publicidad en todas partes, incluidos el examen de prueba y el reto del día. Dos modalidades, al precio mostrado en el momento de la compra: una suscripción mensual de renovación automática, cancelable en cualquier momento desde el portal de cliente de Stripe (el modo sin anuncios sigue activo hasta el final del periodo pagado), y una modalidad de por vida con un pago único. El pago se realiza a través de Stripe; tu estado queda vinculado al correo introducido al pagar y se recupera en otro dispositivo con ese correo.',
        ],
        [
          'Derecho de desistimiento',
          'El modo sin anuncios es un contenido digital entregado inmediatamente tras el pago. Conforme al artículo L221-28 del Código del consumo francés, aceptas su ejecución inmediata y renuncias expresamente a tu derecho de desistimiento de 14 días en el momento de pagar. Esta renuncia se recuerda en la página de pago.',
        ],
        [
          'Reembolsos',
          'Si un pago se reembolsa, se disputa o se anula (incluso por tu banco), el modo sin anuncios se revoca. Ante un problema de activación, escríbenos primero: la mayoría de los casos se resuelven con un mensaje.',
        ],
        [
          'Donaciones',
          'El botón «Apoyar» permite una donación libre, sin contrapartida: no da acceso a Premium y no es reembolsable, salvo error manifiesto comunicado con rapidez.',
        ],
        [
          'Exactitud de las preguntas y responsabilidad',
          'Quizz es una herramienta de repaso y de juego. Las preguntas, en particular las del código de circulación francés, se redactan con cuidado pero pueden contener errores o quedar desactualizadas por un cambio normativo. No sustituyen la formación en autoescuela, ni los textos oficiales, ni el propio examen. Comunícanos cualquier error a través del contacto. El sitio se ofrece «tal cual», sin garantía de disponibilidad; el editor no responde de los daños indirectos derivados de su uso.',
        ],
        [
          'Propiedad intelectual',
          'Los textos de las preguntas, el código, el diseño y el nombre Quizz pertenecen a ryo.offc. Las imágenes de señales reproducen la señalización vial oficial. Los nombres de obras, marcas y personajes citados en las preguntas siguen siendo propiedad de sus titulares y se usan solo con fines de quiz. Uso personal únicamente: cualquier reutilización comercial de las preguntas requiere nuestro acuerdo por escrito.',
        ],
        [
          'Ley aplicable',
          `Estas condiciones se rigen por el derecho francés. En caso de litigio, contáctanos primero para buscar una solución amistosa. También puedes usar la plataforma europea de resolución de litigios en línea: ${ODR}. A falta de acuerdo, son competentes los tribunales franceses.`,
        ],
        [
          'Modificaciones',
          'Estas condiciones pueden evolucionar con el sitio. La fecha del encabezado indica la versión vigente; un cambio importante se anuncia en el sitio. Seguir jugando tras una actualización implica aceptarla.',
        ],
      ],
    },
    pt: {
      title: 'Termos de uso',
      updated: LEGAL_UPDATED,
      sections: [
        [
          'Objeto',
          'O Quizz é um jogo de perguntas gratuito, acessível sem conta, editado por ryo.offc. Ao usar o site, você aceita estes termos. Contato: Instagram @ryo.offc.',
        ],
        [
          'Gratuidade',
          'Todas as perguntas e todos os modos (solo, desafio entre amigos, simulado, desafio do dia, meus erros, placas e flashcards) são gratuitos, sem cadastro nem limite de tempo.',
        ],
        [
          'Premium: sem anúncios',
          'O Premium tem uma única vantagem: remover a publicidade em todo lugar, inclusive no simulado e no desafio do dia. Dois planos, pelo preço exibido no momento da compra: uma assinatura mensal com renovação automática, cancelável a qualquer momento no portal do cliente Stripe (o modo sem anúncios continua ativo até o fim do período pago), e um plano vitalício pago uma única vez. O pagamento passa pela Stripe; seu status fica vinculado ao e-mail informado no pagamento e pode ser recuperado em outro aparelho com esse e-mail.',
        ],
        [
          'Direito de arrependimento',
          'O modo sem anúncios é um conteúdo digital entregue imediatamente após o pagamento. Conforme o artigo L221-28 do Código do Consumidor francês, você aceita a execução imediata e renuncia expressamente ao seu direito de arrependimento de 14 dias no momento de pagar. Essa renúncia é lembrada na página de pagamento.',
        ],
        [
          'Reembolsos',
          'Se um pagamento for reembolsado, contestado ou cancelado (inclusive pelo seu banco), o modo sem anúncios é revogado. Em caso de problema de ativação, escreva para nós primeiro: a maioria dos casos se resolve com uma mensagem.',
        ],
        [
          'Doações',
          'O botão « Apoiar » permite uma doação livre, sem contrapartida: não dá acesso ao Premium e não é reembolsável, salvo erro evidente comunicado rapidamente.',
        ],
        [
          'Exatidão das perguntas e responsabilidade',
          'O Quizz é uma ferramenta de revisão e de jogo. As perguntas, em especial as do código de trânsito francês, são escritas com cuidado, mas podem conter erros ou ficar desatualizadas por uma mudança na regulamentação. Elas não substituem a formação em autoescola, os textos oficiais nem o próprio exame. Informe qualquer erro pelo contato. O site é fornecido « como está », sem garantia de disponibilidade; o editor não se responsabiliza por danos indiretos decorrentes do uso.',
        ],
        [
          'Propriedade intelectual',
          'Os textos das perguntas, o código, o design e o nome Quizz pertencem a ryo.offc. As imagens de placas reproduzem a sinalização oficial. Os nomes de obras, marcas e personagens citados nas perguntas continuam sendo propriedade dos seus titulares e são usados apenas para fins de quiz. Uso pessoal somente: qualquer reutilização comercial das perguntas exige nossa autorização por escrito.',
        ],
        [
          'Lei aplicável',
          `Estes termos são regidos pelo direito francês. Em caso de litígio, fale conosco primeiro para buscar uma solução amigável. Você também pode usar a plataforma europeia de resolução de litígios online: ${ODR}. Sem acordo, os tribunais franceses são competentes.`,
        ],
        [
          'Alterações',
          'Estes termos podem evoluir com o site. A data no topo indica a versão em vigor; uma mudança importante é anunciada no site. Continuar jogando após uma atualização significa aceitá-la.',
        ],
      ],
    },
  },
}
