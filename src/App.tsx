import React from 'react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { CbtSimulatorSetup } from './components/CbtSimulatorSetup.tsx';
import { CbtExamRoom } from './components/CbtExamRoom.tsx';
import { CbtResultsModal } from './components/CbtResultsModal.tsx';
import { AdminQuestionManager } from './components/AdminQuestionManager.tsx';
import { AdminReviewQueue } from './components/AdminReviewQueue.tsx';
import { CandidateHistoryView } from './components/CandidateHistoryView.tsx';
import { NeonSyncModal } from './components/NeonSyncModal.tsx';
import { NeonAuthModal } from './components/NeonAuthModal.tsx';
import { GraduationCap, ShieldCheck, Heart, AlertCircle, CheckCircle, Info } from 'lucide-react';

const MainContent: React.FC = () => {
  const { activeView, toastMessage, user, isAuthenticated, openAuthModal, setActiveView } = useApp();
  const isAdminView = activeView === 'admin_questions' || activeView === 'admin_review' || activeView === 'neon_settings';
  const hasAdminAccess = isAuthenticated && user.role === 'admin';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Neon Authentication Modal (Sign In / Sign Up) */}
      <NeonAuthModal />

      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom duration-300">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-white ${
              toastMessage.type === 'error'
                ? 'bg-red-600'
                : toastMessage.type === 'info'
                ? 'bg-blue-600'
                : 'bg-emerald-600'
            }`}
          >
            {toastMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : toastMessage.type === 'info' ? (
              <Info className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Hide standard navbar when candidate is in strict exam room to minimize distraction */}
      {activeView !== 'exam_room' && <Navbar />}

      {/* Main View Switcher */}
      <main className="flex-1">
        {activeView === 'dashboard' && <DashboardView />}
        {activeView === 'simulator_setup' && <CbtSimulatorSetup />}
        {activeView === 'exam_room' && <CbtExamRoom />}
        {activeView === 'results' && <CbtResultsModal />}
        {isAdminView && !hasAdminAccess && (
          <div className="max-w-xl mx-auto px-4 py-20 text-center">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-4">
              <ShieldCheck className="w-12 h-12 mx-auto text-orange-500" />
              <h1 className="text-2xl font-extrabold text-slate-900">Admin access required</h1>
              <p className="text-sm text-slate-500">Sign in with an approved SamEduHub admin account to manage and generate questions.</p>
              <div className="flex justify-center gap-2">
                {!isAuthenticated && (
                  <button onClick={() => openAuthModal('login')} className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold">Log in</button>
                )}
                <button onClick={() => setActiveView('dashboard')} className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold">Back to dashboard</button>
              </div>
            </div>
          </div>
        )}
        {activeView === 'admin_questions' && hasAdminAccess && <AdminQuestionManager />}
        {activeView === 'admin_review' && hasAdminAccess && <AdminReviewQueue />}
        {activeView === 'history' && <CandidateHistoryView />}
        {activeView === 'neon_settings' && hasAdminAccess && <NeonSyncModal />}
      </main>

      {/* Footer (hidden during exam mode) */}
      {activeView !== 'exam_room' && (
        <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-10 mt-16 text-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-700 text-white font-bold">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-base font-extrabold text-white">
                    Sam<span className="text-orange-500">EduHub</span> CBT Question Bank
                  </div>
                  <p className="text-slate-400 text-xs">
                    Empowering Nigerian UTME / JAMB aspirants with reliable practice tests.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6 text-xs font-semibold">
                <span>Database & Auth: <strong className="text-emerald-400 font-mono">Neon Serverless Postgres</strong></span>
                <span>•</span>
                <span>Role-Based Access: <strong className="text-orange-400">Admin & Student</strong></span>
              </div>
            </div>

            <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-[11px]">
              <div>
                © {new Date().getFullYear()} SamEduHub. Built for Nigerian JAMB / UTME preparation.
              </div>
              <div className="flex items-center gap-1">
                <span>Created with academic excellence for UTME success</span>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
