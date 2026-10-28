/**
 * Mastery & Readiness Engine - Pure functions
 *
 * Formulas:
 *  newMastery = 0.4 * old + 0.6 * quizScore
 *  Subtract an extra 0.1 per concept_gap mistake (floor 0)
 *  Careless errors & calculation slips do not lower mastery beyond score,
 *  but add a 'slow down and recheck' note.
 *  Readiness % = weighted average of mastery by topic weight.
 */

/**
 * Calculates updated topic mastery after a quiz.
 *
 * @param {number} oldMastery - between 0 and 1
 * @param {number} quizScore - between 0 and 1
 * @param {Array<object>} mistakes - Array of Mistake objects
 * @returns {{ newMastery: number, note: string|null, conceptGaps: number }}
 */
export function calculateNewMastery(oldMastery = 0.3, quizScore = 0, mistakes = []) {
  const baseMastery = 0.4 * oldMastery + 0.6 * quizScore;

  const conceptGaps = mistakes.filter((m) => m.type === 'concept_gap').length;
  const carelessOrSlips = mistakes.filter(
    (m) => m.type === 'careless_error' || m.type === 'calculation_slip'
  ).length;

  const penalizedMastery = baseMastery - conceptGaps * 0.1;
  const newMastery = Math.max(0, Math.min(1, Number(penalizedMastery.toFixed(4))));

  let note = null;
  if (carelessOrSlips > 0) {
    note = 'Careless errors detected: slow down and recheck';
  } else if (conceptGaps > 0) {
    note = 'Concept gaps detected: revisit core definitions';
  }

  return {
    newMastery,
    note,
    conceptGaps,
    carelessOrSlips
  };
}

/**
 * Updates a topic object directly after quiz results.
 *
 * @param {object} topic
 * @param {number} quizScore - 0..1
 * @param {Array<object>} mistakes
 * @returns {object} updated topic
 */
export function updateTopicAfterQuiz(topic, quizScore, mistakes = []) {
  const currentMastery = topic.mastery !== undefined ? topic.mastery : 0.3;
  const { newMastery, note } = calculateNewMastery(currentMastery, quizScore, mistakes);

  const dominantMistake = mistakes.length ? mistakes[0].type : null;

  const existingNotes = topic.notes || [];
  const updatedNotes = note ? Array.from(new Set([...existingNotes, note])) : existingNotes;

  return {
    ...topic,
    mastery: newMastery,
    lastMistakeType: dominantMistake,
    notes: updatedNotes
  };
}

/**
 * Calculates overall student readiness percentage (0..100).
 * Readiness % = weighted average of mastery by topic weight.
 *
 * @param {Array<object>} topics
 * @returns {number} readiness integer 0..100
 */
export function calculateReadiness(topics = []) {
  if (!topics || !topics.length) return 0;

  let totalWeight = 0;
  let weightedMasterySum = 0;

  for (const topic of topics) {
    const weight = topic.weight ?? 1;
    const mastery = topic.mastery !== undefined ? topic.mastery : 0.3;

    totalWeight += weight;
    weightedMasterySum += weight * mastery;
  }

  if (totalWeight === 0) return 0;

  const fraction = weightedMasterySum / totalWeight;
  return Math.round(fraction * 100);
}
