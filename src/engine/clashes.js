/**
 * Clash Detection Engine - Pure functions
 *
 * Rules:
 *  (a) two or more deadlines on the same day;
 *  (b) an exam within 48 hours (<= 2 days) of another deadline;
 *  (c) a day with 2+ deadlines and fewer than 3 available hours (overload).
 *
 * Each clash returns:
 *  - rule: 'same_day_deadlines' | 'exam_proximity' | 'overload'
 *  - date: 'YYYY-MM-DD'
 *  - warning: plain-language warning string
 *  - suggestion: actionable recommendation
 *  - deadlineIds: string[]
 */

/**
 * Calculates absolute calendar days between two 'YYYY-MM-DD' date strings.
 */
export function getDaysBetween(dateA, dateB) {
  const dA = new Date(`${dateA}T00:00:00Z`);
  const dB = new Date(`${dateB}T00:00:00Z`);
  const diffMs = Math.abs(dB.getTime() - dA.getTime());
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Gets daily available study hours from settings.
 */
export function getDailyAvailableHours(dateStr, settings = {}) {
  const defaultHours = typeof settings.hoursPerDay === 'number' ? settings.hoursPerDay : 2;

  if (settings.hoursPerDay && typeof settings.hoursPerDay === 'object') {
    const dayOfWeek = new Date(`${dateStr}T00:00:00Z`)
      .toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })
      .toLowerCase();
    return settings.hoursPerDay[dayOfWeek] ?? defaultHours;
  }

  return defaultHours;
}

/**
 * Detects all schedule clashes deterministically.
 *
 * @param {Array<object>} deadlines - Array of Deadline objects
 * @param {object} settings - { today, hoursPerDay }
 * @returns {Array<object>} Array of Clash objects
 */
export function detectClashes(deadlines = [], settings = {}) {
  if (!deadlines || !deadlines.length) return [];

  // Filter deadlines with valid dueDate
  const validDeadlines = deadlines.filter((d) => Boolean(d.dueDate));
  const clashes = [];

  // Group by dueDate
  const byDate = {};
  for (const item of validDeadlines) {
    if (!byDate[item.dueDate]) byDate[item.dueDate] = [];
    byDate[item.dueDate].push(item);
  }

  // Rule (a): Two or more deadlines on the same day
  for (const [date, items] of Object.entries(byDate)) {
    if (items.length >= 2) {
      const titles = items.map((i) => i.title || i.subject).join(', ');
      clashes.push({
        rule: 'same_day_deadlines',
        date,
        warning: `${items.length} deadlines clash on ${date}: ${titles}.`,
        suggestion: 'Start earlier to distribute submission workload and prevent last-minute crunch.',
        deadlineIds: items.map((i) => i.id)
      });

      // Rule (c): A day with 2+ deadlines and fewer than 3 available hours (overload)
      const availableHours = getDailyAvailableHours(date, settings);
      if (availableHours < 3) {
        clashes.push({
          rule: 'overload',
          date,
          warning: `Overload on ${date}: ${items.length} deadlines with only ${availableHours}h available study time.`,
          suggestion: 'Clear this bottleneck by completing one assignment 2 days earlier or reallocating hours.',
          deadlineIds: items.map((i) => i.id)
        });
      }
    }
  }

  // Rule (b): An exam within 48 hours (<= 2 days) of another deadline
  for (let i = 0; i < validDeadlines.length; i++) {
    for (let j = i + 1; j < validDeadlines.length; j++) {
      const d1 = validDeadlines[i];
      const d2 = validDeadlines[j];

      // At least one must be an exam
      const isExam1 = d1.type === 'exam';
      const isExam2 = d2.type === 'exam';

      if (isExam1 || isExam2) {
        const days = getDaysBetween(d1.dueDate, d2.dueDate);
        // within 48 hours (1 or 2 days apart; same-day already caught in rule a)
        if (days > 0 && days <= 2) {
          const exam = isExam1 ? d1 : d2;
          const other = isExam1 ? d2 : d1;
          clashes.push({
            rule: 'exam_proximity',
            date: exam.dueDate,
            warning: `Exam "${exam.title || exam.subject}" is within 48 hours of "${other.title || other.subject}" (${other.dueDate}).`,
            suggestion: `Move study for "${other.title || other.subject}" to the day before to reserve full cognitive bandwidth for the exam.`,
            deadlineIds: [exam.id, other.id]
          });
        }
      }
    }
  }

  return clashes;
}
