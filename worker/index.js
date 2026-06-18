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
const hex = (bytes) =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

// ---------- HMAC-SHA256 (Web Crypto) ----------
async function hmac(secret, data) {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data)))
}
// Comparaison à temps constant (anti timing-attack).
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// ---------- Jeton de session (JWT HS256) : prouve un email, rien de plus ----------
async function signToken(secret, payload, ttlSec = 60 * 60 * 24 * 180) {
  const header = b64urlEncode(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
  const body = b64urlEncode(enc.encode(JSON.stringify({ ...payload, exp: nowSec() + ttlSec })))
  const sig = b64urlEncode(await hmac(secret, `${header}.${body}`))
  return `${header}.${body}.${sig}`
}
async function verifyToken(secret, token) {
  if (!token || token.split('.').length !== 3) return null
  const [h, b, s] = token.split('.')
  const expected = b64urlEncode(await hmac(secret, `${h}.${b}`))
  if (!timingSafeEqual(expected, s)) return null
  try {
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
    'line_items[0][price]': price,
    'line_items[0][quantity]': '1',
    success_url: `${origin}/?premium=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?premium=cancel`,
  })
}

// Vérifie la signature d'un webhook Stripe (schéma t=...,v1=... ; HMAC hex).
async function verifyStripeSignature(env, payload, header) {
  if (!header) return false
  const parts = Object.fromEntries(
    header.split(',').map((p) => {
      const i = p.indexOf('=')
      return [p.slice(0, i), p.slice(i + 1)]
    }),
  )
  const t = parts.t
  const v1 = parts.v1
  if (!t || !v1) return false
  // Anti-rejeu : on rejette les événements de plus de 5 minutes.
  if (Math.abs(nowSec() - Number(t)) > 300) return false
  const expected = hex(await hmac(env.STRIPE_WEBHOOK_SECRET, `${t}.${payload}`))
  return timingSafeEqual(expected, v1)
}

// ---------- D1 ----------
async function upsertEntitlement(env, email, premium, plan, customer) {
  await env.DB.prepare(
    `INSERT INTO entitlements (email, premium, plan, stripe_customer_id, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5)
     ON CONFLICT(email) DO UPDATE SET
       premium = ?2, plan = ?3,
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
  if (!session || session.error) return json({ error: 'stripe_error' }, 502)
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

  if (event.type === 'checkout.session.completed') {
    const s = event.data.object
    const email = (s.customer_details && s.customer_details.email) || s.customer_email
    if (email && (s.payment_status === 'paid' || s.status === 'complete')) {
      const plan = s.mode === 'subscription' ? 'monthly' : 'lifetime'
      await upsertEntitlement(env, email.toLowerCase(), 1, plan, s.customer || null)
    }
  } else if (event.type === 'customer.subscription.deleted') {
    // Abonnement annulé/expiré -> on coupe le premium pour ce client.
    await env.DB.prepare(
      'UPDATE entitlements SET premium = 0, updated_at = ? WHERE stripe_customer_id = ?',
    )
      .bind(new Date(nowSec() * 1000).toISOString(), event.data.object.customer)
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
  const paid = s.payment_status === 'paid' || s.status === 'complete'
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
      return json({ error: 'server_error' }, 500)
    }
    // Tout le reste -> assets statiques (la SPA et son fallback index.html).
    return env.ASSETS.fetch(req)
  },
}
