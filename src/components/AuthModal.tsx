import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { JAMB_SUBJECTS } from '../data/subjects.ts';
import {
  GraduationCap,
  X,
  Lock,
  Mail,
  User as UserIcon,
  Sparkles,
  ArrowRight,
  CheckCircle,
  Eye,
  EyeOff,
  Zap
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    authModalMode,
    authModalReason,
    pendingExamConfig,
    closeAuthModal,
    loginWithAuth,
    signupWithAuth,
    requestPasswordReset,
    resetPassword
  } = useApp();

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>(authModalMode);
  const [emailOrReg, setEmailOrReg] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [jambReg, setJambReg] = useState('');
  const [targetScore, setTargetScore] = useState(320);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([
    'english',
    'mathematics',
    'physics',
    'chemistry'
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync mode with context state when opened
  React.useEffect(() => {
    setMode(authModalMode);
  }, [authModalMode, isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleToggleSubject = (subId: string) => {
    if (selectedSubjects.includes(subId)) {
      if (selectedSubjects.length > 1) {
        setSelectedSubjects(prev => prev.filter(s => s !== subId));
      }
    } else {
      if (selectedSubjects.length < 4) {
        setSelectedSubjects(prev => [...prev, subId]);
      }
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrReg.trim()) return;
    setIsSubmitting(true);
    await loginWithAuth(emailOrReg, password);
    setIsSubmitting(false);
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !signupEmail.trim() || !signupPassword) return;
    setIsSubmitting(true);
    await signupWithAuth({
      name,
      email: signupEmail,
      password: signupPassword,
      jambRegNumber: jambReg.trim() || undefined,
      targetScore,
      selectedSubjects
    });
    setIsSubmitting(false);
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrReg.trim()) return;
    setIsSubmitting(true);
    await requestPasswordReset(emailOrReg);
    setIsSubmitting(false);
  };

  const handlePasswordResetConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmNewPassword) {
      return;
    }

    setIsSubmitting(true);
    await resetPassword('', newPassword);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="relative bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-950 text-white p-5 sm:p-6 pb-4">
          <button
            onClick={closeAuthModal}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 border border-blue-400/40 flex items-center justify-center text-white shadow-md">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-lg font-extrabold text-white flex items-center gap-1.5">
                <span>Sam</span>
                <span className="text-orange-400">EduHub</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  SECURE ACCOUNT
                </span>
              </div>
              <p className="text-xs text-blue-200 font-medium">
                Official JAMB CBT Practice Portal
              </p>
            </div>
          </div>

          {/* Tab Switcher: Login vs Sign Up */}
          {mode !== 'reset' && <div className="flex rounded-xl bg-slate-900/60 p-1 border border-blue-700/40 mt-3">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* If opened because user attempted CBT practice */}
          {(authModalReason === 'cbt_required' || pendingExamConfig) && (
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200/90 rounded-2xl p-4 flex items-start gap-3 text-orange-950 shadow-sm animate-in fade-in">
              <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <span>Sign Up Required for CBT Practice</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-orange-200 text-orange-800">
                    MANDATORY
                  </span>
                </div>
                <p className="text-slate-600 mt-1 leading-relaxed">
                  To take realistic timed JAMB exams and save your scores, candidates must create a free student account. It takes only 10 seconds!
                </p>
                {pendingExamConfig && (
                  <div className="mt-2 inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white border border-orange-200 text-orange-800 font-semibold text-[11px] shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                    <span>Ready to launch: <strong>{pendingExamConfig.mode === 'full_jamb' ? 'Full UTME Mock' : pendingExamConfig.mode === 'quick_mock' ? '15-Min Sprint' : 'Subject Drill'}</strong></span>
                  </div>
                )}
              </div>
            </div>
          )}

          {mode === 'reset' ? (
            <form onSubmit={handlePasswordResetConfirm} className="space-y-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Choose a new password</h2>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  Use a password with at least 8 characters. This link can only be used once.
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmNewPassword}
                    onChange={e => setConfirmNewPassword(e.target.value)}
                    placeholder="Repeat your new password"
                    className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all"
                  />
                </div>
                {confirmNewPassword && newPassword !== confirmNewPassword && (
                  <p className="text-xs text-red-600 mt-1.5">Passwords do not match.</p>
                )}
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !newPassword || newPassword !== confirmNewPassword}
                className="w-full py-3.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm shadow-md shadow-blue-700/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>{isSubmitting ? 'Updating password...' : 'Update password'}</span>
              </button>
            </form>
          ) : mode === 'forgot' ? (
            <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Reset your password</h2>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  Enter your email and we’ll send a secure one-time reset link.
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={emailOrReg}
                    onChange={e => setEmailOrReg(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm shadow-md shadow-blue-700/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                <span>{isSubmitting ? 'Requesting reset...' : 'Send reset link'}</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
              >
                Back to sign in
              </button>
            </form>
          ) : mode === 'login' ? (
            /* Login Form */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={emailOrReg}
                    onChange={e => setEmailOrReg(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-blue-700 hover:bg-blue-800 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-blue-700/20 transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                <Zap className="w-4 h-4 text-orange-400" />
                <span>
                  {isSubmitting
                    ? 'Signing you in...'
                    : pendingExamConfig
                    ? 'Sign In & Launch CBT Exam'
                    : 'Sign In to CBT Portal'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* Sign Up Form */
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Tunde Adebayo"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={signupEmail}
                    onChange={e => setSignupEmail(e.target.value)}
                    placeholder="tunde@example.ng"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={signupPassword}
                    onChange={e => setSignupPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    JAMB Reg Number <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={jambReg}
                    onChange={e => setJambReg(e.target.value)}
                    placeholder="e.g. 2026/UTME/102938"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Target UTME Score ({targetScore}/400)
                  </label>
                  <input
                    type="range"
                    min="200"
                    max="380"
                    step="5"
                    value={targetScore}
                    onChange={e => setTargetScore(Number(e.target.value))}
                    className="w-full accent-orange-500 mt-2 cursor-pointer"
                  />
                </div>
              </div>

              {/* Subject Selection for JAMB Combination */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Select up to 4 UTME Subjects ({selectedSubjects.length}/4)
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {JAMB_SUBJECTS.map(subj => {
                    const isSelected = selectedSubjects.includes(subj.id);
                    return (
                      <button
                        key={subj.id}
                        type="button"
                        onClick={() => handleToggleSubject(subj.id)}
                        className={`p-2 rounded-xl text-left font-medium border flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 border-blue-500 text-blue-900 font-semibold'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <span className="truncate pr-1">{subj.name}</span>
                        {isSelected && (
                          <CheckCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-orange-600 hover:bg-orange-500 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-orange-600/20 transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                <Sparkles className="w-4 h-4 text-white" />
                <span>
                  {isSubmitting
                    ? 'Creating your account...'
                    : pendingExamConfig
                    ? 'Create Account & Begin CBT Exam'
                    : 'Create Candidate Account'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

        </div>

        {/* Keep infrastructure details out of the candidate-facing auth flow. */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 text-center text-xs text-slate-500">
          Secure account access for your JAMB practice journey.
        </div>
      </div>
    </div>
  );
};
