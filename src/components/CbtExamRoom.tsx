import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { JAMB_SUBJECTS } from '../data/subjects.ts';
import { OptionKey, Question } from '../types/index.ts';
import { CbtCalculator } from './CbtCalculator.tsx';
import {
  Clock,
  Calculator,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  BookOpen,
  Keyboard,
  Maximize2,
  Minimize2,
  Grid,
  X,
  StopCircle,
  LogOut
} from 'lucide-react';

export const CbtExamRoom: React.FC = () => {
  const {
    activeTestSession,
    questions,
    submitCbtTest,
    exitCbtTest,
    user,
    isAuthenticated,
    openAuthModal,
    showToast
  } = useApp();

  if (!activeTestSession || !isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Candidate Sign-Up Required</h2>
        <p className="text-slate-500 mb-6">Please sign up or log in to access the CBT Examination room and save your score.</p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              exitCbtTest();
              openAuthModal('signup', 'cbt_required');
            }}
            className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-semibold shadow-md cursor-pointer"
          >
            Sign Up to Practice
          </button>
          <button
            onClick={exitCbtTest}
            className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-semibold cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Retrieve question objects for the test
  const testQuestions = useMemo(() => {
    return activeTestSession.questionIds
      .map(id => questions.find(q => q.id === id))
      .filter((q): q is Question => !!q);
  }, [activeTestSession.questionIds, questions]);

  // Group questions by subject
  const subjectsInTest = useMemo(() => {
    return activeTestSession.subjects.map(sId => {
      const info = JAMB_SUBJECTS.find(s => s.id === sId);
      const subQuestions = testQuestions.filter(q => q.subjectId === sId);
      return {
        id: sId,
        name: info?.name || sId,
        code: info?.code || sId.substring(0, 3).toUpperCase(),
        questions: subQuestions,
      };
    });
  }, [activeTestSession.subjects, testQuestions]);

  const [activeSubjectId, setActiveSubjectId] = useState<string>(activeTestSession.subjects[0] || 'english');
  const [currentQuestionIndexInSubject, setCurrentQuestionIndexInSubject] = useState<number>(0);

  // Candidate answers and review status
  const [answers, setAnswers] = useState<Record<string, OptionKey>>(activeTestSession.answers || {});
  const [markedForReview, setMarkedForReview] = useState<string[]>(activeTestSession.markedForReview || []);

  // Timer
  const [secondsRemaining, setSecondsRemaining] = useState<number>(activeTestSession.timeAllowedSeconds);
  const [timeSpent, setTimeSpent] = useState<number>(0);

  // UI state toggles
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isTerminateModalOpen, setIsTerminateModalOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false); // Mobile bottom sheet question palette
  const [isKeyboardHelpOpen, setIsKeyboardHelpOpen] = useState(false);
  const [isPassageExpanded, setIsPassageExpanded] = useState(false);

  // Active subject's current questions
  const currentSubjectGroup = subjectsInTest.find(s => s.id === activeSubjectId) || subjectsInTest[0];
  const currentQuestion = currentSubjectGroup?.questions[currentQuestionIndexInSubject] || testQuestions[0];

  // Global question number across all subjects
  const globalQuestionNumber = testQuestions.findIndex(q => q?.id === currentQuestion?.id) + 1;

  // Answer selection
  const handleSelectOption = useCallback((option: OptionKey) => {
    if (!currentQuestion) return;
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: option
    }));
  }, [currentQuestion]);

  // Clear answer
  const handleClearAnswer = useCallback(() => {
    if (!currentQuestion) return;
    setAnswers(prev => {
      const next = { ...prev };
      delete next[currentQuestion.id];
      return next;
    });
  }, [currentQuestion]);

  // Toggle mark for review
  const handleToggleReview = useCallback(() => {
    if (!currentQuestion) return;
    setMarkedForReview(prev => {
      if (prev.includes(currentQuestion.id)) {
        return prev.filter(id => id !== currentQuestion.id);
      } else {
        return [...prev, currentQuestion.id];
      }
    });
  }, [currentQuestion]);

  // Navigation: Next question
  const handleNext = useCallback(() => {
    if (!currentSubjectGroup) return;
    if (currentQuestionIndexInSubject < currentSubjectGroup.questions.length - 1) {
      setCurrentQuestionIndexInSubject(prev => prev + 1);
    } else {
      // Jump to next subject if available
      const currentSubIndex = subjectsInTest.findIndex(s => s.id === activeSubjectId);
      if (currentSubIndex < subjectsInTest.length - 1) {
        setActiveSubjectId(subjectsInTest[currentSubIndex + 1].id);
        setCurrentQuestionIndexInSubject(0);
      }
    }
  }, [currentQuestionIndexInSubject, currentSubjectGroup, subjectsInTest, activeSubjectId]);

  // Navigation: Prev question
  const handlePrev = useCallback(() => {
    if (currentQuestionIndexInSubject > 0) {
      setCurrentQuestionIndexInSubject(prev => prev - 1);
    } else {
      // Jump to previous subject last question
      const currentSubIndex = subjectsInTest.findIndex(s => s.id === activeSubjectId);
      if (currentSubIndex > 0) {
        const prevSub = subjectsInTest[currentSubIndex - 1];
        setActiveSubjectId(prevSub.id);
        setCurrentQuestionIndexInSubject(prevSub.questions.length - 1);
      }
    }
  }, [currentQuestionIndexInSubject, subjectsInTest, activeSubjectId]);

  // Handle final submission
  const handleFinalSubmit = useCallback(() => {
    submitCbtTest(answers, markedForReview, timeSpent);
  }, [answers, markedForReview, timeSpent, submitCbtTest]);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinalSubmit();
          return 0;
        }
        return prev - 1;
      });
      setTimeSpent(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [handleFinalSubmit]);

  // 8-Key JAMB keyboard shortcuts listener (A, B, C, D, N, P, R, S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      const key = e.key.toUpperCase();
      if (key === 'A' || key === 'B' || key === 'C' || key === 'D') {
        e.preventDefault();
        handleSelectOption(key as OptionKey);
      } else if (key === 'N') {
        e.preventDefault();
        handleNext();
      } else if (key === 'P') {
        e.preventDefault();
        handlePrev();
      } else if (key === 'R') {
        e.preventDefault();
        handleClearAnswer();
      } else if (key === 'S') {
        e.preventDefault();
        setIsSubmitModalOpen(true);
      } else if (key === 'T' || key === 'X') {
        e.preventDefault();
        setIsTerminateModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSelectOption, handleNext, handlePrev, handleClearAnswer]);

  // Format time HH:MM:SS
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isLowTime = secondsRemaining < 300; // < 5 mins
  const isCriticalTime = secondsRemaining < 60; // < 1 min

  // Answered stats
  const totalAnsweredCount = Object.keys(answers).length;
  const totalUnansweredCount = testQuestions.length - totalAnsweredCount;
  const currentSubjectAnsweredCount = currentSubjectGroup?.questions.filter(q => !!answers[q.id]).length || 0;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans select-none pb-24 lg:pb-12">
      
      {/* ======================================================== */}
      {/* 1. DISTRACTION-FREE TOP CBT BAR (Mobile-First Header)    */}
      {/* ======================================================== */}
      <header className="sticky top-0 z-30 bg-slate-900 border-b-2 border-orange-500 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            
            {/* Candidate & Exam Title (Compact on Mobile) */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-600 flex items-center justify-center font-extrabold text-white text-xs sm:text-sm shrink-0 border border-blue-400/40">
                {user.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="truncate">
                <div className="font-bold text-xs sm:text-sm text-white truncate flex items-center gap-1.5">
                  <span>{user.name}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">
                  {user.jambRegNumber || '2026/UTME'}
                </div>
              </div>
            </div>

            {/* Quick Utility Buttons (Calculator, Palette Sheet) */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setIsCalculatorOpen(!isCalculatorOpen)}
                className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                  isCalculatorOpen
                    ? 'bg-orange-500 text-white border-orange-600'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
                title="Calculator"
              >
                <Calculator className="w-4 h-4 text-orange-400" />
                <span className="hidden sm:inline">Calc</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPaletteOpen(true)}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer flex items-center gap-1"
                title="Open Question Palette"
              >
                <Grid className="w-4 h-4 text-blue-400" />
                <span className="hidden sm:inline">Palette</span>
                <span className="text-[10px] px-1 py-0.2 rounded bg-blue-500/20 text-blue-300 font-mono">
                  {totalAnsweredCount}/{testQuestions.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsKeyboardHelpOpen(true)}
                className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
                title="8-Key Mode Shortcuts"
              >
                <Keyboard className="w-4 h-4 text-emerald-400" />
                <span>8-Key</span>
              </button>
            </div>

            {/* Countdown Timer, Terminate & Submit Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div
                className={`flex items-center gap-1.5 px-2 sm:px-3.5 py-1 rounded-xl border font-mono font-bold text-xs sm:text-base ${
                  isCriticalTime
                    ? 'bg-red-950 text-red-400 border-red-500 animate-pulse'
                    : isLowTime
                    ? 'bg-amber-950 text-amber-400 border-amber-500'
                    : 'bg-slate-950 text-emerald-400 border-slate-700'
                }`}
              >
                <Clock className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isCriticalTime ? 'text-red-400' : isLowTime ? 'text-amber-400' : 'text-emerald-400'}`} />
                <span>{formatTime(secondsRemaining)}</span>
              </div>

              {/* Terminate Examination Button */}
              <button
                type="button"
                onClick={() => setIsTerminateModalOpen(true)}
                className="px-2 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950 hover:border-rose-500/80 text-rose-300 hover:text-rose-200 border border-slate-700 font-bold text-xs transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                title="Terminate Examination"
              >
                <StopCircle className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Terminate</span>
                <span className="sm:hidden">End</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(true)}
                className="px-2.5 sm:px-4 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center gap-1 active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit</span>
              </button>
            </div>

          </div>
        </div>

        {/* Horizontal Scrollable Subject Navigation Tabs */}
        <div className="bg-slate-950 border-t border-slate-800/80 px-3 sm:px-6">
          <div className="max-w-7xl mx-auto flex items-center overflow-x-auto no-scrollbar gap-2 py-1.5">
            {subjectsInTest.map(sub => {
              const isSelected = sub.id === activeSubjectId;
              const answeredCount = sub.questions.filter(q => !!answers[q.id]).length;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => {
                    setActiveSubjectId(sub.id);
                    setCurrentQuestionIndexInSubject(0);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm border-b-2 border-orange-400'
                      : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <span>{sub.name}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isSelected ? 'bg-blue-800 text-blue-200' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {answeredCount}/{sub.questions.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. MAIN QUESTION WORKSPACE (Phones Primary, Tablets Sec) */}
      {/* ======================================================== */}
      <main className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 w-full flex-1 space-y-4">
        
        {/* Main Question Card */}
        <div className="bg-white rounded-3xl p-4 sm:p-7 shadow-sm border border-slate-200 flex flex-col justify-between min-h-[480px]">
          <div>
            {/* Question Info Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-blue-700 text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
                  {currentQuestionIndexInSubject + 1}
                </span>
                <div>
                  <span className="text-xs font-bold text-slate-800">
                    Question {currentQuestionIndexInSubject + 1} of {currentSubjectGroup?.questions.length}
                  </span>
                  <span className="text-[11px] text-slate-400 block sm:inline sm:ml-2">
                    ({currentSubjectGroup?.name})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {currentQuestion?.topic && (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium border border-slate-200 truncate max-w-[140px] sm:max-w-xs">
                    {currentQuestion.topic}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleToggleReview}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    markedForReview.includes(currentQuestion?.id || '')
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                  title="Flag question for review later"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {markedForReview.includes(currentQuestion?.id || '') ? 'Flagged' : 'Flag'}
                  </span>
                </button>
              </div>
            </div>

            {/* Reading Passage for English / Comprehension Questions */}
            {currentQuestion?.passage && (
              <div className="mb-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsPassageExpanded(!isPassageExpanded)}
                  className="w-full bg-blue-100/60 px-4 py-2 flex items-center justify-between text-xs font-bold text-blue-900 cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-700 shrink-0" />
                    <span>Reading Passage / Comprehension Text</span>
                  </div>
                  <div className="flex items-center gap-1 text-blue-700 text-[11px]">
                    {isPassageExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    <span>{isPassageExpanded ? 'Hide' : 'Read'}</span>
                  </div>
                </button>
                <div
                  className={`p-4 text-xs sm:text-sm text-slate-800 leading-relaxed font-serif transition-all ${
                    isPassageExpanded ? 'max-h-96 overflow-y-auto' : 'max-h-24 overflow-hidden relative'
                  }`}
                >
                  {currentQuestion.passage}
                  {!isPassageExpanded && (
                    <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-blue-50/90 to-transparent flex items-end justify-center pb-1">
                      <span className="text-[10px] text-blue-700 font-bold">Tap to expand full passage</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Question Stem Text */}
            <div className="text-base sm:text-lg font-semibold text-slate-900 leading-relaxed mb-6">
              {currentQuestion?.questionText}
            </div>

            {/* Optional Question Diagram */}
            {currentQuestion?.imageUrl && (
              <div className="mb-6 p-2 bg-slate-50 border border-slate-200 rounded-xl inline-block max-w-full">
                <img
                  src={currentQuestion.imageUrl}
                  alt="Question Diagram"
                  className="max-h-60 rounded object-contain"
                />
              </div>
            )}

            {/* Options A, B, C, D (Generous touch targets for mobile) */}
            <div className="space-y-3">
              {(['A', 'B', 'C', 'D'] as OptionKey[]).map(key => {
                const optionText = currentQuestion?.options[key];
                if (!optionText) return null;
                const isSelected = answers[currentQuestion.id] === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectOption(key)}
                    className={`w-full min-h-[52px] flex items-start gap-3.5 p-3.5 sm:p-4 rounded-2xl text-left border-2 transition-all cursor-pointer active:scale-[0.99] ${
                      isSelected
                        ? 'bg-blue-50/90 border-blue-600 shadow-md ring-2 ring-blue-500/20'
                        : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {key}
                    </span>
                    <span
                      className={`text-sm sm:text-base leading-relaxed pt-1 select-text ${
                        isSelected ? 'font-bold text-blue-950' : 'text-slate-800'
                      }`}
                    >
                      {optionText}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop/Tablet In-card Prev/Next buttons */}
          <div className="hidden lg:flex items-center justify-between pt-6 mt-6 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentQuestionIndexInSubject === 0 && subjectsInTest[0].id === activeSubjectId}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 font-semibold text-sm transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous (P)</span>
              </button>

              <button
                type="button"
                onClick={handleClearAnswer}
                disabled={!answers[currentQuestion?.id || '']}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear (R)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
            >
              <span>Next (N)</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile 8-Key Shortcut Banner */}
        <div className="hidden md:flex bg-slate-900 rounded-2xl px-4 py-2.5 text-xs text-slate-300 items-center justify-between border border-slate-800">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-orange-400" />
            <span className="font-semibold text-white">JAMB 8-Key Keyboard Mode:</span>
            <span className="text-slate-400">Keys [A, B, C, D] to answer • [P] Previous • [N] Next • [R] Clear • [S] Submit • [T] Terminate</span>
          </div>
        </div>
      </main>

      {/* ======================================================== */}
      {/* 3. MOBILE ERGONOMIC STICKY BOTTOM BAR                    */}
      {/* ======================================================== */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 p-2 sm:px-6 shadow-2xl flex items-center justify-between gap-1.5 max-w-4xl mx-auto">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentQuestionIndexInSubject === 0 && subjectsInTest[0].id === activeSubjectId}
          className="flex-1 py-3 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed text-slate-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-1 transition-all cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        <button
          type="button"
          onClick={() => setIsPaletteOpen(true)}
          className="px-3 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 active:scale-95 text-blue-900 font-bold text-xs flex flex-col items-center justify-center border border-blue-200 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-1">
            <Grid className="w-3.5 h-3.5 text-blue-700" />
            <span>Q {currentQuestionIndexInSubject + 1}/{currentSubjectGroup?.questions.length}</span>
          </div>
          <span className="text-[10px] text-blue-600 font-mono">
            {currentSubjectAnsweredCount} Answered
          </span>
        </button>

        <button
          type="button"
          onClick={() => setIsTerminateModalOpen(true)}
          className="p-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 active:scale-95 transition-all cursor-pointer"
          title="Terminate Examination"
        >
          <StopCircle className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleClearAnswer}
          disabled={!answers[currentQuestion?.id || '']}
          className="p-3 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          title="Clear answer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleNext}
          className="flex-1 py-3 px-2 rounded-xl bg-blue-700 hover:bg-blue-800 active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1 shadow-md transition-all cursor-pointer"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ======================================================== */}
      {/* 4. MOBILE QUESTION PALETTE DRAWER (Bottom Sheet)         */}
      {/* ======================================================== */}
      {isPaletteOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
          onClick={() => setIsPaletteOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-6 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Question Navigation Palette
                </h3>
                <p className="text-xs text-slate-500">{currentSubjectGroup?.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPaletteOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Subject Tabs Switcher inside palette */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-2.5 border-b border-slate-100">
              {subjectsInTest.map(sub => {
                const isSelected = sub.id === activeSubjectId;
                const answeredCount = sub.questions.filter(q => !!answers[q.id]).length;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => {
                      setActiveSubjectId(sub.id);
                      setCurrentQuestionIndexInSubject(0);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-700 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{sub.name}</span>
                    <span className="ml-1 opacity-75">({answeredCount}/{sub.questions.length})</span>
                  </button>
                );
              })}
            </div>

            {/* Question Bubbles Grid */}
            <div className="flex-1 overflow-y-auto py-4">
              <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                {currentSubjectGroup?.questions.map((q, idx) => {
                  const isCurrent = idx === currentQuestionIndexInSubject;
                  const isAnswered = !!answers[q.id];
                  const isMarked = markedForReview.includes(q.id);

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        setCurrentQuestionIndexInSubject(idx);
                        setIsPaletteOpen(false);
                      }}
                      className={`relative h-11 rounded-xl font-bold text-xs transition-all flex items-center justify-center cursor-pointer active:scale-95 ${
                        isCurrent
                          ? 'ring-2 ring-orange-500 ring-offset-2 bg-blue-700 text-white font-extrabold shadow'
                          : isAnswered
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      <span>{idx + 1}</span>
                      {isMarked && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-white" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Palette Legend */}
            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-md bg-emerald-600 shrink-0"></span>
                <span>Answered ({totalAnsweredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-md bg-slate-200 border border-slate-300 shrink-0"></span>
                <span>Unanswered ({totalUnansweredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-md bg-blue-700 ring-2 ring-orange-500 shrink-0"></span>
                <span>Current Question</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-md bg-amber-400 shrink-0"></span>
                <span>Flagged ({markedForReview.length})</span>
              </div>
            </div>

            {/* Palette Action Buttons */}
            <div className="pt-3 mt-3 border-t border-slate-200 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsPaletteOpen(false);
                  setIsTerminateModalOpen(true);
                }}
                className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <StopCircle className="w-4 h-4" />
                <span>Terminate Exam</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPaletteOpen(false);
                  setIsSubmitModalOpen(true);
                }}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Submit Exam</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. ON-SCREEN JAMB CALCULATOR                             */}
      {/* ======================================================== */}
      <CbtCalculator
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
      />

      {/* ======================================================== */}
      {/* 6. SUBMISSION CONFIRMATION MODAL                         */}
      {/* ======================================================== */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-extrabold text-slate-900 text-center mb-1">
              Submit Examination?
            </h3>
            <p className="text-xs text-slate-500 text-center mb-4">
              Review your answers before final submission. Scoring and detailed solutions are computed instantly.
            </p>

            {/* Breakdown summary */}
            <div className="bg-slate-50 rounded-2xl p-4 space-y-2 mb-4 border border-slate-200 text-xs sm:text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Total Questions:</span>
                <span className="font-bold text-slate-900">{testQuestions.length}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Answered:</span>
                <span className="font-bold">{totalAnsweredCount}</span>
              </div>
              <div className="flex justify-between text-amber-700 font-medium">
                <span>Unanswered:</span>
                <span className="font-bold">{totalUnansweredCount}</span>
              </div>
              <div className="flex justify-between text-blue-700 font-medium">
                <span>Time Remaining:</span>
                <span className="font-bold font-mono">{formatTime(secondsRemaining)}</span>
              </div>
            </div>

            {totalUnansweredCount > 0 && (
              <div className="p-3 mb-4 rounded-xl bg-amber-50 text-amber-900 text-xs flex items-start gap-2 border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  You still have <strong>{totalUnansweredCount}</strong> unanswered questions.
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Return to Test
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSubmitModalOpen(false);
                  handleFinalSubmit();
                }}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
              >
                Submit Now
              </button>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSubmitModalOpen(false);
                  setIsTerminateModalOpen(true);
                }}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold hover:underline cursor-pointer"
              >
                Or terminate examination early without scoring →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. 8-KEY KEYBOARD HELP MODAL                             */}
      {/* ======================================================== */}
      {isKeyboardHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  JAMB 8-Key Keyboard Shortcuts
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsKeyboardHelpOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              Standard official JAMB computer centers support physical keyboard shortcuts without requiring a mouse:
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-800">Keys [A], [B], [C], [D]</span>
                <span className="text-slate-600">Select option A, B, C, or D</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-800">Key [N]</span>
                <span className="text-slate-600">Next Question</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-800">Key [P]</span>
                <span className="text-slate-600">Previous Question</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-800">Key [R]</span>
                <span className="text-slate-600">Clear / Deselect choice</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-800">Key [S]</span>
                <span className="text-slate-600">Submit Exam Dialog</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-800">Key [T] or [X]</span>
                <span className="text-slate-600">Terminate Examination Dialog</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsKeyboardHelpOpen(false)}
              className="mt-4 w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold text-xs sm:text-sm cursor-pointer"
            >
              Continue Test
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8. TERMINATE EXAMINATION MODAL                           */}
      {/* ======================================================== */}
      {isTerminateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <StopCircle className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-extrabold text-slate-900 text-center mb-1">
              Terminate Examination?
            </h3>
            <p className="text-xs text-slate-500 text-center mb-4 leading-relaxed">
              You can terminate this examination session whenever you want. Choose how you would like to proceed:
            </p>

            {/* Current Exam Progress Snapshot */}
            <div className="bg-slate-50 rounded-2xl p-4 space-y-2 mb-4 border border-slate-200 text-xs sm:text-sm">
              <div className="flex justify-between items-center text-slate-600">
                <span>Subject(s):</span>
                <span className="font-bold text-slate-800 truncate max-w-[200px]">
                  {subjectsInTest.map(s => s.name).join(', ')}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Questions Answered:</span>
                <span className="font-bold text-emerald-700">
                  {totalAnsweredCount} of {testQuestions.length} ({Math.round((totalAnsweredCount / (testQuestions.length || 1)) * 100)}%)
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Time Spent:</span>
                <span className="font-bold font-mono text-slate-800">{formatTime(timeSpent)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Time Remaining:</span>
                <span className="font-bold font-mono text-blue-700">{formatTime(secondsRemaining)}</span>
              </div>
            </div>

            {/* Termination Options */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsTerminateModalOpen(false);
                  handleFinalSubmit();
                  showToast('Examination concluded and scored.', 'success');
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>End & Score Current Answers</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsTerminateModalOpen(false);
                  exitCbtTest();
                  showToast('Examination terminated. Session discarded.', 'info');
                }}
                className="w-full py-3 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs sm:text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 active:scale-98"
              >
                <LogOut className="w-4 h-4" />
                <span>Discard Test & Exit to Dashboard</span>
              </button>

              <button
                type="button"
                onClick={() => setIsTerminateModalOpen(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel & Resume Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
