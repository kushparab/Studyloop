import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { callAIWithValidation } from './ai.js';
import { validateExtract, validateQuiz, validateDiagnose } from './schemas.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Root API info
app.get('/api', (req, res) => {
  res.json({
    status: 'ok',
    service: 'studyloop-proxy',
    endpoints: ['/api/health', '/api/extract', '/api/quiz', '/api/diagnose', '/api/sync']
  });
});

// Health check
app.get('/api/health', (req, res) => {
  const apiKey = process.env.AI_API_KEY || '';
  const hasKey = Boolean(apiKey.trim());
  const rtdbUrl = process.env.FIREBASE_DATABASE_URL || '';
  const provider = apiKey.startsWith('gsk_')
    ? 'groq'
    : apiKey.startsWith('nvapi-')
    ? 'nvidia'
    : apiKey.startsWith('sk-')
    ? 'openai'
    : 'gemini';

  res.json({
    status: 'ok',
    service: 'studyloop-proxy',
    hasApiKey: hasKey,
    hasDatabase: Boolean(rtdbUrl.trim()),
    provider: hasKey ? provider : 'none',
    model: process.env.AI_MODEL || 'default'
  });
});

/**
 * POST /api/sync
 * Saves app state to Firebase Realtime Database (/studyloop/latest.json)
 */
app.post('/api/sync', async (req, res) => {
  const rtdbUrl = process.env.FIREBASE_DATABASE_URL;
  if (!rtdbUrl || !rtdbUrl.trim()) {
    return res.status(200).json({ status: 'skipped', reason: 'No FIREBASE_DATABASE_URL configured' });
  }

  const { state } = req.body || {};
  if (!state || typeof state !== 'object') {
    return res.status(400).json({ error: 'Missing or invalid "state" payload' });
  }

  const cleanBase = rtdbUrl.trim().replace(/\/+$/, '');
  const targetUrl = `${cleanBase}/studyloop/latest.json`;

  try {
    const response = await fetch(targetUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...state,
        _syncedAt: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`Firebase RTDB returned HTTP ${response.status}`);
    }

    return res.json({ status: 'synced', timestamp: new Date().toISOString() });
  } catch (err) {
    console.warn(`[Firebase RTDB Sync] Error writing to RTDB: ${err.message}`);
    return res.status(502).json({ error: err.message, status: 'error' });
  }
});

/**
 * GET /api/sync
 * Retrieves the latest saved session state from Firebase Realtime Database
 */
app.get('/api/sync', async (req, res) => {
  const rtdbUrl = process.env.FIREBASE_DATABASE_URL;
  if (!rtdbUrl || !rtdbUrl.trim()) {
    return res.json({ state: null, reason: 'No FIREBASE_DATABASE_URL configured' });
  }

  const cleanBase = rtdbUrl.trim().replace(/\/+$/, '');
  const targetUrl = `${cleanBase}/studyloop/latest.json`;

  try {
    const response = await fetch(targetUrl);
    if (!response.ok) {
      throw new Error(`Firebase RTDB returned HTTP ${response.status}`);
    }

    const state = await response.json();
    return res.json({ state: state || null, status: 'ok' });
  } catch (err) {
    console.warn(`[Firebase RTDB Sync] Error reading from RTDB: ${err.message}`);
    return res.status(502).json({ error: err.message, state: null });
  }
});

/**
 * POST /api/extract
 * Input: { text: string, today: string }
 * Output: { deadlines: Deadline[], topics: Topic[], warnings: string[] }
 */
app.post('/api/extract', async (req, res) => {
  const { text, today } = req.body || {};
  const todayStr = today || new Date().toISOString().split('T')[0];

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Missing or invalid "text" field' });
  }

  const systemPrompt = `You extract study deadlines and topics from messy student text. Today is ${todayStr}. Resolve relative dates to YYYY-MM-DD. If a date is ambiguous, set dueDate to null and add a warning. Never invent deadlines. Return only JSON matching the schema.

Schema shape:
{
  "deadlines": [
    {
      "id": "d-1",
      "title": "Assignment title",
      "type": "assignment" | "exam" | "lab" | "test" | "other",
      "subject": "Course name",
      "dueDate": "YYYY-MM-DD" or null,
      "confidence": 0.0 to 1.0,
      "sourceSnippet": "exact short quote from text"
    }
  ],
  "topics": [
    {
      "id": "t-1",
      "subject": "Course name",
      "name": "Topic name",
      "weight": 1 to 5,
      "difficulty": 1 to 5,
      "examDate": "YYYY-MM-DD" or null,
      "mastery": 0.3
    }
  ],
  "warnings": ["string warning if any dates were ambiguous"]
}`;

  try {
    const data = await callAIWithValidation({
      systemPrompt,
      userPrompt: `Extract deadlines and topics from this input:\n\n${text}`,
      validator: validateExtract
    });

    return res.json(data);
  } catch (err) {
    console.error(`[AI Proxy /api/extract] Error: ${err.message}`);
    const status = err.message === 'AI_API_KEY_MISSING' ? 503 : 502;
    return res.status(status).json({
      error: err.message,
      fallbackRequired: true
    });
  }
});

/**
 * POST /api/quiz
 * Input: { topic: Topic, count: number }
 * Output: { questions: Question[] }
 */
app.post('/api/quiz', async (req, res) => {
  const { topic, count } = req.body || {};
  const questionCount = Number(count) || 5;

  if (!topic || typeof topic !== 'object' || !topic.name) {
    return res.status(400).json({ error: 'Missing or invalid "topic" object' });
  }

  const topicName = topic.name;
  const subjectName = topic.subject || 'General';

  const systemPrompt = `Write ${questionCount} multiple-choice questions for the topic. Exactly 4 options, one correct, a short explanation, and a conceptTag per question. Return only JSON.

Schema shape:
{
  "questions": [
    {
      "id": "q-1",
      "topicId": "${topic.id || 't-1'}",
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Brief explanation why this is correct",
      "conceptTag": "Specific concept tested"
    }
  ]
}`;

  try {
    const data = await callAIWithValidation({
      systemPrompt,
      userPrompt: `Generate ${questionCount} quiz questions for Subject: "${subjectName}", Topic: "${topicName}".`,
      validator: validateQuiz,
      validatorArg: topic.id || 't-1'
    });

    return res.json(data);
  } catch (err) {
    console.error(`[AI Proxy /api/quiz] Error: ${err.message}`);
    const status = err.message === 'AI_API_KEY_MISSING' ? 503 : 502;
    return res.status(status).json({
      error: err.message,
      fallbackRequired: true
    });
  }
});

/**
 * POST /api/diagnose
 * Input: { topic, questions, answers: [{questionId, userAnswerIndex}] }
 * Output: { mistakes: Mistake[] }
 */
app.post('/api/diagnose', async (req, res) => {
  const { topic, questions, answers } = req.body || {};

  if (!Array.isArray(questions) || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'Missing or invalid "questions" or "answers" array' });
  }

  // Filter only wrong answers
  const wrongAnswers = [];
  for (const ans of answers) {
    const q = questions.find((item) => item.id === ans.questionId);
    if (q && q.correctIndex !== ans.userAnswerIndex) {
      wrongAnswers.push({
        questionId: q.id,
        question: q.question,
        conceptTag: q.conceptTag,
        expectedIndex: q.correctIndex,
        expectedAnswer: q.options[q.correctIndex],
        userIndex: ans.userAnswerIndex,
        userAnswer: q.options[ans.userAnswerIndex]
      });
    }
  }

  // If no wrong answers, return empty mistakes immediately without calling AI
  if (wrongAnswers.length === 0) {
    return res.json({ mistakes: [] });
  }

  // Prioritize top 3 mistakes to prevent excessive generation latency
  const prioritizedWrong = wrongAnswers.slice(0, 3);

  const systemPrompt = `You are a concise study coach. For each wrong answer:
1. Classify type as "concept_gap", "calculation_slip", "careless_error", or "misread_question".
2. reason: 1 concise sentence (under 15 words).
3. fixTip: 1 actionable tip (under 15 words).
4. For concept_gap only, add 2 brief practice questions (4 options, 1 correct, concise explanation under 10 words).
Return ONLY JSON matching schema:

Schema shape:
{
  "mistakes": [
    {
      "id": "m-1",
      "questionId": "q-1",
      "topicId": "${topic?.id || 't-1'}",
      "userAnswerIndex": 1,
      "type": "concept_gap" | "calculation_slip" | "careless_error" | "misread_question",
      "reason": "One concise sentence reason",
      "fixTip": "One concise actionable tip",
      "practice": [
        {
          "id": "p-1",
          "topicId": "${topic?.id || 't-1'}",
          "question": "Brief practice question",
          "options": ["A", "B", "C", "D"],
          "correctIndex": 0,
          "explanation": "Brief explanation",
          "conceptTag": "Tag"
        },
        {
          "id": "p-2",
          "topicId": "${topic?.id || 't-1'}",
          "question": "Brief practice question 2",
          "options": ["A", "B", "C", "D"],
          "correctIndex": 1,
          "explanation": "Brief explanation",
          "conceptTag": "Tag"
        }
      ]
    }
  ]
}`;

  try {
    const data = await callAIWithValidation({
      systemPrompt,
      userPrompt: `Diagnose these missed quiz questions for topic "${topic?.name || 'Study Topic'}":\n${JSON.stringify(prioritizedWrong, null, 2)}`,
      validator: validateDiagnose
    });

    return res.json(data);
  } catch (err) {
    console.error(`[AI Proxy /api/diagnose] Error: ${err.message}`);
    const status = err.message === 'AI_API_KEY_MISSING' ? 503 : 502;
    return res.status(status).json({
      error: err.message,
      fallbackRequired: true
    });
  }
});

export default app;
