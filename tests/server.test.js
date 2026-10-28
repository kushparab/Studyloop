import { describe, it, expect } from 'vitest';
import { stripFences } from '../server/ai.js';
import { validateExtract, validateQuiz, validateDiagnose } from '../server/schemas.js';

describe('Server & Schema Validators', () => {
  describe('stripFences', () => {
    it('removes markdown json code fences', () => {
      const raw = '```json\n{"deadlines":[],"topics":[]}\n```';
      expect(stripFences(raw)).toBe('{"deadlines":[],"topics":[]}');
    });

    it('removes plain triple backticks', () => {
      const raw = '```\n{"test": true}\n```';
      expect(stripFences(raw)).toBe('{"test": true}');
    });

    it('returns trimmed string if no fences', () => {
      const raw = '  {"test": true}  ';
      expect(stripFences(raw)).toBe('{"test": true}');
    });
  });

  describe('validateExtract', () => {
    it('sanitizes valid deadlines and topics', () => {
      const input = {
        deadlines: [
          {
            id: 'd-1',
            title: 'Quiz 1',
            type: 'test',
            subject: 'Math',
            dueDate: '2026-11-04',
            confidence: 0.9,
            sourceSnippet: 'Math Quiz 1 on Nov 4'
          }
        ],
        topics: [
          {
            id: 't-1',
            subject: 'Math',
            name: 'Linear Algebra',
            weight: 4,
            difficulty: 3,
            examDate: '2026-11-04'
          }
        ],
        warnings: []
      };

      const result = validateExtract(input);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedData.deadlines).toHaveLength(1);
      expect(result.sanitizedData.topics).toHaveLength(1);
      expect(result.sanitizedData.topics[0].mastery).toBe(0.3); // default 0.3
    });

    it('converts ambiguous / invalid date to null', () => {
      const input = {
        deadlines: [
          {
            id: 'd-2',
            title: 'Project Draft',
            type: 'assignment',
            subject: 'English',
            dueDate: 'next Tuesday', // ambiguous relative date string not resolved to YYYY-MM-DD
            confidence: 0.4
          }
        ],
        topics: []
      };

      const result = validateExtract(input);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedData.deadlines[0].dueDate).toBeNull();
    });

    it('rejects empty payload without deadlines or topics', () => {
      const result = validateExtract({ deadlines: [], topics: [] });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('contains neither deadlines nor topics');
    });
  });

  describe('validateQuiz', () => {
    it('validates questions with exactly 4 options and valid correctIndex', () => {
      const input = {
        questions: [
          {
            id: 'q-1',
            topicId: 't-1',
            question: 'What is 2 + 2?',
            options: ['1', '2', '3', '4'],
            correctIndex: 3,
            explanation: 'Basic arithmetic',
            conceptTag: 'Addition'
          }
        ]
      };

      const result = validateQuiz(input);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedData.questions[0].correctIndex).toBe(3);
    });

    it('rejects questions with fewer than 4 options', () => {
      const input = {
        questions: [
          {
            id: 'q-1',
            question: 'Incomplete question',
            options: ['A', 'B'], // only 2 options
            correctIndex: 0
          }
        ]
      };

      const result = validateQuiz(input);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must have exactly 4 options');
    });
  });

  describe('validateDiagnose', () => {
    it('enforces 2 practice questions for concept_gap mistakes', () => {
      const input = {
        mistakes: [
          {
            id: 'm-1',
            questionId: 'q-1',
            topicId: 't-1',
            userAnswerIndex: 2,
            type: 'concept_gap',
            reason: 'Did not know rule',
            fixTip: 'Review rule',
            practice: [
              {
                id: 'p-1',
                question: 'Practice 1',
                options: ['A', 'B', 'C', 'D'],
                correctIndex: 0
              },
              {
                id: 'p-2',
                question: 'Practice 2',
                options: ['A', 'B', 'C', 'D'],
                correctIndex: 1
              }
            ]
          }
        ]
      };

      const result = validateDiagnose(input);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedData.mistakes[0].practice).toHaveLength(2);
    });

    it('ensures practice questions are empty for non-concept-gap mistakes', () => {
      const input = {
        mistakes: [
          {
            id: 'm-2',
            questionId: 'q-2',
            topicId: 't-1',
            userAnswerIndex: 1,
            type: 'careless_error',
            reason: 'Misread the operator',
            fixTip: 'Check negative signs',
            practice: [{ question: 'Practice' }] // should be stripped for careless error
          }
        ]
      };

      const result = validateDiagnose(input);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedData.mistakes[0].practice).toHaveLength(0);
    });
  });
});
