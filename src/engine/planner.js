/**
 * Study Planner Engine - Pure functions
 *
 * Requirements:
 * - For each day from today to the last exam, take top 3 topics (exam not yet passed) by priority.
 * - Split day's available minutes in proportion to priority.
 * - Rounded to 5 minutes, minimum 20 minutes per block.
 * - Each block carries a reason string.
 * - Output shape: PlanBlock { date, topicId, minutes, reason }
 */

import { calculateTopicPriority, calculateDaysLeft } from './priority.js';

/**
 * Adds days to a 'YYYY-MM-DD' string safely in UTC.
 */
export function addDays(dateStr, numDays) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + numDays);
  return d.toISOString().split('T')[0];
}

/**
 * Gets available minutes for a specific date from settings.
 */
export function getDailyAvailableMinutes(dateStr, settings = {}) {
  const defaultHours = typeof settings.hoursPerDay === 'number' ? settings.hoursPerDay : 2;
  
  if (settings.hoursPerDay && typeof settings.hoursPerDay === 'object') {
    const dayOfWeek = new Date(`${dateStr}T00:00:00Z`)
      .toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })
      .toLowerCase();
    const hours = settings.hoursPerDay[dayOfWeek] ?? defaultHours;
    return Math.round(hours * 60);
  }

  return Math.round(defaultHours * 60);
}

/**
 * Generates an informative reason string for a study block.
 */
export function generateBlockReason(topic, dateStr) {
  const daysLeft = calculateDaysLeft(topic.examDate, dateStr);
  const mastery = topic.mastery !== undefined ? topic.mastery : 0.3;

  if (topic.lastMistakeType === 'concept_gap') {
    return 'Concept gap found in last quiz';
  }
  if (topic.lastMistakeType === 'careless_error' || topic.lastMistakeType === 'calculation_slip') {
    return 'Careless errors previously, slow down and recheck';
  }
  if (daysLeft === 0) {
    return 'Exam is today';
  }
  if (daysLeft === 1) {
    return 'Exam tomorrow';
  }
  if (mastery < 0.5 && daysLeft <= 3) {
    return `Weak topic, exam in ${daysLeft} days`;
  }
  if (mastery < 0.5) {
    return `Low mastery (${Math.round(mastery * 100)}%), prioritize reinforcement`;
  }
  if (daysLeft <= 3) {
    return `Upcoming exam in ${daysLeft} days`;
  }
  if ((topic.weight || 1) >= 4 || (topic.difficulty || 1) >= 4) {
    return 'High weight/difficulty subject';
  }
  return 'Scheduled priority review';
}

/**
 * Splits available minutes among up to 3 candidate topics proportionally.
 * Enforces:
 * - Minimum 20 minutes per block
 * - Rounded to nearest 5 minutes
 * - Total allocated <= availableMinutes
 */
export function allocateDailyMinutes(candidateTopics, availableMinutes, dateStr) {
  if (!candidateTopics.length || availableMinutes < 20) {
    return [];
  }

  // Cap number of topics so each can get at least the 20m minimum
  const maxTopicsFit = Math.min(candidateTopics.length, Math.floor(availableMinutes / 20));
  if (maxTopicsFit <= 0) return [];

  const activeTopics = candidateTopics.slice(0, maxTopicsFit);

  if (activeTopics.length === 1) {
    const mins = Math.max(20, Math.floor(availableMinutes / 5) * 5);
    return [
      {
        topic: activeTopics[0],
        minutes: mins
      }
    ];
  }

  // Calculate priorities
  const priorities = activeTopics.map((t) => Math.max(0.01, calculateTopicPriority(t, dateStr)));
  const sumPriority = priorities.reduce((acc, p) => acc + p, 0);

  // Initial proportional allocation rounded to 5m and min 20m
  let allocations = activeTopics.map((topic, i) => {
    const raw = (priorities[i] / sumPriority) * availableMinutes;
    let rounded = Math.round(raw / 5) * 5;
    if (rounded < 20) rounded = 20;
    return { topic, minutes: rounded };
  });

  // Reconcile total with availableMinutes in 5-minute increments
  let totalAllocated = allocations.reduce((sum, a) => sum + a.minutes, 0);
  let diff = availableMinutes - totalAllocated;

  // If over-allocated, reduce from largest blocks while preserving 20 min min
  while (diff < 0) {
    // Find largest block with > 20 mins
    let largestIdx = -1;
    let maxMins = 20;
    for (let i = 0; i < allocations.length; i++) {
      if (allocations[i].minutes > maxMins) {
        maxMins = allocations[i].minutes;
        largestIdx = i;
      }
    }

    if (largestIdx === -1) {
      // Cannot reduce without violating 20m minimum, drop the lowest topic
      allocations.pop();
      totalAllocated = allocations.reduce((sum, a) => sum + a.minutes, 0);
      diff = availableMinutes - totalAllocated;
      if (allocations.length <= 1) break;
    } else {
      allocations[largestIdx].minutes -= 5;
      diff += 5;
    }
  }

  // If under-allocated, add 5m to the highest priority block
  while (diff >= 5) {
    allocations[0].minutes += 5;
    diff -= 5;
  }

  return allocations;
}

/**
 * Generates deterministic daily study plan blocks.
 *
 * @param {Array<object>} topics
 * @param {object} settings - { today: 'YYYY-MM-DD', hoursPerDay: number | object }
 * @returns {Array<object>} Array of PlanBlock { date, topicId, minutes, reason }
 */
export function generateDailyPlan(topics = [], settings = {}) {
  if (!topics || !topics.length) return [];

  const today = settings.today || new Date().toISOString().split('T')[0];

  // Find the last exam date
  const examDates = topics
    .map((t) => t.examDate)
    .filter((d) => Boolean(d));

  let lastExamDate;
  if (examDates.length > 0) {
    lastExamDate = examDates.reduce((max, d) => (d > max ? d : max), examDates[0]);
    // If all exams were before today, don't schedule into the past
    if (lastExamDate < today) return [];
  } else {
    // If no exam dates exist, default plan window is 7 days
    lastExamDate = addDays(today, 6);
  }

  const plan = [];
  let currentDate = today;
  let guard = 0;

  // Day-by-day progression from today up to lastExamDate
  while (currentDate <= lastExamDate && guard < 60) {
    guard++;
    const availableMinutes = getDailyAvailableMinutes(currentDate, settings);

    // Rule: exam not yet passed (currentDate <= topic.examDate if examDate is present)
    const eligibleTopics = topics.filter((t) => {
      if (!t.examDate) return true;
      return currentDate <= t.examDate;
    });

    if (eligibleTopics.length > 0) {
      // Sort eligible topics by priority for this day
      const sorted = [...eligibleTopics].sort((a, b) => {
        const pA = calculateTopicPriority(a, currentDate);
        const pB = calculateTopicPriority(b, currentDate);
        return pB - pA;
      });

      // 3-topic daily cap: take top 3
      const top3 = sorted.slice(0, 3);

      const allocations = allocateDailyMinutes(top3, availableMinutes, currentDate);

      for (const item of allocations) {
        plan.push({
          date: currentDate,
          topicId: item.topic.id,
          minutes: item.minutes,
          reason: generateBlockReason(item.topic, currentDate)
        });
      }
    }

    currentDate = addDays(currentDate, 1);
  }

  return plan;
}
