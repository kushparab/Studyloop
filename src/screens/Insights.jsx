import React, { useState, useEffect, useMemo } from 'react';
import { diagnoseMistakes } from '../api.js';
import { calculateNewMastery, updateTopicAfterQuiz, calculateReadiness } from '../engine/mastery.js';
import { generateDailyPlan, addDays } from '../engine/planner.js';
import { SAMPLE_DIAGNOSE_RESPONSE } from '../data/sample.js';

export default function Insights({
  topic,
  topics = [],
  quizResults,
  settings = {},
  onUpdateTopics,
  onReset,
  onBack,
  onViewPlan
}) {
  const [loading, setLoading] = useState(true);
  const [mistakes, setMistakes] = useState([]);
  const [apiBanner, setApiBanner] = useState(null);
  const [isFallback, setIsFallback] = useState(false);
  const [hasAppliedEngine, setHasAppliedEngine] = useState(false);

  // Fallback data if user navigated directly without taking a quiz
  const activeTopic = topic || topics[0] || {
    id: 't-1',
    subject: 'General',
    name: 'Core Review',
    weight: 3,
    difficulty: 3,
    mastery: 0.3
  };

  const today = settings.today || new Date().toISOString().split('T')[0];

  // 1. Fetch AI Diagnosis on mount
  useEffect(() => {
    let isMounted = true;

    async function runDiagnosis() {
      setLoading(true);

      const questions = quizResults?.questions || [];
      const answers = quizResults?.answers || [];

      // Filter missed answers
      const wrongCount = answers.filter((a) => {
        const q = questions.find((item) => item.id === a.questionId);
        return q && q.correctIndex !== a.userAnswerIndex;
      }).length;

      // If user had 100% correct answers
      if (answers.length > 0 && wrongCount === 0) {
        if (isMounted) {
          setMistakes([]);
          setLoading(false);
        }
        return;
      }

      try {
        const result = await diagnoseMistakes({
          topic: activeTopic,
          questions,
          answers
        });

        if (isMounted) {
          setMistakes(result.mistakes || SAMPLE_DIAGNOSE_RESPONSE.mistakes);
          setApiBanner(result.banner);
          setIsFallback(result.isFallback);
        }
      } catch (err) {
        if (isMounted) {
          console.warn('[Insights] Fallback used:', err);
          setMistakes(SAMPLE_DIAGNOSE_RESPONSE.mistakes);
          setIsFallback(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    runDiagnosis();
    return () => {
      isMounted = false;
    };
  }, [quizResults, activeTopic?.id]);

  // 2. Compute Before-and-After using Pure Engine Functions
  const {
    oldMastery,
    newMastery,
    oldReadiness,
    newReadiness,
    updatedTopics,
    next3DaysComparison
  } = useMemo(() => {
    const currentMastery = activeTopic.mastery !== undefined ? activeTopic.mastery : 0.3;
    const quizScore = quizResults?.score !== undefined ? quizResults.score : 0.4;

    // A. Engine mastery update
    const updatedTopic = updateTopicAfterQuiz(activeTopic, quizScore, mistakes);
    const newTopicMastery = updatedTopic.mastery;

    // B. Old vs New overall readiness
    const oldReadinessScore = calculateReadiness(topics);
    const newTopicsList = topics.map((t) => (t.id === activeTopic.id ? updatedTopic : t));
    const newReadinessScore = calculateReadiness(newTopicsList);

    // C. Re-run deterministic planner for before & after
    const oldPlan = generateDailyPlan(topics, settings);
    const newPlan = generateDailyPlan(newTopicsList, settings);

    // Filter next 3 days: today, today+1, today+2
    const day0 = today;
    const day1 = addDays(today, 1);
    const day2 = addDays(today, 2);
    const targetDates = [day0, day1, day2];

    const comparison = [];

    for (const date of targetDates) {
      const oldBlocks = oldPlan.filter((b) => b.date === date);
      const newBlocks = newPlan.filter((b) => b.date === date);

      // Collect all topic IDs scheduled across old and new
      const topicIds = Array.from(
        new Set([...oldBlocks.map((b) => b.topicId), ...newBlocks.map((b) => b.topicId)])
      );

      for (const tid of topicIds) {
        const oldB = oldBlocks.find((b) => b.topicId === tid);
        const newB = newBlocks.find((b) => b.topicId === tid);
        const refTopic = newTopicsList.find((t) => t.id === tid) || activeTopic;

        const oldMins = oldB?.minutes || 0;
        const newMins = newB?.minutes || 0;

        let whyChanged = 'Maintained schedule';
        if (tid === activeTopic.id) {
          if (newMins > oldMins) {
            whyChanged = `+${newMins - oldMins}m added: Priority boosted after quiz mistakes (${Math.round(newTopicMastery * 100)}% mastery)`;
          } else if (newMins < oldMins) {
            whyChanged = `-${oldMins - newMins}m reduced: Mastery verified on quiz`;
          } else if (newMins > 0) {
            whyChanged = 'Reinforcement block preserved';
          }
        } else {
          if (newMins > oldMins) {
            whyChanged = `+${newMins - oldMins}m adjusted to balance daily capacity`;
          } else if (newMins < oldMins) {
            whyChanged = `-${oldMins - newMins}m reallocated to give urgency to ${activeTopic.name.slice(0, 16)}...`;
          }
        }

        comparison.push({
          date,
          topic: refTopic,
          oldMinutes: oldMins,
          newMinutes: newMins,
          whyChanged
        });
      }
    }

    return {
      oldMastery: currentMastery,
      newMastery: newTopicMastery,
      oldReadiness: oldReadinessScore,
      newReadiness: newReadinessScore,
      updatedTopics: newTopicsList,
      next3DaysComparison: comparison
    };
  }, [activeTopic, topics, quizResults, mistakes, settings, today]);

  // 3. Persist updated topics into App / localStorage once diagnosis is computed
  useEffect(() => {
    if (!loading && !hasAppliedEngine && onUpdateTopics) {
      onUpdateTopics(updatedTopics);
      setHasAppliedEngine(true);
    }
  }, [loading, hasAppliedEngine, onUpdateTopics, updatedTopics]);

  const readinessDelta = newReadiness - oldReadiness;

  return (
    <section className="screen-card" aria-labelledby="insights-heading">
      <header className="screen-header">
        <div className="header-badge-row">
          <span className="badge badge-accent">The StudyLoop WOW Moment 🔁</span>
          <span className={`badge ${isFallback ? 'badge-warning' : 'badge-success'}`}>
            {isFallback ? 'Sample Diagnosis (AI Offline)' : 'AI Mistake Diagnosis Active'}
          </span>
        </div>
        <h2 id="insights-heading" className="screen-title">
          5. Mistake Diagnosis & Dynamic Plan Re-balancing
        </h2>
        <p className="screen-desc">
          AI classified each quiz mistake into student error categories. The deterministic engine
          immediately re-weighted your study schedule and recalculated exam readiness.
        </p>
      </header>

      {apiBanner && (
        <div className="alert-banner alert-info" role="status">
          <span className="alert-icon" aria-hidden="true">ℹ️</span>
          <span>{apiBanner}</span>
        </div>
      )}

      {!quizResults && (
        <div className="alert-banner alert-info" role="status">
          <span className="alert-icon" aria-hidden="true">💡</span>
          <span>Showing sample diagnostic preview. Return to the Plan screen and select "Start Quiz" on any topic to diagnose your personal quiz performance.</span>
        </div>
      )}

      {loading ? (
        <div className="placeholder-box" aria-busy="true">
          <div className="spinner" aria-hidden="true" style={{ borderColor: '#1d4ed8', borderTopColor: 'transparent', width: 32, height: 32 }} />
          <p className="muted-text" style={{ marginTop: '1rem' }}>
            Classifying mistakes & recalibrating study engine for <strong>{activeTopic.name}</strong>...
          </p>
        </div>
      ) : (
        <>
          {/* SECTION 1: BEFORE & AFTER WOW MOMENT (READINESS SCORECARD) */}
          <div className="wow-banner-card" role="region" aria-label="Before and After Readiness Comparison">
            <h3 className="wow-card-title">⚡ Real-Time Loop Recalibration</h3>

            <div className="wow-comparison-grid">
              {/* Overall Readiness Box */}
              <div className="wow-metric-card">
                <span className="wow-metric-label">Overall Exam Readiness</span>
                <div className="wow-metric-values">
                  <span className="val-before">{oldReadiness}%</span>
                  <span className="arrow-divider" aria-hidden="true">&rarr;</span>
                  <span className="val-after">{newReadiness}%</span>
                  <span className={`badge ${readinessDelta >= 0 ? 'badge-success' : 'badge-warning'}`}>
                    {readinessDelta >= 0 ? `+${readinessDelta}%` : `${readinessDelta}%`}
                  </span>
                </div>
                <p className="wow-metric-explanation">
                  {readinessDelta < 0
                    ? 'Readiness adjusted down to accurately reflect discovered concept gaps.'
                    : 'Readiness boosted by verified topic comprehension.'}
                </p>
              </div>

              {/* Topic Mastery Box */}
              <div className="wow-metric-card">
                <span className="wow-metric-label">{activeTopic.name} Mastery</span>
                <div className="wow-metric-values">
                  <span className="val-before">{Math.round(oldMastery * 100)}%</span>
                  <span className="arrow-divider" aria-hidden="true">&rarr;</span>
                  <span className="val-after">{Math.round(newMastery * 100)}%</span>
                  <span className="badge badge-subtle">
                    Score: {quizResults?.correctCount ?? 2}/{quizResults?.totalCount ?? 5}
                  </span>
                </div>
                <p className="wow-metric-explanation">
                  Calculated via <code>0.4&times;old + 0.6&times;score - conceptGaps</code>.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 2: AI MISTAKE DIAGNOSIS BREAKDOWN */}
          <div className="diagnostics-panel" role="region" aria-label="AI Mistake Diagnosis">
            <h3 className="panel-title">
              <span aria-hidden="true">🧠</span> AI Mistake Taxonomy & Recommendations ({mistakes.length})
            </h3>

            {mistakes.length === 0 ? (
              <div className="alert-banner alert-success">
                <span className="alert-icon" aria-hidden="true">🌟</span>
                <div>
                  <strong>No mistakes detected!</strong>
                  <p className="text-sm">You demonstrated full mastery of this topic. Future study blocks have been optimized.</p>
                </div>
              </div>
            ) : (
              <div className="mistakes-list">
                {mistakes.map((m, idx) => {
                  return (
                    <article key={m.id || idx} className="mistake-card">
                      <div className="mistake-card-header">
                        {/* Text and color badge */}
                        <div className="mistake-badge-group">
                          {m.type === 'concept_gap' && (
                            <span className="badge badge-concept-gap">
                              <span aria-hidden="true">🔴</span> Concept Gap
                            </span>
                          )}
                          {m.type === 'calculation_slip' && (
                            <span className="badge badge-calculation-slip">
                              <span aria-hidden="true">🟠</span> Calculation Slip
                            </span>
                          )}
                          {m.type === 'careless_error' && (
                            <span className="badge badge-careless-error">
                              <span aria-hidden="true">🟡</span> Careless Error
                            </span>
                          )}
                          {m.type === 'misread_question' && (
                            <span className="badge badge-misread">
                              <span aria-hidden="true">🟣</span> Misread Question
                            </span>
                          )}
                          <span className="mistake-topic-tag">{activeTopic.name}</span>
                        </div>
                      </div>

                      <div className="mistake-body">
                        <div className="mistake-item">
                          <span className="mistake-label">🔍 Root Cause:</span>
                          <p className="mistake-text">{m.reason}</p>
                        </div>

                        <div className="mistake-item">
                          <span className="mistake-label">💡 Study Coach Tip:</span>
                          <p className="mistake-text tip-highlight">{m.fixTip}</p>
                        </div>
                      </div>

                      {/* Practice Questions for Concept Gaps */}
                      {m.type === 'concept_gap' && m.practice && m.practice.length > 0 && (
                        <div className="practice-section" aria-label="Concept Gap Practice Questions">
                          <h4 className="practice-title">
                            🎯 Targeted Practice ({m.practice.length} items to close this gap):
                          </h4>
                          <div className="practice-cards-list">
                            {m.practice.map((p, pIdx) => (
                              <div key={p.id || pIdx} className="practice-card">
                                <span className="practice-num">Practice {pIdx + 1}: {p.conceptTag}</span>
                                <p className="practice-q-text">{p.question}</p>
                                <ul className="practice-options">
                                  {p.options.map((opt, oIdx) => (
                                    <li
                                      key={oIdx}
                                      className={`practice-opt ${oIdx === p.correctIndex ? 'practice-opt-correct' : ''}`}
                                    >
                                      <span className="practice-letter">{['A', 'B', 'C', 'D'][oIdx]}</span>
                                      <span>{opt}</span>
                                      {oIdx === p.correctIndex && <span className="badge badge-success badge-inline">Correct Answer</span>}
                                    </li>
                                  ))}
                                </ul>
                                {p.explanation && (
                                  <div className="practice-explanation">
                                    <strong>Explanation:</strong> {p.explanation}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 3: CHANGED PLAN FOR THE NEXT 3 DAYS WITH 'WHY THIS CHANGED' */}
          <div className="replan-panel" role="region" aria-label="Dynamic Re-plan for the Next 3 Days">
            <h3 className="panel-title">
              <span aria-hidden="true">📅</span> Adapted Daily Schedule (Next 3 Days)
            </h3>
            <p className="panel-desc">
              Here is how your study sessions automatically rebalanced to close your knowledge gaps:
            </p>

            <div className="replan-table-container">
              <table className="replan-table" aria-label="Schedule diff table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Topic & Subject</th>
                    <th scope="col">Before &rarr; After</th>
                    <th scope="col">Why this changed</th>
                  </tr>
                </thead>
                <tbody>
                  {next3DaysComparison.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="empty-cell">
                        No changes needed; current plan accommodates all priorities.
                      </td>
                    </tr>
                  ) : (
                    next3DaysComparison.map((row, idx) => {
                      const isTargetTopic = row.topic.id === activeTopic.id;
                      const hasIncrease = row.newMinutes > row.oldMinutes;

                      return (
                        <tr
                          key={idx}
                          className={isTargetTopic && hasIncrease ? 'row-replan-boost' : ''}
                        >
                          <td>
                            <strong className="text-nowrap">{row.date}</strong>
                            {row.date === today && <span className="badge badge-accent badge-inline">Today</span>}
                          </td>
                          <td>
                            <div className="table-topic-group">
                              <span className="table-topic-name">{row.topic.name}</span>
                              <span className="table-subject-tag">{row.topic.subject}</span>
                            </div>
                          </td>
                          <td>
                            <span className="minutes-diff">
                              <span className="min-old">{row.oldMinutes}m</span>
                              <span className="arrow-divider" aria-hidden="true">&rarr;</span>
                              <strong className={`min-new ${hasIncrease ? 'text-boost' : ''}`}>
                                {row.newMinutes}m
                              </strong>
                            </span>
                          </td>
                          <td>
                            <div className="why-changed-cell">
                              <span className="why-badge">
                                {isTargetTopic ? '🎯 Priority Recalibrated' : '⚖️ Auto-Rebalanced'}
                              </span>
                              <span className="why-text">{row.whyChanged}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="actions-row">
            <button type="button" className="btn btn-secondary" onClick={onBack}>
              &larr; Back to Quiz
            </button>

            {onViewPlan && (
              <button type="button" className="btn btn-secondary" onClick={onViewPlan}>
                📅 View Full Updated Plan
              </button>
            )}

            <button type="button" className="btn btn-primary btn-large" onClick={onReset}>
              🔁 Start New StudyLoop &rarr;
            </button>
          </div>
        </>
      )}
    </section>
  );
}
