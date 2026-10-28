import { describe, it, expect } from 'vitest';
import {
  calculateDaysLeft,
  calculateUrgency,
  calculateTopicPriority,
  sortTopicsByPriority
} from '../src/engine/priority.js';
import { generateDailyPlan } from '../src/engine/planner.js';
import { detectClashes } from '../src/engine/clashes.js';
import {
  calculateNewMastery,
  updateTopicAfterQuiz,
  calculateReadiness
} from '../src/engine/mastery.js';

describe('StudyLoop Engine Tests', () => {
  const TODAY = '2026-11-01';

  // 1. Priority ordering
  describe('Priority Ordering', () => {
    it('ranks urgent, high-difficulty, low-mastery topics higher', () => {
      const urgentTopic = {
        id: 't-urgent',
        name: 'Calculus Integrals',
        weight: 4,
        difficulty: 4,
        mastery: 0.2, // low mastery
        examDate: '2026-11-03' // 2 days away
      };

      const distantTopic = {
        id: 't-distant',
        name: 'History Intro',
        weight: 2,
        difficulty: 2,
        mastery: 0.8, // high mastery
        examDate: '2026-11-15' // 14 days away
      };

      const pUrgent = calculateTopicPriority(urgentTopic, TODAY);
      const pDistant = calculateTopicPriority(distantTopic, TODAY);

      expect(pUrgent).toBeGreaterThan(pDistant);

      const sorted = sortTopicsByPriority([distantTopic, urgentTopic], TODAY);
      expect(sorted[0].id).toBe('t-urgent');
      expect(sorted[1].id).toBe('t-distant');
    });

    it('falls back to 14 daysLeft when examDate is missing', () => {
      const days = calculateDaysLeft(null, TODAY);
      expect(days).toBe(14);
      const urgency = calculateUrgency(days);
      expect(urgency).toBeCloseTo(1 + 3 / 15, 3);
    });
  });

  // 2. Plan never schedules a topic after its exam
  describe('Exam Date Boundary Enforcement', () => {
    it('never schedules a topic after its exam date', () => {
      const topics = [
        {
          id: 't-early-exam',
          name: 'Early Physics Exam',
          weight: 4,
          difficulty: 3,
          mastery: 0.2,
          examDate: '2026-11-02'
        },
        {
          id: 't-late-exam',
          name: 'Late Computer Science Exam',
          weight: 4,
          difficulty: 3,
          mastery: 0.2,
          examDate: '2026-11-05'
        }
      ];

      const plan = generateDailyPlan(topics, { today: TODAY, hoursPerDay: 2 });
      expect(plan.length).toBeGreaterThan(0);

      // Verify that after 2026-11-02, t-early-exam is NEVER scheduled
      const postExamBlocks = plan.filter(
        (block) => block.topicId === 't-early-exam' && block.date > '2026-11-02'
      );
      expect(postExamBlocks).toHaveLength(0);

      // Verify it was scheduled on or before exam day
      const validBlocks = plan.filter(
        (block) => block.topicId === 't-early-exam' && block.date <= '2026-11-02'
      );
      expect(validBlocks.length).toBeGreaterThan(0);
    });
  });

  // 3. 3-topic daily cap
  describe('Daily Topic Cap', () => {
    it('enforces a maximum of 3 topics per single day', () => {
      const topics = [
        { id: 't-1', name: 'Topic 1', weight: 5, difficulty: 4, mastery: 0.1, examDate: '2026-11-04' },
        { id: 't-2', name: 'Topic 2', weight: 4, difficulty: 3, mastery: 0.2, examDate: '2026-11-04' },
        { id: 't-3', name: 'Topic 3', weight: 3, difficulty: 3, mastery: 0.3, examDate: '2026-11-04' },
        { id: 't-4', name: 'Topic 4', weight: 2, difficulty: 2, mastery: 0.4, examDate: '2026-11-04' },
        { id: 't-5', name: 'Topic 5', weight: 1, difficulty: 1, mastery: 0.5, examDate: '2026-11-04' }
      ];

      const plan = generateDailyPlan(topics, { today: TODAY, hoursPerDay: 3 });

      // Group plan blocks by date
      const byDate = {};
      for (const block of plan) {
        if (!byDate[block.date]) byDate[block.date] = [];
        byDate[block.date].push(block);
      }

      // Check every single date does not exceed 3 topics
      for (const [date, blocks] of Object.entries(byDate)) {
        expect(blocks.length).toBeLessThanOrEqual(3);
      }
    });
  });

  // 4. Minimum block size and rounding
  describe('Block Sizing and Granularity', () => {
    it('enforces minimum 20 minutes and multiples of 5 minutes', () => {
      const topics = [
        { id: 't-1', name: 'Topic A', weight: 5, difficulty: 4, mastery: 0.2, examDate: '2026-11-03' },
        { id: 't-2', name: 'Topic B', weight: 1, difficulty: 1, mastery: 0.8, examDate: '2026-11-03' }
      ];

      const plan = generateDailyPlan(topics, { today: TODAY, hoursPerDay: 2 }); // 120 mins
      expect(plan.length).toBeGreaterThan(0);

      for (const block of plan) {
        expect(block.minutes).toBeGreaterThanOrEqual(20);
        expect(block.minutes % 5).toBe(0);
        expect(typeof block.reason).toBe('string');
        expect(block.reason.length).toBeGreaterThan(0);
      }
    });
  });

  // 5. Each of the three clash rules
  describe('Clash Detection Rules', () => {
    it('rule (a): detects two or more deadlines on the same day', () => {
      const deadlines = [
        { id: 'd-1', title: 'CS Problem Set', type: 'assignment', dueDate: '2026-11-04' },
        { id: 'd-2', title: 'Physics Lab Report', type: 'lab', dueDate: '2026-11-04' }
      ];

      const clashes = detectClashes(deadlines, { hoursPerDay: 4 });
      const sameDayClash = clashes.find((c) => c.rule === 'same_day_deadlines');

      expect(sameDayClash).toBeDefined();
      expect(sameDayClash.date).toBe('2026-11-04');
      expect(sameDayClash.warning).toContain('2 deadlines clash on 2026-11-04');
      expect(sameDayClash.suggestion).toContain('Start earlier');
    });

    it('rule (b): detects exam within 48 hours of another deadline', () => {
      const deadlines = [
        { id: 'd-exam', title: 'Biology Midterm', type: 'exam', dueDate: '2026-11-04' },
        { id: 'd-essay', title: 'History Essay', type: 'assignment', dueDate: '2026-11-02' }
      ];

      const clashes = detectClashes(deadlines, { hoursPerDay: 4 });
      const proximityClash = clashes.find((c) => c.rule === 'exam_proximity');

      expect(proximityClash).toBeDefined();
      expect(proximityClash.warning).toContain('Biology Midterm');
      expect(proximityClash.warning).toContain('within 48 hours');
      expect(proximityClash.suggestion).toContain('day before');
    });

    it('rule (c): detects overload when 2+ deadlines have fewer than 3 available hours', () => {
      const deadlines = [
        { id: 'd-1', title: 'Calculus Quiz', type: 'test', dueDate: '2026-11-04' },
        { id: 'd-2', title: 'Stats Homework', type: 'assignment', dueDate: '2026-11-04' }
      ];

      // Settings has only 2 hours available (< 3 hours overload threshold)
      const clashes = detectClashes(deadlines, { hoursPerDay: 2 });
      const overloadClash = clashes.find((c) => c.rule === 'overload');

      expect(overloadClash).toBeDefined();
      expect(overloadClash.date).toBe('2026-11-04');
      expect(overloadClash.warning).toContain('Overload on 2026-11-04');
      expect(overloadClash.suggestion).toBeDefined();
    });
  });

  // 6. Mastery update with concept gaps vs careless errors
  describe('Mastery Updates', () => {
    const oldMastery = 0.5;
    const quizScore = 0.6; // base = 0.4 * 0.5 + 0.6 * 0.6 = 0.2 + 0.36 = 0.56

    it('penalizes concept gaps by subtracting 0.1 per gap', () => {
      const conceptGapMistakes = [
        { id: 'm-1', questionId: 'q-1', type: 'concept_gap', reason: 'Misunderstood state table' },
        { id: 'm-2', questionId: 'q-2', type: 'concept_gap', reason: 'Confused base case' }
      ];

      const result = calculateNewMastery(oldMastery, quizScore, conceptGapMistakes);
      // 0.56 - (2 * 0.1) = 0.36
      expect(result.newMastery).toBeCloseTo(0.36, 4);
      expect(result.conceptGaps).toBe(2);
    });

    it('does not lower mastery for careless errors, but flags a note to slow down and recheck', () => {
      const carelessMistakes = [
        { id: 'm-3', questionId: 'q-3', type: 'careless_error', reason: 'Arithmetic slip' },
        { id: 'm-4', questionId: 'q-4', type: 'calculation_slip', reason: 'Misread sign' }
      ];

      const result = calculateNewMastery(oldMastery, quizScore, carelessMistakes);
      // base mastery preserved without deduction: 0.56
      expect(result.newMastery).toBeCloseTo(0.56, 4);
      expect(result.note).toContain('slow down and recheck');
    });

    it('updateTopicAfterQuiz attaches note to topic', () => {
      const topic = { id: 't-1', name: 'Topic 1', mastery: 0.5, notes: [] };
      const carelessMistakes = [
        { id: 'm-1', questionId: 'q-1', type: 'careless_error', reason: 'Rushed answer' }
      ];

      const updated = updateTopicAfterQuiz(topic, 0.6, carelessMistakes);
      expect(updated.mastery).toBeCloseTo(0.56, 4);
      expect(updated.notes).toContain('Careless errors detected: slow down and recheck');
    });
  });

  // 7. Readiness calculation
  describe('Readiness Percentage', () => {
    it('computes weighted average of mastery by topic weight', () => {
      const topics = [
        { id: 't-1', weight: 2, mastery: 0.5 }, // 2 * 0.5 = 1.0
        { id: 't-2', weight: 3, mastery: 0.8 }  // 3 * 0.8 = 2.4
      ];
      // total weight = 5, weighted sum = 3.4
      // fraction = 3.4 / 5 = 0.68 -> 68%
      const readiness = calculateReadiness(topics);
      expect(readiness).toBe(68);
    });

    it('returns 0 when topics list is empty', () => {
      expect(calculateReadiness([])).toBe(0);
    });
  });
});
