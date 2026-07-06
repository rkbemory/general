// Caregiver Village — server-side Gemini proxy (Cloudflare Pages Function)
//
// File-based route: functions/api/gemini.js  ->  /api/gemini
//
// Holds ONE Google Gemini API key for all users. The key lives ONLY in the
// Cloudflare Pages environment variable GEMINI_API_KEY — it is never sent to the browser.
//
// Setup (one time, in the Cloudflare Pages dashboard):
//   Settings → Environment variables → add for Production (and Preview):
//     GEMINI_API_KEY  = <key from https://aistudio.google.com/apikey>
//   Optional hardening:
//     ALLOWED_ORIGIN  = https://caregiver-village.pages.dev   (locks the proxy to your site)
//     ALLOWED_MODELS  = gemini-2.5-flash,gemini-2.5-pro        (restrict requestable models)

const DEFAULT_MODEL = 'gemini-2.5-flash';
const MODEL_ALLOWLIST = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro', 'gemini-2.0-flash'];

// Best-effort in-memory rate limit (per edge isolate). Stops trivial hammering / abuse
// so the proxy doesn't look like an open relay. Not a hard global guarantee.
const RATE_MAX = 30;          // requests
const RATE_WINDOW_MS = 60000; // per minute, per IP
const hits = new Map();

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: cors() });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // 1) Optional origin lock — only enforced if ALLOWED_ORIGIN is set.
  const allowedHost = (env.ALLOWED_ORIGIN || '').trim();
  if (allowedHost) {
    const origin = request.headers.get('Origin') || '';
    const referer = request.headers.get('Referer') || '';
    const ok = (origin && origin.startsWith(allowedHost)) || (referer && referer.startsWith(allowedHost));
    // Block only when we clearly have a mismatched origin/referer (lets same-origin & tools through).
    if ((origin || referer) && !ok) {
      return json({ error: 'Forbidden origin.' }, 403);
    }
  }

  // 2) Basic per-IP rate limit
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const now = Date.now();
  const rec = hits.get(ip) || { count: 0, reset: now + RATE_WINDOW_MS };
  if (now > rec.reset) { rec.count = 0; rec.reset = now + RATE_WINDOW_MS; }
  rec.count++;
  hits.set(ip, rec);
  if (rec.count > RATE_MAX) {
    return json({ error: 'Too many requests — please wait a moment and try again.' }, 429);
  }

  // 3) Key must be configured server-side
  const key = env.GEMINI_API_KEY;
  if (!key) {
    return json({ error: 'Server AI key not configured. Set GEMINI_API_KEY in Cloudflare Pages.' }, 503);
  }

  // 4) Parse + validate the request
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON in request body.' }, 400); }

  let model = (body.model || '').trim() || DEFAULT_MODEL;
  const allowed = env.ALLOWED_MODELS ? env.ALLOWED_MODELS.split(',').map(s => s.trim()) : MODEL_ALLOWLIST;
  if (!allowed.includes(model)) model = DEFAULT_MODEL;

  const payload = {
    contents: Array.isArray(body.contents) ? body.contents : [],
    systemInstruction: body.systemInstruction || undefined,
    generationConfig: body.generationConfig || undefined,
    safetySettings: body.safetySettings || undefined
  };

  // 5) Forward to Gemini with the server key attached
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/'
    + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(key);

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json', ...cors() }
    });
  } catch (e) {
    return json({ error: 'Upstream request failed: ' + (e && e.message ? e.message : 'unknown') }, 502);
  }
}

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}
function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors() }
  });
}
