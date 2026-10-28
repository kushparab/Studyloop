# StudyLoop 🔁🎓

> **AI-Guided Study Planning & Diagnostic Closed Loop**  
> *Built for the Education & Student Life Track (6-Hour Hackathon Project)*

StudyLoop transforms messy syllabi, assignment notices, and exam dates into a dynamically balanced daily study schedule. It pairs a **deterministic pure-function planning engine** with **AI-powered mistake diagnosis**: every quiz error re-weights future study blocks toward your exact weak spots, raising your overall readiness score.

---

## 🌟 The Core Loop

```
1. CAPTURE  ──► Paste messy student chat or announcements (AI extracts dates & topics)
2. CONFIRM  ──► Verify topics, add missing dates, and validate low-confidence rows
3. PLAN     ──► Pure mathematical planning engine schedules daily study blocks & flags clashes
4. QUIZ     ──► 5-question active recall check (keyboard navigable, one question at a time)
5. INSIGHTS ──► AI classifies mistakes (Concept Gap vs Slip), engine dynamically re-weights future plan!
```

---

## 🛠️ Tech Stack & Architecture

- **Frontend:** Plain JavaScript, React 18, Vite, Mobile-first Plain CSS (zero UI libraries, zero TypeScript).
- **Backend Proxy:** Express (Port 3001) with 45-second timeout, input validation, and single retry.
- **Provider Support:** Multi-provider client supporting **NVIDIA NIM** (`nvapi-...`), **Google Gemini** (`AIza...`), and **OpenAI** (`sk-...`).
- **Engine Core:** 100% deterministic pure functions in `src/engine/` (`priority.js`, `planner.js`, `clashes.js`, `mastery.js`).
- **Unit Testing:** Vitest (26 passing tests across engine, server schemas, and client fallbacks).
- **Storage:** Client-side persistence via `localStorage` (restores state seamlessly across refreshes).
- **Accessibility:** WCAG AA compliant contrast, logical tab ordering, visible 3px focus rings, $\ge 44\text{px}$ touch targets, and color-and-text badges.

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
# Clone the repository
git clone https://github.com/kushparab/studyloop.git
cd studyloop

# Install dependencies
npm install
```

### 2. Environment Setup (Optional)
StudyLoop includes complete offline sample fixtures and will work out of the box even without API keys. To connect live AI generation:

```bash
cp .env.example .env
```
Edit `.env` with your API key:
```env
PORT=3001
AI_API_KEY=your_key_here
AI_MODEL=nvidia/nemotron-3.5-super-vl-120b-a12b
```

### 3. Run Development Server
```bash
# Concurrently launches Vite (port 5173) and Express proxy (port 3001)
npm run dev
```
Open **`http://localhost:5173`** in your browser.

### 4. Run Automated Test Suite
```bash
npm test
```

---

## 🌐 Deploy to Vercel

StudyLoop is pre-configured for 1-click deployment on [Vercel](https://vercel.com) using **Vercel Serverless Functions** and **Vite static hosting**:

1. **Import the Project:**
   - Head to [Vercel Dashboard](https://vercel.com/new).
   - Click **Add New Project** and import the `kushparab/studyloop` repository.
2. **Framework Preset:**
   - Vercel automatically detects **Vite** (Build command: `vite build`, Output directory: `dist`).
3. **Environment Variables:**
   - Add the following in the **Environment Variables** section:
     - `AI_API_KEY`: `your_nim_or_gemini_or_openai_api_key` (e.g. `nvapi-...`)
     - `AI_MODEL`: `nvidia/nemotron-3.5-super-vl-120b-a12b` (or your chosen provider model)
4. **Deploy:**
   - Click **Deploy**.
   - Vercel routes `/api/*` to the serverless proxy in `api/index.js` (with a 60-second execution window configured in `vercel.json`) and serves the Vite single-page application at the root.

---

## 📐 The Deterministic Math

1. **Urgency & Priority Formulation:**
   $$\text{daysLeft} = \max(0, \text{days from today to examDate})$$
   $$\text{urgency} = 1 + \frac{3}{\text{daysLeft} + 1}$$
   $$\text{priority} = \text{weight} \times \text{difficulty} \times (1 - \text{mastery}) \times \text{urgency}$$

2. **Mastery Update After Quiz:**
   $$\text{newMastery} = 0.4 \times \text{oldMastery} + 0.6 \times \text{quizScore} - (0.1 \times \text{conceptGaps})$$

3. **Readiness Percentage:**
   $$\text{Readiness \%} = \frac{\sum (\text{weight}_i \times \text{mastery}_i)}{\sum \text{weight}_i} \times 100$$

4. **Clash Detection Rules:**
   - **Rule (a):** 2 or more deadlines falling on the same day (`same_day_deadlines`).
   - **Rule (b):** Exam within 48 hours ($\le 2$ days) of another deadline (`exam_proximity`).
   - **Rule (c):** 2+ deadlines on a day with $< 3$ available study hours (`overload`).

---

## 📋 Manual QA Test Checklist

| ID | Feature / Flow | Test Scenario | Expected Result | Status |
|:---|:---|:---|:---|:---:|
| **TC-01** | Capture Screen | Click "Load sample messy chat" | Textarea, today's date, and hours populate immediately | Pass |
| **TC-02** | Capture Screen | Submit empty textarea | Inline error shows; extraction does not trigger | Pass |
| **TC-03** | Capture Screen | Hours input validation | Enforces min 0.5h; prevents negative study capacity | Pass |
| **TC-04** | Extraction API | Offline proxy / invalid key fallback | App loads sample data with visible "(AI unavailable)" banner | Pass |
| **TC-05** | Confirm Screen | Extracted item with null date | Row highlighted in amber; "Generate Plan" button disabled | Pass |
| **TC-06** | Confirm Screen | Edit null date to valid `YYYY-MM-DD` | Highlight clears; "Generate Plan" button immediately unlocks | Pass |
| **TC-07** | Confirm Screen | Low confidence item (< 0.6) | Badge shows "Low Conf"; clicking verifies item | Pass |
| **TC-08** | Confirm Screen | Add / Delete table rows | New row created with defaults; deleted row removed from state | Pass |
| **TC-09** | Plan Screen | Clash detection rule (a) | 2 deadlines on same day show warning & suggested action | Pass |
| **TC-10** | Plan Screen | Clash detection rule (b) | Exam within 48h of another deadline shows warning & action | Pass |
| **TC-11** | Plan Screen | Clash detection rule (c) | 2+ deadlines with < 3h available shows overload warning | Pass |
| **TC-12** | Plan Screen | Daily study block sizing | Every block is ≥ 20m and rounded to nearest 5m | Pass |
| **TC-13** | Plan Screen | Max 3 topics per day cap | No day contains more than 3 scheduled topic blocks | Pass |
| **TC-14** | Plan Screen | Exam date boundary | Topics are never scheduled after their exam date | Pass |
| **TC-15** | Quiz Screen | Single-question runner | Shows 1 question at a time with counter (e.g. 1 of 5) | Pass |
| **TC-16** | Quiz Screen | Keyboard hotkeys | Pressing A–D or 1–4 selects option; Enter advances | Pass |
| **TC-17** | Quiz Screen | Live Demo Mode toggle | "Auto-fill 100% wrong answers" fills wrong options and submits | Pass |
| **TC-18** | Quiz Screen | Question review summary | Shows correct vs missed answers with explanations | Pass |
| **TC-19** | Insights Screen | Mistake taxonomy display | Badges show text + color + icon (🔴 Concept Gap, etc.) | Pass |
| **TC-20** | Insights Screen | Concept gap practice | Concept gap mistakes render 2 targeted practice questions | Pass |
| **TC-21** | Insights Screen | Before & after readiness | Strikethrough before score, new score, and delta badge show | Pass |
| **TC-22** | Insights Screen | Next 3 days schedule diff | Shows previous vs new minutes with "Why this changed" line | Pass |
| **TC-23** | Persistence | Browser refresh (`F5`) | Restores current screen and all user data from localStorage | Pass |
| **TC-24** | Accessibility | Keyboard navigation & focus | Visible 3px outline on all active elements; logical tab order | Pass |
| **TC-25** | Responsiveness | Mobile viewport (360px width) | All cards, buttons, and tables fit without page horizontal break | Pass |

---

## 🔒 Security & Privacy Guarantee
- **Zero API Key Leakage:** Keys are loaded strictly from the server `.env` file and are never sent or bundled into client code.
- **Privacy:** Student notes and raw syllabus texts are never stored on external databases or logged to system logs.
