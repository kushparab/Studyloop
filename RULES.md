# StudyLoop - Rules of Engagement

1. **Small, working increments:** Build only what is asked in each prompt.
2. **Verification after every change:** Provide exact commands to run and verify functionality after every step.
3. **No heavy dependencies:** Plain JavaScript, Vite + React, Express proxy, Vitest, plain CSS. No TypeScript, no UI libraries, no external databases, no auth.
4. **Deterministic planning core:** Planning logic is pure functions in `src/engine`. AI is used strictly for extraction, quiz generation, and mistake diagnosis.
5. **Robust AI contracts:** All AI responses must be validated JSON. On failure, retry once, then fallback to cached sample responses.
6. **API key security:** Never put API keys in client code. Read keys from server `.env` only.
7. **Code preservation:** Never rewrite working files without explanation. Explain changes before applying them.
8. **Accessible by default:** Semantic HTML, explicit `<label>` elements for inputs, full keyboard navigation, visible `:focus-visible` outlines, WCAG contrast standards, and mobile-first layout.
9. **UI transparency:** Explicitly label all sample, mock, and AI-generated data in the UI.
10. **Explainable code:** Maintain short, clear comments so any student or hackathon judge can read and understand the implementation easily.
