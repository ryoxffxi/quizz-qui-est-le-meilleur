import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import worker, {
  verifyStripeSignature,
  decideEntitlementFromSession,
  decideSubscriptionUpdate,
  validateEventBody,
  isSameOrigin,
  signToken,
  verifyToken,
  EVENT_NAMES,
  EV_MAX_BYTES,
} from './index.js'
import { EVENT_NAMES as CLIENT_EVENT_NAMES } from '../src/lib/analytics.js'

const ORIGIN = 'https://ryo-offc.com'
const WH_SECRET = 'whsec_test_secret'
const nowSec = () => Math.floor(Date.now() / 1000)

// Signature Stripe (t=...,v1=hex) calculée avec Web Crypto, comme le SDK officiel.
async function stripeSig(secret, payload, t = nowSec()) {
  const te = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    te.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, te.encode(`${t}.${payload}`)))
  const hex = [...sig].map((b) => b.toString(16).padStart(2, '0')).join('')
  return { header: `t=${t},v1=${hex}`, hex, t }
}

// Faux D1 en mémoire : interprète les seules requêtes émises par le Worker.
function fakeD1() {
  const state = { entitlements: new Map(), processed: new Set(), events: new Map(), created: 0, log: [] }
  const rows = () => [...state.entitlements.values()]
  function exec(sql, args) {
    const s = sql.replace(/\s+/g, ' ').trim()
    state.log.push({ sql: s, args })
    if (s.startsWith('SELECT 1 AS seen FROM processed_events')) {
      return state.processed.has(args[0]) ? { seen: 1 } : null
    }
    if (s.startsWith('INSERT OR IGNORE INTO processed_events')) {
      state.processed.add(args[0])
      return null
    }
    if (s.startsWith('INSERT INTO entitlements')) {
      const [email, premium, plan, customer] = args
      const cur = state.entitlements.get(email)
      state.entitlements.set(email, {
        email,
        premium,
        plan: cur && cur.plan === 'lifetime' ? 'lifetime' : plan,
        stripe_customer_id: customer ?? (cur ? cur.stripe_customer_id : null),
      })
      return null
    }
    if (s.startsWith('SELECT premium FROM entitlements')) {
      const r = state.entitlements.get(args[0])
      return r ? { premium: r.premium } : null
    }
    if (s.startsWith('SELECT stripe_customer_id FROM entitlements')) {
      const r = state.entitlements.get(args[0])
      return r ? { stripe_customer_id: r.stripe_customer_id } : null
    }
    if (s.startsWith("UPDATE entitlements SET premium = ?1, updated_at = ?2 WHERE stripe_customer_id = ?3 AND plan = 'monthly'")) {
      for (const r of rows()) if (r.stripe_customer_id === args[2] && r.plan === 'monthly') r.premium = args[0]
      return null
    }
    if (s.startsWith('UPDATE entitlements SET premium = 0, updated_at = ?1 WHERE email = ?2 OR')) {
      for (const r of rows()) {
        if (r.email === args[1] || (r.stripe_customer_id && r.stripe_customer_id === args[2])) r.premium = 0
      }
      return null
    }
    if (s.startsWith("UPDATE entitlements SET premium = 1, updated_at = ?1 WHERE plan = 'lifetime'")) {
      for (const r of rows()) {
        if (r.plan !== 'lifetime') continue
        if (r.email === args[1] || (r.stripe_customer_id && r.stripe_customer_id === args[2])) r.premium = 1
      }
      return null
    }
    if (s.startsWith('CREATE TABLE IF NOT EXISTS events')) {
      state.created += 1
      return null
    }
    if (s.startsWith('INSERT INTO events')) {
      const k = args.join('|')
      state.events.set(k, (state.events.get(k) || 0) + 1)
      return null
    }
    throw new Error(`SQL inattendu dans le faux D1 : ${s}`)
  }
  const run = (sql, args) => async () => {
    exec(sql, args)
    return { success: true }
  }
  const db = {
    prepare(sql) {
      return {
        bind: (...args) => ({ first: async () => exec(sql, args), run: run(sql, args) }),
        first: async () => exec(sql, []),
        run: run(sql, []),
      }
    },
  }
  return { db, state }
}

const html = (body, status, extra = {}) =>
  new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8', ...extra } })
const fakeAssets = {
  fetch: async (req) => {
    const u = new URL(req.url)
    if (u.pathname === '/') return html('<html>shell</html>', 200, { etag: '"shell"' })
    if (u.pathname === '/a-propos') return html('<html>about</html>', 200)
    return html('<html>404</html>', 404)
  },
}

function makeEnv(d1) {
  return {
    DB: d1.db,
    ASSETS: fakeAssets,
    STRIPE_SECRET_KEY: 'sk_test_fake',
    STRIPE_WEBHOOK_SECRET: WH_SECRET,
    SESSION_SECRET: 'session-secret-de-test',
    PRICE_MONTHLY: 'price_month',
    PRICE_LIFETIME: 'price_life',
  }
}

// Faux Stripe : routeur par chemin ; chaque handler renvoie [status, body].
function stubStripe(routes) {
  const calls = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, opts = {}) => {
      const u = new URL(url)
      const params = opts.body ? Object.fromEntries(new URLSearchParams(opts.body)) : {}
      calls.push({ path: u.pathname + u.search, method: opts.method || 'GET', params })
      for (const [pattern, handler] of routes) {
        if (u.pathname.startsWith(pattern)) {
          const [status, body] = await handler({ url: u, params, opts })
          return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
        }
      }
      return new Response(JSON.stringify({ error: { message: 'no route' } }), { status: 404 })
    }),
  )
  return calls
}

const req = (path, init = {}) => new Request(ORIGIN + path, init)
const evReq = (body, init = {}) => {
  const { headers: extra, ...rest } = init
  return req('/api/ev', {
    method: 'POST',
    headers: { origin: ORIGIN, 'content-type': 'text/plain', ...(extra || {}) },
    body: typeof body === 'string' ? body : JSON.stringify(body),
    ...rest,
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
describe('verifyStripeSignature', () => {
  const payload = '{"id":"evt_1","type":"ping"}'

  it('accepte une signature valide et récente', async () => {
    const { header } = await stripeSig(WH_SECRET, payload)
    expect(await verifyStripeSignature(WH_SECRET, payload, header)).toBe(true)
  })

  it('accepte si AU MOINS une des signatures v1 vérifie (rotation de secret)', async () => {
    const { hex, t } = await stripeSig(WH_SECRET, payload)
    const header = `t=${t},v1=${'00'.repeat(32)},v1=${hex}`
    expect(await verifyStripeSignature(WH_SECRET, payload, header)).toBe(true)
  })

  it('refuse un mauvais secret, un payload modifié, un horodatage périmé ou absurde', async () => {
    const { header } = await stripeSig(WH_SECRET, payload)
    expect(await verifyStripeSignature('autre', payload, header)).toBe(false)
    expect(await verifyStripeSignature(WH_SECRET, payload + ' ', header)).toBe(false)
    const old = await stripeSig(WH_SECRET, payload, nowSec() - 600)
    expect(await verifyStripeSignature(WH_SECRET, payload, old.header)).toBe(false)
    const { hex } = await stripeSig(WH_SECRET, payload)
    expect(await verifyStripeSignature(WH_SECRET, payload, `t=abc,v1=${hex}`)).toBe(false)
  })

  it('refuse un en-tête absent, sans v1, en hex invalide, ou un secret vide', async () => {
    expect(await verifyStripeSignature(WH_SECRET, payload, null)).toBe(false)
    expect(await verifyStripeSignature(WH_SECRET, payload, `t=${nowSec()}`)).toBe(false)
    expect(await verifyStripeSignature(WH_SECRET, payload, `t=${nowSec()},v1=zz`)).toBe(false)
    expect(await verifyStripeSignature(WH_SECRET, payload, `t=${nowSec()},v1=abc`)).toBe(false)
    const { header } = await stripeSig(WH_SECRET, payload)
    expect(await verifyStripeSignature('', payload, header)).toBe(false)
    expect(await verifyStripeSignature(undefined, payload, header)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
describe('decideEntitlementFromSession', () => {
  const premiumSession = (over = {}) => ({
    id: 'cs_test_1',
    mode: 'payment',
    payment_status: 'paid',
    customer: 'cus_1',
    customer_details: { email: 'Ryo@Example.com ' },
    metadata: { kind: 'premium', plan: 'lifetime' },
    ...over,
  })

  it('accorde un achat premium payé (email normalisé, plan et client relevés)', () => {
    expect(decideEntitlementFromSession(premiumSession())).toEqual({
      grant: true,
      reason: 'ok',
      email: 'ryo@example.com',
      customer: 'cus_1',
      plan: 'lifetime',
    })
  })

  it('n’accorde JAMAIS un don, même payé en mode payment', () => {
    const d = decideEntitlementFromSession(
      premiumSession({ metadata: { kind: 'donation' } }),
    )
    expect(d.grant).toBe(false)
    expect(d.reason).toBe('donation')
  })

  it('n’accorde pas une session sans marque kind=premium (ancienne ou étrangère)', () => {
    expect(decideEntitlementFromSession(premiumSession({ metadata: {} })).reason).toBe('unknown_kind')
    expect(decideEntitlementFromSession(premiumSession({ metadata: undefined })).reason).toBe('unknown_kind')
    expect(decideEntitlementFromSession(premiumSession({ metadata: { kind: 'autre' } })).grant).toBe(false)
  })

  it('exige un paiement encaissé ou no_payment_required', () => {
    expect(decideEntitlementFromSession(premiumSession({ payment_status: 'unpaid' })).reason).toBe('unpaid')
    expect(decideEntitlementFromSession(premiumSession({ payment_status: undefined })).grant).toBe(false)
    expect(decideEntitlementFromSession(premiumSession({ payment_status: 'no_payment_required' })).grant).toBe(true)
  })

  it('exige un email (customer_details puis customer_email)', () => {
    expect(decideEntitlementFromSession(premiumSession({ customer_details: null })).reason).toBe('no_email')
    const d = decideEntitlementFromSession(
      premiumSession({ customer_details: null, customer_email: 'a@b.fr' }),
    )
    expect(d).toMatchObject({ grant: true, email: 'a@b.fr' })
    expect(decideEntitlementFromSession(premiumSession({ customer_details: { email: 'pas-un-email' } })).grant).toBe(false)
  })

  it('déduit le plan du mode quand metadata.plan manque ou est inconnu', () => {
    expect(decideEntitlementFromSession(premiumSession({ mode: 'subscription', metadata: { kind: 'premium' } })).plan).toBe('monthly')
    expect(decideEntitlementFromSession(premiumSession({ mode: 'payment', metadata: { kind: 'premium', plan: 'x' } })).plan).toBe('lifetime')
    expect(decideEntitlementFromSession(premiumSession({ mode: 'payment', metadata: { kind: 'premium', plan: 'monthly' } })).plan).toBe('monthly')
  })

  it('accepte un client développé en objet et résiste à une entrée vide', () => {
    expect(decideEntitlementFromSession(premiumSession({ customer: { id: 'cus_obj' } })).customer).toBe('cus_obj')
    expect(decideEntitlementFromSession(premiumSession({ customer: null })).customer).toBe(null)
    expect(decideEntitlementFromSession(null)).toMatchObject({ grant: false, email: null, customer: null })
    expect(decideEntitlementFromSession('x')).toMatchObject({ grant: false })
  })
})

// ---------------------------------------------------------------------------
describe('decideSubscriptionUpdate', () => {
  it('révoque tout statut hors active/trialing', () => {
    for (const status of ['past_due', 'unpaid', 'canceled', 'paused', 'incomplete', 'incomplete_expired']) {
      expect(decideSubscriptionUpdate({ status }, {}), status).toBe('revoke')
    }
  })

  it('rétablit seulement sur un retour à active depuis un statut non actif', () => {
    expect(decideSubscriptionUpdate({ status: 'active' }, { status: 'past_due' })).toBe('restore')
    expect(decideSubscriptionUpdate({ status: 'trialing' }, { status: 'incomplete' })).toBe('restore')
    expect(decideSubscriptionUpdate({ status: 'active' }, { status: 'trialing' })).toBe('none')
    expect(decideSubscriptionUpdate({ status: 'active' }, { cancel_at_period_end: false })).toBe('none')
    expect(decideSubscriptionUpdate({ status: 'active' }, undefined)).toBe('none')
    expect(decideSubscriptionUpdate({}, {})).toBe('none')
    expect(decideSubscriptionUpdate(null, null)).toBe('none')
  })
})

// ---------------------------------------------------------------------------
describe('validateEventBody', () => {
  it('accepte un événement de la liste blanche, avec ou sans contexte', () => {
    expect(validateEventBody('{"e":"solo_start","c":"code-route"}')).toEqual({ ok: true, name: 'solo_start', ctx: 'code-route' })
    expect(validateEventBody('{"e":"share"}')).toEqual({ ok: true, name: 'share', ctx: '' })
    expect(validateEventBody('{"e":"defi_end","c":null}')).toEqual({ ok: true, name: 'defi_end', ctx: '' })
    expect(validateEventBody(`{"e":"exam_end","c":"${'a'.repeat(32)}"}`).ok).toBe(true)
  })

  it('refuse un nom hors liste (dont pageview) et les formes non conformes', () => {
    expect(validateEventBody('{"e":"pageview"}')).toEqual({ ok: false, error: 'bad_event' })
    expect(validateEventBody('{"e":"solo_start ","c":"x"}').error).toBe('bad_event')
    expect(validateEventBody('{"c":"x"}').error).toBe('bad_event')
    expect(validateEventBody('{"e":42}').error).toBe('bad_event')
    expect(validateEventBody('[]').error).toBe('bad_body')
    expect(validateEventBody('null').error).toBe('bad_body')
    expect(validateEventBody('"solo_start"').error).toBe('bad_body')
    expect(validateEventBody('{pas du json').error).toBe('bad_json')
    expect(validateEventBody(undefined).error).toBe('bad_body')
  })

  it('refuse un contexte hors [a-z0-9_-]{1,32}', () => {
    expect(validateEventBody('{"e":"share","c":"Code-Route"}').error).toBe('bad_ctx')
    expect(validateEventBody('{"e":"share","c":""}').error).toBe('bad_ctx')
    expect(validateEventBody('{"e":"share","c":"a b"}').error).toBe('bad_ctx')
    expect(validateEventBody('{"e":"share","c":"é"}').error).toBe('bad_ctx')
    expect(validateEventBody(`{"e":"share","c":"${'a'.repeat(33)}"}`).error).toBe('bad_ctx')
    expect(validateEventBody('{"e":"share","c":12}').error).toBe('bad_ctx')
  })

  it('refuse un corps de plus de 200 octets (mesuré en octets UTF-8)', () => {
    const big = `{"e":"share","c":"ok","pad":"${'x'.repeat(200)}"}`
    expect(validateEventBody(big)).toEqual({ ok: false, error: 'too_large' })
    const accents = `{"e":"share","pad":"${'é'.repeat(95)}"}`
    expect(accents.length).toBeLessThanOrEqual(EV_MAX_BYTES)
    expect(validateEventBody(accents).error).toBe('too_large')
  })

  it('a la même liste blanche que le client (src/lib/analytics.js)', () => {
    expect(EVENT_NAMES).toEqual(CLIENT_EVENT_NAMES)
    expect(new Set(EVENT_NAMES).size).toBe(EVENT_NAMES.length)
    expect(EVENT_NAMES).not.toContain('pageview')
  })
})

describe('isSameOrigin', () => {
  it('compare Origin puis Referer à l’origine de la requête', () => {
    expect(isSameOrigin(req('/api/ev', { headers: { origin: ORIGIN } }), ORIGIN)).toBe(true)
    expect(isSameOrigin(req('/api/ev', { headers: { origin: 'https://evil.example' } }), ORIGIN)).toBe(false)
    expect(isSameOrigin(req('/api/ev', { headers: { referer: ORIGIN + '/examen' } }), ORIGIN)).toBe(true)
    expect(isSameOrigin(req('/api/ev', { headers: { referer: 'https://evil.example/' } }), ORIGIN)).toBe(false)
    expect(isSameOrigin(req('/api/ev', { headers: { referer: 'pas une url' } }), ORIGIN)).toBe(false)
    expect(isSameOrigin(req('/api/ev'), ORIGIN)).toBe(false)
    // Origin prime sur Referer.
    expect(isSameOrigin(req('/api/ev', { headers: { origin: 'https://evil.example', referer: ORIGIN + '/' } }), ORIGIN)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
describe('jeton de session', () => {
  it('signe puis vérifie, et refuse falsification, expiration et mauvais secret', async () => {
    const token = await signToken('s1', { email: 'a@b.fr' })
    expect(await verifyToken('s1', token)).toMatchObject({ email: 'a@b.fr' })
    expect(await verifyToken('s2', token)).toBe(null)
    const [h, b, s] = token.split('.')
    expect(await verifyToken('s1', `${h}.${b}x.${s}`)).toBe(null)
    expect(await verifyToken('s1', 'n.importe')).toBe(null)
    expect(await verifyToken('s1', '')).toBe(null)
    expect(await verifyToken('', token)).toBe(null)
    const expired = await signToken('s1', { email: 'a@b.fr' }, -10)
    expect(await verifyToken('s1', expired)).toBe(null)
  })
})

// ---------------------------------------------------------------------------
describe('POST /api/ev', () => {
  let d1, env
  beforeEach(() => {
    d1 = fakeD1()
    env = makeEnv(d1)
  })

  it('incrémente le compteur (jour UTC, nom, contexte), crée la table à la volée, répond 204', async () => {
    const r1 = await worker.fetch(evReq({ e: 'solo_start', c: 'code-route' }), env)
    expect(r1.status).toBe(204)
    expect(r1.headers.get('cache-control')).toBe('no-store')
    const r2 = await worker.fetch(evReq({ e: 'solo_start', c: 'code-route' }), env)
    expect(r2.status).toBe(204)
    const r3 = await worker.fetch(evReq({ e: 'share' }), env)
    expect(r3.status).toBe(204)
    const day = new Date().toISOString().slice(0, 10)
    expect(d1.state.events.get(`${day}|solo_start|code-route`)).toBe(2)
    expect(d1.state.events.get(`${day}|share|`)).toBe(1)
    // Création paresseuse : une seule fois par isolat (cache module).
    expect(d1.state.created).toBe(1)
    // Rien d'autre que (jour, nom, contexte) ne part en base.
    for (const { sql, args } of d1.state.log) {
      if (sql.startsWith('INSERT INTO events')) expect(args).toHaveLength(3)
    }
  })

  it('refuse une autre origine (403) et une requête sans Origin ni Referer', async () => {
    const cross = await worker.fetch(evReq({ e: 'share' }, { headers: { origin: 'https://evil.example' } }), env)
    expect(cross.status).toBe(403)
    const none = await worker.fetch(
      req('/api/ev', { method: 'POST', body: '{"e":"share"}' }),
      env,
    )
    expect(none.status).toBe(403)
    expect(d1.state.events.size).toBe(0)
  })

  it('accepte le Referer seul (repli) et refuse GET (405)', async () => {
    const r = await worker.fetch(
      req('/api/ev', { method: 'POST', headers: { referer: ORIGIN + '/examen' }, body: '{"e":"exam_end","c":"ok"}' }),
      env,
    )
    expect(r.status).toBe(204)
    const g = await worker.fetch(req('/api/ev', { headers: { origin: ORIGIN } }), env)
    expect(g.status).toBe(405)
    expect(g.headers.get('allow')).toBe('POST')
  })

  it('refuse un corps invalide (400) ou trop gros (413), sans rien écrire', async () => {
    expect((await worker.fetch(evReq({ e: 'pageview' }), env)).status).toBe(400)
    expect((await worker.fetch(evReq({ e: 'share', c: 'Majuscule' }), env)).status).toBe(400)
    expect((await worker.fetch(evReq('{oops'), env)).status).toBe(400)
    const big = await worker.fetch(evReq({ e: 'share', pad: 'x'.repeat(300) }), env)
    expect(big.status).toBe(413)
    const declared = await worker.fetch(evReq({ e: 'share' }, { headers: { 'content-length': '999' } }), env)
    expect(declared.status).toBe(413)
    expect(d1.state.events.size).toBe(0)
  })
})

// ---------------------------------------------------------------------------
describe('routes de l’App et 404', () => {
  const env = makeEnv(fakeD1())
  const nav = (path, init = {}) =>
    req(path, { headers: { accept: 'text/html,application/xhtml+xml,*/*;q=0.8' }, ...init })

  it('sert index.html en 200 avec les en-têtes de durcissement pour une route de l’App', async () => {
    const r = await worker.fetch(nav('/jouer/code-route/facile'), env)
    expect(r.status).toBe(200)
    expect(await r.text()).toBe('<html>shell</html>')
    expect(r.headers.get('content-type')).toContain('text/html')
    expect(r.headers.get('etag')).toBe('"shell"')
    expect(r.headers.get('x-content-type-options')).toBe('nosniff')
    expect(r.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin')
    expect(r.headers.get('x-frame-options')).toBe('SAMEORIGIN')
    for (const p of ['/examen', '/quotidien', '/erreurs/panneaux', '/revision/panneaux', '/flashcards', '/defi/manga-anime/expert']) {
      expect((await worker.fetch(nav(p), env)).status, p).toBe(200)
    }
  })

  it('laisse passer le 404 des assets pour une adresse inconnue ou un fetch non HTML', async () => {
    const r = await worker.fetch(nav('/nimporte-quoi'), env)
    expect(r.status).toBe(404)
    expect(await r.text()).toBe('<html>404</html>')
    const j = await worker.fetch(req('/examen', { headers: { accept: 'application/json' } }), env)
    expect(j.status).toBe(404)
    const post = await worker.fetch(nav('/examen', { method: 'POST' }), env)
    expect(post.status).toBe(404)
  })

  it('sert les fichiers existants tels quels et HEAD sans corps', async () => {
    const r = await worker.fetch(nav('/a-propos'), env)
    expect(r.status).toBe(200)
    expect(await r.text()).toBe('<html>about</html>')
    expect(r.headers.get('x-frame-options')).toBe(null)
    const h = await worker.fetch(nav('/examen', { method: 'HEAD' }), env)
    expect(h.status).toBe(200)
    expect(await h.text()).toBe('')
  })

  it('répond 404 JSON non cachable pour une route /api inconnue', async () => {
    const r = await worker.fetch(req('/api/inconnu'), env)
    expect(r.status).toBe(404)
    expect(r.headers.get('cache-control')).toBe('no-store')
    expect(r.headers.get('content-type')).toBe('application/json')
  })
})

// ---------------------------------------------------------------------------
describe('POST /api/checkout et /api/donate', () => {
  it('pose kind=premium + plan sur la session et customer_creation=always pour l’achat à vie', async () => {
    const calls = stubStripe([['/v1/checkout/sessions', async () => [200, { id: 'cs_test_x', url: 'https://checkout.stripe.com/x' }]]])
    const env = makeEnv(fakeD1())
    const r = await worker.fetch(req('/api/checkout', { method: 'POST', body: JSON.stringify({ plan: 'lifetime' }) }), env)
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({ url: 'https://checkout.stripe.com/x' })
    const p = calls[0].params
    expect(p.mode).toBe('payment')
    expect(p['metadata[kind]']).toBe('premium')
    expect(p['metadata[plan]']).toBe('lifetime')
    expect(p.customer_creation).toBe('always')
    expect(p['payment_intent_data[metadata][kind]']).toBe('premium')
    expect(p['line_items[0][price]']).toBe('price_life')
    expect(p.success_url).toBe(`${ORIGIN}/?premium=success&session_id={CHECKOUT_SESSION_ID}`)

    await worker.fetch(req('/api/checkout', { method: 'POST', body: '{"plan":"monthly"}' }), env)
    const m = calls[1].params
    expect(m.mode).toBe('subscription')
    expect(m['metadata[kind]']).toBe('premium')
    expect(m['metadata[plan]']).toBe('monthly')
    expect(m['subscription_data[metadata][kind]']).toBe('premium')
    expect(m.customer_creation).toBeUndefined()
  })

  it('pose kind=donation sur la session ET le PaymentIntent, borne le montant', async () => {
    const calls = stubStripe([['/v1/checkout/sessions', async () => [200, { url: 'https://checkout.stripe.com/d' }]]])
    const env = makeEnv(fakeD1())
    const r = await worker.fetch(req('/api/donate', { method: 'POST', body: '{"amount":2.5}' }), env)
    expect(r.status).toBe(200)
    const p = calls[0].params
    expect(p['metadata[kind]']).toBe('donation')
    expect(p['payment_intent_data[metadata][kind]']).toBe('donation')
    expect(p['line_items[0][price_data][unit_amount]']).toBe('250')
    expect((await worker.fetch(req('/api/donate', { method: 'POST', body: '{"amount":0.5}' }), env)).status).toBe(400)
    expect((await worker.fetch(req('/api/donate', { method: 'POST', body: '{"amount":501}' }), env)).status).toBe(400)
    expect((await worker.fetch(req('/api/donate', { method: 'POST', body: 'x' }), env)).status).toBe(400)
  })

  it('renvoie 502 si Stripe répond une erreur (plus de faux positif sur un objet error)', async () => {
    stubStripe([['/v1/checkout/sessions', async () => [400, { error: { message: 'No such price' } }]]])
    const env = makeEnv(fakeD1())
    const r = await worker.fetch(req('/api/checkout', { method: 'POST', body: '{"plan":"monthly"}' }), env)
    expect(r.status).toBe(502)
    expect(await r.json()).toEqual({ error: 'stripe_error' })
  })
})

// ---------------------------------------------------------------------------
describe('GET /api/confirm', () => {
  const session = (over = {}) => ({
    id: 'cs_test_abc12345',
    mode: 'payment',
    payment_status: 'paid',
    customer: 'cus_42',
    customer_details: { email: 'ryo@example.com' },
    metadata: { kind: 'premium', plan: 'lifetime' },
    ...over,
  })

  it('accorde UNE fois, délivre un jeton, puis relit D1 sur rejeu (premium révoqué non ré-accordé)', async () => {
    stubStripe([['/v1/checkout/sessions/', async () => [200, session()]]])
    const d1 = fakeD1()
    const env = makeEnv(d1)
    const r1 = await worker.fetch(req('/api/confirm?session_id=cs_test_abc12345'), env)
    expect(r1.status).toBe(200)
    const b1 = await r1.json()
    expect(b1.premium).toBe(true)
    expect(await verifyToken(env.SESSION_SECRET, b1.token)).toMatchObject({ email: 'ryo@example.com' })
    expect(d1.state.entitlements.get('ryo@example.com')).toMatchObject({ premium: 1, plan: 'lifetime', stripe_customer_id: 'cus_42' })
    expect(d1.state.processed.has('confirm:cs_test_abc12345')).toBe(true)

    // Remboursement entre-temps : premium coupé.
    d1.state.entitlements.get('ryo@example.com').premium = 0
    const upserts = () => d1.state.log.filter((l) => l.sql.startsWith('INSERT INTO entitlements')).length
    const before = upserts()
    const r2 = await worker.fetch(req('/api/confirm?session_id=cs_test_abc12345'), env)
    const b2 = await r2.json()
    expect(b2.premium).toBe(false)
    expect(typeof b2.token).toBe('string')
    expect(upserts()).toBe(before)
    expect(d1.state.entitlements.get('ryo@example.com').premium).toBe(0)
  })

  it('refuse un don, une session impayée, un id absent ou mal formé', async () => {
    stubStripe([
      ['/v1/checkout/sessions/cs_test_don00000', async () => [200, session({ metadata: { kind: 'donation' } })]],
      ['/v1/checkout/sessions/cs_test_unpaid00', async () => [200, session({ payment_status: 'unpaid' })]],
      ['/v1/checkout/sessions/cs_test_inconnu0', async () => [404, { error: { message: 'No such checkout.session' } }]],
    ])
    const d1 = fakeD1()
    const env = makeEnv(d1)
    for (const q of ['session_id=cs_test_don00000', 'session_id=cs_test_unpaid00', 'session_id=cs_test_inconnu0', '', 'session_id=../evil', 'session_id=cs_x']) {
      const r = await worker.fetch(req(`/api/confirm?${q}`), env)
      expect(r.status, q).toBe(200)
      expect(await r.json(), q).toEqual({ premium: false })
    }
    expect(d1.state.entitlements.size).toBe(0)
  })

  it('renvoie 500 (réessayable) si Stripe est indisponible', async () => {
    stubStripe([['/v1/checkout/sessions/', async () => [503, { error: { message: 'down' } }]]])
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const env = makeEnv(fakeD1())
    const r = await worker.fetch(req('/api/confirm?session_id=cs_test_abc12345'), env)
    expect(r.status).toBe(500)
  })
})

// ---------------------------------------------------------------------------
describe('GET /api/entitlement et POST /api/portal', () => {
  it('entitlement : relit D1 avec un jeton valide, premium false sinon', async () => {
    const d1 = fakeD1()
    const env = makeEnv(d1)
    d1.state.entitlements.set('a@b.fr', { email: 'a@b.fr', premium: 1, plan: 'monthly', stripe_customer_id: 'cus_a' })
    const token = await signToken(env.SESSION_SECRET, { email: 'a@b.fr' })
    const ok = await worker.fetch(req('/api/entitlement', { headers: { authorization: `Bearer ${token}` } }), env)
    expect(await ok.json()).toEqual({ premium: true, email: 'a@b.fr' })
    const none = await worker.fetch(req('/api/entitlement'), env)
    expect(await none.json()).toEqual({ premium: false })
    const bad = await worker.fetch(req('/api/entitlement', { headers: { authorization: 'Bearer x.y.z' } }), env)
    expect(await bad.json()).toEqual({ premium: false })
  })

  it('portal : 401 sans jeton, 404 sans client Stripe, sinon l’URL du portail', async () => {
    const calls = stubStripe([['/v1/billing_portal/sessions', async () => [200, { url: 'https://billing.stripe.com/p/x' }]]])
    const d1 = fakeD1()
    const env = makeEnv(d1)
    expect((await worker.fetch(req('/api/portal', { method: 'POST' }), env)).status).toBe(401)
    const token = await signToken(env.SESSION_SECRET, { email: 'a@b.fr' })
    const auth = { method: 'POST', headers: { authorization: `Bearer ${token}` } }
    expect((await worker.fetch(req('/api/portal', auth), env)).status).toBe(404)
    d1.state.entitlements.set('a@b.fr', { email: 'a@b.fr', premium: 1, plan: 'monthly', stripe_customer_id: null })
    expect((await worker.fetch(req('/api/portal', auth), env)).status).toBe(404)
    d1.state.entitlements.get('a@b.fr').stripe_customer_id = 'cus_a'
    const r = await worker.fetch(req('/api/portal', auth), env)
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({ url: 'https://billing.stripe.com/p/x' })
    expect(calls[0].params).toEqual({ customer: 'cus_a', return_url: `${ORIGIN}/?portail=retour` })
    expect((await worker.fetch(req('/api/portal'), env)).status).toBe(405)
  })
})

// ---------------------------------------------------------------------------
describe('POST /api/webhook', () => {
  async function post(env, event, opts = {}) {
    const payload = JSON.stringify(event)
    const { header } = await stripeSig(opts.secret || WH_SECRET, payload)
    return worker.fetch(
      req('/api/webhook', { method: 'POST', headers: { 'stripe-signature': opts.header || header }, body: payload }),
      env,
    )
  }
  const completed = (id, object) => ({ id, type: 'checkout.session.completed', data: { object } })
  const premiumSession = (over = {}) => ({
    mode: 'payment',
    payment_status: 'paid',
    customer: 'cus_1',
    customer_details: { email: 'ryo@example.com' },
    metadata: { kind: 'premium', plan: 'lifetime' },
    ...over,
  })

  it('rejette une signature invalide (400) sans rien traiter', async () => {
    const d1 = fakeD1()
    const env = makeEnv(d1)
    const r = await post(env, completed('evt_1', premiumSession()), { secret: 'mauvais' })
    expect(r.status).toBe(400)
    expect(d1.state.entitlements.size).toBe(0)
    expect(d1.state.processed.size).toBe(0)
  })

  it('checkout.session.completed : un DON n’accorde rien, un achat premium accorde, puis idempotence', async () => {
    const d1 = fakeD1()
    const env = makeEnv(d1)
    const don = await post(env, completed('evt_don', premiumSession({ metadata: { kind: 'donation' } })))
    expect(await don.json()).toEqual({ received: true, granted: false, reason: 'donation' })
    expect(d1.state.entitlements.size).toBe(0)
    expect(d1.state.processed.has('evt_don')).toBe(true)

    const legacy = await post(env, completed('evt_legacy', premiumSession({ metadata: {} })))
    expect((await legacy.json()).reason).toBe('unknown_kind')
    expect(d1.state.entitlements.size).toBe(0)

    const ok = await post(env, completed('evt_ok', premiumSession()))
    expect(await ok.json()).toEqual({ received: true, granted: true, reason: 'ok' })
    expect(d1.state.entitlements.get('ryo@example.com')).toMatchObject({ premium: 1, plan: 'lifetime', stripe_customer_id: 'cus_1' })

    d1.state.entitlements.get('ryo@example.com').premium = 0
    const again = await post(env, completed('evt_ok', premiumSession()))
    expect(await again.json()).toEqual({ received: true, duplicate: true })
    expect(d1.state.entitlements.get('ryo@example.com').premium).toBe(0)
  })

  it('octroi unique par session, webhook et /api/confirm confondus : jamais de ré-octroi après révocation', async () => {
    const d1 = fakeD1()
    const env = makeEnv(d1)
    // 1. /api/confirm accorde en premier ; le webhook livré plus tard (réessai
    //    Stripe) ne ré-accorde pas un premium remboursé entre-temps.
    const s1 = premiumSession({ id: 'cs_test_shared01' })
    stubStripe([['/v1/checkout/sessions/', async () => [200, s1]]])
    const c1 = await (await worker.fetch(req('/api/confirm?session_id=cs_test_shared01'), env)).json()
    expect(c1.premium).toBe(true)
    d1.state.entitlements.get('ryo@example.com').premium = 0
    const late = await post(env, completed('evt_late', s1))
    expect(await late.json()).toEqual({ received: true, granted: false, reason: 'already_granted' })
    expect(d1.state.entitlements.get('ryo@example.com').premium).toBe(0)
    expect(d1.state.processed.has('evt_late')).toBe(true)

    // 2. Ordre inverse : le webhook accorde en premier, puis l'URL de retour
    //    rechargée après un remboursement ne ré-accorde pas (jeton seulement).
    const s2 = premiumSession({ id: 'cs_test_shared02', customer_details: { email: 'two@example.com' } })
    expect(await (await post(env, completed('evt_first', s2))).json()).toEqual({ received: true, granted: true, reason: 'ok' })
    expect(d1.state.processed.has('confirm:cs_test_shared02')).toBe(true)
    d1.state.entitlements.get('two@example.com').premium = 0
    stubStripe([['/v1/checkout/sessions/', async () => [200, s2]]])
    const c2 = await (await worker.fetch(req('/api/confirm?session_id=cs_test_shared02'), env)).json()
    expect(c2.premium).toBe(false)
    expect(await verifyToken(env.SESSION_SECRET, c2.token)).toMatchObject({ email: 'two@example.com' })
    expect(d1.state.entitlements.get('two@example.com').premium).toBe(0)
  })

  it('cycle de vie de l’abonnement : impayé coupe, retour actif rétablit, annulation coupe, à vie intouché', async () => {
    const d1 = fakeD1()
    const env = makeEnv(d1)
    d1.state.entitlements.set('m@x.fr', { email: 'm@x.fr', premium: 1, plan: 'monthly', stripe_customer_id: 'cus_m' })
    d1.state.entitlements.set('l@x.fr', { email: 'l@x.fr', premium: 1, plan: 'lifetime', stripe_customer_id: 'cus_m' })
    const sub = (id, status, previous) => ({
      id,
      type: 'customer.subscription.updated',
      data: { object: { id: 'sub_1', customer: 'cus_m', status }, previous_attributes: previous },
    })
    expect(await (await post(env, sub('evt_pd', 'past_due', { status: 'active' }))).json()).toMatchObject({ action: 'revoke' })
    expect(d1.state.entitlements.get('m@x.fr').premium).toBe(0)
    expect(d1.state.entitlements.get('l@x.fr').premium).toBe(1)

    expect(await (await post(env, sub('evt_back', 'active', { status: 'past_due' }))).json()).toMatchObject({ action: 'restore' })
    expect(d1.state.entitlements.get('m@x.fr').premium).toBe(1)

    // Simple modification (fin de période programmée) : rien.
    d1.state.entitlements.get('m@x.fr').premium = 0
    expect(await (await post(env, sub('evt_cape', 'active', { cancel_at_period_end: false }))).json()).toMatchObject({ action: 'none' })
    expect(d1.state.entitlements.get('m@x.fr').premium).toBe(0)

    d1.state.entitlements.get('m@x.fr').premium = 1
    const del = await post(env, { id: 'evt_del', type: 'customer.subscription.deleted', data: { object: { id: 'sub_1', customer: 'cus_m' } } })
    expect(await del.json()).toMatchObject({ action: 'revoke' })
    expect(d1.state.entitlements.get('m@x.fr').premium).toBe(0)
    expect(d1.state.entitlements.get('l@x.fr').premium).toBe(1)

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const inv = await post(env, { id: 'evt_inv', type: 'invoice.payment_failed', data: { object: { id: 'in_1', customer: 'cus_m', customer_email: 'm@x.fr' } } })
    expect(await inv.json()).toMatchObject({ action: 'logged' })
    expect(warn).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(warn.mock.calls[0])).not.toContain('m@x.fr')
  })

  it('remboursement et litige : révoquent l’acheteur (même à vie) mais jamais sur un don', async () => {
    const charges = {
      ch_buy: { id: 'ch_buy', customer: 'cus_b', billing_details: { email: 'B@x.fr' }, metadata: { kind: 'premium' } },
      ch_don: { id: 'ch_don', customer: 'cus_b', billing_details: { email: 'b@x.fr' }, metadata: { kind: 'donation' } },
    }
    stubStripe([['/v1/charges/', async ({ url }) => [200, charges[url.pathname.split('/').pop()]]]])
    const d1 = fakeD1()
    const env = makeEnv(d1)
    const seed = () => d1.state.entitlements.set('b@x.fr', { email: 'b@x.fr', premium: 1, plan: 'lifetime', stripe_customer_id: 'cus_b' })
    seed()
    // Don remboursé : rien ne bouge.
    const donRefund = await post(env, { id: 'evt_r0', type: 'charge.refunded', data: { object: { ...charges.ch_don, refunded: true } } })
    expect(await donRefund.json()).toMatchObject({ action: 'donation' })
    expect(d1.state.entitlements.get('b@x.fr').premium).toBe(1)
    // Remboursement partiel : rien.
    const partial = await post(env, { id: 'evt_r1', type: 'charge.refunded', data: { object: { ...charges.ch_buy, refunded: false } } })
    expect(await partial.json()).toMatchObject({ action: 'ignored' })
    expect(d1.state.entitlements.get('b@x.fr').premium).toBe(1)
    // Remboursement intégral : révoqué.
    await post(env, { id: 'evt_r2', type: 'charge.refunded', data: { object: { ...charges.ch_buy, refunded: true } } })
    expect(d1.state.entitlements.get('b@x.fr').premium).toBe(0)
    // Litige sur un don : rien ; litige sur un achat : révoqué (charge relue chez Stripe).
    seed()
    await post(env, { id: 'evt_d0', type: 'charge.dispute.created', data: { object: { id: 'dp_0', charge: 'ch_don' } } })
    expect(d1.state.entitlements.get('b@x.fr').premium).toBe(1)
    await post(env, { id: 'evt_d1', type: 'charge.dispute.created', data: { object: { id: 'dp_1', charge: 'ch_buy' } } })
    expect(d1.state.entitlements.get('b@x.fr').premium).toBe(0)
  })

  it('litige gagné : rétablit l’achat à vie, et le mensuel seulement si l’abonnement est encore actif', async () => {
    const charge = { id: 'ch_w', customer: 'cus_w', billing_details: { email: 'w@x.fr' }, metadata: {} }
    let subs = [{ id: 'sub_w', status: 'active' }]
    stubStripe([
      ['/v1/charges/', async () => [200, charge]],
      ['/v1/subscriptions', async () => [200, { data: subs }]],
    ])
    const d1 = fakeD1()
    const env = makeEnv(d1)
    d1.state.entitlements.set('w@x.fr', { email: 'w@x.fr', premium: 0, plan: 'monthly', stripe_customer_id: 'cus_w' })
    d1.state.entitlements.set('w2@x.fr', { email: 'w2@x.fr', premium: 0, plan: 'lifetime', stripe_customer_id: 'cus_w' })
    const closed = (id, status) => ({ id, type: 'charge.dispute.closed', data: { object: { id: 'dp', charge: 'ch_w', status } } })

    expect(await (await post(env, closed('evt_lost', 'lost'))).json()).toMatchObject({ action: 'ignored' })
    expect(d1.state.entitlements.get('w@x.fr').premium).toBe(0)

    expect(await (await post(env, closed('evt_won', 'won'))).json()).toMatchObject({ action: 'restore' })
    expect(d1.state.entitlements.get('w@x.fr').premium).toBe(1)
    expect(d1.state.entitlements.get('w2@x.fr').premium).toBe(1)

    // Abonnement annulé pendant le litige : le mensuel reste coupé, l'à vie revient.
    subs = [{ id: 'sub_w', status: 'canceled' }]
    d1.state.entitlements.get('w@x.fr').premium = 0
    d1.state.entitlements.get('w2@x.fr').premium = 0
    await post(env, closed('evt_won2', 'won'))
    expect(d1.state.entitlements.get('w@x.fr').premium).toBe(0)
    expect(d1.state.entitlements.get('w2@x.fr').premium).toBe(1)
  })

  it('répond 500 si Stripe échoue en cours de traitement, SANS marquer l’événement traité', async () => {
    stubStripe([['/v1/charges/', async () => [500, { error: { message: 'boom' } }]]])
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const d1 = fakeD1()
    const env = makeEnv(d1)
    const r = await post(env, { id: 'evt_x', type: 'charge.dispute.created', data: { object: { id: 'dp', charge: 'ch_x' } } })
    expect(r.status).toBe(500)
    expect(d1.state.processed.has('evt_x')).toBe(false)
  })

  it('ignore un type inconnu mais le marque traité ; refuse un JSON invalide signé', async () => {
    const d1 = fakeD1()
    const env = makeEnv(d1)
    const r = await post(env, { id: 'evt_u', type: 'product.created', data: { object: {} } })
    expect(await r.json()).toEqual({ received: true, action: 'ignored' })
    expect(d1.state.processed.has('evt_u')).toBe(true)
    const payload = '{pas du json'
    const { header } = await stripeSig(WH_SECRET, payload)
    const bad = await worker.fetch(req('/api/webhook', { method: 'POST', headers: { 'stripe-signature': header }, body: payload }), env)
    expect(bad.status).toBe(400)
  })
})
