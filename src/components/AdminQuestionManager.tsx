import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { JAMB_SUBJECTS, SUBJECT_TOPICS } from '../data/subjects.ts';
import { Difficulty, Question, QuestionStatus } from '../types/index.ts';
import { QuestionEditorModal } from './QuestionEditorModal.tsx';
import { AdminQuestionGenerator } from './AdminQuestionGenerator.tsx';
import {
  Plus,
  Search,
  Filter,
  Trash2,
  CheckCircle2,
  XCircle,
  Edit3,
  Download,
  Upload,
  RotateCcw,
  BookOpen,
  Layers,
  Sparkles,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';

export const AdminQuestionManager: React.FC = () => {
  const {
    questions,
    deleteQuestion,
    approveQuestion,
    rejectQuestion,
    bulkApproveQuestions,
    bulkDeleteQuestions,
    resetQuestions,
    importQuestionsJson,
    showToast,
    user
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);

  // Available topics for the selected subject
  const availableTopics = useMemo(() => {
    if (selectedSubject === 'all') {
      const all: string[] = [];
      Object.values(SUBJECT_TOPICS).forEach(list => all.push(...list));
      return Array.from(new Set(all));
    }
    return SUBJECT_TOPICS[selectedSubject] || [];
  }, [selectedSubject]);

  // Filtered questions
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      if (selectedSubject !== 'all' && q.subjectId !== selectedSubject) return false;
      if (selectedTopic !== 'all' && q.topic !== selectedTopic) return false;
      if (selectedDifficulty !== 'all' && q.difficulty !== selectedDifficulty) return false;
      if (selectedStatus !== 'all' && q.status !== selectedStatus) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesStem = q.questionText.toLowerCase().includes(query);
        const matchesTopic = q.topic.toLowerCase().includes(query);
        const matchesExplanation = q.explanation.toLowerCase().includes(query);
        if (!matchesStem && !matchesTopic && !matchesExplanation) return false;
      }

      return true;
    });
  }, [questions, selectedSubject, selectedTopic, selectedDifficulty, selectedStatus, searchQuery]);

  // Handle Select All
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedQuestionIds(filteredQuestions.map(q => q.id));
    } else {
      setSelectedQuestionIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedQuestionIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Export questions to JSON
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredQuestions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `sameduhub_jamb_questions_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(`Exported ${filteredQuestions.length} questions to JSON.`, 'success');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <BookOpen className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                JAMB UTME Question Bank Manager
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Create, organize by syllabus, review, and approve CBT test items
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsGeneratorOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-600 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Question Generator</span>
          </button>

          <button
            onClick={() => {
              setEditingQuestion(null);
              setIsEditorOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer hover:scale-102"
          >
            <Plus className="w-4 h-4" />
            <span>Add Question</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-300 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import JSON</span>
          </button>

          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-300 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          <button
            onClick={() => {
              if (window.confirm('Reset all questions to verified default JAMB dataset? Custom questions will be replaced.')) {
                resetQuestions();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors cursor-pointer"
            title="Reset Question Bank"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Stats Quick Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">Total Bank Items</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{questions.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Across {JAMB_SUBJECTS.length} Subjects</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">Approved for CBT</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {questions.filter(q => q.status === 'approved').length}
          </div>
          <div className="text-[11px] text-emerald-700 mt-0.5">Live in Practice Tests</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">Pending Review</div>
          <div className="text-2xl font-black text-orange-600 mt-1">
            {questions.filter(q => q.status === 'pending').length}
          </div>
          <div className="text-[11px] text-orange-700 mt-0.5">Awaiting verification</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">Hard / Advanced</div>
          <div className="text-2xl font-black text-blue-600 mt-1">
            {questions.filter(q => q.difficulty === 'hard').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">High-distinction questions</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by question text, formula, topic, or keyword..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Subject Filter */}
          <select
            value={selectedSubject}
            onChange={e => {
              setSelectedSubject(e.target.value);
              setSelectedTopic('all');
            }}
            className="w-full md:w-48 px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          >
            <option value="all">All Subjects</option>
            {JAMB_SUBJECTS.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {/* Topic Filter */}
          <select
            value={selectedTopic}
            onChange={e => setSelectedTopic(e.target.value)}
            className="w-full md:w-48 px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          >
            <option value="all">All Topics</option>
            {availableTopics.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {/* Difficulty Filter */}
          <select
            value={selectedDifficulty}
            onChange={e => setSelectedDifficulty(e.target.value)}
            className="w-full md:w-36 px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="w-full md:w-36 px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          >
            <option value="all">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="draft">Draft</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Bulk Action Controls */}
        {selectedQuestionIds.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-200 animate-in fade-in">
            <span className="text-xs font-bold text-blue-900">
              {selectedQuestionIds.length} question(s) selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  bulkApproveQuestions(selectedQuestionIds);
                  setSelectedQuestionIds([]);
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
              >
                Approve Selected
              </button>
              <button
                onClick={() => {
                  if (window.confirm(`Delete ${selectedQuestionIds.length} selected questions?`)) {
                    bulkDeleteQuestions(selectedQuestionIds);
                    setSelectedQuestionIds([]);
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer"
              >
                Delete Selected
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Questions Data Table / Card View */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              onChange={handleSelectAll}
              checked={selectedQuestionIds.length === filteredQuestions.length && filteredQuestions.length > 0}
              className="w-4 h-4 rounded text-blue-600 cursor-pointer"
            />
            <span>Select All</span>
          </div>
          <span>Showing {filteredQuestions.length} of {questions.length} questions</span>
        </div>

        {filteredQuestions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <BookOpen className="w-10 h-10 mx-auto text-slate-300" />
            <div className="text-base font-bold text-slate-700">No questions match your filter</div>
            <p className="text-xs text-slate-500">Try loosening your search terms or subject selection.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredQuestions.map(q => {
              const subjectInfo = JAMB_SUBJECTS.find(s => s.id === q.subjectId);
              const isSelected = selectedQuestionIds.includes(q.id);

              return (
                <div
                  key={q.id}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
                    isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(q.id)}
                      className="w-4 h-4 rounded text-blue-600 mt-1 cursor-pointer shrink-0"
                    />

                    <div className="space-y-1.5 flex-1">
                      {/* Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="font-extrabold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                          {subjectInfo?.name || q.subjectId}
                        </span>
                        <span className="font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {q.topic}
                        </span>
                        {q.year && (
                          <span className="font-semibold px-1.5 py-0.5 rounded bg-orange-100 text-orange-800">
                            JAMB {q.year}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded font-bold capitalize ${
                          q.difficulty === 'easy'
                            ? 'bg-emerald-100 text-emerald-800'
                            : q.difficulty === 'hard'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {q.difficulty}
                        </span>

                        <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                          q.status === 'approved'
                            ? 'bg-emerald-600 text-white'
                            : q.status === 'pending'
                            ? 'bg-orange-500 text-white'
                            : 'bg-slate-300 text-slate-700'
                        }`}>
                          {q.status}
                        </span>
                        {q.source === 'ai_generated' && (
                          <span className="px-2 py-0.5 rounded font-bold uppercase text-[10px] bg-indigo-100 text-indigo-800">
                            Practice question · not official JAMB
                          </span>
                        )}
                      </div>

                      {/* Stem */}
                      <div className="text-sm font-semibold text-slate-900 leading-snug">
                        {q.questionText}
                      </div>

                      {/* Options Preview */}
                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span><strong>Ans:</strong> Option {q.correctAnswer} ({q.options[q.correctAnswer]})</span>
                        <span>•</span>
                        <span className="truncate max-w-md"><strong>Exp:</strong> {q.explanation}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {q.status !== 'approved' && (
                      <button
                        onClick={() => approveQuestion(q.id)}
                        className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        title="Approve Question"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Approve</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setEditingQuestion(q);
                        setIsEditorOpen(true);
                      }}
                      className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      title="Edit Question"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>

                    <button
                      onClick={() => {
                        if (window.confirm('Delete this question permanently?')) {
                          deleteQuestion(q.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                      title="Delete Question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Question Editor Modal */}
      <QuestionEditorModal
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingQuestion(null);
        }}
        questionToEdit={editingQuestion}
      />

      <AdminQuestionGenerator
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
      />

      {/* JSON Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Bulk Import Questions from JSON</h3>
            <p className="text-xs text-slate-500">
              Paste a JSON array containing question items conforming to the SamEduHub schema.
            </p>
            <textarea
              rows={8}
              value={importJsonText}
              onChange={e => setImportJsonText(e.target.value)}
              placeholder='[{"subjectId":"english","topic":"Lexis","difficulty":"medium","questionText":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"correctAnswer":"A","explanation":"..."}]'
              className="w-full p-3 rounded-xl border border-slate-300 font-mono text-xs text-slate-800"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const success = importQuestionsJson(importJsonText);
                  if (success) {
                    setIsImportModalOpen(false);
                    setImportJsonText('');
                  }
                }}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
              >
                Import Questions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
