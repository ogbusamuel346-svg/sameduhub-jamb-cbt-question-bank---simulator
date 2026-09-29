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
import { AuthService } from '../services/auth.ts';

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
  generateQuestionDrafts: (input: {
    subjectId: string;
    topic: string;
    difficulty: 'easy' | 'medium' | 'hard';
    count: number;
  }) => Promise<Question[]>;

  // CBT Exam actions
  startCbtTest: (config: CbtExamConfig) => void;
  submitCbtTest: (finalAnswers: Record<string, OptionKey>, finalMarked: string[], timeSpentSeconds: number) => TestSession;
  exitCbtTest: () => void;

  // Toast notifications
  toastMessage: { text: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;

  // Application-owned authentication state
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'signup';
  authModalReason: 'general' | 'cbt_required';
  pendingExamConfig: CbtExamConfig | null;
  setPendingExamConfig: (cfg: CbtExamConfig | null) => void;
  openAuthModal: (mode?: 'login' | 'signup', reason?: 'general' | 'cbt_required') => void;
  closeAuthModal: () => void;
  loginWithAuth: (emailOrReg: string, password?: string) => Promise<boolean>;
  signupWithAuth: (data: {
    name: string;
    email: string;
    password: string;
    jambRegNumber?: string;
    targetScore?: number;
    selectedSubjects?: string[];
  }) => Promise<boolean>;
  requestPasswordReset: (email: string) => Promise<boolean>;
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

  const hydrateQuestions = async (includeAll = false) => {
    const result = await NeonApiService.getQuestions(includeAll);
    if (!result.success || result.questions.length === 0) return;

    setQuestions(previous => {
      const remoteIds = new Set(result.questions.map(question => question.id));
      // Keep unsaved AI drafts and local seed questions, while Neon remains the
      // source of truth for any question that already exists remotely.
      const localOnly = previous.filter(question => !remoteIds.has(question.id));
      const merged = [...result.questions, ...localOnly];
      StorageService.saveQuestions(merged);
      return merged;
    });
  };

  useEffect(() => {
    void hydrateQuestions(false);
  }, []);

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

  // Restore the server-owned session on every page load. The browser only
  // holds an HttpOnly session cookie; it never stores a password or token.
  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      try {
        const sessionResult = await AuthService.getSession();
        if (!sessionResult.success || !sessionResult.user) {
          if (!cancelled) {
            setIsAuthenticated(false);
            setUserState(GUEST_USER);
          }
          return;
        }

        if (!cancelled) {
          setUserState(sessionResult.user);
          setIsAuthenticated(true);
          void hydrateQuestions(sessionResult.user.role === 'admin');
        }
      } catch (error) {
        if (!cancelled) {
          setIsAuthenticated(false);
          setUserState(GUEST_USER);
          console.warn('App session restore failed:', error);
        }
      }
    };

    void restoreSession();
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

  const loginWithAuth = async (email: string, password?: string): Promise<boolean> => {
    if (!email.trim() || !password) {
      showToast('Enter your email and password.', 'error');
      return false;
    }

    const result = await AuthService.signIn(email.trim().toLowerCase(), password);
    if (!result.success || !result.user) {
      showToast(result.error || 'Sign-in failed.', 'error');
      return false;
    }

    activateAuthenticatedUser(result.user, `Welcome back, ${result.user.name}!`);
    void hydrateQuestions(result.user.role === 'admin');
    return true;
  };

  const signupWithAuth = async (data: {
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
    const result = await AuthService.signUp(data);
    if (!result.success || !result.user) {
      showToast(result.error || 'Account creation failed.', 'error');
      return false;
    }

    activateAuthenticatedUser(result.user, `Account created! Welcome, ${result.user.name}.`);
    void hydrateQuestions(result.user.role === 'admin');
    return true;
  };

  const requestPasswordReset = async (email: string): Promise<boolean> => {
    if (!email.trim()) {
      showToast('Enter your account email address.', 'error');
      return false;
    }

    const result = await AuthService.requestPasswordReset(email.trim().toLowerCase());
    if (!result.success) {
      showToast(result.error || 'Password reset is unavailable.', 'error');
      return false;
    }

    setIsAuthModalOpen(false);
    showToast(result.message || 'Password reset requested.', 'success');
    return true;
  };

  const logout = async () => {
    const result = await AuthService.signOut();
    if (!result.success) {
      showToast(result.error || 'Sign-out failed.', 'error');
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

  const isAdminSession = isAuthenticated && user.role === 'admin';
  const isUnsavedDraft = (id: string) => id.startsWith('ai-draft-');

  const reportQuestionSyncError = (error: string | undefined, fallback: string) => {
    if (error) showToast(error, 'error');
    else showToast(fallback, 'error');
  };

  const createQuestion = (data: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newQ: Question = {
      ...data,
      source: data.source || 'manual',
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newQ, ...questions];
    setQuestions(updated);
    StorageService.saveQuestions(updated);
    showToast('Question created successfully!', 'success');

    if (isAdminSession) {
      void NeonApiService.createQuestion(newQ).then(result => {
        if (!result.success) reportQuestionSyncError(result.error, 'Question was created locally but could not be saved to Neon.');
      });
    }
  };

  const updateQuestion = (updatedQuestion: Question) => {
    const questionToSave = { ...updatedQuestion, updatedAt: new Date().toISOString() };
    const updated = questions.map(q => q.id === updatedQuestion.id ? questionToSave : q);
    setQuestions(updated);
    StorageService.saveQuestions(updated);
    showToast('Question updated successfully!', 'success');

    if (isAdminSession && !isUnsavedDraft(questionToSave.id)) {
      void NeonApiService.updateQuestion(questionToSave).then(result => {
        if (!result.success) reportQuestionSyncError(result.error, 'Question was updated locally but could not be saved to Neon.');
      });
    }
  };

  const deleteQuestion = (id: string) => {
    const updated = questions.filter(q => q.id !== id);
    setQuestions(updated);
    StorageService.saveQuestions(updated);
    showToast('Question removed from question bank.', 'info');

    if (isAdminSession && !isUnsavedDraft(id)) {
      void NeonApiService.deleteQuestion(id).then(result => {
        if (!result.success) reportQuestionSyncError(result.error, 'Question was removed locally but could not be deleted from Neon.');
      });
    }
  };

  const approveQuestion = (id: string) => {
    const question = questions.find(q => q.id === id);
    if (!question) return;

    const approvedQuestion = {
      ...question,
      status: 'approved' as const,
      reviewedBy: user.name,
      updatedAt: new Date().toISOString()
    };
    const updated = questions.map(q => q.id === id ? approvedQuestion : q);
    setQuestions(updated);
    StorageService.saveQuestions(updated);
    showToast('Question approved for CBT practice tests!', 'success');

    if (isAdminSession) {
      // Upsert makes approval work for both unsaved AI drafts and local seed items.
      void NeonApiService.createQuestion(approvedQuestion).then(result => {
        if (!result.success) reportQuestionSyncError(result.error, 'Question was approved locally but could not be saved to Neon.');
      });
    }
  };

  const rejectQuestion = (id: string, notes: string) => {
    const rejectedQuestion = questions.find(q => q.id === id);
    if (!rejectedQuestion) return;

    const updatedQuestion = {
      ...rejectedQuestion,
      status: 'rejected' as const,
      reviewedBy: user.name,
      reviewNotes: notes,
      updatedAt: new Date().toISOString()
    };
    const updated = questions.map(q => q.id === id ? updatedQuestion : q);
    setQuestions(updated);
    StorageService.saveQuestions(updated);
    showToast('Question marked as rejected with revision notes.', 'info');

    if (isAdminSession && !isUnsavedDraft(id)) {
      void NeonApiService.updateQuestionStatus(id, 'rejected', notes).then(result => {
        if (!result.success && !result.error?.includes('not found')) {
          reportQuestionSyncError(result.error, 'Question was rejected locally but could not be updated in Neon.');
        }
      });
    }
  };

  const bulkApproveQuestions = (ids: string[]) => {
    const approvedQuestions = questions.filter(q => ids.includes(q.id)).map(q => ({
      ...q,
      status: 'approved' as const,
      reviewedBy: user.name,
      updatedAt: new Date().toISOString()
    }));
    const approvedById = new Map(approvedQuestions.map(question => [question.id, question]));
    const updated = questions.map(q => approvedById.get(q.id) || q);
    setQuestions(updated);
    StorageService.saveQuestions(updated);
    showToast(`Approved ${ids.length} questions in bulk!`, 'success');

    if (isAdminSession && approvedQuestions.length > 0) {
      void Promise.all(approvedQuestions.map(question => NeonApiService.createQuestion(question))).then(results => {
        const failed = results.find(result => !result.success);
        if (failed) reportQuestionSyncError(failed.error, 'Some approved questions could not be saved to Neon.');
      });
    }
  };

  const bulkDeleteQuestions = (ids: string[]) => {
    const updated = questions.filter(q => !ids.includes(q.id));
    setQuestions(updated);
    StorageService.saveQuestions(updated);
    showToast(`Deleted ${ids.length} questions.`, 'info');

    if (isAdminSession) {
      void Promise.all(ids.filter(id => !isUnsavedDraft(id)).map(id => NeonApiService.deleteQuestion(id))).then(results => {
        const failed = results.find(result => !result.success);
        if (failed) reportQuestionSyncError(failed.error, 'Some questions could not be deleted from Neon.');
      });
    }
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
        source: item.source || 'manual',
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: item.createdBy || user.name
      }));

      const merged = [...newItems, ...questions];
      setQuestions(merged);
      StorageService.saveQuestions(merged);
      showToast(`Successfully imported ${newItems.length} questions into question bank!`, 'success');

      if (isAdminSession) {
        void Promise.all(newItems.map(question => NeonApiService.createQuestion(question))).then(results => {
          const failed = results.find(result => !result.success);
          if (failed) reportQuestionSyncError(failed.error, 'Some imported questions could not be saved to Neon.');
        });
      }
      return true;
    } catch (e) {
      console.error('Import failed', e);
      showToast('Failed to parse question JSON file.', 'error');
      return false;
    }
  };

  const generateQuestionDrafts = async (input: {
    subjectId: string;
    topic: string;
    difficulty: 'easy' | 'medium' | 'hard';
    count: number;
  }): Promise<Question[]> => {
    if (!isAdminSession) {
      showToast('Only authenticated admins can generate question drafts.', 'error');
      return [];
    }

    const result = await NeonApiService.generateQuestionDrafts(input);
    if (!result.success) {
      showToast(result.error || 'Unable to generate question drafts.', 'error');
      return [];
    }

    const merged = [...result.questions, ...questions];
    setQuestions(merged);
    StorageService.saveQuestions(merged);
    showToast(`${result.questions.length} AI question drafts are ready for review.`, 'success');
    return result.questions;
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
        generateQuestionDrafts,
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
        loginWithAuth,
        signupWithAuth,
        requestPasswordReset,
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
