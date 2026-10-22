# ¡Hola Ingeniero! — Aprende. Practica. Progresa.

Spanish for the next generation of engineers: a website with grammar lessons, 118 technical vocabulary terms, 110 practice questions, 15 campus role-plays, and an AI tutor powered by Google Gemini.

> **Read this first (honest status).** Everything except the live Gemini call was tested in an automated browser and with unit tests (see section 16). The **live Gemini call could not be tested** by the person who built this (no key, no internet access to Google), so the very first time you chat with the tutor is also the first real-world test. A one-command checker is provided (section 8). The Windows `.bat` files were written carefully but were **not run on Windows**; the same steps work by typing commands (sections 5 and 9).

---

## 1. What you get

| Module | What it does |
|---|---|
| **Learn Spanish** | 27 lessons (alphabet to grammar to everyday talk), each with objective, English explanation, examples, vocabulary, conjugation/comparison tables, 5 practice questions with instant feedback, mark-as-completed, previous/next. |
| **Tech Español** | 118 terms in 14 engineering categories. Search, category filter, flashcards, reveal-translation, mark-as-learned, review learned words, random practice. |
| **Play & Practice** | 110 questions: multiple choice, fill-in-the-blank, matching, sentence building, conjugation, SER/ESTAR/HAY, vocabulary, grammar, mixed tests. Points, XP, 11 badges, daily challenge, saved attempts. |
| **Campus Español** | 15 university situations with dialogue, translation, vocabulary, grammar notes, comprehension quiz, and a branching role-play where you choose your replies. **Works without any API key.** |
| **¡Hola Amigo! AI tutor** | Real chat with Gemini through your own backend: levels A1/A2/B1, 6 conversation modes, hint, translate, grammar explanation, “correct my last message”, optional voice. |

The first four modules work **100% offline from the AI**. Only the tutor needs a key.

## 2. Technology

Frontend: React 19, Vite, Tailwind CSS 4, React Router, Lucide icons (JavaScript).
Backend: Node.js, Express 5, `helmet`, `cors`, `express-rate-limit`, `dotenv`.
AI: official **Google Gen AI JavaScript SDK** (`@google/genai`), Gemini Developer API.
Storage: browser LocalStorage only (progress, quiz results, level, chat history). No database, no accounts.

## 3. Folder structure

```
hola-ingeniero/
  setup.bat  start.bat  stop.bat     <- double-click these (Windows)
  .env.example                        <- template; setup copies it to ".env"
  package.json                        <- root scripts (npm start, npm test...)
  scripts/        setup.mjs, check-secrets.mjs
  backend/
    src/  config/ routes/ controllers/ services/ middleware/
    test/ (automated tests)   check-ai.js (key checker)
  frontend/
    src/  components/ pages/ modules/ data/ hooks/ services/ styles/ lib/ test/
    public/
```
All lesson, vocabulary, question and scenario content lives in `frontend/src/data/`.

## 4. Prerequisites

* **Windows 11**, **Visual Studio Code** (https://code.visualstudio.com).
* **Node.js LTS, version 20.19 or newer** (https://nodejs.org, choose “LTS”, default options). Check in a terminal: `node -v`.
* A modern browser (Chrome or Edge recommended; needed for voice input).
* Internet for the first install and for the tutor.

You do **not** need to install Vite, nodemon or anything else globally.

## 5. Install and open (first time only)

1. Download `hola-ingeniero.zip`, right-click → **Extract All…** (e.g. to `C:\Users\YOU\hola-ingeniero`).
2. Open VS Code → **File → Open Folder…** → choose the extracted **`hola-ingeniero`** folder.
3. Install: double-click **`setup.bat`**, *or* in VS Code open **Terminal → New Terminal** and type (the terminal opens in the right folder):
   ```
   node scripts/setup.mjs
   ```
   This checks Node/npm, installs everything inside the project folder, and creates a local `.env` file. It never overwrites an existing `.env` and never prints your key. It can take a few minutes.

## 6. Get your free Gemini key (only for the AI tutor)

I cannot create a key for you; it must belong to your Google account.

1. Go to https://aistudio.google.com/apikey and sign in.
2. Click **Create API key**, copy it.
3. In VS Code open the file **`.env`** (project root, not `.env.example`).
4. Replace `PASTE_YOUR_KEY_HERE` with your key, no quotes, no spaces:
   ```
   GEMINI_API_KEY=AIza...your key...
   ```
5. Save (Ctrl+S). Restart the app if it was running.

**Keep it private.** `.env` is in `.gitignore` and is never sent to the browser. Never paste your key in a chat, screenshot, or upload.

### Free tier and models (checked 14 Oct 2026 on the official pricing page)
The default model is `gemini-3.8-flash`. At that date the free tier listed these text models: `gemini-3.8-flash`, `gemini-3.6-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-2.5-flash`. Pro models were **paid only**. The app never enables billing; if you never add a billing account to your Google project, you stay on the free tier and requests are simply refused (with a clear message) when the quota is used up.

Things to know about the free tier: it has rate/daily limits that Google changes over time; **free-tier prompts may be used by Google to improve its products**, so don’t type personal information; availability can differ by country. Always confirm at https://ai.google.dev/gemini-api/docs/pricing and https://ai.google.dev/gemini-api/docs/models.

**To change the model**, edit `GEMINI_MODEL` in `.env` (e.g. `gemini-3.5-flash-lite` if the default is out of quota) and restart.

## 7. Start the application

* **Easiest:** double-click **`start.bat`**. It opens the site automatically.
* **Or** in the VS Code terminal (project root):
  ```
  npm start
  ```

| What | Address |
|---|---|
| Website (open this) | http://localhost:5173 |
| Backend health check | http://localhost:5000/api/health |

Keep the terminal window open while you use the site.

**To stop:** press **Ctrl+C** in the terminal (answer `Y` if asked), or close the window, or double-click **`stop.bat`**.

## 8. Verify the AI tutor works

1. Check the key and model from the terminal (project root):
   ```
   npm run check:ai
   ```
   It prints `SUCCESS` plus a short Spanish reply, or a friendly error such as *invalid key*, *quota used up*, *model not found*, or *network problem*.
2. In the site open **¡Hola Amigo! AI tutor**. The grey line “Connected · model …” confirms the backend sees your key. Click a starter or type `Hola` and press Enter.
3. Try **Hint**, **Translate**, **Explain grammar** and **Correct my last message**.

If something is wrong, the tutor shows an honest red message with a **Retry** button. It never pretends to answer.

## 9. Everyday commands (project root)

| Command | Purpose |
|---|---|
| `npm start` | Run frontend + backend together |
| `npm test` | Run all automated tests |
| `npm run lint` | Static code checks |
| `npm run build` | Build the production website into `frontend/dist` |
| `npm run serve` | Build, then serve everything from one port: http://localhost:5000 |
| `npm run check:ai` | Test your Gemini key/model |
| `npm run check:secrets` | Scan for accidentally included secrets |

**Rebuilding / reinstalling:** if something is badly broken, delete the three `node_modules` folders (root, `backend`, `frontend`), then run `node scripts/setup.mjs` again.

## 10. Common errors and fixes

| Message / symptom | Fix |
|---|---|
| `node is not recognized` | Install Node LTS from nodejs.org, **close and reopen** VS Code, try again. |
| “Node.js … is too old” | Install the current LTS (needs 20.19+). |
| `Port 5000 is already in use` / `Port 5173 is in use` | Another copy is running. Run `stop.bat`, or change `PORT` in `.env` (and the proxy target in `frontend/vite.config.js`). |
| Tutor: “backend is not reachable” | You opened the site without starting the app. Use `start.bat` / `npm start`; keep the window open. |
| Tutor: “No Gemini API key is configured” | Section 6. Make sure you edited `.env`, not `.env.example`, and restarted. |
| “Google rejected the API key” | Key mistyped, extra spaces, or revoked. Create a new one in AI Studio. |
| “The free Gemini quota is used up” | Wait a minute (per-minute limit) or until the next day, or switch `GEMINI_MODEL` to a lighter model. |
| “model … is not available” | Pick another model from section 6 and restart. |
| “not available in your region” | Gemini API availability varies by country; check Google’s documentation. |
| Microphone button missing | Your browser lacks speech recognition (use Chrome/Edge). Typing always works. |
| Microphone blocked | Click the lock icon in the address bar → allow microphone. |
| White page after changes | Press Ctrl+Shift+R; check the terminal for red errors. |
| Progress “lost” | LocalStorage is per browser/profile; private windows and “clear site data” erase it. |
| PowerShell says scripts are disabled | Use the VS Code terminal in **Command Prompt** mode, or just double-click the `.bat` files. |

## 11. Security notes

* The API key lives only in `.env` on your computer, is read by the backend, and is never sent to the browser. The frontend only calls `/api/chat` on your own machine.
* Backend protections: input validation (message ≤ 1000 characters, level/mode/action must be from fixed lists, history capped at 12 turns), 20 KB request limit, 15 chat requests/minute per client, security headers (`helmet`), CORS limited to localhost, request timeouts, central error handler that never returns stack traces, logs without secrets or message text.
* It is **not** an open Gemini proxy: the client cannot send its own system prompt or model name.
* Treat the site as a **local learning tool**. Do not put it on the public internet without adding authentication and stricter rate limits.
* Run `npm run check:secrets` before sharing the folder.

## 12. Voice (optional)

* 🔊 speaker icons read Spanish aloud using your browser’s built-in voices. Quality depends on the Spanish voices installed in Windows/Chrome.
* 🎤 microphone uses the browser’s speech recognition to turn your speech into **text**; the tutor only ever sees that text. It cannot judge pronunciation and says so. Chrome/Edge may send audio to their own speech service.

## 13. Known limitations

* **Live Gemini not verified** by the builder (section 16). Model names and free-tier terms can change; update `GEMINI_MODEL` if needed.
* **Windows `.bat` files not run on Windows** by the builder.
* Spanish content was written and checked by an AI, not a certified teacher. It is deliberately conservative (standard Spain/Latin-America variants are labelled), but have a Spanish teacher spot-check it before using it formally. Report errors by editing the files in `frontend/src/data/`.
* The AI tutor can still make mistakes. It is instructed not to invent grammar rules, but verify important points.
* No accounts or cloud sync: progress stays in one browser.
* Exact dollar-free guarantees depend on your Google project settings: do not enable billing if you want to stay free.
* Responsive layout checked at 375, 768 and 1280 px in Chromium only.

## 14. How to demonstrate this to your professor (5–7 minutes)

1. **Pitch (30 s):** “Spanish learning built for engineers: technical vocabulary, campus situations, and an AI tutor.”
2. **Onboarding + dashboard:** choose a level; point out that all numbers start at zero and come from real activity.
3. **Learn Spanish:** open *SER vs ESTAR vs HAY*, show the tables, answer a practice question wrongly then rightly to show feedback, mark complete → watch the dashboard update.
4. **Tech Español:** search “red”, filter *Cybersecurity*, flip a flashcard, mark learned.
5. **Play & Practice:** run the daily challenge; show hint (half points), results page, badge unlock.
6. **Campus Español:** run the “Meeting a professor” role-play; pick a too-informal reply to show the corrective feedback.
7. **AI tutor:** type a sentence with a deliberate mistake (e.g. “Yo es estudiante”), press **Correct my last message**, then **Explain grammar**.
8. **Architecture (30 s):** show that the key is only in `.env` and the browser talks to `/api/chat` on your backend, which calls Gemini through the official SDK. Mention the 36 automated tests.

## 16. Test results (what was actually run)

Run on Linux with Node 22 and headless Chromium, 14 Oct 2026, **against a fresh extraction of this ZIP**.

| Check | Result |
|---|---|
| Backend automated tests (`npm test --prefix backend`): health, validation, oversize body, CORS block, 404 JSON, missing key, placeholder key, error mapping (invalid key / quota / network / timeout / model), safe errors, rate limit | **11 / 11 passed** (AI responses **mocked**) |
| Frontend unit tests: content minimums, unique IDs, answer validity, streaks, XP, duplicate-click protection, badge criteria, grading, daily challenge | **25 / 25 passed** |
| Lint (ESLint, frontend + backend) | **0 errors** |
| Production build | **Succeeded** |
| Browser end-to-end (Playwright/Chromium, 61 checks): onboarding, all routes, lessons, flashcards, search/filter, quizzes (all question types), scoring, retry, hints, badges, daily challenge, role-plays, tutor chat, hint/translate/explain/correct, persistence after reload, clear-with-confirm, backend-down / quota / bad-key / retry flows, level change, no horizontal overflow at 375/768/1280 px, skip link | **61 / 61 passed** (AI **mocked**; browser tests are not shipped in the ZIP) |
| Frontend ↔ backend connectivity through the dev proxy, on the extracted copy | Verified (`/api/health` through port 5173) |
| API key not in frontend bundle (planted a fake key in `.env`, rebuilt, searched `dist/`) | **Not found**; scanner negative control correctly fails on a leak |
| ZIP contents | No `node_modules`, no `.env`, no `dist`; `npm run check:secrets` passes |
| Setup script idempotence | Existing `.env` and key preserved, never printed |
| Real SDK code path with a fake key | Reaches the SDK and returns the friendly “could not reach Google” error (the test machine could not reach Google) |
| SDK parameters (`systemInstruction`, `temperature`, `maxOutputTokens`, `abortSignal`) | Confirmed against the SDK’s own type definitions |

**NOT tested:** a live Gemini call with a real key; `setup.bat` / `start.bat` / `stop.bat` on Windows; Firefox, Safari, Edge; real phones or screen readers; voice recognition; a formal colour-contrast audit (colours were chosen for contrast but not measured with a tool).

## 17. Disclaimer

Not affiliated with Google. Gemini is a trademark of Google LLC. This is an educational project.
