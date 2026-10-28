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
      setError('Please paste syllabus text or click "Load sample messy chat" before analyzing.');
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
          Paste unstructured emails, Discord/WhatsApp announcements, or lecture syllabi. StudyLoop
          extracts deadlines, topics, and exam dates.
        </p>
      </header>

      {localBanner && (
        <div className="alert-banner alert-info" role="status" aria-live="polite">
          <span className="alert-icon" aria-hidden="true">ℹ️</span>
          <span>{localBanner}</span>
        </div>
      )}

      {error && (
        <div className="alert-banner alert-error" role="alert" aria-live="assertive">
          <span className="alert-icon" aria-hidden="true">⚠️</span>
          <span>{error}</span>
        </div>
      )}

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
              className="btn btn-subtle"
              onClick={handleLoadSample}
              disabled={loading}
            >
              📥 Load sample messy chat
            </button>
          </div>
          <textarea
            id="capture-textarea"
            className="form-textarea"
            rows={8}
            placeholder="Paste syllabus announcements, exam dates, assignment reminders here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={loading}
            required
            aria-describedby="capture-hint"
          />
          <span id="capture-hint" className="input-hint">
            Tip: Relative dates like "next Monday" will be automatically resolved to YYYY-MM-DD.
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
                <span>Analysing with AI...</span>
              </>
            ) : (
              <span>Analyse & Extract Deadlines &rarr;</span>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
