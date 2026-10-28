import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractFromText, generateQuiz, diagnoseMistakes } from '../src/api.js';

describe('Client API Fallback Behavior', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('extractFromText falls back gracefully to sample data on fetch error', async () => {
    // Mock global fetch to simulate network error / server down
    global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    const result = await extractFromText({ text: 'Some random text', today: '2026-10-28' });
    expect(result.isFallback).toBe(true);
    expect(result.banner).toBe('Using sample data (AI unavailable)');
    expect(result.deadlines.length).toBeGreaterThan(0);
    expect(result.topics.length).toBeGreaterThan(0);
  });

  it('generateQuiz falls back gracefully to sample data on HTTP 502/503', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: 'AI_API_KEY_MISSING', fallbackRequired: true })
    });

    const result = await generateQuiz({ topic: { id: 't-1', name: 'DP' } });
    expect(result.isFallback).toBe(true);
    expect(result.banner).toBe('Using sample data (AI unavailable)');
    expect(result.questions.length).toBe(5);
  });

  it('diagnoseMistakes falls back gracefully to sample data on timeout', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('The operation was aborted'));

    const result = await diagnoseMistakes({
      topic: { id: 't-1' },
      questions: [],
      answers: []
    });
    expect(result.isFallback).toBe(true);
    expect(result.banner).toBe('Using sample data (AI unavailable)');
    expect(result.mistakes.length).toBeGreaterThan(0);
  });
});
