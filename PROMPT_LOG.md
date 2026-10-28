# StudyLoop - Prompt & Decision Log

## Prompt 1: Session Rules Confirmation
- **Prompt:** User set up the 10 core constraints for the 6-hour hackathon project StudyLoop.
- **Result:** Confirmed and aligned on all 10 rules. No code written.

## Prompt 2: Product Design & Scope
- **Prompt:** Defined the 5 screens, user flow, Must/Should/Cut list for 5-hour build, and acceptance criteria.
- **Result:** Designed 5-screen architecture (Capture, Confirm, Plan, Quiz, Insights), deterministic planning flow, failure-resilient AI proxy, and strict hackathon boundaries.

## Prompt 3: Project Scaffold & App Shell
- **Prompt:** Create project structure (Vite + React, Express proxy, concurrently dev runner, .env.example, .gitignore, engine/screens/tests placeholders), plus working app shell with accessible header, 5-step navigation, and placeholder screens.
- **Result:** Created directory structure, scripts, mock screens, step navigation with ARIA support, and initial test setup.

## Prompt 4: Deterministic Engine Implementation & Vitest Suite
- **Prompt:** Implement pure functions in `src/engine` (`priority.js`, `planner.js`, `clashes.js`, `mastery.js`) matching exact formulas with no UI and no AI. Add comprehensive tests in `tests/engine.test.js`.
- **Result:** Implemented all formulas, clash detectors, block allocator (rounding to 5m, min 20m, 3-topic daily cap, exam boundary cutoffs), and mastery update logic. All 13 unit tests passed cleanly.

## Prompt 5: Express AI Proxy & Client Fallback Integration
- **Prompt:** Build Express proxy endpoints (`/api/extract`, `/api/quiz`, `/api/diagnose`), Gemini caller with JSON-only stripping, hand-written schemas in `schemas.js`, 20s timeout, single retry, API key/user text confidentiality, and client fallback in `src/api.js` with visible banner. Provide curl commands.
- **Result:** Created `server/schemas.js`, `server/ai.js`, `server/index.js`, updated `src/data/sample.js` and `src/api.js`, added test suites (`tests/server.test.js`, `tests/client.test.js`). 26/26 tests passing.

## Prompt 6: Capture and Confirm Screens with Validation & LocalStorage
- **Prompt:** Build Capture screen (textarea, "Load sample messy chat" button, today's date, hours available per day, "Analyse" action, loading spinner, clear errors). Build Confirm screen (editable tables of deadlines & topics, add/delete rows, highlight null dates & confidence < 0.6 with blocking validation, show warnings list). Save/restore state with `localStorage`. Untouched engine.
- **Result:** Implemented `Capture.jsx`, `Confirm.jsx`, enhanced `App.jsx` and `store.js`, styled accessible mobile-first forms/tables/alerts in `index.css`. Built and verified with 0 build errors and 26 passing tests.

## Prompt 7: Mobile-First Plan Screen with Pure Engine Computations
- **Prompt:** Build Plan screen using only `src/engine` (no AI calls): (1) clash warnings panel with plain-language alerts & suggestions, (2) day-by-day plan blocks with topic, minutes, and reason, (3) topic & overall readiness % bars, (4) "Start quiz" button per topic. Mobile-readable.
- **Result:** Built `Plan.jsx` calling pure engine functions (`detectClashes`, `generateDailyPlan`, `calculateReadiness`, `sortTopicsByPriority`), added mobile-first CSS styling, and connected `onStartQuiz` in `App.jsx`. All 26 tests passing, 0 build errors.

## Prompt 8: Active Quiz Runner with Keyboard Support & Demo Mode
- **Prompt:** Build Quiz screen calling `/api/quiz` (5 questions) with one question at a time, large tap targets, keyboard navigation (1-4, A-D, Enter), answer tracking, summary with score and explanations, "Analyse my mistakes" action, sample fallback, and a clearly labeled "Demo mode: answer wrong deliberately" toggle for live presentations.
- **Result:** Implemented `Quiz.jsx`, wired `onCompleteQuiz` in `App.jsx`, styled large option buttons, keyboard listeners, score hero card, and question review list. Built and verified cleanly with 26 passing tests.

## Prompt 9: Mistake Diagnosis & Closed-Loop Engine Re-plan (Insights Screen)
- **Prompt:** Implement Insights screen and the closed loop: call `/api/diagnose`, display mistake taxonomy with color-and-text badges (`concept_gap`, `calculation_slip`, `careless_error`, `misread_question`), reasons, fix tips, practice questions for concept gaps. Update mastery via `mastery.js`, re-run `planner.js`, show before-and-after readiness % and changed plan for next 3 days with "Why this changed" lines. Persist in `localStorage`.
- **Result:** Created `Insights.jsx`, updated `App.jsx` and `index.css`. Fully connected the closed study loop with real-time before/after metrics and dynamic daily minutes reallocation. All 26 tests passing, 0 build errors.

## Prompt 10: Comprehensive Accessibility (a11y) & Usability Audit
- **Prompt:** Review whole UI for a11y & clarity: labels on every input, logical tab order, visible focus, WCAG AA contrast, min 44px buttons, 360px mobile viewport, friendly empty/error states, no color alone. List problems found first, then apply minimal targeted fixes.
- **Result:** Identified 4 concrete issues (sub-44px buttons in `.btn-sm`, `.btn-icon-danger`, and `.badge-warning-btn`; low contrast on faded strikethrough text and amber badges; table focus ring clipping; card padding on 360px mobile). Applied minimal targeted fixes. 26/26 tests passing, 0 build errors.
