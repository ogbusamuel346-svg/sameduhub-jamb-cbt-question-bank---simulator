import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { JAMB_SUBJECTS, OFFLINE_PRACTICE_QUESTIONS_PER_SUBJECT } from '../data/subjects.ts';
import {
  GraduationCap,
  PlayCircle,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Calculator,
  Keyboard,
  Target,
  UserCheck,
  LogIn,
  BookOpen,
  Lock
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    user,
    isAuthenticated,
    openAuthModal,
    startCbtTest,
    setActiveView,
    questions,
    testSessions
  } = useApp();

  // Quick Examination Selector state on homepage
  const [selectedExamType, setSelectedExamType] = useState<'full_jamb' | 'subject_practice' | 'quick_mock'>('full_jamb');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('english');
  const [selectedSubjectCount, setSelectedSubjectCount] = useState<number>(4);
  const [selectedFullSubjects, setSelectedFullSubjects] = useState<string[]>(['english', 'mathematics', 'physics', 'chemistry']);
  const [customTimeMinutes, setCustomTimeMinutes] = useState<number>(120);

  const practiceQuestions = questions.filter(q => q.id.startsWith('offline-'));
  const canStartExam = selectedExamType !== 'full_jamb' || selectedFullSubjects.length === selectedSubjectCount;

  const selectExamType = (examType: 'full_jamb' | 'subject_practice' | 'quick_mock') => {
    setSelectedExamType(examType);
    setCustomTimeMinutes(examType === 'full_jamb' ? 120 : examType === 'quick_mock' ? 15 : 20);
  };

  const handleFullSubjectCountChange = (nextCount: number) => {
    setSelectedSubjectCount(nextCount);
    setSelectedFullSubjects(currentSubjects => Array.from(new Set([
      ...currentSubjects,
      ...JAMB_SUBJECTS.map(subject => subject.id),
    ])).slice(0, nextCount));
  };

  const handleFullSubjectToggle = (subjectId: string) => {
    setSelectedFullSubjects(currentSubjects => {
      if (currentSubjects.includes(subjectId)) {
        if (currentSubjects.length <= 1) return currentSubjects;
        return currentSubjects.filter(subject => subject !== subjectId);
      }

      if (currentSubjects.length >= selectedSubjectCount) {
        return [...currentSubjects.slice(0, Math.max(0, selectedSubjectCount - 1)), subjectId];
      }

      return [...currentSubjects, subjectId];
    });
  };

  const handleStartExam = () => {
    if (selectedExamType === 'full_jamb') {
      startCbtTest({
        mode: 'full_jamb',
        subjects: selectedFullSubjects.slice(0, selectedSubjectCount),
        questionsPerSubject: OFFLINE_PRACTICE_QUESTIONS_PER_SUBJECT,
        customTimeMinutes
      });
    } else if (selectedExamType === 'quick_mock') {
      startCbtTest({
        mode: 'quick_mock',
        subjects: ['english', 'mathematics'],
        questionsPerSubject: 10,
        customTimeMinutes
      });
    } else {
      startCbtTest({
        mode: 'subject_practice',
        subjects: [selectedSubjectId],
        questionsPerSubject: OFFLINE_PRACTICE_QUESTIONS_PER_SUBJECT,
        customTimeMinutes
      });
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      
      {/* Candidate Status Banner (if logged in) or CBT Free Registration Callout (if guest) */}
      {isAuthenticated && user ? (
        <div className="bg-gradient-to-r from-blue-900 to-slate-900 rounded-2xl p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md border border-blue-800/60">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-orange-500 text-white font-extrabold flex items-center justify-center text-sm shadow">
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base text-white">{user.name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  {user.jambRegNumber || 'CANDIDATE'}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Target Score: <strong className="text-orange-400">{user.targetScore || 320}/400 Marks</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setActiveView('history')}
              className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors cursor-pointer"
            >
              Past Tests ({testSessions.length})
            </button>
            <button
              onClick={() => openAuthModal('login')}
              className="px-3.5 py-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/30 font-semibold transition-colors cursor-pointer"
            >
              Switch Account
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 rounded-2xl p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md border border-blue-800/60">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center shrink-0 shadow">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base text-white">Student Registration Required</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-400/30">
                  FREE ACCESS
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Create a student profile to take CBT practice tests, simulate exam timers, and track scores.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs shrink-0">
            <button
              onClick={() => openAuthModal('signup', 'cbt_required')}
              className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold transition-all shadow-sm cursor-pointer hover:scale-[1.02]"
            >
              Sign Up to Practice
            </button>
            <button
              onClick={() => openAuthModal('login')}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white font-semibold transition-colors cursor-pointer"
            >
              Log In
            </button>
          </div>
        </div>
      )}

      {/* Hero Welcome: Clean, Mobile-First, Direct Purpose */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 font-bold text-xs border border-orange-500/20">
          <Sparkles className="w-3.5 h-3.5 text-orange-500" />
          <span>2026/2027 JAMB UTME CBT SYSTEM</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Master the JAMB CBT Exam with <span className="text-blue-700">Sam</span><span className="text-orange-500">EduHub</span>
        </h1>

        <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto font-normal leading-relaxed">
          Sign up, pick your exam mode, and begin realistic timed practice tests with instant scoring and solutions.
        </p>
      </div>

      {/* Main Purpose Card: Choose Examination & Begin Practice */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xl border border-slate-200/90 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-sm">
              1
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Choose Your Examination
              </h2>
              <p className="text-xs text-slate-500">Select your preferred practice format</p>
            </div>
          </div>

          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            {practiceQuestions.length} Offline Questions Ready
          </span>
        </div>

        {/* Exam Type Options (3 Clean Choices) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {/* Option 1: Full JAMB Mock */}
          <button
            type="button"
            onClick={() => selectExamType('full_jamb')}
            className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
              selectedExamType === 'full_jamb'
                ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-xs'
                : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  selectedExamType === 'full_jamb'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}>
                  RECOMMENDED
                </span>
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
              <div className="font-extrabold text-sm text-slate-900 mb-1">
                Full UTME Mock
              </div>
              <p className="text-xs text-slate-500 leading-snug">
                Official 4-subject combination, 2-hour timer, and 400 marks standard score.
              </p>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-200/60 text-[11px] font-semibold text-blue-700 flex items-center gap-1">
              <span>Official 400 Marks</span>
            </div>
          </button>

          {/* Option 2: Single Subject Drill */}
          <button
            type="button"
            onClick={() => selectExamType('subject_practice')}
            className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
              selectedExamType === 'subject_practice'
                ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-xs'
                : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  selectedExamType === 'subject_practice'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}>
                  FOCUSED
                </span>
                <Target className="w-4 h-4 text-slate-400" />
              </div>
              <div className="font-extrabold text-sm text-slate-900 mb-1">
                Subject Practice
              </div>
              <p className="text-xs text-slate-500 leading-snug">
                Target one subject to strengthen difficult syllabus topics.
              </p>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-200/60 text-[11px] font-semibold text-blue-700 flex items-center gap-1">
              <span>Custom Pace</span>
            </div>
          </button>

          {/* Option 3: Quick 15-Min Speed Challenge */}
          <button
            type="button"
            onClick={() => selectExamType('quick_mock')}
            className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
              selectedExamType === 'quick_mock'
                ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-xs'
                : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  selectedExamType === 'quick_mock'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}>
                  SPEED
                </span>
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
              <div className="font-extrabold text-sm text-slate-900 mb-1">
                15-Min Sprint
              </div>
              <p className="text-xs text-slate-500 leading-snug">
                Quick 15-minute challenge to train exam speed and accuracy.
              </p>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-200/60 text-[11px] font-semibold text-blue-700 flex items-center gap-1">
              <span>Rapid Feedback</span>
            </div>
          </button>
        </div>

        {/* If Single Subject is selected, show mobile-friendly subject pills */}
        {selectedExamType === 'subject_practice' && (
          <div className="mb-5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="text-xs font-bold text-slate-700 mb-2">
              Select Subject to Practice:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {JAMB_SUBJECTS.map(subj => {
                const isSelected = selectedSubjectId === subj.id;
                return (
                  <button
                    key={subj.id}
                    type="button"
                    onClick={() => setSelectedSubjectId(subj.id)}
                    className={`p-2.5 rounded-xl text-left font-semibold text-xs border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-orange-500 text-white border-orange-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="truncate">{subj.name}</span>
                    {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {selectedExamType === 'full_jamb' && (
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
              <div className="flex items-center justify-between gap-2 mb-2">
                <label htmlFor="dashboard-subject-count" className="block text-xs font-bold text-blue-900">
                  Number of subjects
                </label>
                <span className="text-[11px] font-semibold text-blue-700">
                  {selectedFullSubjects.length}/{selectedSubjectCount} selected
                </span>
              </div>
              <select
                id="dashboard-subject-count"
                value={selectedSubjectCount}
                onChange={event => handleFullSubjectCountChange(Number(event.target.value))}
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-blue-200 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                {[1, 2, 3, 4].map(count => (
                  <option key={count} value={count}>{count} subject{count === 1 ? '' : 's'}</option>
                ))}
              </select>
            </div>
          )}

          <div className={`p-4 rounded-2xl bg-orange-50 border border-orange-200 ${selectedExamType === 'full_jamb' ? '' : 'sm:col-span-2'}`}>
            <label htmlFor="dashboard-time-minutes" className="block text-xs font-bold text-orange-900 mb-2">
              Examination time (minutes)
            </label>
            <input
              id="dashboard-time-minutes"
              type="number"
              min="1"
              max="300"
              value={customTimeMinutes}
              onChange={event => setCustomTimeMinutes(Math.min(300, Math.max(1, Number(event.target.value) || 1)))}
              className="w-full px-3 py-2.5 rounded-xl bg-white border border-orange-200 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
            />
            <p className="text-[11px] text-orange-800 mt-1.5">Choose any duration from 1 to 300 minutes.</p>
          </div>
        </div>

        {selectedExamType === 'full_jamb' && (
          <div className="mb-5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="text-xs font-bold text-slate-700 mb-2">
              Select the subjects you want to take:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {JAMB_SUBJECTS.map(subject => {
                const isSelected = selectedFullSubjects.includes(subject.id);
                return (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => handleFullSubjectToggle(subject.id)}
                    className={`p-2.5 rounded-xl text-left text-xs font-semibold border transition-all cursor-pointer flex items-center justify-between gap-1 ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="truncate">{subject.name}</span>
                    {isSelected && <CheckCircle className="w-3.5 h-3.5 text-orange-300 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Big Action Button: Begin CBT Practice */}
        <div className="space-y-3">
          <button
            onClick={handleStartExam}
            disabled={!canStartExam}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 hover:from-orange-700 hover:to-amber-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-extrabold text-base sm:text-lg shadow-lg shadow-orange-500/30 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2.5"
          >
            {isAuthenticated ? (
              <PlayCircle className="w-6 h-6 shrink-0" />
            ) : (
              <UserCheck className="w-6 h-6 shrink-0" />
            )}
            <span>
              {isAuthenticated ? (
                selectedExamType === 'full_jamb'
                  ? 'Begin Full JAMB UTME Mock Exam'
                  : selectedExamType === 'quick_mock'
                  ? 'Begin 15-Minute Speed Mock'
                  : `Begin ${JAMB_SUBJECTS.find(s => s.id === selectedSubjectId)?.name} Practice`
              ) : (
                selectedExamType === 'full_jamb'
                  ? 'Sign Up & Begin Full JAMB UTME Mock'
                  : selectedExamType === 'quick_mock'
                  ? 'Sign Up & Begin 15-Minute Speed Mock'
                  : `Sign Up & Begin ${JAMB_SUBJECTS.find(s => s.id === selectedSubjectId)?.name} Practice`
              )}
            </span>
            <ArrowRight className="w-5 h-5 shrink-0" />
          </button>

          {!isAuthenticated ? (
            <div className="p-3 rounded-xl bg-orange-50 border border-orange-200/80 text-center text-xs text-orange-950 font-medium flex flex-wrap items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-orange-600 shrink-0" />
              <span>Candidates must sign up to take CBT practice tests.</span>
              <button
                onClick={() => openAuthModal('signup', 'cbt_required')}
                className="text-orange-700 font-bold hover:underline cursor-pointer"
              >
                Sign up free in 10 seconds
              </button>
              <span>or</span>
              <button
                onClick={() => openAuthModal('login')}
                className="text-blue-700 font-bold hover:underline cursor-pointer"
              >
                Log In
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500 text-center">
              <span>Ready candidate: <strong className="text-slate-800">{user.name}</strong></span>
              <span>•</span>
              <button
                onClick={() => setActiveView('history')}
                className="text-blue-700 font-semibold hover:underline cursor-pointer"
              >
                View Past Scores
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3 Simple Modern Highlights (Mobile-First, no card bloat) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Keyboard className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">Official 8-Key Mode</div>
            <div className="text-[11px] text-slate-500">JAMB shortcuts (A, B, C, D, P, N, R, S)</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">On-Screen Calculator</div>
            <div className="text-[11px] text-slate-500">Accessible during Science & Math tests</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">Instant 400-Mark Score</div>
            <div className="text-[11px] text-slate-500">Cut-off benchmarks & step explanations</div>
          </div>
        </div>
      </div>

    </div>
  );
};
