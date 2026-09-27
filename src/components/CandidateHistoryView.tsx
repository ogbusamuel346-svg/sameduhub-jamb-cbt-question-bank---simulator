import React from 'react';
import { useApp } from '../context/AppContext.tsx';
import { TestSession } from '../types/index.ts';
import {
  History,
  Trophy,
  Clock,
  ArrowRight,
  BookOpen,
  Award,
  PlayCircle,
  BarChart3,
  Calendar,
  CheckCircle2,
  Lock,
  UserPlus
} from 'lucide-react';

export const CandidateHistoryView: React.FC = () => {
  const { testSessions, setSelectedResultForReview, setActiveView, user, isAuthenticated, openAuthModal } = useApp();

  // Filter sessions for current user or show all with user tags
  const userSessions = testSessions.filter(s => s.userId === user.id || user.role === 'admin');

  // Compute stats
  const totalTests = userSessions.length;
  const avgScore = totalTests > 0 ? Math.round(userSessions.reduce((acc, s) => acc + s.score, 0) / totalTests) : 0;
  const highestScore = totalTests > 0 ? Math.max(...userSessions.map(s => s.score)) : 0;

  const handleReviewSession = (session: TestSession) => {
    setSelectedResultForReview(session);
    setActiveView('results');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in">
      
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-100 text-orange-600">
              <History className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                Examination History & Performance
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Review past UTME scores, time management, and detailed solutions.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setActiveView('simulator_setup')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer hover:scale-102 self-start md:self-auto"
        >
          <PlayCircle className="w-4 h-4" />
          <span>Take New CBT Test</span>
        </button>
      </div>

      {/* Guest Notice if not authenticated */}
      {!isAuthenticated && (
        <div className="bg-gradient-to-r from-blue-900 to-slate-900 rounded-3xl p-5 sm:p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-blue-800 shadow-md">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm sm:text-base text-white">
                Sign In to Save & View Your Examination Records
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Results from previous CBT practice sessions are safely stored on Neon when you create a student profile.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => openAuthModal('signup', 'cbt_required')}
              className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-sm cursor-pointer"
            >
              Sign Up Free
            </button>
            <button
              onClick={() => openAuthModal('login')}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs cursor-pointer"
            >
              Log In
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{totalTests}</div>
            <div className="text-xs text-slate-500">Tests Attempted</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-700">{avgScore} / 400</div>
            <div className="text-xs text-slate-500">Average UTME Score</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-orange-600">{highestScore} / 400</div>
            <div className="text-xs text-slate-500">Highest Score Achieved</div>
          </div>
        </div>
      </div>

      {/* Test Sessions List */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 font-bold text-sm text-slate-800">
          Completed Test Sessions ({userSessions.length})
        </div>

        {userSessions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <History className="w-12 h-12 mx-auto text-slate-300" />
            <h3 className="text-base font-bold text-slate-700">No Test Attempts Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Start your first practice test to track your JAMB readiness, scores, and subject accuracy.
            </p>
            <button
              onClick={() => setActiveView('simulator_setup')}
              className="mt-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs"
            >
              Start Practice Test
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {userSessions.map(session => (
              <div
                key={session.id}
                className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-sm sm:text-base text-slate-900">
                      {session.title}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {session.mode.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Candidate: {session.userName}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(session.completedAt || session.startedAt).toLocaleDateString()} at{' '}
                      {new Date(session.completedAt || session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Time Spent: {Math.floor(session.timeSpentSeconds / 60)} mins {session.timeSpentSeconds % 60} secs
                    </span>
                    <span>
                      Total Questions: <strong>{session.totalQuestions}</strong>
                    </span>
                  </div>
                </div>

                {/* Score & Review Button */}
                <div className="flex items-center gap-4 self-end md:self-center shrink-0">
                  <div className="text-right">
                    <div className="text-xl font-black text-blue-900 font-mono">
                      {session.score} <span className="text-xs font-medium text-slate-400">/ {session.totalMaxScore}</span>
                    </div>
                    <div className="text-xs font-bold text-emerald-600">
                      {session.finalPercentage}% Accuracy
                    </div>
                  </div>

                  <button
                    onClick={() => handleReviewSession(session)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs cursor-pointer transition-colors"
                  >
                    <span>View Slip & Corrections</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
