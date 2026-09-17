// Backend de Quizz, même origine que le site (Cloudflare Worker).
// Les routes /api/* sont gérées ici ; tout le reste sert les assets statiques
// (pages générées, coquille de l'App, page 404).
//
// PRINCIPE DE SÉCURITÉ : on ne fait JAMAIS confiance au client. L'entitlement
// « sans pub » vit en base D1, et n'y est inscrit que par un événement Stripe
// SIGNÉ (webhook) ou une session Stripe vérifiée comme payée ET marquée
// kind=premium. Le jeton renvoyé au navigateur ne fait que PROUVER un email ;
// le statut premium est toujours relu côté serveur depuis D1 (donc révocable :
// abonnement annulé ou impayé, remboursement, litige).
//
// Bindings attendus (voir PREMIUM-SETUP.md) :
//   env.DB                    -> base D1 (tables entitlements, processed_events, events)
//   env.STRIPE_SECRET_KEY     -> secret (wrangler secret put)
//   env.STRIPE_WEBHOOK_SECRET -> secret (wrangler secret put)
//   env.SESSION_SECRET        -> secret aléatoire (wrangler secret put)
//   env.PRICE_MONTHLY, env.PRICE_LIFETIME -> price IDs Stripe (vars)
//   env.ASSETS                -> binding des assets statiques
//
// Les fonctions exportées nommées (decideEntitlementFromSession, verifyStripeSignature,
// validateEventBody, ...) sont PURES ou sans effet de bord et couvertes par worker/index.test.js.

import { isAppRoute, acceptsHtml, SECURITY_HEADERS } from './routes.js'

const enc = new TextEncoder()
const nowSec = () => Math.floor(Date.now() / 1000)
const isoNow = () => new Date(nowSec() * 1000).toISOString()
// Jour UTC 'YYYY-MM-DD' pour les compteurs d'usage.
const todayUtc = () => new Date().toISOString().slice(0, 10)

// Toute réponse d'API est non cachable : statut premium, jetons, sessions Stripe.
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
const noContent = () => new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } })
const methodNotAllowed = (allow) =>
  new Response(JSON.stringify({ error: 'method_not_allowed' }), {
    status: 405,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', allow },
  })

// ---------- base64url / hex ----------
function b64urlEncode(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let bin = ''
  arr.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function b64urlToBytes(str) {
  const pad = str.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(pad)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}
function hexToBytes(h) {
  if (typeof h !== 'string' || h.length === 0 || h.length % 2 !== 0) return new Uint8Array()
  const out = new Uint8Array(h.length / 2)
  for (let i = 0; i < out.length; i++) {
    const byte = parseInt(h.substr(i * 2, 2), 16)
    if (Number.isNaN(byte)) return new Uint8Array()
    out[i] = byte
  }
  return out
}

// ---------- HMAC-SHA256 (Web Crypto) ----------
async function hmacKey(secret, usages) {
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usages,
  )
}
async function hmacSign(secret, data) {
  const key = await hmacKey(secret, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data)))
}
// Vérification à temps constant fournie par Web Crypto (aucune comparaison maison).
async function hmacVerify(secret, data, signature) {
  const key = await hmacKey(secret, ['verify'])
  return crypto.subtle.verify('HMAC', key, signature, enc.encode(data))
}

// ---------- Jeton de session (JWT HS256) : prouve un email, rien de plus ----------
export async function signToken(secret, payload, ttlSec = 60 * 60 * 24 * 90) {
  const header = b64urlEncode(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
  const body = b64urlEncode(enc.encode(JSON.stringify({ ...payload, exp: nowSec() + ttlSec })))
  const sig = b64urlEncode(await hmacSign(secret, `${header}.${body}`))
  return `${header}.${body}.${sig}`
}
export async function verifyToken(secret, token) {
  if (!secret || !token || token.split('.').length !== 3) return null
  // Tout le décodage est dans le try : un jeton mal formé (base64url invalide)
  // doit renvoyer null, pas faire planter la requête.
  try {
    const [h, b, s] = token.split('.')
    if (!(await hmacVerify(secret, `${h}.${b}`, b64urlToBytes(s)))) return null
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(b)))
    if (!payload.exp || payload.exp < nowSec()) return null
    return payload
  } catch {
    return null
  }
}
// Email prouvé par l'en-tête Authorization: Bearer <jeton>, ou null.
async function bearerEmail(req, env) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const payload = await verifyToken(env.SESSION_SECRET, token)
  return payload && typeof payload.email === 'string' ? payload.email : null
}

// ---------- Stripe (API REST, sans SDK) ----------
// Toute réponse non 2xx (ou portant un objet error) LÈVE : un appelant ne peut
// plus prendre un message d'erreur pour un objet valide. Dans un webhook, cela
// remonte en 500 et Stripe réessaie l'événement, qui n'est pas marqué traité.
export class StripeError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'StripeError'
    this.status = status
  }
}
async function stripe(env, path, method = 'GET', form = null) {
  const opts = {
    method,
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
  }
  if (form) opts.body = new URLSearchParams(form).toString()
  const res = await fetch(`https://api.stripe.com/v1${path}`, opts)
  let body
  try {
    body = await res.json()
  } catch {
    body = null
  }
  if (!res.ok || !body || body.error) {
    const message = (body && body.error && body.error.message) || `stripe http ${res.status}`
    throw new StripeError(message, res.status)
  }
  return body
}
// Erreur Stripe « côté client » (id inconnu, requête invalide) : non réessayable.
const isStripeClientError = (e) =>
  e instanceof StripeError && (e.status === 400 || e.status === 404)

async function createCheckoutSession(env, plan, origin) {
  const lifetime = plan === 'lifetime'
  const price = lifetime ? env.PRICE_LIFETIME : env.PRICE_MONTHLY
  if (!price) throw new Error('price not configured')
  const form = {
    mode: lifetime ? 'payment' : 'subscription',
    // Carte uniquement = capture immédiate : évite la fenêtre « complete mais
    // payment_status=unpaid » des moyens asynchrones (SEPA/virement), donc
    // s'appuyer sur payment_status==='paid' reste fiable.
    'payment_method_types[0]': 'card',
    'line_items[0][price]': price,
    'line_items[0][quantity]': '1',
    // Métadonnées SUR LA SESSION : c'est l'objet reçu par checkout.session.completed
    // et relu par /api/confirm. Sans kind=premium, aucun octroi (voir
    // decideEntitlementFromSession) : un don ne peut plus passer pour un achat.
    'metadata[kind]': 'premium',
    'metadata[plan]': plan,
    success_url: `${origin}/?premium=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?premium=cancel`,
  }
  if (lifetime) {
    // Un client Stripe est créé même pour un paiement unique : indispensable pour
    // retrouver l'acheteur (révocation par customer, portail client).
    form.customer_creation = 'always'
    // Recopié sur le PaymentIntent puis sur la charge (lu par remboursement/litige).
    form['payment_intent_data[metadata][kind]'] = 'premium'
  } else {
    form['subscription_data[metadata][kind]'] = 'premium'
  }
  return stripe(env, '/checkout/sessions', 'POST', form)
}

// Session de DON : montant libre (centimes), paiement unique. kind=donation est
// posé sur la SESSION (lue par le webhook checkout.session.completed et par
// /api/confirm : jamais d'octroi) ET sur le PaymentIntent (recopié sur la charge :
// un don remboursé ou contesté ne touche pas au premium d'un acheteur).
async function createDonationSession(env, cents, origin) {
  return stripe(env, '/checkout/sessions', 'POST', {
    mode: 'payment',
    'payment_method_types[0]': 'card',
    submit_type: 'donate',
    'line_items[0][price_data][currency]': 'eur',
    'line_items[0][price_data][product_data][name]': 'Don - Quizz',
    'line_items[0][price_data][unit_amount]': String(cents),
    'line_items[0][quantity]': '1',
    'metadata[kind]': 'donation',
    'payment_intent_data[metadata][kind]': 'donation',
    success_url: `${origin}/?don=merci`,
    cancel_url: `${origin}/?don=cancel`,
  })
}

// Vérifie la signature d'un webhook Stripe (schéma t=...,v1=... ; HMAC hex).
export async function verifyStripeSignature(secret, payload, header) {
  if (!secret || typeof payload !== 'string' || !header) return false
  // Stripe peut envoyer PLUSIEURS signatures v1= (fenêtre de rotation du secret) :
  // on les collecte toutes et on accepte si AU MOINS UNE vérifie, comme le SDK officiel.
  let t = null
  const v1s = []
  for (const part of header.split(',')) {
    const i = part.indexOf('=')
    if (i === -1) continue
    const k = part.slice(0, i).trim()
    const v = part.slice(i + 1).trim()
    if (k === 't') t = v
    else if (k === 'v1') v1s.push(v)
  }
  if (!t || v1s.length === 0) return false
  // Anti-rejeu : t doit être un timestamp valide ET récent (< 5 min). NaN -> rejet.
  const ts = Number(t)
  if (!Number.isFinite(ts) || Math.abs(nowSec() - ts) > 300) return false
  for (const v1 of v1s) {
    const sig = hexToBytes(v1)
    if (sig.length === 0) continue
    if (await hmacVerify(secret, `${t}.${payload}`, sig)) return true
  }
  return false
}

// ---------- Décisions PURES (testées sans réseau ni base) ----------

const PLANS = new Set(['monthly', 'lifetime'])

// Décision d'octroi à partir d'un objet Checkout Session Stripe (webhook ou
// relecture par /api/confirm). Octroi seulement si :
//   1. metadata.kind === 'premium' (un don, ou une session sans marque, ne donne rien),
//   2. paiement réellement encaissé ('complete' seul ne suffit pas ; 'no_payment_required'
//      accepté : montant 0 ou coupon 100 % assumé),
//   3. un email est connu (clé de l'entitlement).
export function decideEntitlementFromSession(session) {
  const s = session && typeof session === 'object' ? session : {}
  const meta = s.metadata && typeof s.metadata === 'object' ? s.metadata : {}
  const rawEmail = (s.customer_details && s.customer_details.email) || s.customer_email || null
  const email =
    typeof rawEmail === 'string' && rawEmail.includes('@') ? rawEmail.trim().toLowerCase() : null
  const customer =
    typeof s.customer === 'string' ? s.customer : (s.customer && s.customer.id) || null
  const plan = PLANS.has(meta.plan) ? meta.plan : s.mode === 'subscription' ? 'monthly' : 'lifetime'
  const paid = s.payment_status === 'paid' || s.payment_status === 'no_payment_required'
  const base = { grant: false, email, customer, plan }
  if (meta.kind !== 'premium') return { ...base, reason: meta.kind === 'donation' ? 'donation' : 'unknown_kind' }
  if (!paid) return { ...base, reason: 'unpaid' }
  if (!email) return { ...base, reason: 'no_email' }
  return { ...base, grant: true, reason: 'ok' }
}

const ACTIVE_SUB = new Set(['active', 'trialing'])

// Décision sur customer.subscription.updated :
//   'revoke'  : statut hors {active, trialing} (past_due, unpaid, canceled, paused, incomplete...)
//   'restore' : retour à active/trialing DEPUIS un statut non actif (previous_attributes.status),
//               par exemple past_due -> active après un nouvel essai de paiement réussi
//   'none'    : toute autre mise à jour (cancel_at_period_end, quantité, métadonnées...) :
//               on ne ré-accorde jamais sur une simple modification, pour ne pas annuler
//               une révocation faite entre-temps (remboursement).
export function decideSubscriptionUpdate(subscription, previousAttributes) {
  const status = subscription && subscription.status
  if (typeof status !== 'string') return 'none'
  if (!ACTIVE_SUB.has(status)) return 'revoke'
  const prev = previousAttributes && previousAttributes.status
  if (typeof prev === 'string' && !ACTIVE_SUB.has(prev)) return 'restore'
  return 'none'
}

// Mesure d'usage : liste blanche des événements (identique à src/lib/analytics.js,
// parité vérifiée par un test). Pas de 'pageview' : ce n'est pas de l'audience.
export const EVENT_NAMES = [
  'solo_start',
  'solo_lot_end',
  'solo_quit',
  'defi_create',
  'defi_open',
  'defi_end',
  'exam_start',
  'exam_end',
  'daily_end',
  'share',
  'errors_replay',
  'flash_session',
  'pwa_install',
  'error_boundary',
]
const EVENT_SET = new Set(EVENT_NAMES)
const CTX_RE = /^[a-z0-9_-]{1,32}$/
export const EV_MAX_BYTES = 200

// Validation du corps brut de POST /api/ev : { e, c? } -> { ok, name, ctx } ou { ok:false, error }.
export function validateEventBody(text) {
  if (typeof text !== 'string') return { ok: false, error: 'bad_body' }
  if (enc.encode(text).length > EV_MAX_BYTES) return { ok: false, error: 'too_large' }
  let body
  try {
    body = JSON.parse(text)
  } catch {
    return { ok: false, error: 'bad_json' }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'bad_body' }
  if (typeof body.e !== 'string' || !EVENT_SET.has(body.e)) return { ok: false, error: 'bad_event' }
  let ctx = ''
  if (body.c !== undefined && body.c !== null) {
    if (typeof body.c !== 'string' || !CTX_RE.test(body.c)) return { ok: false, error: 'bad_ctx' }
    ctx = body.c
  }
  return { ok: true, name: body.e, ctx }
}

// Même origine : l'en-tête Origin (posé par sendBeacon/fetch POST) ou, à défaut,
// Referer, doit correspondre à l'origine de la requête. Sinon 403.
export function isSameOrigin(req, origin) {
  const o = req.headers.get('origin')
  if (o) return o === origin
  const r = req.headers.get('referer')
  if (!r) return false
  try {
    return new URL(r).origin === origin
  } catch {
    return false
  }
}

// ---------- D1 ----------
async function upsertEntitlement(env, email, premium, plan, customer) {
  await env.DB.prepare(
    `INSERT INTO entitlements (email, premium, plan, stripe_customer_id, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5)
     ON CONFLICT(email) DO UPDATE SET
       premium = ?2,
       -- Ne JAMAIS rétrograder un achat « à vie » vers 'monthly' : sinon une
       -- annulation d'abonnement ultérieure couperait un premium payé à vie.
       plan = CASE WHEN entitlements.plan = 'lifetime' THEN 'lifetime' ELSE ?3 END,
       stripe_customer_id = COALESCE(?4, stripe_customer_id),
       updated_at = ?5`,
  )
    .bind(email, premium, plan, customer, isoNow())
    .run()
}
async function isPremium(env, email) {
  const row = await env.DB.prepare('SELECT premium FROM entitlements WHERE email = ?')
    .bind(email)
    .first()
  return !!(row && row.premium)
}
// Bascule premium (0/1) des lignes MENSUELLES d'un client Stripe (jamais un « à vie »).
async function setMonthlyPremiumByCustomer(env, customer, premium) {
  if (!customer) return
  await env.DB.prepare(
    "UPDATE entitlements SET premium = ?1, updated_at = ?2 WHERE stripe_customer_id = ?3 AND plan = 'monthly'",
  )
    .bind(premium, isoNow(), customer)
    .run()
}
// Idempotence : clé = event.id Stripe, ou 'confirm:<session_id>' (octroi d'une
// Checkout Session, partagé par le webhook et /api/confirm).
async function isProcessed(env, key) {
  const seen = await env.DB.prepare('SELECT 1 AS seen FROM processed_events WHERE event_id = ?')
    .bind(key)
    .first()
  return !!seen
}
async function markProcessed(env, key) {
  await env.DB.prepare('INSERT OR IGNORE INTO processed_events (event_id, created_at) VALUES (?, ?)')
    .bind(key, isoNow())
    .run()
}

// Octroi UNIQUE par Checkout Session, quel que soit le chemin qui arrive en
// premier (webhook checkout.session.completed ou /api/confirm) : la clé
// 'confirm:<session_id>' est posée une fois pour toutes. Ainsi un webhook
// rejoué tard (Worker indisponible, réessais Stripe) ou une URL de retour
// rechargée ne ré-accorde jamais un premium révoqué entre-temps (remboursement,
// litige). Renvoie true si l'octroi a eu lieu maintenant.
async function grantSessionOnce(env, sessionId, decision) {
  const key = typeof sessionId === 'string' && sessionId ? `confirm:${sessionId}` : null
  if (key && (await isProcessed(env, key))) return false
  await upsertEntitlement(env, decision.email, 1, decision.plan, decision.customer)
  if (key) await markProcessed(env, key)
  return true
}

// Table des compteurs d'usage, créée paresseusement au premier /api/ev de
// l'isolat (même DDL que db/migrations/0002-events.sql) : le déploiement ne
// dépend pas d'une migration manuelle.
const EVENTS_DDL = `CREATE TABLE IF NOT EXISTS events (
  day  TEXT NOT NULL,
  name TEXT NOT NULL,
  ctx  TEXT NOT NULL DEFAULT '',
  n    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, name, ctx)
)`
let eventsTableReady = null
function ensureEventsTable(env) {
  if (!eventsTableReady) {
    eventsTableReady = env.DB.prepare(EVENTS_DDL)
      .run()
      .catch((e) => {
        eventsTableReady = null
        throw e
      })
  }
  return eventsTableReady
}

// ---------- Routes /api ----------
async function handleCheckout(req, env, origin) {
  const body = await req.json().catch(() => ({}))
  const plan = body && body.plan === 'lifetime' ? 'lifetime' : 'monthly'
  let session
  try {
    session = await createCheckoutSession(env, plan, origin)
  } catch (e) {
    console.error('checkout error', e)
    return json({ error: 'stripe_error' }, 502)
  }
  if (!session.url) return json({ error: 'stripe_error' }, 502)
  return json({ url: session.url })
}

// Don : montant en euros dans le corps, borné 1-500 €, converti en centimes.
async function handleDonate(req, env, origin) {
  const body = await req.json().catch(() => ({}))
  const euros = Number(body && body.amount)
  if (!Number.isFinite(euros)) return json({ error: 'bad_amount' }, 400)
  const cents = Math.round(euros * 100)
  if (cents < 100 || cents > 50000) return json({ error: 'bad_amount' }, 400)
  let session
  try {
    session = await createDonationSession(env, cents, origin)
  } catch (e) {
    console.error('donate error', e)
    return json({ error: 'stripe_error' }, 502)
  }
  if (!session.url) return json({ error: 'stripe_error' }, 502)
  return json({ url: session.url })
}

// Charge Stripe concernée par un événement charge.* ou charge.dispute.* (l'objet
// d'un litige n'a ni email ni métadonnées : on récupère la charge).
async function chargeFromEvent(env, event) {
  const obj = event.data && event.data.object
  if (!obj || typeof obj !== 'object') return null
  if (event.type.startsWith('charge.dispute.')) {
    const id = typeof obj.charge === 'string' ? obj.charge : obj.charge && obj.charge.id
    return id ? stripe(env, `/charges/${encodeURIComponent(id)}`) : null
  }
  return obj
}
const chargeEmail = (charge) => {
  const e = (charge.billing_details && charge.billing_details.email) || charge.receipt_email
  return typeof e === 'string' && e.includes('@') ? e.trim().toLowerCase() : null
}
const isDonationCharge = (charge) => !!(charge && charge.metadata && charge.metadata.kind === 'donation')

async function hasActiveSubscription(env, customer) {
  const list = await stripe(
    env,
    `/subscriptions?customer=${encodeURIComponent(customer)}&status=all&limit=20`,
  )
  return (list.data || []).some((s) => ACTIVE_SUB.has(s.status))
}

// Applique un événement Stripe (déjà vérifié et non encore traité). Toute
// exception remonte : 500, Stripe réessaie, l'événement n'est pas marqué traité.
async function applyStripeEvent(env, event) {
  const obj = (event.data && event.data.object) || {}
  switch (event.type) {
    case 'checkout.session.completed': {
      const d = decideEntitlementFromSession(obj)
      if (!d.grant) return { granted: false, reason: d.reason }
      // Déjà accordée par /api/confirm (ou par une livraison précédente) : on
      // ne touche pas à l'état courant de D1.
      const granted = await grantSessionOnce(env, obj.id, d)
      return { granted, reason: granted ? 'ok' : 'already_granted' }
    }
    case 'customer.subscription.deleted':
      // Abonnement annulé/expiré -> on coupe UNIQUEMENT le premium MENSUEL de ce
      // client (ne touche pas un éventuel achat « à vie » sur le même customer).
      await setMonthlyPremiumByCustomer(env, obj.customer, 0)
      return { action: 'revoke' }
    case 'customer.subscription.updated': {
      // Impayé (past_due/unpaid), pause, annulation -> premium mensuel coupé ;
      // retour à active depuis un statut non actif -> rétabli.
      const action = decideSubscriptionUpdate(obj, event.data && event.data.previous_attributes)
      if (action === 'revoke') await setMonthlyPremiumByCustomer(env, obj.customer, 0)
      else if (action === 'restore') await setMonthlyPremiumByCustomer(env, obj.customer, 1)
      return { action }
    }
    case 'invoice.payment_failed':
      // Journal seulement (visible dans l'observabilité Workers) : la coupure
      // effective passe par customer.subscription.updated (past_due/unpaid).
      // Aucune donnée personnelle dans le log : identifiants Stripe uniquement.
      console.warn('invoice.payment_failed', obj.id || '?', 'customer', obj.customer || '?')
      return { action: 'logged' }
    case 'charge.refunded':
    case 'charge.dispute.created': {
      // Remboursement TOTAL ou litige (chargeback) -> révoquer le premium de
      // l'acheteur, y compris un achat « à vie ».
      const charge = await chargeFromEvent(env, event)
      if (!charge) return { action: 'ignored' }
      if (isDonationCharge(charge)) return { action: 'donation' }
      // charge.refunded n'est vrai que pour un remboursement INTÉGRAL ; un litige révoque toujours.
      const full = event.type === 'charge.dispute.created' || charge.refunded === true
      const email = chargeEmail(charge)
      const customer = typeof charge.customer === 'string' ? charge.customer : null
      if (!full || (!email && !customer)) return { action: 'ignored' }
      await env.DB.prepare(
        'UPDATE entitlements SET premium = 0, updated_at = ?1 WHERE email = ?2 OR (stripe_customer_id IS NOT NULL AND stripe_customer_id = ?3)',
      )
        .bind(isoNow(), email, customer)
        .run()
      return { action: 'revoke' }
    }
    case 'charge.dispute.closed': {
      // Litige GAGNÉ par le marchand -> le paiement est acquis, on rétablit.
      if (obj.status !== 'won') return { action: 'ignored' }
      const charge = await chargeFromEvent(env, event)
      if (!charge || isDonationCharge(charge)) return { action: 'ignored' }
      const email = chargeEmail(charge)
      const customer = typeof charge.customer === 'string' ? charge.customer : null
      if (!email && !customer) return { action: 'ignored' }
      // « À vie » : rétabli sans condition.
      await env.DB.prepare(
        "UPDATE entitlements SET premium = 1, updated_at = ?1 WHERE plan = 'lifetime' AND (email = ?2 OR (stripe_customer_id IS NOT NULL AND stripe_customer_id = ?3))",
      )
        .bind(isoNow(), email, customer)
        .run()
      // Mensuel : seulement si l'abonnement est encore actif chez Stripe, sinon
      // on annulerait une annulation survenue pendant le litige.
      if (customer && (await hasActiveSubscription(env, customer))) {
        await setMonthlyPremiumByCustomer(env, customer, 1)
      }
      return { action: 'restore' }
    }
    default:
      return { action: 'ignored' }
  }
}

async function handleWebhook(req, env) {
  const payload = await req.text()
  const ok = await verifyStripeSignature(
    env.STRIPE_WEBHOOK_SECRET,
    payload,
    req.headers.get('stripe-signature'),
  )
  if (!ok) return json({ error: 'invalid_signature' }, 400)

  let event
  try {
    event = JSON.parse(payload)
  } catch {
    return json({ error: 'bad_json' }, 400)
  }
  if (!event || typeof event !== 'object' || typeof event.type !== 'string') {
    return json({ error: 'bad_event' }, 400)
  }

  // Idempotence : Stripe rejoue les webhooks -> on ignore un événement déjà traité.
  if (event.id && (await isProcessed(env, event.id))) return json({ received: true, duplicate: true })

  const result = await applyStripeEvent(env, event)
  // Marqué traité SEULEMENT après succès complet : une exception plus haut
  // laisse l'événement rejouable.
  if (event.id) await markProcessed(env, event.id)
  return json({ received: true, ...result })
}

// Après le retour de Checkout : on relit la session auprès de Stripe (donc payée
// pour de vrai, et marquée kind=premium) et on délivre un jeton lié à l'email.
// Robuste même si le webhook n'a pas encore tourné. L'OCTROI EST UNIQUE par
// session (grantSessionOnce) : un rejeu de l'URL ne ré-accorde jamais un
// premium révoqué entre-temps, il relit seulement l'état courant en D1.
const SESSION_ID_RE = /^cs_[A-Za-z0-9_]{8,250}$/
async function handleConfirm(url, env) {
  const sid = url.searchParams.get('session_id')
  if (!sid || !SESSION_ID_RE.test(sid)) return json({ premium: false })
  let s
  try {
    s = await stripe(env, `/checkout/sessions/${encodeURIComponent(sid)}`)
  } catch (e) {
    if (isStripeClientError(e)) return json({ premium: false })
    throw e // 500 : le client garde session_id dans l'URL et réessaie au rechargement
  }
  const d = decideEntitlementFromSession(s)
  if (!d.grant) return json({ premium: false })
  await grantSessionOnce(env, sid, d)
  const token = await signToken(env.SESSION_SECRET, { email: d.email })
  return json({ premium: await isPremium(env, d.email), token })
}

// Statut courant : le jeton prouve l'email, mais le premium est RELU en base.
async function handleEntitlement(req, env) {
  const email = await bearerEmail(req, env)
  if (!email) return json({ premium: false })
  return json({ premium: await isPremium(env, email), email })
}

// Portail client Stripe (gérer/annuler l'abonnement, factures) : jeton -> email
// -> client Stripe connu en D1 -> session de portail. 404 si aucun client.
async function handlePortal(req, env, origin) {
  const email = await bearerEmail(req, env)
  if (!email) return json({ error: 'unauthorized' }, 401)
  const row = await env.DB.prepare('SELECT stripe_customer_id FROM entitlements WHERE email = ?')
    .bind(email)
    .first()
  const customer = row && row.stripe_customer_id
  if (!customer) return json({ error: 'no_customer' }, 404)
  let session
  try {
    session = await stripe(env, '/billing_portal/sessions', 'POST', {
      customer,
      return_url: `${origin}/?portail=retour`,
    })
  } catch (e) {
    console.error('portal error', e)
    return json({ error: 'stripe_error' }, 502)
  }
  if (!session.url) return json({ error: 'stripe_error' }, 502)
  return json({ url: session.url })
}

// Lecture bornée du corps : null si plus de `max` octets (sans tout charger).
async function readBounded(req, max) {
  if (!req.body) return ''
  const reader = req.body.getReader()
  const chunks = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > max) {
      await reader.cancel().catch(() => {})
      return null
    }
    chunks.push(value)
  }
  const buf = new Uint8Array(total)
  let off = 0
  for (const c of chunks) {
    buf.set(c, off)
    off += c.byteLength
  }
  return new TextDecoder().decode(buf)
}

// Mesure d'usage sans cookie : POST { e, c? } -> compteur (jour UTC, nom, contexte)
// incrémenté. Aucune IP, aucun user-agent, aucun identifiant stocké ni journalisé.
async function handleEvent(req, env, origin) {
  if (!isSameOrigin(req, origin)) return json({ error: 'forbidden' }, 403)
  const declared = Number(req.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > EV_MAX_BYTES) return json({ error: 'too_large' }, 413)
  const text = await readBounded(req, EV_MAX_BYTES)
  if (text === null) return json({ error: 'too_large' }, 413)
  const v = validateEventBody(text)
  if (!v.ok) return json({ error: v.error }, v.error === 'too_large' ? 413 : 400)
  await ensureEventsTable(env)
  await env.DB.prepare(
    `INSERT INTO events (day, name, ctx, n) VALUES (?1, ?2, ?3, 1)
     ON CONFLICT(day, name, ctx) DO UPDATE SET n = n + 1`,
  )
    .bind(todayUtc(), v.name, v.ctx)
    .run()
  return noContent()
}

async function handleApi(req, env, url) {
  const p = url.pathname
  const m = req.method
  const origin = url.origin
  if (p === '/api/checkout') return m === 'POST' ? handleCheckout(req, env, origin) : methodNotAllowed('POST')
  if (p === '/api/donate') return m === 'POST' ? handleDonate(req, env, origin) : methodNotAllowed('POST')
  if (p === '/api/webhook') return m === 'POST' ? handleWebhook(req, env) : methodNotAllowed('POST')
  if (p === '/api/confirm') return m === 'GET' ? handleConfirm(url, env) : methodNotAllowed('GET')
  if (p === '/api/entitlement') return m === 'GET' ? handleEntitlement(req, env) : methodNotAllowed('GET')
  if (p === '/api/portal') return m === 'POST' ? handlePortal(req, env, origin) : methodNotAllowed('POST')
  if (p === '/api/ev') return m === 'POST' ? handleEvent(req, env, origin) : methodNotAllowed('POST')
  return json({ error: 'not_found' }, 404)
}

// ---------- Assets + routes de l'App ----------
// Les assets répondent 404 (page dist/404.html, cf. not_found_handling "404-page")
// pour toute adresse sans fichier. Pour une route de l'App (contrat d'URL)
// demandée par un navigateur, on sert à la place la coquille index.html en 200.
async function serveAsset(req, env, url) {
  const res = await env.ASSETS.fetch(req)
  if (res.status !== 404) return res
  if (req.method !== 'GET' && req.method !== 'HEAD') return res
  if (!isAppRoute(url.pathname) || !acceptsHtml(req)) return res
  // On demande « / » (index.html) : avec le html_handling par défaut, une requête
  // directe de /index.html répond par une redirection 308 vers /.
  const shell = await env.ASSETS.fetch(
    new Request(`${url.origin}/`, { headers: { accept: 'text/html' } }),
  )
  if (!shell.ok) return res
  const headers = new Headers(shell.headers)
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) headers.set(k, v)
  return new Response(req.method === 'HEAD' ? null : shell.body, { status: 200, headers })
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url)
    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(req, env, url)
      } catch (e) {
        // Visible dans l'observabilité Workers / `wrangler tail` : sans log, le
        // diagnostic prod est aveugle. 500 = Stripe réessaie ses webhooks.
        console.error('worker error', url.pathname, e)
        return json({ error: 'server_error' }, 500)
      }
    }
    try {
      return await serveAsset(req, env, url)
    } catch (e) {
      console.error('asset error', url.pathname, e)
      return new Response('Service indisponible', {
        status: 500,
        headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
      })
    }
  },
}
