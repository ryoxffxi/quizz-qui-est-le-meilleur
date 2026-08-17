// Backend Premium « sans pub » — même origine que le site (Cloudflare Worker).
// Les routes /api/* sont gérées ici ; tout le reste sert les assets statiques (SPA).
//
// PRINCIPE DE SÉCURITÉ : on ne fait JAMAIS confiance au client. L'entitlement
// « sans pub » vit en base D1, et n'y est inscrit que par un événement Stripe
// SIGNÉ (webhook) ou une session Stripe vérifiée comme payée. Le jeton renvoyé
// au navigateur ne fait que PROUVER un email ; le statut premium est toujours
// relu côté serveur depuis D1 (donc révocable, ex. abonnement annulé).
//
// Bindings attendus (voir PREMIUM-SETUP.md) :
//   env.DB                  -> base D1
//   env.STRIPE_SECRET_KEY   -> secret (wrangler secret put)
//   env.STRIPE_WEBHOOK_SECRET -> secret (wrangler secret put)
//   env.SESSION_SECRET      -> secret aléatoire (wrangler secret put)
//   env.PRICE_MONTHLY, env.PRICE_LIFETIME -> price IDs Stripe (vars)
//   env.ASSETS              -> binding des assets statiques (SPA)

const enc = new TextEncoder()
const nowSec = () => Math.floor(Date.now() / 1000)
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
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
async function signToken(secret, payload, ttlSec = 60 * 60 * 24 * 90) {
  const header = b64urlEncode(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
  const body = b64urlEncode(enc.encode(JSON.stringify({ ...payload, exp: nowSec() + ttlSec })))
  const sig = b64urlEncode(await hmacSign(secret, `${header}.${body}`))
  return `${header}.${body}.${sig}`
}
async function verifyToken(secret, token) {
  if (!token || token.split('.').length !== 3) return null
  // Tout le décodage est dans le try : un jeton mal formé (base64url invalide)
  // doit renvoyer null, pas faire planter la requête (sec-6).
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

// ---------- Stripe (API REST, sans SDK) ----------
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
  return res.json()
}

async function createCheckoutSession(env, plan, origin) {
  const lifetime = plan === 'lifetime'
  const price = lifetime ? env.PRICE_LIFETIME : env.PRICE_MONTHLY
  if (!price) return { error: { message: 'price not configured' } }
  return stripe(env, '/checkout/sessions', 'POST', {
    mode: lifetime ? 'payment' : 'subscription',
    // Carte uniquement = capture immédiate : évite la fenêtre « complete mais
    // payment_status=unpaid » des moyens asynchrones (SEPA/virement), donc
    // s'appuyer sur payment_status==='paid' reste fiable (sec-1).
    'payment_method_types[0]': 'card',
    'line_items[0][price]': price,
    'line_items[0][quantity]': '1',
    success_url: `${origin}/?premium=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?premium=cancel`,
  })
}

// Vérifie la signature d'un webhook Stripe (schéma t=...,v1=... ; HMAC hex).
async function verifyStripeSignature(env, payload, header) {
  if (!header) return false
  // Stripe peut envoyer PLUSIEURS signatures v1= (fenêtre de rotation du secret) :
  // on les collecte toutes et on accepte si AU MOINS UNE vérifie, comme le SDK
  // officiel (sec-7). Object.fromEntries n'en gardait qu'une seule.
  let t = null
  const v1s = []
  for (const part of header.split(',')) {
    const i = part.indexOf('=')
    if (i === -1) continue
    const k = part.slice(0, i)
    const v = part.slice(i + 1)
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
    if (await hmacVerify(env.STRIPE_WEBHOOK_SECRET, `${t}.${payload}`, sig)) return true
  }
  return false
}

// ---------- D1 ----------
async function upsertEntitlement(env, email, premium, plan, customer) {
  await env.DB.prepare(
    `INSERT INTO entitlements (email, premium, plan, stripe_customer_id, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5)
     ON CONFLICT(email) DO UPDATE SET
       premium = ?2,
       -- Ne JAMAIS rétrograder un achat « à vie » vers 'monthly' : sinon une
       -- annulation d'abonnement ultérieure couperait un premium payé à vie (corr-1).
       plan = CASE WHEN entitlements.plan = 'lifetime' THEN 'lifetime' ELSE ?3 END,
       stripe_customer_id = COALESCE(?4, stripe_customer_id),
       updated_at = ?5`,
  )
    .bind(email, premium, plan, customer, new Date(nowSec() * 1000).toISOString())
    .run()
}
async function isPremium(env, email) {
  const row = await env.DB.prepare('SELECT premium FROM entitlements WHERE email = ?')
    .bind(email)
    .first()
  return !!(row && row.premium)
}

// ---------- Routes ----------
async function handleCheckout(req, env, origin) {
  const body = await req.json().catch(() => ({}))
  const plan = body.plan === 'lifetime' ? 'lifetime' : 'monthly'
  const session = await createCheckoutSession(env, plan, origin)
  if (!session || session.error || !session.url) return json({ error: 'stripe_error' }, 502)
  return json({ url: session.url })
}

async function handleWebhook(req, env) {
  const payload = await req.text()
  const ok = await verifyStripeSignature(env, payload, req.headers.get('stripe-signature'))
  if (!ok) return json({ error: 'invalid_signature' }, 400)

  let event
  try {
    event = JSON.parse(payload)
  } catch {
    return json({ error: 'bad_json' }, 400)
  }

  // Idempotence : Stripe rejoue les webhooks -> on ignore un événement déjà traité.
  if (event.id) {
    const seen = await env.DB.prepare('SELECT 1 FROM processed_events WHERE event_id = ?')
      .bind(event.id)
      .first()
    if (seen) return json({ received: true, duplicate: true })
  }

  if (event.type === 'checkout.session.completed') {
    const s = event.data.object
    const email = (s.customer_details && s.customer_details.email) || s.customer_email
    // Exiger un paiement réellement encaissé : 'complete' seul ne suffit PAS
    // (toujours vrai sur cet event, et vrai pour les paiements asynchrones non
    // prélevés). On accepte 'no_payment_required' (montant 0 / coupon 100% assumé) (sec-1/corr-2).
    if (email && (s.payment_status === 'paid' || s.payment_status === 'no_payment_required')) {
      const plan = s.mode === 'subscription' ? 'monthly' : 'lifetime'
      await upsertEntitlement(env, email.toLowerCase(), 1, plan, s.customer || null)
    }
  } else if (event.type === 'customer.subscription.deleted') {
    // Abonnement annulé/expiré -> on coupe UNIQUEMENT le premium MENSUEL de ce
    // client (ne touche pas un éventuel achat « à vie » sur le même customer).
    await env.DB.prepare(
      "UPDATE entitlements SET premium = 0, updated_at = ? WHERE stripe_customer_id = ? AND plan = 'monthly'",
    )
      .bind(new Date(nowSec() * 1000).toISOString(), event.data.object.customer)
      .run()
  } else if (event.type === 'charge.refunded' || event.type === 'charge.dispute.created') {
    // Remboursement TOTAL ou litige (chargeback) -> révoquer le premium de
    // l'acheteur, y compris un achat « à vie » (sec-2). L'objet d'un dispute n'a
    // pas l'email : on récupère alors la charge pour retrouver email/customer.
    let charge = event.data.object
    if (event.type === 'charge.dispute.created' && charge && charge.charge) {
      charge = await stripe(env, `/charges/${encodeURIComponent(charge.charge)}`)
    }
    // charge.refunded n'est vrai que pour un remboursement INTÉGRAL ; un litige révoque toujours.
    const full = event.type === 'charge.dispute.created' || (charge && charge.refunded === true)
    const email =
      charge && ((charge.billing_details && charge.billing_details.email) || charge.receipt_email)
    const customer = charge && charge.customer
    if (full && (email || customer)) {
      await env.DB.prepare(
        'UPDATE entitlements SET premium = 0, updated_at = ?1 WHERE email = ?2 OR (stripe_customer_id IS NOT NULL AND stripe_customer_id = ?3)',
      )
        .bind(new Date(nowSec() * 1000).toISOString(), email ? email.toLowerCase() : null, customer || null)
        .run()
    }
  }

  if (event.id) {
    await env.DB.prepare(
      'INSERT OR IGNORE INTO processed_events (event_id, created_at) VALUES (?, ?)',
    )
      .bind(event.id, new Date(nowSec() * 1000).toISOString())
      .run()
  }
  return json({ received: true })
}

// Après le retour de Checkout : on vérifie la session auprès de Stripe (donc
// payée pour de vrai) et on délivre un jeton lié à l'email. Robuste même si le
// webhook n'a pas encore tourné.
async function handleConfirm(url, env) {
  const sid = url.searchParams.get('session_id')
  if (!sid) return json({ premium: false })
  const s = await stripe(env, `/checkout/sessions/${encodeURIComponent(sid)}`)
  if (!s || s.error) return json({ premium: false })
  const email = (s.customer_details && s.customer_details.email) || s.customer_email
  const paid = s.payment_status === 'paid' || s.payment_status === 'no_payment_required'
  if (!paid || !email) return json({ premium: false })
  const plan = s.mode === 'subscription' ? 'monthly' : 'lifetime'
  await upsertEntitlement(env, email.toLowerCase(), 1, plan, s.customer || null)
  const token = await signToken(env.SESSION_SECRET, { email: email.toLowerCase() })
  return json({ premium: true, token })
}

// Statut courant : le jeton prouve l'email, mais le premium est RELU en base.
async function handleEntitlement(req, env) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const payload = await verifyToken(env.SESSION_SECRET, token)
  if (!payload || !payload.email) return json({ premium: false })
  return json({ premium: await isPremium(env, payload.email), email: payload.email })
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url)
    const p = url.pathname
    try {
      if (p === '/api/checkout' && req.method === 'POST') return await handleCheckout(req, env, url.origin)
      if (p === '/api/webhook' && req.method === 'POST') return await handleWebhook(req, env)
      if (p === '/api/confirm' && req.method === 'GET') return await handleConfirm(url, env)
      if (p === '/api/entitlement' && req.method === 'GET') return await handleEntitlement(req, env)
      if (p.startsWith('/api/')) return json({ error: 'not_found' }, 404)
    } catch (e) {
      // Visible via `wrangler tail` : sans log, le diagnostic prod est aveugle (corr-9).
      console.error('worker error', e)
      return json({ error: 'server_error' }, 500)
    }
    // Tout le reste -> assets statiques (la SPA et son fallback index.html).
    return env.ASSETS.fetch(req)
  },
}
