// Caregiver Village — server-side Gemini proxy (Netlify Function v2)
//
// Holds ONE Google Gemini API key for all users. The key lives ONLY in the
// Netlify environment variable GEMINI_API_KEY — it is never sent to the browser.
//
// The browser posts { model, contents, systemInstruction, generationConfig, safetySettings }
// exactly as it would to Gemini directly; this function adds the key and forwards it.
//
// Setup (one time, in the Netlify dashboard):
//   Site configuration → Environment variables → Add a variable
//     Key:   GEMINI_API_KEY
//     Value: <your key from https://aistudio.google.com/apikey>
//   (Optional) ALLOWED_MODELS = comma list to restrict which models can be requested.

const DEFAULT_MODEL = 'gemini-2.5-flash';
// Only these models may be requested (prevents someone forcing an expensive model).
const MODEL_ALLOWLIST = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro', 'gemini-2.0-flash'];

export default async (req) => {
  // CORS / preflight — same-origin in production, but be permissive so it also
  // works from the local file during testing.
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 204, headers: cors });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, cors);
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return json({ error: 'Server AI key not configured. Set GEMINI_API_KEY in Netlify.' }, 503, cors);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON in request body.' }, 400, cors);
  }

  // Pick a safe model
  let model = (body.model || '').trim() || DEFAULT_MODEL;
  const allowed = (process.env.ALLOWED_MODELS
    ? process.env.ALLOWED_MODELS.split(',').map(s => s.trim())
    : MODEL_ALLOWLIST);
  if (!allowed.includes(model)) model = DEFAULT_MODEL;

  // Build the Gemini payload from what the browser sent (only expected fields)
  const payload = {
    contents: Array.isArray(body.contents) ? body.contents : [],
    systemInstruction: body.systemInstruction || undefined,
    generationConfig: body.generationConfig || undefined,
    safetySettings: body.safetySettings || undefined
  };

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/'
    + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(key);

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await upstream.text();
    // Pass Gemini's response straight through (status + body), minus the key
    return new Response(text, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json', ...cors }
    });
  } catch (e) {
    return json({ error: 'Upstream request failed: ' + (e && e.message ? e.message : 'unknown') }, 502, cors);
  }
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...(cors || {}) }
  });
}
