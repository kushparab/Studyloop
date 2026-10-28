import React from 'react';

export default function Header() {
  return (
    <header className="app-header" role="banner">
      <div className="header-brand">
        <span className="brand-logo" aria-hidden="true">🔁</span>
        <div className="brand-text">
          <h1 className="brand-title">StudyLoop</h1>
          <p className="brand-tagline">AI-Guided Study Planning & Diagnostic Loop</p>
        </div>
      </div>
      <div className="header-meta">
        <span className="badge badge-subtle" title="AI only used for Extraction, Quiz, and Diagnosis">
          Engine: Deterministic Pure Functions
        </span>
      </div>
    </header>
  );
}
