import React from 'react';

export default function Header() {
  return (
    <header className="app-header" role="banner">
      <div className="header-brand">
        <div className="brand-wordmark-row">
          <svg
            className="brand-loop-glyph"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {/* Hand-drawn dynamic looping arrow path */}
            <path d="M17 3l4 4-4 4" />
            <path d="M7 21l-4-4 4-4" />
            <path d="M21 7H8a4 4 0 0 0-4 4v1" />
            <path d="M3 17h13a4 4 0 0 0 4-4v-1" />
          </svg>
          <h1 className="brand-title">StudyLoop</h1>
        </div>
        <p className="brand-tagline">What to study today, adjusted by what you got wrong.</p>
      </div>
    </header>
  );
}
