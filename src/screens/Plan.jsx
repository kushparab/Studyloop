import React, { useMemo } from 'react';
import { generateDailyPlan } from '../engine/planner.js';
import { detectClashes } from '../engine/clashes.js';
import { calculateReadiness } from '../engine/mastery.js';
import { calculateDaysLeft, sortTopicsByPriority } from '../engine/priority.js';

export default function Plan({
  deadlines = [],
  topics = [],
  settings = {},
  onStartQuiz,
  onBack,
  onNext
}) {
  const today = settings.today || new Date().toISOString().split('T')[0];

  // Pure deterministic calculations from src/engine
  const clashes = useMemo(() => {
    return detectClashes(deadlines, settings);
  }, [deadlines, settings]);

  const plan = useMemo(() => {
    return generateDailyPlan(topics, settings);
  }, [topics, settings]);

  const overallReadiness = useMemo(() => {
    return calculateReadiness(topics);
  }, [topics]);

  // Topic lookup map for fast block labeling
  const topicMap = useMemo(() => {
    const map = {};
    for (const t of topics) {
      map[t.id] = t;
    }
    return map;
  }, [topics]);

  // Group plan blocks by date
  const planByDate = useMemo(() => {
    const grouped = {};
    for (const block of plan) {
      if (!grouped[block.date]) grouped[block.date] = [];
      grouped[block.date].push(block);
    }
    return grouped;
  }, [plan]);

  const sortedDates = Object.keys(planByDate).sort();

  // Determine top priority topic for default quiz action
  const sortedTopics = useMemo(() => {
    return sortTopicsByPriority(topics, today);
  }, [topics, today]);

  const topTopic = sortedTopics[0] || topics[0] || null;

  const handleQuizClick = (topic) => {
    if (onStartQuiz) {
      onStartQuiz(topic);
    } else if (onNext) {
      onNext();
    }
  };

  return (
    <section className="screen-card" aria-labelledby="plan-heading">
      <header className="screen-header">
        <div className="header-badge-row">
          <span className="badge badge-subtle">Engine: Deterministic Pure Functions</span>
          <span className="badge badge-neutral">Plan Window: {today} onward</span>
        </div>
        <h2 id="plan-heading" className="screen-title">
          3. Daily Study Plan & Clash Detection
        </h2>
        <p className="screen-desc">
          Your daily schedule is balanced up to exam deadlines. Review clash bottlenecks, inspect
          topic readiness, and launch quick knowledge checks.
        </p>
      </header>

      {/* 1. CLASH WARNINGS PANEL */}
      <div className="clash-panel" role="region" aria-label="Schedule Clashes and Warnings">
        <h3 className="panel-title">
          <span aria-hidden="true">⚠️</span> Clash & Bottleneck Alerts ({clashes.length})
        </h3>

        {clashes.length === 0 ? (
          <div className="alert-banner alert-success" role="status">
            <span className="alert-icon" aria-hidden="true">✅</span>
            <div>
              <strong>No schedule clashes detected!</strong>
              <p className="text-sm">Your deadlines and exam dates are well-spaced across available study hours.</p>
            </div>
          </div>
        ) : (
          <div className="clash-card-list">
            {clashes.map((c, idx) => (
              <div key={idx} className="clash-card">
                <div className="clash-card-header">
                  <span className={`badge ${c.rule === 'overload' ? 'badge-danger' : 'badge-warning'}`}>
                    {c.rule === 'same_day_deadlines' && 'Multiple Deadlines on Same Day'}
                    {c.rule === 'exam_proximity' && 'Exam within 48h of Deadline'}
                    {c.rule === 'overload' && 'Daily Overload (< 3h Available)'}
                  </span>
                  <span className="clash-date">📅 {c.date}</span>
                </div>
                <p className="clash-warning-text"><strong>Issue:</strong> {c.warning}</p>
                <div className="clash-suggestion-box">
                  <span className="suggestion-label">💡 Suggested Action:</span>
                  <span className="suggestion-text">{c.suggestion}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. READINESS PROGRESS SECTION */}
      <div className="readiness-panel" role="region" aria-label="Readiness and Topic Mastery">
        <div className="readiness-overview-card">
          <div className="readiness-score-group">
            <span className="readiness-big-score">{overallReadiness}%</span>
            <div className="readiness-text-group">
              <h3 className="readiness-title">Overall Exam Readiness</h3>
              <p className="readiness-desc">
                {overallReadiness < 40
                  ? 'Baseline preparation. Take diagnostic quizzes to pinpoint gaps.'
                  : overallReadiness < 70
                  ? 'Good foundation. Focus on weak topics to boost readiness.'
                  : 'High readiness! Polish remaining concepts with targeted review.'}
              </p>
            </div>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-valuenow={overallReadiness}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Overall Readiness Progress"
          >
            <div className="progress-fill" style={{ width: `${overallReadiness}%` }} />
          </div>
        </div>

        {/* TOPIC READINESS CARDS */}
        <h4 className="sub-heading">Topic Mastery Breakdown & Quizzes</h4>
        <div className="topic-grid">
          {topics.map((t) => {
            const masteryPct = Math.round((t.mastery !== undefined ? t.mastery : 0.3) * 100);
            const daysLeft = calculateDaysLeft(t.examDate, today);

            return (
              <article key={t.id} className="topic-card" aria-labelledby={`topic-title-${t.id}`}>
                <div className="topic-card-header">
                  <div>
                    <span className="topic-subject-tag">{t.subject}</span>
                    <h5 id={`topic-title-${t.id}`} className="topic-card-name">{t.name}</h5>
                  </div>
                  <span className="badge badge-neutral">
                    {t.examDate ? `${daysLeft}d left` : 'No exam date'}
                  </span>
                </div>

                <div className="topic-meta-row">
                  <span className="meta-pill">Weight: {t.weight}/5</span>
                  <span className="meta-pill">Difficulty: {t.difficulty}/5</span>
                </div>

                <div className="topic-progress-group">
                  <div className="progress-label-row">
                    <span className="progress-label">Mastery</span>
                    <span className="progress-pct">{masteryPct}%</span>
                  </div>
                  <div
                    className="progress-track progress-track-sm"
                    role="progressbar"
                    aria-valuenow={masteryPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${t.name} mastery`}
                  >
                    <div
                      className={`progress-fill ${masteryPct < 40 ? 'fill-low' : masteryPct < 70 ? 'fill-mid' : 'fill-high'}`}
                      style={{ width: `${masteryPct}%` }}
                    />
                  </div>
                </div>

                {t.notes && t.notes.length > 0 && (
                  <p className="topic-note-alert">
                    ⚠️ {t.notes[t.notes.length - 1]}
                  </p>
                )}

                <div className="topic-card-footer">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm btn-full"
                    onClick={() => handleQuizClick(t)}
                    aria-label={`Start active recall quiz for ${t.name}`}
                  >
                    🎯 Start Quiz ({t.name.split(' ')[0]})
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* 3. DAY-BY-DAY LIST OF PLAN BLOCKS */}
      <div className="schedule-panel" role="region" aria-label="Day-by-Day Study Schedule">
        <h3 className="panel-title">
          <span aria-hidden="true">📅</span> Day-by-Day Study Schedule
        </h3>

        {sortedDates.length === 0 ? (
          <div className="placeholder-box">
            <p className="muted-text">No study sessions could be scheduled. Check that topics and deadlines have upcoming dates.</p>
          </div>
        ) : (
          <div className="days-list">
            {sortedDates.map((date) => {
              const blocks = planByDate[date];
              const totalMins = blocks.reduce((sum, b) => sum + b.minutes, 0);
              const isToday = date === today;

              return (
                <div key={date} className={`day-card ${isToday ? 'day-card-today' : ''}`}>
                  <div className="day-header">
                    <div className="day-title-group">
                      <time dateTime={date} className="day-date-text">
                        {date} {isToday && <span className="badge badge-accent">Today</span>}
                      </time>
                    </div>
                    <span className="badge badge-subtle">
                      ⏱️ {totalMins} mins ({ (totalMins / 60).toFixed(1) } hrs)
                    </span>
                  </div>

                  <ul className="blocks-list" aria-label={`Study blocks for ${date}`}>
                    {blocks.map((block, bIdx) => {
                      const topic = topicMap[block.topicId];
                      return (
                        <li key={bIdx} className="block-item">
                          <div className="block-main">
                            <span className="block-minutes">{block.minutes}m</span>
                            <div className="block-details">
                              <span className="block-topic-name">
                                {topic ? topic.name : `Topic ${block.topicId}`}
                              </span>
                              {topic && <span className="block-subject">{topic.subject}</span>}
                            </div>
                          </div>
                          <div className="block-reason-box">
                            <span className="reason-quote">"{block.reason}"</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ACTIONS */}
      <div className="actions-row">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          &larr; Back to Confirm
        </button>
        {topTopic && (
          <button
            type="button"
            className="btn btn-primary btn-large"
            onClick={() => handleQuizClick(topTopic)}
          >
            Start Top Priority Quiz ({topTopic.name.slice(0, 18)}...) &rarr;
          </button>
        )}
      </div>
    </section>
  );
}
