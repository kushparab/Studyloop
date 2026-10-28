import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { callAIWithValidation } from './ai.js';
import { validateExtract, validateQuiz, validateDiagnose } from './schemas.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/api/health', (req, res) => {
  const apiKey = process.env.AI_API_KEY || '';
  const hasKey = Boolean(apiKey.trim());
  const provider = apiKey.startsWith('nvapi-')
    ? 'nvidia'
    : apiKey.startsWith('sk-')
    ? 'openai'
    : 'gemini';

  res.json({
    status: 'ok',
    service: 'studyloop-proxy',
    hasApiKey: hasKey,
    provider: hasKey ? provider : 'none',
    model: process.env.AI_MODEL || 'default'
  });
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

  const systemPrompt = `You are a study coach. For each wrong answer classify the mistake as concept_gap, calculation_slip, careless_error or misread_question, give a one-sentence reason and fix tip. For concept_gap only, add 2 new practice questions. Return only JSON.

Schema shape:
{
  "mistakes": [
    {
      "id": "m-1",
      "questionId": "q-1",
      "topicId": "${topic?.id || 't-1'}",
      "userAnswerIndex": 1,
      "type": "concept_gap" | "calculation_slip" | "careless_error" | "misread_question",
      "reason": "One-sentence diagnosis of why this mistake occurred",
      "fixTip": "One-sentence actionable fix tip",
      "practice": [
        {
          "id": "p-1",
          "topicId": "${topic?.id || 't-1'}",
          "question": "Practice question 1",
          "options": ["A", "B", "C", "D"],
          "correctIndex": 0,
          "explanation": "Why correct",
          "conceptTag": "Tag"
        },
        {
          "id": "p-2",
          "topicId": "${topic?.id || 't-1'}",
          "question": "Practice question 2",
          "options": ["A", "B", "C", "D"],
          "correctIndex": 2,
          "explanation": "Why correct",
          "conceptTag": "Tag"
        }
      ]
    }
  ]
}`;

  try {
    const data = await callAIWithValidation({
      systemPrompt,
      userPrompt: `Diagnose these missed quiz questions for topic "${topic?.name || 'Study Topic'}":\n${JSON.stringify(wrongAnswers, null, 2)}`,
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

app.listen(PORT, () => {
  console.log(`[StudyLoop Server] Proxy listening on http://localhost:${PORT}`);
});
