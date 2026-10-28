import React, { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import StepProgress from './components/StepProgress.jsx';
import Capture from './screens/Capture.jsx';
import Confirm from './screens/Confirm.jsx';
import Plan from './screens/Plan.jsx';
import Quiz from './screens/Quiz.jsx';
import Insights from './screens/Insights.jsx';
import { loadStoredState, saveStoredState, clearStoredState } from './store.js';

const INITIAL_SETTINGS = {
  today: new Date().toISOString().split('T')[0],
  hoursPerDay: 2
};

export default function App() {
  // Restore persisted state from localStorage on startup
  const [appState, setAppState] = useState(() => {
    const saved = loadStoredState();
    if (saved) return saved;

    return {
      currentStep: 0,
      rawText: '',
      settings: INITIAL_SETTINGS,
      deadlines: [],
      topics: [],
      warnings: [],
      selectedQuizTopicId: null,
      quizResults: null,
      apiBanner: null
    };
  });

  // Automatically save state whenever it updates
  useEffect(() => {
    saveStoredState(appState);
  }, [appState]);

  const {
    currentStep,
    rawText,
    settings,
    deadlines,
    topics,
    warnings,
    selectedQuizTopicId,
    quizResults,
    apiBanner
  } = appState;

  const setCurrentStep = (step) => {
    setAppState((prev) => ({ ...prev, currentStep: step }));
  };

  const handleNext = () => setCurrentStep(Math.min(currentStep + 1, 4));
  const handleBack = () => setCurrentStep(Math.max(currentStep - 1, 0));

  const handleReset = () => {
    clearStoredState();
    setAppState({
      currentStep: 0,
      rawText: '',
      settings: INITIAL_SETTINGS,
      deadlines: [],
      topics: [],
      warnings: [],
      selectedQuizTopicId: null,
      quizResults: null,
      apiBanner: null
    });
  };

  // Called after Capture successfully analyzes text
  const handleCaptureAnalyzed = ({ rawText, settings, deadlines, topics, warnings, apiBanner }) => {
    setAppState((prev) => ({
      ...prev,
      currentStep: 1, // Advance to Confirm
      rawText,
      settings,
      deadlines,
      topics,
      warnings,
      apiBanner
    }));
  };

  // Called from Confirm screen when deadlines/topics are edited
  const handleUpdateConfirmData = ({ deadlines, topics }) => {
    setAppState((prev) => ({
      ...prev,
      deadlines: deadlines || prev.deadlines,
      topics: topics || prev.topics
    }));
  };

  // Called when Confirm screen is approved by student
  const handleConfirmApproved = ({ deadlines, topics }) => {
    setAppState((prev) => ({
      ...prev,
      currentStep: 2, // Advance to Plan
      deadlines,
      topics
    }));
  };

  // Called from Plan screen when student chooses a topic to quiz
  const handleStartQuiz = (topic) => {
    setAppState((prev) => ({
      ...prev,
      selectedQuizTopicId: topic?.id || null,
      currentStep: 3 // Advance to Quiz
    }));
  };

  // Called when Quiz finishes and student wants diagnosis
  const handleQuizCompleted = ({ topic, questions, answers, score, correctCount, totalCount }) => {
    setAppState((prev) => ({
      ...prev,
      quizResults: { topic, questions, answers, score, correctCount, totalCount },
      currentStep: 4 // Advance to Insights
    }));
  };

  // Called from Insights when planning engine re-balances topics
  const handleUpdateTopicsAfterDiagnosis = (updatedTopics) => {
    setAppState((prev) => ({
      ...prev,
      topics: updatedTopics
    }));
  };

  const activeQuizTopic =
    topics.find((t) => t.id === selectedQuizTopicId) || topics[0] || null;

  return (
    <div className="app-shell">
      <Header />

      <main className="app-main" id="main-content">
        <StepProgress currentStep={currentStep} onSelectStep={setCurrentStep} />

        <div className="screen-container">
          {currentStep === 0 && (
            <Capture
              initialText={rawText}
              initialSettings={settings}
              onAnalyzed={handleCaptureAnalyzed}
              apiBanner={apiBanner}
            />
          )}

          {currentStep === 1 && (
            <Confirm
              deadlines={deadlines}
              topics={topics}
              warnings={warnings}
              settings={settings}
              apiBanner={apiBanner}
              onConfirm={handleConfirmApproved}
              onBack={handleBack}
              onUpdateData={handleUpdateConfirmData}
            />
          )}

          {currentStep === 2 && (
            <Plan
              deadlines={deadlines}
              topics={topics}
              settings={settings}
              onStartQuiz={handleStartQuiz}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {currentStep === 3 && (
            <Quiz
              topic={activeQuizTopic}
              topics={topics}
              onCompleteQuiz={handleQuizCompleted}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {currentStep === 4 && (
            <Insights
              topic={quizResults?.topic || activeQuizTopic}
              topics={topics}
              quizResults={quizResults}
              settings={settings}
              deadlines={deadlines}
              onUpdateTopics={handleUpdateTopicsAfterDiagnosis}
              onReset={handleReset}
              onBack={handleBack}
              onViewPlan={() => setCurrentStep(2)}
            />
          )}
        </div>
      </main>

      <footer className="app-footer">
        <p>StudyLoop &bull; 6-Hour Hackathon Project &bull; Education & Student Life Track</p>
      </footer>
    </div>
  );
}
