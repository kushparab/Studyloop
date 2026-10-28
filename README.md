# StudyLoop 🔁

> **Hand-Crafted Study Notebook & Adaptive Diagnostic Loop**  
> *What to study today, adjusted by what you got wrong.*  
> Built for the Education & Student Life Track

StudyLoop turns messy syllabi, course announcements, Discord messages, and exam dates into a dynamically balanced daily study schedule. It combines a **deterministic pure-function planning engine** with an **adaptive mistake diagnosis loop**: every quiz mistake re-weights your future study sessions toward your exact weak spots, raising your overall readiness score.

---

## 📖 The Core Loop

```
1. CAPTURE  ──► Drop in messy student chat, announcements, or syllabus text
2. CONFIRM  ──► Verify topics, resolve date ambiguities, and approve study scope
3. PLAN     ──► Mathematical engine schedules daily blocks & detects overload clashes
4. QUIZ     ──► 5-question active recall checkpoint (keyboard-ready, one question at a time)
5. INSIGHTS ──► Classifies mistakes, engine reshuffles future blocks to close knowledge gaps!
```

---

## ✨ Features & Design Highlights

### 📓 Hand-Made Study Notebook UI
- **Tactile Paper Aesthetic:** Warm paper background (`#F4EFE6`), crisp notebook card surfaces (`#FFFDF8`), dark ink (`#14110F`), vermilion accent fills (`#C93A1E`), and highlighter yellow callouts (`#F5C842`).
- **Confident Geometry:** 2px solid ink borders, tactile 4px hard unblurred shadows (`4px 4px 0 #14110F`) that lift on hover and depress on click.
- **Dotted Grid Texture:** Subtle 20px `#E5DDCF` dotted grid pattern across the notebook paper background.
- **Lined Paper Textarea:** 32px ruled notebook paper texture in the capture input for comfortable typing.
- **Inline Line SVGs:** 100% custom 2px line SVG icons — zero emojis used as UI icons.
- **Editorial Typography:** [Fraunces](https://fonts.google.com/specimen/Fraunces) for expressive serif headings, [DM Sans](https://fonts.google.com/specimen/DM+Sans) for legible body text, and [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) for dates, minutes, and scores.

### 📐 Desktop Two-Column Layout & Stepper
- **Centered 1200px Container:** The brand mark, tagline, and screen cards share the exact same left margin on desktop.
- **Asymmetric Desktop Grid:** At $\ge 1024\text{px}$, the screen splits into a 62% primary workspace and a 38% companion sidebar featuring the "How StudyLoop works" 4-step guide and contextual notebook tips. Stacks cleanly on mobile.
- **High-Contrast Stepper:** Active step labels render in bold dark ink (`#14110F`) with $>14:1$ AAA contrast ratio across all 5 workflow steps (Capture, Confirm, Plan, Quiz, Insights). Compact single-row layout under 64px on mobile devices.

### ⚙️ Deterministic Planning Engine
- **Hallucination-Free Math:** 100% pure functions in `src/engine/` calculate urgency, topic priorities, and daily schedules without randomness or drift.
- **Clash & Crunch Detection:** Detects same-day exam clashes, 48-hour exam proximities, and overload situations when daily study capacity is exceeded.
- **Block Allocation:** Automatically sizes study blocks to $\ge 20$ minutes rounded to 5-minute increments, capped at 3 topics per day.

### 🧠 Adaptive Mistake Diagnosis
- **Mistake Taxonomy:** Categorizes errors into distinct types: *Concept Gap*, *Calculation Slip*, *Careless Error*, and *Misread Question*.
- **Plan Reshuffle:** Dynamically shifts upcoming study blocks from high-mastery topics to topics with detected concept gaps, calculating before-and-after schedule diffs.
- **Targeted Practice:** Generates follow-up reinforcement questions for identified concept gaps.

### ☁️ Cloud Persistence (Firebase Realtime Database)
- **Automatic Cloud Sync:** Seamlessly syncs approved syllabus topics, generated study plans, and diagnostic results to a Firebase Realtime Database in the background.
- **Dual Persistence:** Automatically pairs browser `localStorage` persistence with remote cloud backup.

---

## 🛠️ Tech Stack & Architecture

- **Frontend:** React 18, Vite, Vanilla CSS with custom design tokens (`src/styles/theme.css`). Zero heavy UI component libraries.
- **Backend / Serverless:** Express local proxy server (`server/`) and Vercel Serverless Function (`api/index.js`).
- **Database:** Firebase Realtime Database integration for cloud session storage.
- **Testing:** [Vitest](https://vitest.dev/) automated test suite with 26 unit and integration tests.
- **Accessibility:** WCAG AA/AAA compliant contrast ratios, 3px focus rings with 2px offset, minimum 44px tap targets, and full keyboard navigation.

---

## 🚀 Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/kushparab/Studyloop.git
cd Studyloop
npm install
```

### 2. Run Locally
```bash
# Starts the client and proxy concurrently
npm run dev
```
Open **`http://localhost:5173`** in your browser.

> StudyLoop includes realistic student fixtures and runs fully offline with built-in sample data out of the box.

### 3. Run Automated Tests
```bash
npm test
```
Runs all 26 unit and integration tests across the planning engine, server endpoints, and client fallback behavior.

---

## 🌐 Deployment to Vercel

StudyLoop is pre-configured for automated deployment on [Vercel](https://vercel.com):

1. **Connect Repository:** Import `kushparab/Studyloop` in the Vercel Dashboard.
2. **Preset:** Select **Vite** (Build Command: `npm run build`, Output Directory: `dist`).
3. **Serverless Functions:** Vercel automatically maps `/api/*` requests to `api/index.js` as defined in `vercel.json`.
4. **Deploy:** Click **Deploy**. Each commit pushed to the `main` branch automatically triggers a redeployment.

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
   - **Same-Day Deadlines:** Multiple deadlines on the same calendar day.
   - **Exam Proximity:** An exam within 48 hours ($\le 2$ days) of another deadline.
   - **Overload:** Multiple deadlines on a day where available study hours are $< 3\text{h}$.

---

## 📋 Test Matrix

| ID | Flow | Verification Scenario | Status |
|:---|:---|:---|:---:|
| **TC-01** | Capture | "Load sample messy chat" button populates text, date, and hours via inline line SVG | Pass |
| **TC-02** | Capture | Form validation prevents submission with empty input | Pass |
| **TC-03** | Capture | Daily capacity input enforces $\ge 0.5\text{h}$ positive numbers | Pass |
| **TC-04** | Confirm | Missing dates trigger amber highlighter warnings and disable plan generation | Pass |
| **TC-05** | Confirm | Adding or editing dates immediately unlocks plan generation | Pass |
| **TC-06** | Confirm | Low confidence extractions are visually badged with manual verification toggle | Pass |
| **TC-07** | Plan | Clash detection identifies same-day, proximity, and overload conflicts | Pass |
| **TC-08** | Plan | Study blocks are rounded to 5-minute increments and capped at 3 topics/day | Pass |
| **TC-09** | Plan | Topics are strictly bounded before their exam deadlines | Pass |
| **TC-10** | Quiz | Keyboard navigation supports options A–D / 1–4 and Enter key | Pass |
| **TC-11** | Quiz | Demo mode enables instant answer simulation for rapid evaluation | Pass |
| **TC-12** | Insights | Mistake taxonomy categorizes errors into concept gaps and slips | Pass |
| **TC-13** | Insights | Dynamic plan diff highlights schedule re-allocations and provides reasons | Pass |
| **TC-14** | Sync | Firebase RTDB sync persists plan and diagnostic data to the cloud | Pass |
| **TC-15** | Accessibility | Minimum 4.5:1 text contrast and 3px focus rings on all interactive elements | Pass |
| **TC-16** | Layout | Responsive 360px mobile viewport with zero horizontal overflow | Pass |

---

## 📄 License

MIT License. Built for the Education & Student Life Track.
