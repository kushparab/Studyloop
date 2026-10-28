/**
 * Priority Engine - Pure functions
 *
 * Formulas:
 *   daysLeft = max(0, days from today to examDate). If no exam date, use 14.
 *   urgency  = 1 + 3 / (daysLeft + 1)
 *   priority = weight * difficulty * (1 - mastery) * urgency
 */

/**
 * Calculates days left from today until examDate.
 * Defaults to 14 if examDate is null or undefined.
 *
 * @param {string|null} examDate - 'YYYY-MM-DD'
 * @param {string} today - 'YYYY-MM-DD'
 * @returns {number}
 */
export function calculateDaysLeft(examDate, today) {
  if (!examDate) return 14;
  const tDate = new Date(`${today}T00:00:00Z`);
  const eDate = new Date(`${examDate}T00:00:00Z`);
  const diffMs = eDate.getTime() - tDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Calculates urgency multiplier.
 * urgency = 1 + 3 / (daysLeft + 1)
 *
 * @param {number} daysLeft
 * @returns {number}
 */
export function calculateUrgency(daysLeft) {
  return 1 + 3 / (daysLeft + 1);
}

/**
 * Calculates deterministic topic priority.
 *
 * @param {object} topic - { weight, difficulty, mastery, examDate, ... }
 * @param {string} today - 'YYYY-MM-DD'
 * @returns {number}
 */
export function calculateTopicPriority(topic, today) {
  const weight = topic.weight ?? 1;
  const difficulty = topic.difficulty ?? 1;
  const mastery = topic.mastery !== undefined ? topic.mastery : 0.3;
  const daysLeft = calculateDaysLeft(topic.examDate, today);
  const urgency = calculateUrgency(daysLeft);

  const priority = weight * difficulty * (1 - mastery) * urgency;
  return Number(priority.toFixed(4));
}

/**
 * Sorts topics descending by priority for a given date.
 *
 * @param {Array<object>} topics
 * @param {string} today
 * @returns {Array<object>}
 */
export function sortTopicsByPriority(topics = [], today) {
  return [...topics].sort((a, b) => {
    const prioA = calculateTopicPriority(a, today);
    const prioB = calculateTopicPriority(b, today);
    return prioB - prioA;
  });
}
