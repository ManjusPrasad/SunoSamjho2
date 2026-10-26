# Great Indian AI Internship Challenge — Project Plan

**Information checked:** 25 October 2026. The official challenge page and linked terms are authoritative; re-check them before submitting in case Gnani AI updates the programme.

## Official links

- Challenge overview, awards, eligibility, rules, selection and timeline: https://www.gnani.ai/internship
- Official registration form: https://www.gnani.ai/great-indian-ai-internship-registration-form
- Gnani developer docs: https://docs.gnani.ai/
- API quick start: https://docs.gnani.ai/api/introduction/quick-start
- API dashboard: https://app.gnani.ai/voice
- Prisma STT REST: https://docs.gnani.ai/api/STT/speech-to-text
- Timbre TTS REST: https://docs.gnani.ai/api/TTS/tts-inference
- Timbre voices: https://docs.gnani.ai/api/TTS/available-voices
- Evon v3.3 weights: https://huggingface.co/gnani/gnani-evon-v3.3-30B-A3B
- Challenge support: internshipscontest@gnani.ai; community: https://discord.gg/aECcvtABpq

## Confirmed programme information

- Eligibility: currently enrolled in a degree/course at an Indian college or university; age 18 or older on registration day. Entries may be solo or teams of two; every team member must independently qualify and accept terms.
- Registration asks for identity/contact and college/course details; a duo also supplies the teammate's email. Team communication and the 5,000 programme credits go to the primary registrant.
- There is no fixed project brief. Build a working application using Gnani AI models and/or APIs; document the problem, intended users, Gnani technology and each member's contribution.
- Before final submission, publish a public working-demo video on LinkedIn and/or X, explain what was built and which Gnani technology it uses, tag Gnani AI's official account, and include `#GnaniAI` and `#GreatIndianAIInternshipChallenge`. Nominate one post per platform in the submission; tagging alone is not submission.
- Final submission closes **10 November 2026, 11:59 PM IST**. The official page lists the demo video, written explanation, models/APIs used, and nominated post links as submission items.
- No purchased engagement, bots, paid promotion, engagement swaps, plagiarism or misleading demos. Public-post engagement is verified for shortlisting. Eligible strongest-engagement submissions are shortlisted; each shortlisted person interviews individually. Only a written offer confirms an internship. Awards are separate from internship selection.
- Official page advertises up to 100 six-month internships, stipend up to ₹1 lakh per intern per month, and ten ₹50,000 awards. These are maximum/possible outcomes, not guaranteed offers or stipend amounts. Internships are scheduled to begin 1 January 2027.
- Award categories: Main Character (regional/low-resource Indian language), Mixed Vibes (code-mixed voice), Real Deal (useful real-world impact), Noise Canceller (noisy telephone audio), Two-Person Army, Solo Ninja, Jugaad Genius (creative model use), Small Town Big Build, Demo Day Drop (60-second video), Crowd Favourite. No participant/team may win more than one award. Do not manufacture votes/engagement.

## Project concept: KisanSaathi Voice Desk

Turn this multilingual voice product into a voice-first assistant that helps smallholder farmers understand **current, source-attributed** crop and weather advisories in their own language. A farmer asks naturally by voice (including code-mixed speech); the system transcribes, finds relevant entries in a small curated official advisory set for a district/crop, explains the retrieved guidance in simple language, and reads it aloud. Always show the source, date, district/crop applicability and a clear “ask an agriculture officer” fallback. Do not invent pesticide, dosage, disease-treatment or safety guidance.

**Award targets:** strongest fit is Real Deal; Main Character if a specific regional language is the core, tested with local speakers. A credible noisy-audio evaluation could additionally support Noise Canceller, but only claim it if measured.

**MVP workflow:**
1. Choose one district and one crop; curate a small set of dated advisories from official agricultural/meteorological sources with URLs and attribution.
2. Capture a short voice query; use Prisma to transcribe it and show editable text (users can correct names/dates).
3. Extract crop/district/topic from the query and retrieve matching advisory records; do not ask an LLM to make up current weather or agronomic facts.
4. Use Evon only if its approved access/serving instructions are obtained. Prompt it to simplify the retrieved facts without adding claims; retain source metadata and validate the output. The challenge lists Evon v3.3 as open weights available by request on Hugging Face; do not assume a public hosted inference API exists.
5. Use Timbre to speak the answer in the selected language. Keep a visible caption, source card, replay button, language choice and help/urgent-contact fallback.
6. Add a low-bandwidth path (short clips, compressed UI payloads, text fallback), privacy notice, consent before microphone access, and a clear transcript delete control.
7. Measure task success, transcription correction rate, response time, and comprehension with a small consenting user test. Report sample size and limitations; never claim unsupported accuracy.

## Integration notes

- Prisma STT REST is `POST https://api.vachana.ai/stt/v3`, multipart fields `audio_file` and `language_code`, authenticated with `X-API-Key-ID`. Supported audio includes WAV; maximum 60 seconds (ideal 30). `format=transcribe` enables ITN; native-script numerals are optional. Word boosting takes single words (max 100) plus supported `bias_score` values; documentation recommends verbatim output for boosting.
- Timbre REST is `POST https://api.vachana.ai/api/v1/tts/inference`, authenticated with `X-API-Key-ID`, and returns binary audio. Use a real voice/model pairing (for example v2.5 `Saanvi` for Kannada, `Nalini` for Hindi); catalog: `https://docs.gnani.ai/api/TTS/available-voices`.
- Evon v3.3 is an open-weight 30B MoE model available by request through the listed Hugging Face page. It is not a documented hosted REST endpoint in the linked public Speech API docs. This repo now expects a separately hosted OpenAI-compatible chat-completions endpoint configured as `GNANI_EVON_BASE_URL` (and optional `GNANI_EVON_MODEL` / `GNANI_EVON_API_KEY`). Ask Gnani for approved access and serving guidance; do not assume the Vachana speech key can access Evon. Document exactly how you serve it.
- API secrets belong only in server-side `.env` or a secret manager. Never use `VITE_*` for secrets, commit `.env`, paste keys in code, screenshots, logs, or public demos. Revoke any key shared publicly and rotate it.

## Finish plan (16 days remain on 25 October)

- **25–26 Oct:** Register, confirm eligibility/solo-or-duo, rotate the exposed key, confirm credits and service entitlements, request Evon access, choose one target language/district/crop.
- **27–30 Oct:** Build the complete happy-path MVP using verified Prisma and Timbre APIs; get the core flow working before visual polish.
- **31 Oct–3 Nov:** Add curated sources, safe response guardrails, language choice, captions, replay, privacy controls and robust API errors.
- **4–6 Nov:** Test real accents/noisy samples with consent, correct mistranscriptions, measure latency and task success, test mobile and poor network; record defects and fix critical ones.
- **7–8 Nov:** Record and edit a concise 60-second public demo plus a longer backup walkthrough. Show a real query end-to-end, model/API evidence, source citation and honest limitations.
- **9 Nov:** Publish the video post, tag the official account, add both hashtags, check public visibility, save the URL(s), complete the project description/model/contribution fields.
- **10 Nov (well before 11:59 PM IST):** Submit, verify the confirmation, preserve copies/screenshots and stop relying on last-minute uploads.

## Demo outline suggestion (60 seconds)

- 0–5s: farmer problem and selected region/language.
- 5–15s: ask one realistic voice question, including local/code-mixed phrasing.
- 15–30s: show Prisma transcript and any user correction.
- 30–42s: show the dated official advisory source and the simplified answer.
- 42–52s: play Timbre speech and show captions/replay.
- 52–60s: name the Gnani APIs/models, show the working app, state one measured result and the demo's limitation.

## Submission checklist

- [ ] Registration completed; all participants meet eligibility and accepted terms.
- [ ] Working public demo video; public post published before submission.
- [ ] Official Gnani account tagged; both required hashtags included.
- [ ] Written explanation: problem, users, workflow, data/source provenance, safety/privacy, measured results and limitations.
- [ ] Exact Gnani model/API names and each teammate's contribution listed.
- [ ] One nominated post URL per platform included in final submission.
- [ ] Final submission sent by 10 Nov 2026 11:59 PM IST; confirmation saved.
- [ ] No secrets in repo, video, screenshots, logs, or public links.
