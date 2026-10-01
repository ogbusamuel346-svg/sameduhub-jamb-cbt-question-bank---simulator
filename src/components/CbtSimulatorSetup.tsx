import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { JAMB_SUBJECTS, OFFLINE_PRACTICE_QUESTIONS_PER_SUBJECT, SUBJECT_TOPICS } from '../data/subjects.ts';
import {
  PlayCircle,
  Clock,
  BookOpen,
  Award,
  Sparkles,
  Zap,
  CheckCircle2,
  ChevronRight,
  Sliders,
  Flame,
  Info,
  Lock
} from 'lucide-react';

export const CbtSimulatorSetup: React.FC = () => {
  const { startCbtTest, user, questions, isAuthenticated, openAuthModal } = useApp();

  const [mode, setMode] = useState<'full_jamb' | 'subject_practice' | 'topic_drill' | 'quick_mock'>('full_jamb');
  
  // Selected subjects (Default to candidate's profile subjects or standard Science combo)
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(
    user.selectedSubjects && user.selectedSubjects.length > 0
      ? user.selectedSubjects
      : ['english', 'mathematics', 'physics', 'chemistry']
  );

  const [singleSubject, setSingleSubject] = useState<string>('english');
  const [selectedTopic, setSelectedTopic] = useState<string>('All Topics');
  const [questionsCount, setQuestionsCount] = useState<number>(OFFLINE_PRACTICE_QUESTIONS_PER_SUBJECT);
  const [customTimeMinutes, setCustomTimeMinutes] = useState<number>(30);
  const [subjectCount, setSubjectCount] = useState<number>(4);

  const subjectsForFullExam = Array.from(new Set([
    'english',
    ...selectedSubjects,
    ...JAMB_SUBJECTS.map(subject => subject.id),
  ])).slice(0, subjectCount);

  // Subject presets for Nigerian university courses
  const presets = [
    {
      name: 'Medicine & Health Sciences',
      subjects: ['english', 'biology', 'chemistry', 'physics'],
      desc: 'Medicine, Nursing, Pharmacy, Dentistry, Anatomy'
    },
    {
      name: 'Engineering & Computing',
      subjects: ['english', 'mathematics', 'physics', 'chemistry'],
      desc: 'Software, Civil, Mechanical, Electrical, Computer Science'
    },
    {
      name: 'Law, Arts & Humanities',
      subjects: ['english', 'literature', 'government', 'crs'],
      desc: 'Law, Mass Comm, International Relations, Philosophy'
    },
    {
      name: 'Social Sciences & Management',
      subjects: ['english', 'economics', 'mathematics', 'government'],
      desc: 'Economics, Accounting, Business Admin, Banking & Finance'
    }
  ];

  // Topics for selected single subject
  const topicsForSingleSubject = useMemo(() => {
    return ['All Topics', ...(SUBJECT_TOPICS[singleSubject] || [])];
  }, [singleSubject]);

  const handleToggleSubject = (subjectId: string) => {
    if (subjectId === 'english' || subjectCount === 1) {
      // English is compulsory in JAMB!
      return;
    }

    setSelectedSubjects(currentSubjects => {
      if (currentSubjects.includes(subjectId)) {
        return currentSubjects.filter(subject => subject !== subjectId);
      }

      if (currentSubjects.length >= subjectCount) {
        // Keep English and replace the last selected optional subject.
        const withoutEnglish = currentSubjects.filter(subject => subject !== 'english');
        return ['english', ...withoutEnglish.slice(0, Math.max(0, subjectCount - 2)), subjectId];
      }

      return [...currentSubjects, subjectId];
    });
  };

  const handleSubjectCountChange = (nextCount: number) => {
    setSubjectCount(nextCount);
    setSelectedSubjects(currentSubjects => Array.from(new Set([
      'english',
      ...currentSubjects,
      ...JAMB_SUBJECTS.map(subject => subject.id),
    ])).slice(0, nextCount));
  };

  const handleLaunch = () => {
    if (mode === 'full_jamb') {
      startCbtTest({
        mode: 'full_jamb',
          subjects: subjectsForFullExam,
        questionsPerSubject: questionsCount,
        customTimeMinutes: customTimeMinutes,
      });
    } else if (mode === 'quick_mock') {
      startCbtTest({
        mode: 'quick_mock',
        subjects: ['english', 'mathematics', 'physics', 'chemistry'],
        questionsPerSubject: 5, // 20 questions total
        customTimeMinutes: 15,
      });
    } else {
      startCbtTest({
        mode,
        subjects: [singleSubject],
        questionsPerSubject: questionsCount,
        customTimeMinutes: customTimeMinutes,
        topicFilter: selectedTopic
      });
    }
  };

  const practiceQuestions = questions.filter(q => q.id.startsWith('offline-'));
  const practiceQuestionsCount = practiceQuestions.length;
  const coverageSubjects = mode === 'full_jamb'
    ? subjectsForFullExam
    : mode === 'quick_mock'
      ? ['english', 'mathematics', 'physics', 'chemistry']
      : [singleSubject];
  const requestedQuestionsPerSubject = mode === 'quick_mock' ? 5 : questionsCount;
  const questionCoverage = coverageSubjects.map(subjectId => {
    let available = practiceQuestions.filter(question => question.subjectId === subjectId);
    if (mode === 'subject_practice' && selectedTopic !== 'All Topics') {
      const topicQuestions = available.filter(question => question.topic === selectedTopic);
      if (topicQuestions.length >= requestedQuestionsPerSubject) available = topicQuestions;
    }
    return {
      subjectId,
      name: JAMB_SUBJECTS.find(subject => subject.id === subjectId)?.name || subjectId,
      available: available.length,
    };
  });
  const hasCompleteCoverage = questionCoverage.every(item => item.available >= requestedQuestionsPerSubject);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-in fade-in">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-blue-900/60 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 font-bold text-xs border border-orange-500/30 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            OFFICIAL CBT PRACTICE SIMULATOR
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            Configure Your JAMB UTME Examination
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Experience real-time simulated testing identical to the official Joint Admissions and Matriculation Board environment, with 8-key mode, instant scoring, and detailed review.
          </p>
        </div>
      </div>

      {/* Unauthenticated Alert Banner */}
      {!isAuthenticated && (
        <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-orange-950 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <span>Sign Up Required to Launch CBT Exam</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-200 text-orange-900">
                  FREE REGISTRATION
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Create your student account in 10 seconds to begin timed practice tests and save your official UTME scores.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => openAuthModal('signup', 'cbt_required')}
              className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-sm cursor-pointer"
            >
              Sign Up Free
            </button>
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:text-slate-900 font-semibold text-xs cursor-pointer"
            >
              Log In
            </button>
          </div>
        </div>
      )}

      {/* Mode Selection Grid */}
      <div className="space-y-3">
        <h3 className="font-extrabold text-slate-800 text-sm sm:text-base flex items-center gap-2">
          <Sliders className="w-4 h-4 text-orange-500" />
          Step 1: Choose Practice Format
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Mode 1: Full JAMB Simulation */}
          <button
            type="button"
            onClick={() => setMode('full_jamb')}
            className={`p-5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
              mode === 'full_jamb'
                ? 'bg-blue-50/80 border-blue-600 shadow-md ring-2 ring-blue-500/20'
                : 'bg-white hover:bg-slate-50 border-slate-200'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 rounded-xl bg-blue-600 text-white font-bold text-xs">
                  4 SUBJECTS
                </span>
                <span className="text-[11px] font-bold text-orange-600 font-mono">400 MARKS</span>
              </div>
              <h4 className="font-bold text-base text-slate-900 mb-1">
                Full JAMB UTME Simulation
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Standard 4-subject combination (English + 3 subjects). Realistic timing and grading out of 400.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-blue-700">
              <span>Official Test Mode</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* Mode 2: Subject & Topic Practice */}
          <button
            type="button"
            onClick={() => setMode('subject_practice')}
            className={`p-5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
              mode === 'subject_practice'
                ? 'bg-blue-50/80 border-blue-600 shadow-md ring-2 ring-blue-500/20'
                : 'bg-white hover:bg-slate-50 border-slate-200'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 rounded-xl bg-orange-500 text-white font-bold text-xs">
                  SINGLE SUBJECT
                </span>
                <span className="text-[11px] font-bold text-slate-500 font-mono">CUSTOM</span>
              </div>
              <h4 className="font-bold text-base text-slate-900 mb-1">
                Subject & Topic Mastery Drill
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Target one specific subject (e.g., Mathematics or Chemistry) and hone in on a specific topic syllabus.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-orange-700">
              <span>Target Weak Topics</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* Mode 3: Quick Mock Speed Challenge */}
          <button
            type="button"
            onClick={() => setMode('quick_mock')}
            className={`p-5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
              mode === 'quick_mock'
                ? 'bg-blue-50/80 border-blue-600 shadow-md ring-2 ring-blue-500/20'
                : 'bg-white hover:bg-slate-50 border-slate-200'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 rounded-xl bg-emerald-600 text-white font-bold text-xs">
                  SPEED RUN
                </span>
                <span className="text-[11px] font-bold text-emerald-600 font-mono">15 MINS</span>
              </div>
              <h4 className="font-bold text-base text-slate-900 mb-1">
                Quick 15-Minute Mock Challenge
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Rapid-fire 20 randomized questions across core subjects to build rapid answering intuition and speed.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-emerald-700">
              <span>High Speed Challenge</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      </div>

      {/* Step 2: Subject & Combination Selection */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
        {mode === 'full_jamb' ? (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Select Your JAMB Subjects (English is Compulsory)
                </h3>
                <p className="text-xs text-slate-500">
                  Choose the number of subjects you want, then use the cards below to select them.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="subject-count" className="text-xs font-bold text-slate-700 whitespace-nowrap">
                  Subjects
                </label>
                <select
                  id="subject-count"
                  value={subjectCount}
                  onChange={event => handleSubjectCountChange(Number(event.target.value))}
                  className="px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs font-bold text-blue-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  {[1, 2, 3, 4].map(count => (
                    <option key={count} value={count}>{count}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mb-6">
              {presets.map(p => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => {
                    setSelectedSubjects(p.subjects);
                    setSubjectCount(p.subjects.length);
                  }}
                  className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-all cursor-pointer"
                >
                  <div className="font-bold text-xs text-slate-900">{p.name}</div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>

            {/* Subject Checkbox Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {JAMB_SUBJECTS.map(subj => {
                const isSelected = selectedSubjects.includes(subj.id);
                const isEnglish = subj.id === 'english';

                return (
                  <button
                    key={subj.id}
                    type="button"
                    onClick={() => handleToggleSubject(subj.id)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isSelected ? 'bg-blue-800 text-blue-100' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {subj.code}
                      </span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-orange-400" />}
                    </div>
                    <div>
                      <div className="font-bold text-xs">{subj.name}</div>
                      {isEnglish && (
                        <div className="text-[10px] opacity-80 font-medium">Compulsory</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : mode === 'subject_practice' ? (
          <div className="space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              Select Target Subject & Topic
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Subject
                </label>
                <select
                  value={singleSubject}
                  onChange={e => {
                    setSingleSubject(e.target.value);
                    setSelectedTopic('All Topics');
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  {JAMB_SUBJECTS.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Topic Focus
                </label>
                <select
                  value={selectedTopic}
                  onChange={e => setSelectedTopic(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  {topicsForSingleSubject.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 text-xs sm:text-sm">
            <p className="font-bold mb-1">Quick 15-Minute Mock Parameters:</p>
            <p className="text-emerald-800">
              20 randomized questions across 4 core subjects (5 English, 5 Math, 5 Physics, 5 Chemistry) with a strict 15-minute countdown clock.
            </p>
          </div>
        )}

        {/* Timing and Question Count Controls */}
        <div className="pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Questions per Subject
            </label>
            <select
              value={questionsCount}
              onChange={e => setQuestionsCount(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="5">5 Questions (Quick Test)</option>
              <option value="10">10 Questions (Standard Drill)</option>
              <option value={OFFLINE_PRACTICE_QUESTIONS_PER_SUBJECT}>{OFFLINE_PRACTICE_QUESTIONS_PER_SUBJECT} Questions (Full Offline Subject Practice)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Time Allowed (Minutes)
            </label>
            <input
              type="number"
              min="1"
              max="300"
              value={customTimeMinutes}
              onChange={e => setCustomTimeMinutes(Math.min(300, Math.max(1, Number(e.target.value) || 1)))}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
            <p className="text-[11px] text-slate-500 mt-1.5">Set any duration from 1 to 300 minutes.</p>
          </div>
        </div>

        {/* Launch Button */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Ready with {practiceQuestionsCount} built-in offline questions. No approval is required.</span>
          </div>

          <div className={`w-full sm:w-auto text-[11px] rounded-xl border px-3 py-2 ${hasCompleteCoverage ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
            <strong>Coverage:</strong>{' '}
            {questionCoverage.map(item => `${item.name} ${item.available}/${requestedQuestionsPerSubject}`).join(' · ')}
          </div>

          <button
            type="button"
            onClick={handleLaunch}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-orange-500/30 transition-all hover:scale-102 cursor-pointer flex items-center justify-center gap-2"
          >
            {isAuthenticated ? (
              <>
                <PlayCircle className="w-5 h-5" />
                <span>Start JAMB Examination Now</span>
              </>
            ) : (
              <>
                <Lock className="w-5 h-5" />
                <span>Sign Up & Launch CBT Exam</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
