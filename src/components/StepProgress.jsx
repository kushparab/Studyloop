import React from 'react';

const STEPS = [
  { id: 0, label: 'Capture', desc: 'Paste syllabus' },
  { id: 1, label: 'Confirm', desc: 'Verify dates' },
  { id: 2, label: 'Plan', desc: 'Daily schedule' },
  { id: 3, label: 'Quiz', desc: 'Check mastery' },
  { id: 4, label: 'Insights', desc: 'Diagnose & rebalance' }
];

export default function StepProgress({ currentStep, onSelectStep }) {
  return (
    <nav className="step-nav" aria-label="StudyLoop Workflow Steps">
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
                  {isPassed ? '✓' : step.id + 1}
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
