import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  GraduationCap,
  PlayCircle,
  BookOpen,
  History,
  LogIn,
  UserPlus,
  LogOut,
  ChevronDown,
  ShieldCheck,
  Menu,
  X,
  CheckCircle2,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    user,
    isAuthenticated,
    openAuthModal,
    logout,
    activeView,
    setActiveView,
    questions
  } = useApp();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const pendingQuestionsCount = questions.filter(q => q.status === 'pending').length;

  const handleNavClick = (view: typeof activeView) => {
    setActiveView(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          
          {/* Brand Logo */}
          <div
            className="flex items-center gap-2.5 cursor-pointer select-none"
            onClick={() => handleNavClick('dashboard')}
          >
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-md shadow-blue-950 border border-blue-400/30">
              <GraduationCap className="w-5 h-5 text-white" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-slate-900"></span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-extrabold text-xl tracking-tight text-white">
                  Sam<span className="text-orange-500">EduHub</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 hidden xs:inline-block">
                  CBT
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium tracking-wide">
                JAMB / UTME Question Bank
              </p>
            </div>
          </div>

          {/* Exactly 3 Important Navigation Links on Desktop/Tablet */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-3">
            {/* 1. Practice Tests */}
            <button
              onClick={() => handleNavClick('simulator_setup')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeView === 'simulator_setup'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <PlayCircle className="w-4 h-4 text-orange-400" />
              <span>Practice Tests</span>
            </button>

            {/* 2. Admin Question Bank */}
            {isAuthenticated && user.role === 'admin' && (
              <button
                onClick={() => handleNavClick('admin_questions')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  activeView === 'admin_questions'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <BookOpen className="w-4 h-4 text-blue-400" />
                <span>Question Bank</span>
              </button>
            )}

            {/* 3. My Results & History */}
            <button
              onClick={() => handleNavClick('history')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeView === 'history'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <History className="w-4 h-4 text-emerald-400" />
              <span>My Results</span>
            </button>
          </nav>

          {/* Right Area: Login / Sign Up or Authenticated User */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* If user is logged in as a candidate or admin */}
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-left transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xs text-white shrink-0 border border-blue-400/40">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="hidden sm:block">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white truncate max-w-[120px]">
                        {user.name}
                      </span>
                      {user.role === 'admin' && (
                        <span className="text-[10px] font-bold px-1 py-0.2 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                          ADMIN
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 block truncate max-w-[130px]">
                      {user.role === 'admin' ? 'Tutor / Admin' : user.jambRegNumber || 'UTME Aspirant'}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </button>

                {/* Profile Dropdown Menu */}
                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-50 p-2 text-slate-200 animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-3 border-b border-slate-700/60 mb-2">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Authenticated Persona
                      </div>
                      <div className="font-bold text-sm text-white flex items-center gap-1.5 mt-0.5">
                        <span>{user.name}</span>
                        {user.role === 'admin' && (
                          <ShieldCheck className="w-4 h-4 text-orange-400" />
                        )}
                      </div>
                      <div className="text-xs text-slate-400 truncate">{user.email}</div>
                    </div>

                    {/* Admin review queue link if admin */}
                    {user.role === 'admin' && (
                      <button
                        onClick={() => {
                          handleNavClick('admin_review');
                          setIsProfileDropdownOpen(false);
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-xl text-xs hover:bg-slate-700/80 text-orange-300 font-semibold mb-2 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-orange-400" />
                          <span>Review & Approve Questions</span>
                        </div>
                        {pendingQuestionsCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-bold">
                            {pendingQuestionsCount}
                          </span>
                        )}
                      </button>
                    )}

                    <div className="border-t border-slate-700/60 pt-2 flex flex-col gap-1">
                      <button
                        onClick={() => {
                          logout();
                          setIsProfileDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2 p-2 rounded-lg text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer font-semibold"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Clear Login & Sign Up buttons when not logged in */
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openAuthModal('login')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-200 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <LogIn className="w-4 h-4 text-blue-400" />
                  <span>Login</span>
                </button>

                <button
                  onClick={() => openAuthModal('signup')}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-600/20 transition-all cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Sign Up</span>
                </button>
              </div>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-t border-slate-800 px-4 py-4 space-y-2 animate-in slide-in-from-top-4 duration-200">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 pb-1">
            Menu Navigation
          </div>

          {/* 1. Practice Tests */}
          <button
            onClick={() => handleNavClick('simulator_setup')}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              activeView === 'simulator_setup'
                ? 'bg-blue-600 text-white'
                : 'text-slate-200 hover:bg-slate-800'
            }`}
          >
            <PlayCircle className="w-5 h-5 text-orange-400" />
            <span>Practice Tests</span>
          </button>

          {/* 2. Admin Question Bank */}
          {isAuthenticated && user.role === 'admin' && (
            <button
              onClick={() => handleNavClick('admin_questions')}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeView === 'admin_questions'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-200 hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-5 h-5 text-blue-400" />
              <span>Question Bank</span>
            </button>
          )}

          {/* 3. My Results */}
          <button
            onClick={() => handleNavClick('history')}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              activeView === 'history'
                ? 'bg-blue-600 text-white'
                : 'text-slate-200 hover:bg-slate-800'
            }`}
          >
            <History className="w-5 h-5 text-emerald-400" />
            <span>My Results</span>
          </button>

          {/* Mobile Login / Sign Up Actions */}
          <div className="pt-3 mt-2 border-t border-slate-800 flex gap-2">
            {!isAuthenticated ? (
              <>
                <button
                  onClick={() => {
                    openAuthModal('login');
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-white text-xs font-bold border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogIn className="w-4 h-4 text-blue-400" />
                  <span>Login</span>
                </button>
                <button
                  onClick={() => {
                    openAuthModal('signup');
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Sign Up</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  logout();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full py-2.5 rounded-xl bg-slate-800 text-red-400 text-xs font-bold border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out ({user.name})</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
