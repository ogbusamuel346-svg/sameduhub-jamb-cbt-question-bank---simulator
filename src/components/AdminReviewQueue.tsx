import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { JAMB_SUBJECTS } from '../data/subjects.ts';
import { OptionKey, Question } from '../types/index.ts';
import { QuestionEditorModal } from './QuestionEditorModal.tsx';
import {
  CheckCircle2,
  XCircle,
  Edit3,
  Clock,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  User,
  BookOpen
} from 'lucide-react';

export const AdminReviewQueue: React.FC = () => {
  const {
    questions,
    approveQuestion,
    rejectQuestion,
    bulkApproveQuestions,
    user
  } = useApp();

  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');

  // Pending items
  const pendingQuestions = questions.filter(q => q.status === 'pending');

  const handleApproveAll = () => {
    if (window.confirm(`Approve all ${pendingQuestions.length} pending questions for live candidate tests?`)) {
      bulkApproveQuestions(pendingQuestions.map(q => q.id));
    }
  };

  const handleConfirmReject = () => {
    if (rejectingId) {
      rejectQuestion(rejectingId, rejectNotes.trim() || 'Requires syllabus alignment revision.');
      setRejectingId(null);
      setRejectNotes('');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-900/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 font-bold text-xs border border-orange-500/30 mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            EDUCATIONAL QUALITY ASSURANCE
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Question Review & Approval Queue</h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Vet questions for syllabus alignment, correctness of key, and explanation rigor before publishing to candidates.
          </p>
          <p className="text-[11px] text-amber-300 mt-2 font-semibold">
            AI-generated drafts are practice material only and are not official JAMB questions.
          </p>
        </div>

        {pendingQuestions.length > 0 && (
          <button
            onClick={handleApproveAll}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer hover:scale-102"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Approve All ({pendingQuestions.length})</span>
          </button>
        )}
      </div>

      {/* Main Review List */}
      {pendingQuestions.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Review Queue is All Clear!</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            All submitted questions have been reviewed and approved. New educator contributions or draft questions will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {pendingQuestions.map((q, idx) => {
            const subjectInfo = JAMB_SUBJECTS.find(s => s.id === q.subjectId);

            return (
              <div
                key={q.id}
                className="bg-white rounded-3xl p-6 shadow-sm border-2 border-orange-200/80 hover:border-orange-300 transition-all space-y-4"
              >
                {/* Meta Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-orange-600 text-white text-xs font-bold flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-extrabold text-blue-900 uppercase">
                      {subjectInfo?.name || q.subjectId}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs text-slate-600 font-medium">
                      Topic: <strong>{q.topic}</strong>
                    </span>
                    {q.year && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-800">
                        JAMB {q.year}
                      </span>
                    )}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                      q.difficulty === 'hard' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {q.difficulty}
                    </span>
                    {q.source === 'ai_generated' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                        AI draft · human review required
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-400 flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    <span>Submitted by: <strong>{q.createdBy || 'Educator Contributor'}</strong></span>
                  </div>
                </div>

                {/* Passage if present */}
                {q.passage && (
                  <div className="p-3 bg-blue-50/60 rounded-xl text-xs text-slate-700 font-serif leading-relaxed border border-blue-100">
                    <strong>Passage:</strong> {q.passage}
                  </div>
                )}

                {/* Question Text */}
                <div className="text-base font-bold text-slate-900 leading-snug">
                  {q.questionText}
                </div>

                {/* 4 Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(['A', 'B', 'C', 'D'] as OptionKey[]).map(key => {
                    const text = q.options[key];
                    const isKeyCorrect = key === q.correctAnswer;

                    return (
                      <div
                        key={key}
                        className={`p-3 rounded-xl border flex items-center gap-3 text-xs sm:text-sm ${
                          isKeyCorrect
                            ? 'bg-emerald-50 border-emerald-400 font-bold text-emerald-950 ring-1 ring-emerald-500/20'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs ${
                          isKeyCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {key}
                        </span>
                        <span>{text}</span>
                        {isKeyCorrect && (
                          <span className="ml-auto text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded uppercase font-bold">
                            Correct Answer Key
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Educational Explanation Box */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                  <strong className="text-slate-900 block mb-1">Provided Solution & Explanation:</strong>
                  <p>{q.explanation}</p>
                </div>

                {/* Actions: Approve / Edit / Reject */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setEditingQuestion(q)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Question Details</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRejectingId(q.id)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs cursor-pointer border border-red-200"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject & Request Changes</span>
                    </button>

                    <button
                      onClick={() => approveQuestion(q.id)}
                      className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer hover:scale-102"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve & Publish</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Provide Revision Feedback</h3>
            <p className="text-xs text-slate-500">
              Explain why this question was rejected so the educator can revise the options, stem, or working.
            </p>
            <textarea
              rows={3}
              value={rejectNotes}
              onChange={e => setRejectNotes(e.target.value)}
              placeholder="E.g., Option C contains a mathematical typographical error in sign..."
              className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-800"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectingId(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow"
              >
                Submit Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question Editor Modal */}
      <QuestionEditorModal
        isOpen={!!editingQuestion}
        onClose={() => setEditingQuestion(null)}
        questionToEdit={editingQuestion}
      />
    </div>
  );
};
