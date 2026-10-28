import React, { useState } from 'react';
import { SAMPLE_RAW_TEXT } from '../data/sample.js';
import { extractFromText } from '../api.js';

export default function Capture({
  initialText = '',
  initialSettings = {},
  onAnalyzed,
  apiBanner = null
}) {
  const [text, setText] = useState(initialText || '');
  const [today, setToday] = useState(
    initialSettings.today || new Date().toISOString().split('T')[0]
  );
  const [hoursPerDay, setHoursPerDay] = useState(
    typeof initialSettings.hoursPerDay === 'number' ? initialSettings.hoursPerDay : 2
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [localBanner, setLocalBanner] = useState(apiBanner);

  const handleLoadSample = () => {
    setText(SAMPLE_RAW_TEXT.trim());
    setError(null);
  };

  const handleAnalyse = async (e) => {
    e.preventDefault();
    if (!text.trim()) {
      setError('Please paste syllabus text or load a sample chat before analyzing.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await extractFromText({ text, today });
      setLocalBanner(result.banner);

      if (onAnalyzed) {
        onAnalyzed({
          rawText: text,
          settings: { today, hoursPerDay: Number(hoursPerDay) || 2 },
          deadlines: result.deadlines || [],
          topics: result.topics || [],
          warnings: result.warnings || [],
          apiBanner: result.banner
        });
      }
    } catch (err) {
      setError(`Extraction failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="screen-card" aria-labelledby="capture-heading">
      <header className="screen-header">
        <h2 id="capture-heading" className="screen-title">
          1. Capture Messy Syllabus & Deadlines
        </h2>
        <p className="screen-desc">
          Paste your deadlines, syllabus or class chat. StudyLoop extracts topics, dates, and study priorities.
        </p>
      </header>

      {localBanner && (
        <div className="alert-banner alert-info" role="status" aria-live="polite">
          <span className="alert-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </span>
          <span>{localBanner}</span>
        </div>
      )}

      {error && (
        <div className="alert-banner alert-error" role="alert" aria-live="assertive">
          <span className="alert-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </span>
          <span>{error}</span>
        </div>
      )}

      {/* Two-Column Layout (Form at ~62% on Desktop, Sidebar at ~38%) */}
      <div className="capture-layout-grid">
        <div className="capture-main-col">
          <form onSubmit={handleAnalyse} className="capture-form" noValidate>
            <div className="form-row-grid">
              <div className="form-group">
                <label htmlFor="capture-today" className="form-label">
                  Today's Date <span className="label-subtle">(Baseline for planning)</span>
                </label>
                <input
                  id="capture-today"
                  type="date"
                  className="form-input"
                  value={today}
                  onChange={(e) => setToday(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="capture-hours" className="form-label">
                  Hours Available Per Day <span className="label-subtle">(Study capacity)</span>
                </label>
                <input
                  id="capture-hours"
                  type="number"
                  className="form-input"
                  min="0.5"
                  max="16"
                  step="0.5"
                  value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div className="label-with-action">
                <label htmlFor="capture-textarea" className="form-label">
                  Messy Student Text, Chat, or Syllabus:
                </label>
                <button
                  type="button"
                  className="btn btn-subtle btn-sample"
                  onClick={handleLoadSample}
                  disabled={loading}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                  <span>Load sample messy chat</span>
                </button>
              </div>
              <textarea
                id="capture-textarea"
                className="form-textarea"
                rows={9}
                placeholder="Paste class announcements, exam dates, Discord messages, or syllabus snippets..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={loading}
                required
                aria-describedby="capture-hint"
              />
              <span id="capture-hint" className="input-hint">
                Tip: Relative dates like "next Tuesday" or "midterm in 2 weeks" resolve to exact dates.
              </span>
            </div>

            <div className="actions-row">
              <button
                type="submit"
                className="btn btn-primary btn-large"
                disabled={loading || !text.trim()}
                aria-busy={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner" aria-hidden="true"></span>
                    <span>Extracting deadlines...</span>
                  </>
                ) : (
                  <span>Analyse & Extract Deadlines &rarr;</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Sidebar: Guide and Tip Cards */}
        <aside className="capture-sidebar" aria-label="StudyLoop Guide">
          <div className="sidebar-card">
            <h3 className="sidebar-card-title">How StudyLoop works</h3>
            <ol className="sidebar-steps-list">
              <li>
                <span className="sidebar-step-num">1</span>
                <div className="sidebar-step-content">
                  <strong className="sidebar-step-name">Paste</strong>
                  <p className="sidebar-step-desc">Drop in messy announcements, assignments, or syllabi.</p>
                </div>
              </li>
              <li>
                <span className="sidebar-step-num">2</span>
                <div className="sidebar-step-content">
                  <strong className="sidebar-step-name">Confirm</strong>
                  <p className="sidebar-step-desc">Review extracted dates, fill gaps, and approve topics.</p>
                </div>
              </li>
              <li>
                <span className="sidebar-step-num">3</span>
                <div className="sidebar-step-content">
                  <strong className="sidebar-step-name">Plan</strong>
                  <p className="sidebar-step-desc">Engine balances daily study blocks and flags overload clashes.</p>
                </div>
              </li>
              <li>
                <span className="sidebar-step-num">4</span>
                <div className="sidebar-step-content">
                  <strong className="sidebar-step-name">Quiz and adapt</strong>
                  <p className="sidebar-step-desc">Mistakes re-weight future sessions to close knowledge gaps.</p>
                </div>
              </li>
            </ol>
          </div>

          <div className="sidebar-card tip-card">
            <div className="tip-header">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 18h6" />
                <path d="M10 22h4" />
                <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z" />
              </svg>
              <h4 className="tip-title">Notebook Tip</h4>
            </div>
            <p className="tip-desc">
              Relative dates like <span className="highlight-text">"next Friday"</span> or <span className="highlight-text">"Nov 15th"</span> are automatically resolved to exact dates using your chosen baseline.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
