import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { OFFLINE_PRACTICE_QUESTIONS_PER_SUBJECT } from '../data/subjects.ts';
import { OptionKey, Question } from '../types/index.ts';
import {
  Trophy,
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  RotateCcw,
  ArrowRight,
  BookOpen,
  Filter,
  Flame,
  Check,
  Zap,
  Printer
} from 'lucide-react';

export const CbtResultsModal: React.FC = () => {
  const {
    selectedResultForReview,
    setSelectedResultForReview,
    setActiveView,
    questions,
    startCbtTest
  } = useApp();

  const [filterMode, setFilterMode] = useState<'all' | 'incorrect' | 'correct' | 'unanswered'>('all');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');

  const session = selectedResultForReview;
  if (!session) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold text-slate-800 mb-2">No Result Selected</h2>
        <p className="text-slate-500 mb-4">Please select a completed test from history or take a mock exam.</p>
        <button
          onClick={() => setActiveView('dashboard')}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Load question objects
  const testQuestionObjects = session.questionIds
    .map(id => questions.find(q => q.id === id))
    .filter((q): q is Question => !!q);

  // Compute question stats
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  testQuestionObjects.forEach(q => {
    const candidateAns = session.answers[q.id];
    if (!candidateAns) {
      unansweredCount++;
    } else if (candidateAns === q.correctAnswer) {
      correctCount++;
    } else {
      incorrectCount++;
    }
  });

  // Admission readiness assessment
  const getReadinessBadge = (score: number) => {
    if (score >= 300) {
      return {
        title: 'EXCEPTIONAL (FIRST-TIER ELITE)',
        desc: 'Outstanding competitive standing for Medicine & Surgery, Law, Nursing, Electrical/Computer Engineering at UNILAG, UI, OAU, ABU, UNN.',
        color: 'from-emerald-600 to-teal-700',
        textColor: 'text-emerald-700',
        bgLight: 'bg-emerald-50 border-emerald-200'
      };
    } else if (score >= 250) {
      return {
        title: 'STRONG ADMISSION PROSPECT',
        desc: 'Highly competitive for Pharmacy, Accounting, Computer Science, Economics and Architecture across top federal universities.',
        color: 'from-blue-600 to-indigo-700',
        textColor: 'text-blue-700',
        bgLight: 'bg-blue-50 border-blue-200'
      };
    } else if (score >= 200) {
      return {
        title: 'QUALIFIED / COMPETITIVE',
        desc: 'Clears the general university cut-off benchmark for most degree courses and federal/state institutions.',
        color: 'from-amber-600 to-orange-600',
        textColor: 'text-amber-800',
        bgLight: 'bg-amber-50 border-amber-200'
      };
    } else {
      return {
        title: 'NEEDS CONCENTRATED REVISION',
        desc: 'Below the recommended 200+ target for competitive federal faculties. Review topic solutions below and retake drills.',
        color: 'from-red-600 to-rose-700',
        textColor: 'text-red-700',
        bgLight: 'bg-red-50 border-red-200'
      };
    }
  };

  const readiness = getReadinessBadge(session.score);

  // Format time
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  const avgSecondsPerQ = testQuestionObjects.length > 0 ? Math.round(session.timeSpentSeconds / testQuestionObjects.length) : 0;

  // Filtered review questions
  const filteredQuestions = testQuestionObjects.filter(q => {
    // Subject filter
    if (selectedSubjectFilter !== 'all' && q.subjectId !== selectedSubjectFilter) {
      return false;
    }
    const candidateAns = session.answers[q.id];
    if (filterMode === 'correct') return candidateAns === q.correctAnswer;
    if (filterMode === 'incorrect') return candidateAns && candidateAns !== q.correctAnswer;
    if (filterMode === 'unanswered') return !candidateAns;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 animate-in fade-in space-y-8">
      
      {/* Top Banner / Celebration Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-blue-900/60 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 font-bold text-xs border border-orange-500/30">
              <Trophy className="w-4 h-4 text-orange-400" />
              OFFICIAL CBT SLIP & RESULT
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {session.userName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Reg No: <strong className="text-white font-mono">{session.jambRegNumber}</strong> • {session.title}
            </p>
            <p className="text-xs text-slate-400">
              Completed on: {new Date(session.completedAt || session.startedAt).toLocaleString()}
            </p>
          </div>

          {/* Big Score Box */}
          <div className="flex flex-col items-center bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 shadow-inner min-w-[200px] text-center">
            <span className="text-xs uppercase font-extrabold tracking-widest text-orange-400 mb-1">
              AGGREGATE UTME SCORE
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-black text-white font-mono tracking-tight">{session.score}</span>
              <span className="text-lg font-bold text-slate-400">/{session.totalMaxScore}</span>
            </div>
            <div className="mt-2 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              {session.finalPercentage}% Accuracy
            </div>
          </div>
        </div>

        {/* Readiness Recommendation Card */}
        <div className={`mt-6 p-4 rounded-2xl border ${readiness.bgLight} text-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Award className={`w-5 h-5 ${readiness.textColor}`} />
              <span className={`text-xs font-extrabold uppercase tracking-wide ${readiness.textColor}`}>
                {readiness.title}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
              {readiness.desc}
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 shadow-sm cursor-pointer shrink-0"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Result</span>
          </button>
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800">{correctCount}</div>
            <div className="text-xs text-slate-500">Correct Answers</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800">{incorrectCount}</div>
            <div className="text-xs text-slate-500">Incorrect Answers</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800">{unansweredCount}</div>
            <div className="text-xs text-slate-500">Unanswered</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800">{formatTime(session.timeSpentSeconds)}</div>
            <div className="text-xs text-slate-500">Avg {avgSecondsPerQ}s / question</div>
          </div>
        </div>
      </div>

      {/* Subject-by-Subject Score Breakdown */}
      {session.subjectBreakdown && session.subjectBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h3 className="font-extrabold text-base text-slate-800 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            Subject Breakdown & Marks
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {session.subjectBreakdown.map(sub => (
              <div key={sub.subjectId} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="font-bold text-sm text-slate-800 mb-1">{sub.subjectName}</div>
                  <div className="text-xs text-slate-500 mb-2">
                    {sub.correctCount} / {sub.totalQuestions} questions correct
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-600">Scaled Mark:</span>
                    <span className="text-base font-extrabold text-blue-700 font-mono">{sub.score} / 100</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${sub.percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Corrections & Explanations Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 mb-6 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-500" />
              Detailed Solutions & Explanations
            </h3>
            <p className="text-xs text-slate-500">
              Review correct answers, explanations, and key concepts for each question.
            </p>
          </div>

          {/* Review Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterMode === 'all' ? 'bg-white text-slate-800 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              All ({testQuestionObjects.length})
            </button>
            <button
              onClick={() => setFilterMode('incorrect')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterMode === 'incorrect' ? 'bg-red-500 text-white shadow-sm font-bold' : 'text-slate-600 hover:text-red-600'
              }`}
            >
              Incorrect ({incorrectCount})
            </button>
            <button
              onClick={() => setFilterMode('correct')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterMode === 'correct' ? 'bg-emerald-600 text-white shadow-sm font-bold' : 'text-slate-600 hover:text-emerald-600'
              }`}
            >
              Correct ({correctCount})
            </button>
            <button
              onClick={() => setFilterMode('unanswered')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterMode === 'unanswered' ? 'bg-amber-500 text-white shadow-sm font-bold' : 'text-slate-600 hover:text-amber-600'
              }`}
            >
              Unanswered ({unansweredCount})
            </button>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-6">
          {filteredQuestions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No questions found under this filter criteria.
            </div>
          ) : (
            filteredQuestions.map((q, idx) => {
              const candidateChoice = session.answers[q.id];
              const isCorrect = candidateChoice === q.correctAnswer;
              const isUnanswered = !candidateChoice;

              return (
                <div
                  key={q.id}
                  className={`p-5 rounded-2xl border-2 transition-all ${
                    isCorrect
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : isUnanswered
                      ? 'border-amber-200 bg-amber-50/20'
                      : 'border-red-200 bg-red-50/20'
                  }`}
                >
                  {/* Question Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center ${
                        isCorrect
                          ? 'bg-emerald-600 text-white'
                          : isUnanswered
                          ? 'bg-amber-500 text-white'
                          : 'bg-red-600 text-white'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-700 uppercase">
                        {q.subjectId} • {q.topic}
                      </span>
                      {q.year && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                          JAMB {q.year}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isCorrect && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Correct (+1)
                        </span>
                      )}
                      {!isCorrect && !isUnanswered && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2.5 py-1 rounded-full">
                          <XCircle className="w-3.5 h-3.5" /> Incorrect
                        </span>
                      )}
                      {isUnanswered && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                          <HelpCircle className="w-3.5 h-3.5" /> Not Answered
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Passage if applicable */}
                  {q.passage && (
                    <div className="mb-3 p-3 bg-blue-50/60 rounded-xl text-xs text-slate-700 font-serif leading-relaxed border border-blue-100">
                      <strong>Passage:</strong> {q.passage}
                    </div>
                  )}

                  {/* Question Stem */}
                  <div className="text-sm sm:text-base font-semibold text-slate-900 mb-4">
                    {q.questionText}
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                    {(['A', 'B', 'C', 'D'] as OptionKey[]).map(key => {
                      const text = q.options[key];
                      if (!text) return null;

                      const isKeyCorrect = key === q.correctAnswer;
                      const isKeyCandidate = key === candidateChoice;

                      let badgeStyle = 'bg-slate-50 border-slate-200 text-slate-700';
                      if (isKeyCorrect) {
                        badgeStyle = 'bg-emerald-100 border-emerald-400 text-emerald-900 font-bold';
                      } else if (isKeyCandidate && !isKeyCorrect) {
                        badgeStyle = 'bg-red-100 border-red-400 text-red-900 font-bold line-through';
                      }

                      return (
                        <div
                          key={key}
                          className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs sm:text-sm ${badgeStyle}`}
                        >
                          <span className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs shrink-0 ${
                            isKeyCorrect
                              ? 'bg-emerald-600 text-white'
                              : isKeyCandidate
                              ? 'bg-red-600 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}>
                            {key}
                          </span>
                          <span className="pt-0.5">{text}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Educational Solution & Explanation */}
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed shadow-xs">
                    <div className="flex items-center gap-1.5 font-bold text-blue-900 mb-1 text-xs uppercase tracking-wide">
                      <Zap className="w-3.5 h-3.5 text-orange-500" />
                      Step-by-Step Educational Explanation:
                    </div>
                    <p className="text-slate-700">{q.explanation}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom Floating Navigation Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
        <button
          onClick={() => setActiveView('dashboard')}
          className="px-6 py-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-sm cursor-pointer transition-colors"
        >
          Return to Dashboard
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveView('history')}
            className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm cursor-pointer transition-colors"
          >
            View All Past Attempts
          </button>
          <button
            onClick={() => startCbtTest({
              mode: session.mode,
              subjects: session.subjects,
              questionsPerSubject: OFFLINE_PRACTICE_QUESTIONS_PER_SUBJECT
            })}
            className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm shadow-md cursor-pointer transition-all flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retake Practice Test</span>
          </button>
        </div>
      </div>
    </div>
  );
};
