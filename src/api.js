/**
 * Client API Client with Graceful Fallback
 *
 * Rules:
 * - Never includes API keys in client code.
 * - Calls Express proxy endpoints (/api/extract, /api/quiz, /api/diagnose).
 * - If server fails or times out, seamlessly falls back to cached responses
 *   from src/data/sample.js and returns a visible banner flag.
 */

import {
  SAMPLE_EXTRACT_RESPONSE,
  SAMPLE_QUIZ_RESPONSE,
  SAMPLE_DIAGNOSE_RESPONSE
} from './data/sample.js';

const FALLBACK_BANNER = 'Using sample data (AI unavailable)';

/**
 * Helper to execute client fetch with client-side abort timeout.
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 50000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Extracts deadlines and topics from raw student text.
 *
 * @param {object} params - { text: string, today?: string }
 * @returns {Promise<{ deadlines: Array, topics: Array, warnings: Array, isFallback: boolean, banner: string|null }>}
 */
export async function extractFromText({ text, today }) {
  try {
    const res = await fetchWithTimeout('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, today })
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const data = await res.json();
    return {
      deadlines: data.deadlines || [],
      topics: data.topics || [],
      warnings: data.warnings || [],
      isFallback: false,
      banner: null
    };
  } catch (err) {
    console.warn(`[StudyLoop API Client] /api/extract fallback triggered: ${err.message}`);
    return {
      ...SAMPLE_EXTRACT_RESPONSE,
      isFallback: true,
      banner: FALLBACK_BANNER
    };
  }
}

/**
 * Generates multiple choice questions for a topic.
 *
 * @param {object} params - { topic: object, count?: number }
 * @returns {Promise<{ questions: Array, isFallback: boolean, banner: string|null }>}
 */
export async function generateQuiz({ topic, count = 5 }) {
  try {
    const res = await fetchWithTimeout('/api/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, count })
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const data = await res.json();
    return {
      questions: data.questions || [],
      isFallback: false,
      banner: null
    };
  } catch (err) {
    console.warn(`[StudyLoop API Client] /api/quiz fallback triggered: ${err.message}`);
    return {
      ...SAMPLE_QUIZ_RESPONSE,
      isFallback: true,
      banner: FALLBACK_BANNER
    };
  }
}

/**
 * Diagnoses quiz mistakes and produces classifications + practice questions.
 *
 * @param {object} params - { topic: object, questions: Array, answers: Array }
 * @returns {Promise<{ mistakes: Array, isFallback: boolean, banner: string|null }>}
 */
export async function diagnoseMistakes({ topic, questions, answers }) {
  try {
    const res = await fetchWithTimeout('/api/diagnose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, questions, answers })
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const data = await res.json();
    return {
      mistakes: data.mistakes || [],
      isFallback: false,
      banner: null
    };
  } catch (err) {
    console.warn(`[StudyLoop API Client] /api/diagnose fallback triggered: ${err.message}`);
    return {
      ...SAMPLE_DIAGNOSE_RESPONSE,
      isFallback: true,
      banner: FALLBACK_BANNER
    };
  }
}
