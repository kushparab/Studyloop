/**
 * Hand-written JSON schema validators for StudyLoop AI proxy.
 * Ensures model outputs strictly conform to required engine data shapes.
 */

const VALID_DEADLINE_TYPES = ['assignment', 'exam', 'lab', 'test', 'other'];
const VALID_MISTAKE_TYPES = ['concept_gap', 'calculation_slip', 'careless_error', 'misread_question'];

/**
 * Validates 'YYYY-MM-DD' date string or null.
 */
function isValidDateOrNull(val) {
  if (val === null || val === undefined || val === '') return true;
  if (typeof val !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(val);
}

/**
 * Normalizes numbers within a min-max range with fallback.
 */
function clampNumber(val, min, max, defaultVal) {
  const num = Number(val);
  if (isNaN(num)) return defaultVal;
  return Math.max(min, Math.min(max, num));
}

/**
 * Validates a single Question object.
 */
function validateQuestionItem(q, idx, fallbackTopicId = 't-default') {
  if (!q || typeof q !== 'object') {
    return { valid: false, error: `Question at index ${idx} must be an object` };
  }

  const id = q.id ? String(q.id) : `q-${idx + 1}`;
  const topicId = q.topicId ? String(q.topicId) : fallbackTopicId;
  const question = typeof q.question === 'string' ? q.question.trim() : '';
  const explanation = typeof q.explanation === 'string' ? q.explanation.trim() : '';
  const conceptTag = typeof q.conceptTag === 'string' ? q.conceptTag.trim() : 'General';

  if (!question) {
    return { valid: false, error: `Question at index ${idx} is missing question text` };
  }

  // Must have exactly 4 options
  let options = q.options;
  if (!Array.isArray(options) || options.length !== 4) {
    return { valid: false, error: `Question at index ${idx} must have exactly 4 options` };
  }
  options = options.map((opt) => String(opt || '').trim());
  if (options.some((opt) => opt.length === 0)) {
    return { valid: false, error: `Question at index ${idx} has empty option string` };
  }

  // Correct index must be 0..3
  const correctIndex = Number(q.correctIndex);
  if (isNaN(correctIndex) || correctIndex < 0 || correctIndex > 3) {
    return { valid: false, error: `Question at index ${idx} correctIndex must be an integer between 0 and 3` };
  }

  return {
    valid: true,
    data: {
      id,
      topicId,
      question,
      options,
      correctIndex: Math.floor(correctIndex),
      explanation: explanation || 'No explanation provided.',
      conceptTag
    }
  };
}

/**
 * Validates /api/extract response:
 * { deadlines: Deadline[], topics: Topic[], warnings: string[] }
 */
export function validateExtract(raw) {
  if (!raw || typeof raw !== 'object') {
    return { isValid: false, error: 'Extract response must be a JSON object' };
  }

  // Check deadlines
  const rawDeadlines = Array.isArray(raw.deadlines) ? raw.deadlines : [];
  const deadlines = [];
  for (let i = 0; i < rawDeadlines.length; i++) {
    const d = rawDeadlines[i];
    if (!d || typeof d !== 'object') continue;

    const type = VALID_DEADLINE_TYPES.includes(d.type) ? d.type : 'other';
    const dueDate = isValidDateOrNull(d.dueDate) ? (d.dueDate || null) : null;

    deadlines.push({
      id: d.id ? String(d.id) : `d-${i + 1}`,
      title: String(d.title || d.subject || 'Untitled Deadline').trim(),
      type,
      subject: String(d.subject || 'General').trim(),
      dueDate,
      confidence: clampNumber(d.confidence, 0, 1, 0.8),
      sourceSnippet: String(d.sourceSnippet || '').trim()
    });
  }

  // Check topics
  const rawTopics = Array.isArray(raw.topics) ? raw.topics : [];
  const topics = [];
  for (let i = 0; i < rawTopics.length; i++) {
    const t = rawTopics[i];
    if (!t || typeof t !== 'object') continue;

    const examDate = isValidDateOrNull(t.examDate) ? (t.examDate || null) : null;

    topics.push({
      id: t.id ? String(t.id) : `t-${i + 1}`,
      subject: String(t.subject || 'General').trim(),
      name: String(t.name || t.topic || 'Untitled Topic').trim(),
      weight: Math.round(clampNumber(t.weight, 1, 5, 3)),
      difficulty: Math.round(clampNumber(t.difficulty, 1, 5, 3)),
      examDate,
      mastery: clampNumber(t.mastery, 0, 1, 0.3)
    });
  }

  // Warnings
  const warnings = Array.isArray(raw.warnings) ? raw.warnings.map(String) : [];

  if (deadlines.length === 0 && topics.length === 0) {
    return { isValid: false, error: 'Extract response contains neither deadlines nor topics' };
  }

  return {
    isValid: true,
    sanitizedData: { deadlines, topics, warnings }
  };
}

/**
 * Validates /api/quiz response:
 * { questions: Question[] }
 */
export function validateQuiz(raw, expectedTopicId = 't-default') {
  if (!raw || typeof raw !== 'object') {
    return { isValid: false, error: 'Quiz response must be a JSON object' };
  }

  const rawQuestions = Array.isArray(raw) ? raw : raw.questions;
  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
    return { isValid: false, error: 'Quiz response must contain a non-empty questions array' };
  }

  const questions = [];
  for (let i = 0; i < rawQuestions.length; i++) {
    const check = validateQuestionItem(rawQuestions[i], i, expectedTopicId);
    if (!check.valid) {
      return { isValid: false, error: check.error };
    }
    questions.push(check.data);
  }

  return {
    isValid: true,
    sanitizedData: { questions }
  };
}

/**
 * Validates /api/diagnose response:
 * { mistakes: Mistake[] }
 */
export function validateDiagnose(raw) {
  if (!raw || typeof raw !== 'object') {
    return { isValid: false, error: 'Diagnose response must be a JSON object' };
  }

  const rawMistakes = Array.isArray(raw) ? raw : raw.mistakes;
  if (!Array.isArray(rawMistakes)) {
    return { isValid: false, error: 'Diagnose response must contain a mistakes array' };
  }

  const mistakes = [];
  for (let i = 0; i < rawMistakes.length; i++) {
    const m = rawMistakes[i];
    if (!m || typeof m !== 'object') continue;

    const type = VALID_MISTAKE_TYPES.includes(m.type) ? m.type : 'careless_error';
    const reason = String(m.reason || 'Answer differed from expected key').trim();
    const fixTip = String(m.fixTip || 'Review the core concept definitions').trim();

    // Practice questions for concept_gap only
    const practice = [];
    if (type === 'concept_gap' && Array.isArray(m.practice)) {
      for (let pIdx = 0; pIdx < m.practice.length; pIdx++) {
        const pCheck = validateQuestionItem(m.practice[pIdx], pIdx, m.topicId);
        if (pCheck.valid) {
          practice.push(pCheck.data);
        }
      }
    }

    mistakes.push({
      id: m.id ? String(m.id) : `m-${i + 1}`,
      questionId: String(m.questionId || `q-${i + 1}`),
      topicId: String(m.topicId || 't-1'),
      userAnswerIndex: Number(m.userAnswerIndex) || 0,
      type,
      reason,
      fixTip,
      practice: type === 'concept_gap' ? practice.slice(0, 2) : []
    });
  }

  return {
    isValid: true,
    sanitizedData: { mistakes }
  };
}
