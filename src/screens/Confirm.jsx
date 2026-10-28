import React, { useState } from 'react';

const DEADLINE_TYPES = ['assignment', 'exam', 'lab', 'test', 'other'];

export default function Confirm({
  deadlines = [],
  topics = [],
  warnings = [],
  settings = {},
  onConfirm,
  onBack,
  onUpdateData,
  apiBanner = null
}) {
  const [localDeadlines, setLocalDeadlines] = useState(deadlines);
  const [localTopics, setLocalTopics] = useState(topics);
  const [validationError, setValidationError] = useState(null);

  // Sync back to parent/localStorage whenever changes occur
  const updateDeadlines = (updated) => {
    setLocalDeadlines(updated);
    if (onUpdateData) {
      onUpdateData({ deadlines: updated, topics: localTopics });
    }
  };

  const updateTopics = (updated) => {
    setLocalTopics(updated);
    if (onUpdateData) {
      onUpdateData({ deadlines: localDeadlines, topics: updated });
    }
  };

  // --- Deadline Row Handlers ---
  const handleDeadlineChange = (id, field, value) => {
    const updated = localDeadlines.map((d) => {
      if (d.id === id) {
        const item = { ...d, [field]: value };
        // If user manually edits a low-confidence date or title, mark verified
        if (field === 'dueDate' && value) {
          item.confidence = Math.max(item.confidence || 0, 0.85);
        }
        return item;
      }
      return d;
    });
    updateDeadlines(updated);
  };

  const handleDeleteDeadline = (id) => {
    const updated = localDeadlines.filter((d) => d.id !== id);
    updateDeadlines(updated);
  };

  const handleAddDeadline = () => {
    const newId = `d-${Date.now()}`;
    const newDeadline = {
      id: newId,
      title: 'New Assignment',
      type: 'assignment',
      subject: localTopics[0]?.subject || 'General',
      dueDate: settings.today || new Date().toISOString().split('T')[0],
      confidence: 1.0,
      sourceSnippet: 'Manually added'
    };
    updateDeadlines([...localDeadlines, newDeadline]);
  };

  // --- Topic Row Handlers ---
  const handleTopicChange = (id, field, value) => {
    const updated = localTopics.map((t) => {
      if (t.id === id) {
        const numVal = field === 'weight' || field === 'difficulty' ? Number(value) : value;
        return { ...t, [field]: numVal };
      }
      return t;
    });
    updateTopics(updated);
  };

  const handleDeleteTopic = (id) => {
    const updated = localTopics.filter((t) => t.id !== id);
    updateTopics(updated);
  };

  const handleAddTopic = () => {
    const newId = `t-${Date.now()}`;
    const newTopic = {
      id: newId,
      subject: localDeadlines[0]?.subject || 'General',
      name: 'New Study Topic',
      weight: 3,
      difficulty: 3,
      examDate: settings.today || new Date().toISOString().split('T')[0],
      mastery: 0.3
    };
    updateTopics([...localTopics, newTopic]);
  };

  // --- Validation before proceeding to Plan ---
  // Rows with null dates or confidence below 0.6 must be fixed before continuing
  const invalidDeadlines = localDeadlines.filter(
    (d) => !d.dueDate || d.dueDate.trim() === '' || (d.confidence !== undefined && d.confidence < 0.6)
  );

  const invalidTopics = localTopics.filter(
    (t) => !t.name || t.name.trim() === ''
  );

  const hasBlockingIssues = invalidDeadlines.length > 0 || invalidTopics.length > 0;

  const handleProceed = () => {
    if (hasBlockingIssues) {
      setValidationError(
        `Please fix all highlighted items before proceeding: ${invalidDeadlines.length} deadline(s) have missing dates or unverified low confidence.`
      );
      return;
    }
    setValidationError(null);
    if (onConfirm) {
      onConfirm({
        deadlines: localDeadlines,
        topics: localTopics
      });
    }
  };

  return (
    <section className="screen-card" aria-labelledby="confirm-heading">
      <header className="screen-header">
        <h2 id="confirm-heading" className="screen-title">
          2. Review & Confirm Extracted Items
        </h2>
        <p className="screen-desc">
          Verify extracted deadlines and topics. Items with missing dates or low AI confidence are
          highlighted below and must be verified before generating your daily study plan.
        </p>
      </header>

      {apiBanner && (
        <div className="alert-banner alert-info" role="status" aria-live="polite">
          <span className="alert-icon" aria-hidden="true">ℹ️</span>
          <span>{apiBanner}</span>
        </div>
      )}

      {/* Warnings List */}
      {warnings && warnings.length > 0 && (
        <div className="alert-banner alert-warning" role="region" aria-label="Extraction Warnings">
          <div className="alert-header">
            <span className="alert-icon" aria-hidden="true">⚠️</span>
            <strong>Extraction Warnings:</strong>
          </div>
          <ul className="warnings-list">
            {warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {validationError && (
        <div className="alert-banner alert-error" role="alert" aria-live="assertive">
          <span className="alert-icon" aria-hidden="true">🚫</span>
          <span>{validationError}</span>
        </div>
      )}

      {/* SECTION 1: DEADLINES */}
      <div className="table-section">
        <div className="section-title-row">
          <h3 className="section-subtitle">
            📅 Deadlines & Deliverables ({localDeadlines.length})
          </h3>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddDeadline}>
            + Add Deadline
          </button>
        </div>

        <div className="table-responsive">
          <table className="data-table" aria-label="Extracted Deadlines Table">
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Type</th>
                <th scope="col">Subject</th>
                <th scope="col">Due Date</th>
                <th scope="col">Status</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {localDeadlines.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-cell">
                    No deadlines extracted. Click "+ Add Deadline" to create one.
                  </td>
                </tr>
              ) : (
                localDeadlines.map((d) => {
                  const isMissingDate = !d.dueDate || d.dueDate.trim() === '';
                  const isLowConfidence = d.confidence !== undefined && d.confidence < 0.6;
                  const isHighlighted = isMissingDate || isLowConfidence;

                  return (
                    <tr
                      key={d.id}
                      className={isHighlighted ? 'row-highlight-warning' : ''}
                      aria-label={isHighlighted ? 'Row requires attention' : undefined}
                    >
                      <td>
                        <input
                          type="text"
                          className="table-input"
                          value={d.title}
                          onChange={(e) => handleDeadlineChange(d.id, 'title', e.target.value)}
                          aria-label={`Title for deadline ${d.title}`}
                          required
                        />
                      </td>
                      <td>
                        <select
                          className="table-select"
                          value={d.type}
                          onChange={(e) => handleDeadlineChange(d.id, 'type', e.target.value)}
                          aria-label={`Type for deadline ${d.title}`}
                        >
                          {DEADLINE_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type.toUpperCase()}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="text"
                          className="table-input"
                          value={d.subject}
                          onChange={(e) => handleDeadlineChange(d.id, 'subject', e.target.value)}
                          aria-label={`Subject for deadline ${d.title}`}
                        />
                      </td>
                      <td>
                        <input
                          type="date"
                          className={`table-input ${isMissingDate ? 'input-error-border' : ''}`}
                          value={d.dueDate || ''}
                          onChange={(e) => handleDeadlineChange(d.id, 'dueDate', e.target.value)}
                          aria-label={`Due date for deadline ${d.title}`}
                          required
                        />
                      </td>
                      <td>
                        {isMissingDate ? (
                          <span className="badge badge-warning" title="A due date is required">
                            ⚠️ Missing Date
                          </span>
                        ) : isLowConfidence ? (
                          <button
                            type="button"
                            className="badge badge-warning-btn"
                            title="Click to confirm date"
                            onClick={() => handleDeadlineChange(d.id, 'confidence', 1.0)}
                          >
                            ⚠️ Low Conf ({Math.round(d.confidence * 100)}%) - Click to verify
                          </button>
                        ) : (
                          <span className="badge badge-success">✓ Verified</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-icon-danger"
                          onClick={() => handleDeleteDeadline(d.id)}
                          aria-label={`Delete deadline ${d.title}`}
                          title="Delete deadline"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: TOPICS */}
      <div className="table-section">
        <div className="section-title-row">
          <h3 className="section-subtitle">
            🧠 Study Topics & Exam Dates ({localTopics.length})
          </h3>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddTopic}>
            + Add Topic
          </button>
        </div>

        <div className="table-responsive">
          <table className="data-table" aria-label="Extracted Topics Table">
            <thead>
              <tr>
                <th scope="col">Subject</th>
                <th scope="col">Topic Name</th>
                <th scope="col">Exam Date</th>
                <th scope="col">Weight (1-5)</th>
                <th scope="col">Difficulty (1-5)</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {localTopics.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-cell">
                    No topics extracted. Click "+ Add Topic" to add one.
                  </td>
                </tr>
              ) : (
                localTopics.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <input
                        type="text"
                        className="table-input"
                        value={t.subject}
                        onChange={(e) => handleTopicChange(t.id, 'subject', e.target.value)}
                        aria-label={`Subject for topic ${t.name}`}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="table-input"
                        value={t.name}
                        onChange={(e) => handleTopicChange(t.id, 'name', e.target.value)}
                        aria-label={`Name for topic ${t.name}`}
                        required
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        className="table-input"
                        value={t.examDate || ''}
                        onChange={(e) => handleTopicChange(t.id, 'examDate', e.target.value)}
                        aria-label={`Exam date for topic ${t.name}`}
                      />
                    </td>
                    <td>
                      <select
                        className="table-select"
                        value={t.weight || 3}
                        onChange={(e) => handleTopicChange(t.id, 'weight', e.target.value)}
                        aria-label={`Weight for topic ${t.name}`}
                      >
                        {[1, 2, 3, 4, 5].map((w) => (
                          <option key={w} value={w}>
                            {w} {w === 5 ? '(Highest)' : w === 1 ? '(Lowest)' : ''}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="table-select"
                        value={t.difficulty || 3}
                        onChange={(e) => handleTopicChange(t.id, 'difficulty', e.target.value)}
                        aria-label={`Difficulty for topic ${t.name}`}
                      >
                        {[1, 2, 3, 4, 5].map((d) => (
                          <option key={d} value={d}>
                            {d} {d === 5 ? '(Hardest)' : d === 1 ? '(Easiest)' : ''}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-icon-danger"
                        onClick={() => handleDeleteTopic(t.id)}
                        aria-label={`Delete topic ${t.name}`}
                        title="Delete topic"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="actions-row">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          &larr; Back to Capture
        </button>

        <button
          type="button"
          className="btn btn-primary btn-large"
          onClick={handleProceed}
          disabled={hasBlockingIssues}
          title={
            hasBlockingIssues
              ? 'Fix highlighted items with missing dates or low confidence to proceed'
              : 'Proceed to Plan'
          }
        >
          {hasBlockingIssues
            ? `⚠️ Fix ${invalidDeadlines.length} Highlighted Item(s) to Continue`
            : 'Generate Daily Plan &rarr;'}
        </button>
      </div>
    </section>
  );
}
