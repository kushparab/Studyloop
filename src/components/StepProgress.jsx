import React from 'react';

const STEPS = [
  { id: 0, label: 'Capture', desc: 'Paste raw syllabus' },
  { id: 1, label: 'Confirm', desc: 'Verify dates' },
  { id: 2, label: 'Plan', desc: 'Daily schedule' },
  { id: 3, label: 'Quiz', desc: 'Check mastery' },
  { id: 4, label: 'Insights', desc: 'Diagnose & adapt' }
];

export default function StepProgress({ currentStep, onSelectStep }) {
  return (
    <nav className="step-nav" aria-label="Workflow Steps">
      <ol className="step-list">
        {STEPS.map((step) => {
          const isActive = step.id === currentStep;
          const isPassed = step.id < currentStep;

          return (
            <li key={step.id} className="step-item">
              <button
                type="button"
                className={`step-btn ${isActive ? 'is-active' : ''} ${isPassed ? 'is-passed' : ''}`}
                onClick={() => onSelectStep(step.id)}
                aria-current={isActive ? 'step' : undefined}
                aria-label={`Step ${step.id + 1}: ${step.label} (${step.desc})`}
              >
                <span className="step-number" aria-hidden="true">
                  {isPassed ? (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    step.id + 1
                  )}
                </span>
                <span className="step-label-group">
                  <span className="step-name">{step.label}</span>
                  <span className="step-desc-subtle">{step.desc}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
