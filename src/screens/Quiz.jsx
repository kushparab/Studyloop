import React, { useState, useEffect, useCallback } from 'react';
import { generateQuiz } from '../api.js';

export default function Quiz({
  topic,
  onCompleteQuiz,
  onBack
}) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiBanner, setApiBanner] = useState(null);
  const [isFallback, setIsFallback] = useState(false);

  // Quiz progression state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({}); // { [questionId]: selectedIndex }
  const [isFinished, setIsFinished] = useState(false);

  // Demo mode toggle for hackathon judging
  const [demoMode, setDemoMode] = useState(false);

  // Fetch quiz questions on mount or when topic changes
  useEffect(() => {
    let isMounted = true;
    async function loadQuiz() {
      if (!topic) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setCurrentIndex(0);
      setUserAnswers({});
      setIsFinished(false);

      try {
        const result = await generateQuiz({ topic, count: 5 });
        if (isMounted) {
          setQuestions(result.questions || []);
          setApiBanner(result.banner);
          setIsFallback(result.isFallback);
        }
      } catch (err) {
        if (isMounted) {
          setError(`Failed to load quiz: ${err.message}`);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadQuiz();
    return () => {
      isMounted = false;
    };
  }, [topic?.id]);

  const currentQuestion = questions[currentIndex] || null;
  const currentAnswer = currentQuestion ? userAnswers[currentQuestion.id] : undefined;

  // Select an option for current question
  const handleSelectOption = useCallback((optionIndex) => {
    if (!currentQuestion) return;
    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionIndex
    }));
  }, [currentQuestion]);

  // Keyboard navigation support: 1-4, A-D, Enter, Arrow keys
  useEffect(() => {
    if (isFinished || loading || !currentQuestion) return;

    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      // Allow hotkeys 1, 2, 3, 4
      if (['1', '2', '3', '4'].includes(key)) {
        handleSelectOption(parseInt(key, 10) - 1);
      }
      // Allow hotkeys a, b, c, d
      else if (['a', 'b', 'c', 'd'].includes(key)) {
        const keyMap = { a: 0, b: 1, c: 2, d: 3 };
        handleSelectOption(keyMap[key]);
      }
      // Enter advances to next question if answered
      else if (e.key === 'Enter') {
        if (userAnswers[currentQuestion.id] !== undefined) {
          if (currentIndex < questions.length - 1) {
            setCurrentIndex((prev) => prev + 1);
          } else {
            setIsFinished(true);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFinished, loading, currentQuestion, currentIndex, questions.length, userAnswers, handleSelectOption]);

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsFinished(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Demo mode: Deliberately auto-answer with wrong choices to showcase diagnosis wow-moment
  const handleAutoAnswerWrong = () => {
    const wrongAnswers = {};
    for (const q of questions) {
      // Pick an index different from correctIndex
      const incorrectIndex = (q.correctIndex + 1) % 4;
      wrongAnswers[q.id] = incorrectIndex;
    }
    setUserAnswers(wrongAnswers);
    setIsFinished(true);
  };

  // Compute final score
  const correctCount = questions.reduce((acc, q) => {
    return userAnswers[q.id] === q.correctIndex ? acc + 1 : acc;
  }, 0);

  const scorePct = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

  // Trigger analysis in parent (Step 5: Insights)
  const handleProceedToDiagnose = () => {
    const answersPayload = questions.map((q) => ({
      questionId: q.id,
      userAnswerIndex: userAnswers[q.id] !== undefined ? userAnswers[q.id] : -1
    }));

    if (onCompleteQuiz) {
      onCompleteQuiz({
        topic,
        questions,
        answers: answersPayload,
        score: questions.length > 0 ? correctCount / questions.length : 0,
        correctCount,
        totalCount: questions.length
      });
    }
  };

  if (!topic) {
    return (
      <section className="screen-card">
        <p className="muted-text">No topic selected for quiz. Please go back to the Plan screen and select a topic.</p>
        <div className="actions-row">
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            &larr; Back to Plan
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="screen-card" aria-labelledby="quiz-heading">
      <header className="screen-header">
        <div className="header-badge-row">
          <span className="badge badge-subtle">Topic: {topic.subject} &bull; {topic.name}</span>
          <span className={`badge ${isFallback ? 'badge-warning' : 'badge-success'}`}>
            {isFallback ? 'Cached Sample Quiz (AI Offline)' : 'AI-Generated Quiz'}
          </span>
        </div>
        <h2 id="quiz-heading" className="screen-title">
          4. Active Recall Quiz ({topic.name})
        </h2>
        <p className="screen-desc">
          Test your comprehension with 5 targeted multiple-choice questions. Mistakes will be
          diagnosed by AI to recalibrate your daily study plan.
        </p>
      </header>

      {/* Demo Mode Toggle Banner */}
      <div className="demo-mode-bar" role="region" aria-label="Demo Mode Controls">
        <div className="demo-toggle-group">
          <input
            id="demo-mode-toggle"
            type="checkbox"
            className="demo-checkbox"
            checked={demoMode}
            onChange={(e) => setDemoMode(e.target.checked)}
          />
          <label htmlFor="demo-mode-toggle" className="demo-label">
            <span className="badge badge-warning">DEMO MODE</span>
            <span>Enable deliberate mistakes for live judge demo</span>
          </label>
        </div>
        {demoMode && (
          <button
            type="button"
            className="btn btn-subtle btn-sm"
            onClick={handleAutoAnswerWrong}
            title="Auto-fill with wrong answers to immediately test diagnosis & re-planning"
          >
            ⚡ Auto-fill 100% wrong answers & submit
          </button>
        )}
      </div>

      {apiBanner && (
        <div className="alert-banner alert-info" role="status">
          <span className="alert-icon" aria-hidden="true">ℹ️</span>
          <span>{apiBanner}</span>
        </div>
      )}

      {error && (
        <div className="alert-banner alert-error" role="alert">
          <span className="alert-icon" aria-hidden="true">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* LOADING STATE */}
      {loading ? (
        <div className="placeholder-box" aria-busy="true">
          <div className="spinner" aria-hidden="true" style={{ borderColor: '#2563eb', borderTopColor: 'transparent', width: 28, height: 28 }} />
          <p className="muted-text" style={{ marginTop: '1rem' }}>
            Generating 5 active-recall questions for <strong>{topic.name}</strong>...
          </p>
        </div>
      ) : !isFinished && currentQuestion ? (
        /* QUESTION RUNNER (ONE QUESTION AT A TIME) */
        <div className="quiz-runner" role="region" aria-label={`Question ${currentIndex + 1} of ${questions.length}`}>
          {/* Progress Header */}
          <div className="quiz-progress-bar-group">
            <div className="quiz-step-info">
              <span className="quiz-step-counter">
                Question <strong>{currentIndex + 1}</strong> of {questions.length}
              </span>
              <span className="badge badge-neutral">Concept: {currentQuestion.conceptTag}</span>
            </div>
            <div className="progress-track" aria-hidden="true">
              <div
                className="progress-fill"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Text */}
          <div className="question-box">
            <h3 className="question-text">{currentQuestion.question}</h3>
          </div>

          {/* Large Tap Target Options */}
          <fieldset className="options-fieldset">
            <legend className="sr-only">Choose an answer for Question {currentIndex + 1}</legend>
            <div className="options-list" role="radiogroup" aria-label="Answer options">
              {currentQuestion.options.map((optText, optIdx) => {
                const isSelected = currentAnswer === optIdx;
                const letter = ['A', 'B', 'C', 'D'][optIdx];

                return (
                  <button
                    key={optIdx}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={`option-btn ${isSelected ? 'option-selected' : ''}`}
                    onClick={() => handleSelectOption(optIdx)}
                  >
                    <span className="option-letter" aria-hidden="true">
                      {letter}
                    </span>
                    <span className="option-text">{optText}</span>
                    {isSelected && <span className="option-check" aria-hidden="true">✓</span>}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <p className="keyboard-tip" aria-hidden="true">
            ⌨️ Tip: Press keys <strong>A–D</strong> or <strong>1–4</strong> to pick, and <strong>Enter</strong> to advance.
          </p>

          {/* Navigation Controls */}
          <div className="actions-row">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handlePrev}
              disabled={currentIndex === 0}
            >
              &larr; Previous Question
            </button>

            <button
              type="button"
              className="btn btn-primary btn-large"
              onClick={handleNext}
              disabled={currentAnswer === undefined}
            >
              {currentIndex === questions.length - 1 ? 'Finish & Review Score &rarr;' : 'Next Question &rarr;'}
            </button>
          </div>
        </div>
      ) : (
        /* QUIZ RESULTS & REVIEW SUMMARY */
        <div className="quiz-summary" role="region" aria-label="Quiz Results and Review">
          <div className="summary-hero-card">
            <div className="summary-score-header">
              <span className="summary-big-score">{correctCount}/{questions.length}</span>
              <div className="summary-score-details">
                <h3 className="summary-score-title">
                  {scorePct >= 80 ? '🎉 Excellent Comprehension!' : scorePct >= 60 ? '👍 Good Progress!' : '🔍 Concept Gaps Discovered'}
                </h3>
                <p className="summary-score-subtitle">
                  {scorePct >= 80
                    ? `Strong command of ${topic.name}. Readiness will rise significantly.`
                    : `Identified ${questions.length - correctCount} area(s) needing reinforcement. AI will classify the mistakes to adapt your study loop.`}
                </p>
              </div>
            </div>
          </div>

          <h3 className="sub-heading">Detailed Question Review & Explanations</h3>

          <div className="review-list">
            {questions.map((q, idx) => {
              const userIdx = userAnswers[q.id];
              const isCorrect = userIdx === q.correctIndex;

              return (
                <div key={q.id} className={`review-card ${isCorrect ? 'review-correct' : 'review-incorrect'}`}>
                  <div className="review-header">
                    <span className="review-number">Q{idx + 1} &bull; {q.conceptTag}</span>
                    <span className={`badge ${isCorrect ? 'badge-success' : 'badge-danger'}`}>
                      {isCorrect ? '✓ Correct' : '✗ Missed'}
                    </span>
                  </div>

                  <p className="review-question-text">{q.question}</p>

                  <div className="review-answers-box">
                    <div className="answer-row">
                      <span className="answer-label">Your answer:</span>
                      <span className={`answer-val ${isCorrect ? 'val-correct' : 'val-incorrect'}`}>
                        {userIdx !== undefined ? q.options[userIdx] : 'Unanswered'}
                      </span>
                    </div>

                    {!isCorrect && (
                      <div className="answer-row">
                        <span className="answer-label">Correct answer:</span>
                        <span className="answer-val val-correct">
                          {q.options[q.correctIndex]}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="explanation-box">
                    <strong>Explanation:</strong> {q.explanation}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Action: Proceed to Diagnosis */}
          <div className="actions-row">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setIsFinished(false);
                setCurrentIndex(0);
                setUserAnswers({});
              }}
            >
              🔄 Retake Quiz
            </button>

            <button
              type="button"
              className="btn btn-primary btn-large"
              onClick={handleProceedToDiagnose}
            >
              🧠 Analyse My Mistakes & Re-plan &rarr;
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
