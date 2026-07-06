# Caregiver Village

A companion web app for graduates of dementia-caregiver education programs (such as the Emory Caregiver Bootcamp). Pairs a caregiver portal with a radically simplified patient portal, includes a "You're not alone" peer-disclosure feed, a Sundowning Helper, a Hard Conversations Helper, and an Education Hub grounded in the NIH Caregiver Guide.

**Status:** Working prototype. Not yet evaluated. Not a clinical product.

**Author:** Rajib Biswas, MSN — Doctoral student, Nell Hodgson Woodruff School of Nursing, Emory University.

---

## What this is

A single-file web app (`index.html`) that runs in any modern browser. No install, no account required for first use, no monthly fee.

### Caregiver Portal
- Time-aware dashboard with greeting, "Right Now" contextual card, and Village Strength gauge
- **Sundowning Helper** — a 5-step calm-down protocol that highlights itself between 3 PM and 9 PM
- **Hard Conversations Helper** — six guided scripts for the hardest caregiver conversations (driving cessation, finances, facility transition, firearm removal, sharing the diagnosis)
- **"You're not alone" feed** — anonymous community counts on 16 feeling prompts
- Villages: role-based groups (Family, Friends, Neighbors, Colleagues, Legal & Financial, plus custom groups)
- Tasks, schedule, group chat, broadcast templates (16 templates in 6 categories)
- AI Chat powered by Google Gemini (free), Anthropic Claude, or OpenAI — bring your own API key
- Q&A library with 38 seeded questions across 16 categories, citing the NIH Caregiver Guide
- Education Hub: Understanding Dementia, Beyond Alzheimer's (FTD, Lewy Body, Vascular, Mixed), NIH Caregiver Guide deep dives, Scripts, Legal & Financial Checklist

### Patient Portal
- Radically simplified UI (no more than two prominent options per screen)
- Large clock, daily reminders bell, helper card, medications checklist
- One-tap "Raise Need" button that routes requests to the caregiver for approval
- Same AI assistant, simpler interface

### Pairing
- Six-character sync code links a caregiver device and a patient device
- State syncs automatically every 15 seconds

---

## How to run it locally

This is a static file — no build step.

1. Open `index.html` in any modern browser (Chrome, Edge, Firefox, Safari)
2. Or double-click the file
3. Or host it on any static host (Netlify, Vercel, GitHub Pages, S3, etc.)

The **AI Chat** runs on a shared server key by default (see "Server AI setup" below) — no per-user key needed. Users who prefer to use their own key can open AI Settings → "Advanced" and paste a Google Gemini, Anthropic Claude, or OpenAI key (stored only in their browser `localStorage`).

For **notifications via email**, configure EmailJS in the Notifications Settings modal.

---

## Server AI setup (one shared key for all users)

The AI Chat calls a Netlify serverless function (`netlify/functions/gemini.mjs`) that holds a single Google Gemini API key. The key lives **only** in a Netlify environment variable — it is never exposed to browsers.

**To enable it (one time, in the Netlify dashboard):**

1. Get a free key at <https://aistudio.google.com/apikey>.
2. In Netlify: **Site configuration → Environment variables → Add a variable**
   - Key: `GEMINI_API_KEY`
   - Value: *(your key, starts with `AIza…`)*
3. (Optional) `ALLOWED_MODELS` — comma-separated list to restrict which models can be requested. Defaults to Flash/Flash-Lite/Pro/2.0-Flash.
4. Redeploy (or trigger a deploy) so the function picks up the variable.

Once set, every visitor gets AI with zero setup. If the variable is missing, the app degrades gracefully to rule-based "basic mode" and the chat shows a clear message.

**Note:** the server key is open to anyone who can reach the site (no per-user auth yet). Google's free Gemini tier is ~1,500 requests/day. For a larger pilot, add authentication (planned) and/or rate limiting.

---

## Tech stack

- Single HTML file (~340 KB, no build step)
- Tailwind CSS (CDN)
- Font Awesome (CDN)
- Google Fonts: Outfit
- `localStorage` for persistence
- Free key-value store at `keyvalue.immanuel.co` for paired-device sync and anonymous community counts

---

## Content sources

- National Institute on Aging — *Caring for a Person with Alzheimer's Disease* (NIH Publication No. 23-AG-8040, December 2023), public domain. Cited inline by page number.
- Alzheimer's Association — alz.org clinical guidelines
- Lewy Body Dementia Association — lbda.org
- Association for Frontotemporal Degeneration — theaftd.org

---

## Limitations

This is a working prototype. It has not been formally evaluated. It is not a medical or clinical product. It does not diagnose, does not prescribe, and is not validated as an evidence-based intervention. Patient health information should not be entered into the chat or notes — the current sync architecture uses a public key-value store and is not HIPAA-compliant.

For a full description of features, limitations, and risks, see the project description document.

---

## License

All rights reserved by the author for now. License terms will be decided before any public release.

---

## Contact

For research collaboration or feedback: rajib.biswas@emory.edu
