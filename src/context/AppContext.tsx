import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Question,
  TestSession,
  User,
  NeonConfig,
  OptionKey,
  SubjectScoreBreakdown
} from '../types/index.ts';
import { JAMB_SUBJECTS } from '../data/subjects.ts';
import {
  StorageService,
  DEFAULT_NEON_CONFIG,
  GUEST_USER
} from '../services/storage.ts';
import { NeonApiService } from '../services/neonApi.ts';
import {
  getNeonAuthError,
  neonAuthClient,
  requireNeonAuthClient
} from '../services/neonAuth.ts';

export type AppView =
  | 'dashboard'
  | 'simulator_setup'
  | 'exam_room'
  | 'results'
  | 'admin_questions'
  | 'admin_review'
  | 'history'
  | 'neon_settings';

export interface CbtExamConfig {
  mode: 'full_jamb' | 'subject_practice' | 'topic_drill' | 'quick_mock';
  subjects: string[];
  questionsPerSubject?: number;
  customTimeMinutes?: number;
  topicFilter?: string;
}

interface AppContextType {
  user: User;
  questions: Question[];
  testSessions: TestSession[];
  activeTestSession: TestSession | null;
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  selectedResultForReview: TestSession | null;
  setSelectedResultForReview: (session: TestSession | null) => void;
  neonConfig: NeonConfig;
  updateNeonConfig: (config: Partial<NeonConfig>) => void;
  testNeonConnection: () => Promise<boolean>;
  
  // Question actions
  createQuestion: (data: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateQuestion: (question: Question) => void;
  deleteQuestion: (id: string) => void;
  approveQuestion: (id: string) => void;
  rejectQuestion: (id: string, notes: string) => void;
  bulkApproveQuestions: (ids: string[]) => void;
  bulkDeleteQuestions: (ids: string[]) => void;
  resetQuestions: () => void;
  importQuestionsJson: (jsonString: string) => boolean;

  // CBT Exam actions
  startCbtTest: (config: CbtExamConfig) => void;
  submitCbtTest: (finalAnswers: Record<string, OptionKey>, finalMarked: string[], timeSpentSeconds: number) => TestSession;
  exitCbtTest: () => void;

  // Toast notifications
  toastMessage: { text: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;

  // Authentication & Neon Auth state
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'signup';
  authModalReason: 'general' | 'cbt_required';
  pendingExamConfig: CbtExamConfig | null;
  setPendingExamConfig: (cfg: CbtExamConfig | null) => void;
  openAuthModal: (mode?: 'login' | 'signup', reason?: 'general' | 'cbt_required') => void;
  closeAuthModal: () => void;
  loginWithNeon: (emailOrReg: string, password?: string) => Promise<boolean>;
  signupWithNeon: (data: {
    name: string;
    email: string;
    password: string;
    jambRegNumber?: string;
    targetScore?: number;
    selectedSubjects?: string[];
  }) => Promise<boolean>;
  requestPasswordResetWithNeon: (email: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUserState] = useState<User>(GUEST_USER);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('signup');
  const [authModalReason, setAuthModalReason] = useState<'general' | 'cbt_required'>('general');
  const [pendingExamConfig, setPendingExamConfig] = useState<CbtExamConfig | null>(null);
  const [questions, setQuestions] = useState<Question[]>(() => StorageService.getQuestions());
  const [testSessions, setTestSessions] = useState<TestSession[]>(() => StorageService.getTestSessions());
  const [activeTestSession, setActiveTestSession] = useState<TestSession | null>(null);
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [selectedResultForReview, setSelectedResultForReview] = useState<TestSession | null>(null);
  const [neonConfig, setNeonConfig] = useState<NeonConfig>(() => StorageService.getNeonConfig());
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  type NeonSessionUser = {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };

  const createDefaultProfile = (authUser: NeonSessionUser): User => ({
    id: authUser.id,
    name: authUser.name,
    email: authUser.email,
    role: 'student',
    avatarUrl: authUser.image || undefined,
    jambRegNumber: `2026/UTME/${Math.floor(100000 + Math.random() * 900000)}`,
    selectedSubjects: ['english', 'mathematics', 'physics', 'chemistry'],
    targetScore: 320,
  });

  const continuePendingExam = (authenticatedUser: User) => {
    if (!pendingExamConfig) return;

    const cfg = pendingExamConfig;
    setPendingExamConfig(null);
    setTimeout(() => {
      executeCbtTest(cfg, authenticatedUser);
    }, 100);
  };

  const activateAuthenticatedUser = (authenticatedUser: User, message: string) => {
    setUserState(authenticatedUser);
    setIsAuthenticated(true);
    setIsAuthModalOpen(false);
    showToast(message, 'success');
    continuePendingExam(authenticatedUser);
  };

  // Neon Auth owns the session. Restore it on every page load instead of
  // trusting a localStorage boolean or locally cached profile.
  useEffect(() => {
    let cancelled = false;

    const restoreNeonSession = async () => {
      if (!neonAuthClient) return;

      try {
        const sessionResult = await neonAuthClient.getSession();
        const authUser = sessionResult.data?.user as NeonSessionUser | undefined;
        if (!authUser) {
          if (!cancelled) {
            setIsAuthenticated(false);
            setUserState(GUEST_USER);
          }
          return;
        }

        const profileResult = await NeonApiService.getProfile();
        const restoredUser = profileResult.success && profileResult.user
          ? profileResult.user
          : createDefaultProfile(authUser);

        if (!cancelled) {
          setUserState(restoredUser);
          setIsAuthenticated(true);
        }
      } catch (error) {
        if (!cancelled) {
          setIsAuthenticated(false);
          setUserState(GUEST_USER);
          console.warn('Neon Auth session restore failed:', error);
        }
      }
    };

    void restoreNeonSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const openAuthModal = (mode: 'login' | 'signup' = 'signup', reason: 'general' | 'cbt_required' = 'general') => {
    setAuthModalMode(mode);
    setAuthModalReason(reason);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const executeCbtTest = (config: CbtExamConfig, candidateUser: User) => {
    const { mode, subjects, questionsPerSubject = 10, customTimeMinutes, topicFilter } = config;
    
    // Filter approved questions only for real test simulation
    const approved = questions.filter(q => q.status === 'approved');

    const selectedQuestionIds: string[] = [];

    subjects.forEach(subjId => {
      let subjQuestions = approved.filter(q => q.subjectId === subjId);
      if (topicFilter && topicFilter !== 'All Topics') {
        subjQuestions = subjQuestions.filter(q => q.topic === topicFilter);
      }
      
      // Shuffle randomly
      const shuffled = [...subjQuestions].sort(() => 0.5 - Math.random());
      const picked = shuffled.slice(0, questionsPerSubject);
      picked.forEach(q => selectedQuestionIds.push(q.id));
    });

    if (selectedQuestionIds.length === 0) {
      showToast('No approved questions found for the selected subject(s). Please choose other subjects or ask Admin to approve questions.', 'error');
      return;
    }

    // Determine time allowed
    let timeSeconds = 0;
    if (customTimeMinutes) {
      timeSeconds = customTimeMinutes * 60;
    } else if (mode === 'full_jamb') {
      timeSeconds = 120 * 60; // 2 hours official JAMB time
    } else if (mode === 'quick_mock') {
      timeSeconds = 15 * 60; // 15 mins quick challenge
    } else {
      timeSeconds = Math.max(10, selectedQuestionIds.length * 1.5) * 60; // 1.5 mins per question
    }

    const newSession: TestSession = {
      id: `cbt-${Date.now()}`,
      userId: candidateUser.id,
      userName: candidateUser.name,
      jambRegNumber: candidateUser.jambRegNumber || '2026/UTME/CANDIDATE',
      mode,
      title: mode === 'full_jamb'
        ? 'Full JAMB UTME Comprehensive Mock Exam'
        : mode === 'quick_mock'
        ? 'Quick 15-Minute UTME Speed Challenge'
        : `JAMB Practice: ${subjects.map(s => JAMB_SUBJECTS.find(sub => sub.id === s)?.name || s).join(', ')}`,
      subjects,
      questionIds: selectedQuestionIds,
      answers: {},
      markedForReview: [],
      startedAt: new Date().toISOString(),
      timeAllowedSeconds: timeSeconds,
      timeSpentSeconds: 0,
      status: 'in_progress',
      score: 0,
      totalQuestions: selectedQuestionIds.length,
      totalMaxScore: mode === 'full_jamb' ? 400 : selectedQuestionIds.length * (400 / (selectedQuestionIds.length || 1)),
      finalPercentage: 0,
      subjectBreakdown: []
    };

    setActiveTestSession(newSession);
    setActiveView('exam_room');
  };

  const loginWithNeon = async (email: string, password?: string): Promise<boolean> => {
    if (!email.trim() || !password) {
      showToast('Enter the email and password for your Neon account.', 'error');
      return false;
    }

    try {
      const auth = requireNeonAuthClient();
      const result = await auth.signIn.email({
        email: email.trim().toLowerCase(),
        password,
      });

      if (result.error || !result.data?.user) {
        showToast(getNeonAuthError(result.error, 'Neon sign-in failed.'), 'error');
        return false;
      }

      const authUser = result.data.user as NeonSessionUser;
      const profileResult = await NeonApiService.getProfile();
      const loggedInUser = profileResult.success && profileResult.user
        ? profileResult.user
        : createDefaultProfile(authUser);

      if (!profileResult.success) {
        const savedProfile = await NeonApiService.saveProfile(loggedInUser);
        if (!savedProfile.success) {
          showToast(savedProfile.error || 'Unable to load your Neon profile.', 'error');
          return false;
        }
      }

      activateAuthenticatedUser(loggedInUser, `Welcome back, ${loggedInUser.name}! Authenticated with Neon.`);
      return true;
    } catch (error) {
      showToast(getNeonAuthError(error, 'Unable to reach Neon Auth.'), 'error');
      return false;
    }
  };

  const signupWithNeon = async (data: {
    name: string;
    email: string;
    password: string;
    jambRegNumber?: string;
    targetScore?: number;
    selectedSubjects?: string[];
  }): Promise<boolean> => {
    if (!data.name.trim() || !data.email.trim() || !data.password) {
      showToast('Name, email, and password are required.', 'error');
      return false;
    }

    try {
      const auth = requireNeonAuthClient();
      const result = await auth.signUp.email({
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
      });

      if (result.error || !result.data?.user) {
        showToast(getNeonAuthError(result.error, 'Neon account creation failed.'), 'error');
        return false;
      }

      const authUser = result.data.user as NeonSessionUser;
      const profile = createDefaultProfile(authUser);
      profile.jambRegNumber = data.jambRegNumber?.trim().toUpperCase() || profile.jambRegNumber;
      profile.targetScore = data.targetScore || profile.targetScore;
      profile.selectedSubjects = data.selectedSubjects || profile.selectedSubjects;

      const savedProfile = await NeonApiService.saveProfile(profile);
      if (!savedProfile.success || !savedProfile.user) {
        showToast(
          savedProfile.error || 'Neon account created, but the candidate profile could not be saved.',
          'error',
        );
        return false;
      }

      activateAuthenticatedUser(
        savedProfile.user,
        `Account created on Neon! Welcome, ${savedProfile.user.name}.`,
      );
      return true;
    } catch (error) {
      showToast(getNeonAuthError(error, 'Unable to reach Neon Auth.'), 'error');
      return false;
    }
  };

  const requestPasswordResetWithNeon = async (email: string): Promise<boolean> => {
    if (!email.trim()) {
      showToast('Enter the email address for your Neon account.', 'error');
      return false;
    }

    try {
      const auth = requireNeonAuthClient();
      const result = await auth.requestPasswordReset({
        email: email.trim().toLowerCase(),
        redirectTo: window.location.origin,
      });

      if (result.error) {
        showToast(getNeonAuthError(result.error, 'Unable to request a password reset.'), 'error');
        return false;
      }

      showToast('Neon sent a password reset link if the account exists.', 'success');
      setIsAuthModalOpen(false);
      return true;
    } catch (error) {
      showToast(getNeonAuthError(error, 'Unable to reach Neon Auth.'), 'error');
      return false;
    }
  };

  const logout = async () => {
    try {
      if (neonAuthClient) {
        const result = await neonAuthClient.signOut();
        if (result.error) {
          showToast(getNeonAuthError(result.error, 'Neon sign-out failed.'), 'error');
          return;
        }
      }
    } catch (error) {
      showToast(getNeonAuthError(error, 'Neon sign-out failed.'), 'error');
      return;
    }

    setIsAuthenticated(false);
    setUserState(GUEST_USER);
    setPendingExamConfig(null);
    setActiveView('dashboard');
    showToast('Signed out. Please sign up or log in to use CBT practice.', 'info');
  };

  const updateNeonConfig = (newVals: Partial<NeonConfig>) => {
    const updated = { ...neonConfig, ...newVals };
    setNeonConfig(updated);
    StorageService.saveNeonConfig(updated);
  };

  const testNeonConnection = async (): Promise<boolean> => {
    const health = await NeonApiService.getHealth();
    const updated = {
      ...neonConfig,
      host: health.host || neonConfig.host,
      databaseName: health.database || neonConfig.databaseName,
      isConnected: health.isConnected,
      lastTestedAt: new Date().toISOString(),
      lastSyncedAt: health.isConnected ? new Date().toISOString() : neonConfig.lastSyncedAt,
    };
    setNeonConfig(updated);
    StorageService.saveNeonConfig(updated);

    if (health.isConnected) {
      showToast('Successfully connected to Neon PostgreSQL database!', 'success');
    } else {
      showToast(health.error || 'Could not reach the Neon database.', 'error');
    }

    return health.isConnected;
  };

  const createQuestion = (data: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newQ: Question = {
      ...data,
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newQ, ...questions];
    setQuestions(updated);
    StorageService.saveQuestions(updated);
    showToast('Question created successfully!', 'success');
  };

  const updateQuestion = (updatedQuestion: Question) => {
    const updated = questions.map(q => q.id === updatedQuestion.id ? { ...updatedQuestion, updatedAt: new Date().toISOString() } : q);
    setQuestions(updated);
    StorageService.saveQuestions(updated);
    showToast('Question updated successfully!', 'success');
  };

  const deleteQuestion = (id: string) => {
    const updated = questions.filter(q => q.id !== id);
    setQuestions(updated);
    StorageService.saveQuestions(updated);
    showToast('Question removed from question bank.', 'info');
  };

  const approveQuestion = (id: string) => {
    const updated = questions.map(q => q.id === id ? {
      ...q,
      status: 'approved' as const,
      reviewedBy: user.name,
      updatedAt: new Date().toISOString()
    } : q);
    setQuestions(updated);
    StorageService.saveQuestions(updated);
    showToast('Question approved for CBT practice tests!', 'success');
  };

  const rejectQuestion = (id: string, notes: string) => {
    const updated = questions.map(q => q.id === id ? {
      ...q,
      status: 'rejected' as const,
      reviewedBy: user.name,
      reviewNotes: notes,
      updatedAt: new Date().toISOString()
    } : q);
    setQuestions(updated);
    StorageService.saveQuestions(updated);
    showToast('Question marked as rejected with revision notes.', 'info');
  };

  const bulkApproveQuestions = (ids: string[]) => {
    const updated = questions.map(q => ids.includes(q.id) ? {
      ...q,
      status: 'approved' as const,
      reviewedBy: user.name,
      updatedAt: new Date().toISOString()
    } : q);
    setQuestions(updated);
    StorageService.saveQuestions(updated);
    showToast(`Approved ${ids.length} questions in bulk!`, 'success');
  };

  const bulkDeleteQuestions = (ids: string[]) => {
    const updated = questions.filter(q => !ids.includes(q.id));
    setQuestions(updated);
    StorageService.saveQuestions(updated);
    showToast(`Deleted ${ids.length} questions.`, 'info');
  };

  const resetQuestions = () => {
    const reset = StorageService.resetQuestionBank();
    setQuestions(reset);
    showToast('Reset question bank to initial verified JAMB dataset.', 'info');
  };

  const importQuestionsJson = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed)) return false;
      const valid = parsed.filter(item => item.questionText && item.options && item.correctAnswer && item.subjectId);
      if (valid.length === 0) return false;
      
      const newItems: Question[] = valid.map(item => ({
        ...item,
        id: item.id || `imp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        status: item.status || 'approved',
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: item.createdBy || user.name
      }));

      const merged = [...newItems, ...questions];
      setQuestions(merged);
      StorageService.saveQuestions(merged);
      showToast(`Successfully imported ${newItems.length} questions into question bank!`, 'success');
      return true;
    } catch (e) {
      console.error('Import failed', e);
      showToast('Failed to parse question JSON file.', 'error');
      return false;
    }
  };

  // CBT Exam Logic
  const startCbtTest = (config: CbtExamConfig) => {
    if (!isAuthenticated) {
      setPendingExamConfig(config);
      setAuthModalReason('cbt_required');
      openAuthModal('signup', 'cbt_required');
      showToast('Please sign up or log in to use CBT practice and save your score.', 'info');
      return;
    }

    executeCbtTest(config, user);
  };

  const submitCbtTest = (
    finalAnswers: Record<string, OptionKey>,
    finalMarked: string[],
    timeSpentSeconds: number
  ): TestSession => {
    if (!activeTestSession) {
      throw new Error('No active test session');
    }

    const testQuestionList = activeTestSession.questionIds
      .map(id => questions.find(q => q.id === id))
      .filter((q): q is Question => !!q);

    let rawScore = 0;
    const subjectMap: Record<string, { total: number; correct: number; name: string }> = {};

    activeTestSession.subjects.forEach(subId => {
      const subjectObj = JAMB_SUBJECTS.find(s => s.id === subId);
      subjectMap[subId] = {
        total: 0,
        correct: 0,
        name: subjectObj ? subjectObj.name : subId
      };
    });

    testQuestionList.forEach(q => {
      if (!subjectMap[q.subjectId]) {
        subjectMap[q.subjectId] = { total: 0, correct: 0, name: q.subjectId };
      }
      subjectMap[q.subjectId].total += 1;
      
      const candidateAns = finalAnswers[q.id];
      if (candidateAns && candidateAns === q.correctAnswer) {
        rawScore += 1;
        subjectMap[q.subjectId].correct += 1;
      }
    });

    const subjectBreakdown: SubjectScoreBreakdown[] = Object.keys(subjectMap).map(subId => {
      const item = subjectMap[subId];
      const pct = item.total > 0 ? (item.correct / item.total) * 100 : 0;
      // In JAMB each subject contributes up to 100 marks
      const scaledScore = item.total > 0 ? Math.round((item.correct / item.total) * 100) : 0;
      return {
        subjectId: subId,
        subjectName: item.name,
        score: scaledScore,
        totalQuestions: item.total,
        correctCount: item.correct,
        percentage: Math.round(pct)
      };
    });

    const totalQuestions = testQuestionList.length;
    const finalPct = totalQuestions > 0 ? Math.round((rawScore / totalQuestions) * 100) : 0;
    
    // Scaled JAMB score (out of 400 if multi-subject or scaled)
    let totalMaxScore = 400;
    let finalScore = 0;
    if (activeTestSession.mode === 'full_jamb') {
      finalScore = subjectBreakdown.reduce((acc, curr) => acc + curr.score, 0);
      totalMaxScore = 400;
    } else {
      finalScore = Math.round((rawScore / (totalQuestions || 1)) * 400);
      totalMaxScore = 400;
    }

    const completedSession: TestSession = {
      ...activeTestSession,
      answers: finalAnswers,
      markedForReview: finalMarked,
      timeSpentSeconds,
      completedAt: new Date().toISOString(),
      status: 'completed',
      score: finalScore,
      totalQuestions,
      totalMaxScore,
      finalPercentage: finalPct,
      subjectBreakdown
    };

    StorageService.saveTestSession(completedSession);
    void NeonApiService.saveSession(completedSession);
    setTestSessions(prev => [completedSession, ...prev]);
    setActiveTestSession(null);
    setSelectedResultForReview(completedSession);
    setActiveView('results');

    return completedSession;
  };

  const exitCbtTest = () => {
    setActiveTestSession(null);
    setActiveView('dashboard');
  };

  return (
    <AppContext.Provider
      value={{
        user,
        questions,
        testSessions,
        activeTestSession,
        activeView,
        setActiveView,
        selectedResultForReview,
        setSelectedResultForReview,
        neonConfig,
        updateNeonConfig,
        testNeonConnection,
        createQuestion,
        updateQuestion,
        deleteQuestion,
        approveQuestion,
        rejectQuestion,
        bulkApproveQuestions,
        bulkDeleteQuestions,
        resetQuestions,
        importQuestionsJson,
        startCbtTest,
        submitCbtTest,
        exitCbtTest,
        toastMessage,
        showToast,
        isAuthenticated,
        isAuthModalOpen,
        authModalMode,
        authModalReason,
        pendingExamConfig,
        setPendingExamConfig,
        openAuthModal,
        closeAuthModal,
        loginWithNeon,
        signupWithNeon,
        requestPasswordResetWithNeon,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
