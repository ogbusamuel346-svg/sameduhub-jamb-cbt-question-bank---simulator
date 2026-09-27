import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { JAMB_SUBJECTS, SUBJECT_TOPICS } from '../data/subjects.ts';
import { Difficulty, OptionKey, Question, QuestionStatus } from '../types/index.ts';
import {
  X,
  Save,
  Eye,
  BookOpen,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface QuestionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionToEdit?: Question | null;
}

export const QuestionEditorModal: React.FC<QuestionEditorModalProps> = ({
  isOpen,
  onClose,
  questionToEdit,
}) => {
  const { createQuestion, updateQuestion, user } = useApp();

  const [subjectId, setSubjectId] = useState<string>('english');
  const [topic, setTopic] = useState<string>('');
  const [customTopic, setCustomTopic] = useState<string>('');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [year, setYear] = useState<number>(2024);
  const [passage, setPassage] = useState<string>('');
  const [questionText, setQuestionText] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [options, setOptions] = useState<{ A: string; B: string; C: string; D: string }>({
    A: '',
    B: '',
    C: '',
    D: '',
  });
  const [correctAnswer, setCorrectAnswer] = useState<OptionKey>('A');
  const [explanation, setExplanation] = useState<string>('');
  const [status, setStatus] = useState<QuestionStatus>('approved');
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Load existing question for editing
  useEffect(() => {
    if (questionToEdit) {
      setSubjectId(questionToEdit.subjectId);
      setTopic(questionToEdit.topic);
      setDifficulty(questionToEdit.difficulty);
      setYear(questionToEdit.year || 2024);
      setPassage(questionToEdit.passage || '');
      setQuestionText(questionToEdit.questionText);
      setImageUrl(questionToEdit.imageUrl || '');
      setOptions({ ...questionToEdit.options });
      setCorrectAnswer(questionToEdit.correctAnswer);
      setExplanation(questionToEdit.explanation);
      setStatus(questionToEdit.status);
    } else {
      // Default new question
      setSubjectId('english');
      const defaultTopics = SUBJECT_TOPICS['english'] || [];
      setTopic(defaultTopics[0] || 'Comprehension & Summary');
      setDifficulty('medium');
      setYear(2024);
      setPassage('');
      setQuestionText('');
      setImageUrl('');
      setOptions({ A: '', B: '', C: '', D: '' });
      setCorrectAnswer('A');
      setExplanation('');
      setStatus(user.role === 'admin' ? 'approved' : 'pending');
    }
    setErrors([]);
  }, [questionToEdit, user.role, isOpen]);

  // Handle subject change and adjust available topics
  const handleSubjectChange = (newSubjectId: string) => {
    setSubjectId(newSubjectId);
    const available = SUBJECT_TOPICS[newSubjectId] || [];
    setTopic(available[0] || 'General');
  };

  if (!isOpen) return null;

  const validate = () => {
    const errs: string[] = [];
    if (!questionText.trim()) errs.push('Question stem text cannot be empty.');
    if (!options.A.trim()) errs.push('Option A must have content.');
    if (!options.B.trim()) errs.push('Option B must have content.');
    if (!options.C.trim()) errs.push('Option C must have content.');
    if (!options.D.trim()) errs.push('Option D must have content.');
    if (!explanation.trim()) errs.push('Please provide an educational explanation for the answer.');
    const finalTopic = customTopic.trim() || topic;
    if (!finalTopic.trim()) errs.push('Topic category must be specified.');
    setErrors(errs);
    return errs.length === 0;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const finalTopic = customTopic.trim() || topic;

    if (questionToEdit) {
      updateQuestion({
        ...questionToEdit,
        subjectId,
        topic: finalTopic,
        difficulty,
        year: year ? Number(year) : undefined,
        passage: passage.trim() || undefined,
        questionText: questionText.trim(),
        imageUrl: imageUrl.trim() || undefined,
        options,
        correctAnswer,
        explanation: explanation.trim(),
        status,
        reviewedBy: user.name,
      });
    } else {
      createQuestion({
        subjectId,
        topic: finalTopic,
        difficulty,
        year: year ? Number(year) : undefined,
        passage: passage.trim() || undefined,
        questionText: questionText.trim(),
        imageUrl: imageUrl.trim() || undefined,
        options,
        correctAnswer,
        explanation: explanation.trim(),
        status,
        createdBy: user.name,
      });
    }

    onClose();
  };

  const availableTopics = SUBJECT_TOPICS[subjectId] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {questionToEdit ? 'Edit JAMB Question' : 'Create New JAMB Question'}
              </h2>
              <p className="text-xs text-slate-400">
                Organize by subject, topic syllabus, and difficulty
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                showPreview ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>{showPreview ? 'Editor' : 'Live Preview'}</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {errors.length > 0 && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-sm mb-1">
                <AlertCircle className="w-4 h-4" />
                Please fix the following validation errors:
              </div>
              <ul className="list-disc pl-5 space-y-0.5">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {showPreview ? (
            /* Live Candidate-facing Preview */
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600" />
                Previewing how candidates see this question in the CBT Exam Room
              </div>

              <div className="p-6 rounded-2xl border-2 border-blue-500/40 bg-white shadow-sm space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-500 border-b pb-2">
                  <span className="font-bold uppercase text-blue-800">
                    {JAMB_SUBJECTS.find(s => s.id === subjectId)?.name} • {customTopic || topic}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 font-bold">
                    JAMB {year}
                  </span>
                </div>

                {passage && (
                  <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 font-serif leading-relaxed border">
                    <strong>Passage:</strong> {passage}
                  </div>
                )}

                <div className="text-base font-semibold text-slate-900">
                  {questionText || '(Question text preview)'}
                </div>

                {imageUrl && (
                  <img src={imageUrl} alt="Diagram" className="max-h-48 rounded object-contain border" />
                )}

                <div className="space-y-2">
                  {(['A', 'B', 'C', 'D'] as OptionKey[]).map(key => (
                    <div
                      key={key}
                      className={`p-3 rounded-xl border flex items-center gap-3 text-sm ${
                        key === correctAnswer ? 'bg-emerald-50 border-emerald-400 font-semibold text-emerald-950' : 'bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className={`w-7 h-7 rounded font-bold text-xs flex items-center justify-center ${
                        key === correctAnswer ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {key}
                      </span>
                      <span>{options[key] || `(Option ${key})`}</span>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border text-xs text-slate-700">
                  <strong>Explanation:</strong> {explanation || '(No explanation provided yet)'}
                </div>
              </div>
            </div>
          ) : (
            <form id="question-form" onSubmit={handleSave} className="space-y-5">
              
              {/* Row 1: Subject, Topic, Difficulty, Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Subject *
                  </label>
                  <select
                    value={subjectId}
                    onChange={e => handleSubjectChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    {JAMB_SUBJECTS.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Topic / Syllabus *
                  </label>
                  <select
                    value={topic}
                    onChange={e => {
                      setTopic(e.target.value);
                      setCustomTopic('');
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    {availableTopics.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                    <option value="Custom">Custom Topic...</option>
                  </select>
                  {topic === 'Custom' && (
                    <input
                      type="text"
                      placeholder="Type custom topic name"
                      value={customTopic}
                      onChange={e => setCustomTopic(e.target.value)}
                      className="mt-2 w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Difficulty Level *
                  </label>
                  <select
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value as Difficulty)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="easy">Easy (Foundational)</option>
                    <option value="medium">Medium (Standard UTME)</option>
                    <option value="hard">Hard (Advanced Distinction)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    JAMB Exam Year
                  </label>
                  <input
                    type="number"
                    min="1990"
                    max="2026"
                    value={year}
                    onChange={e => setYear(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Comprehension Passage / Case Study (Optional) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Comprehension Passage / Scenario (Optional)
                  </label>
                  <span className="text-[11px] text-slate-400">Used for English passages or scenario-based physics/chem questions</span>
                </div>
                <textarea
                  rows={3}
                  value={passage}
                  onChange={e => setPassage(e.target.value)}
                  placeholder="Paste comprehension passage, poem stanza, or scenario..."
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-serif leading-relaxed text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Question Stem Text */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Question Text (Stem) *
                </label>
                <textarea
                  rows={3}
                  required
                  value={questionText}
                  onChange={e => setQuestionText(e.target.value)}
                  placeholder="Enter the full question stem. (E.g. If log₁₀(x) + log₁₀(x - 3) = 1, find x...)"
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Optional Diagram / Image URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Optional Diagram Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/diagram.png"
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800"
                />
              </div>

              {/* 4 Standard Options (A, B, C, D) & Correct Answer Picker */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Multiple Choice Options (Select Correct Key) *
                  </label>
                  <span className="text-xs text-slate-500">
                    Click radio button to mark correct answer
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(['A', 'B', 'C', 'D'] as OptionKey[]).map(key => (
                    <div
                      key={key}
                      className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                        correctAnswer === key ? 'bg-emerald-50/80 border-emerald-400' : 'bg-slate-50 border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        id={`opt-${key}`}
                        name="correctAnswer"
                        checked={correctAnswer === key}
                        onChange={() => setCorrectAnswer(key)}
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <label htmlFor={`opt-${key}`} className="w-6 font-bold text-sm text-slate-800 cursor-pointer">
                        {key}.
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={`Option ${key} text`}
                        value={options[key]}
                        onChange={e => setOptions({ ...options, [key]: e.target.value })}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Explanation / Working */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Detailed Explanation & Mathematical Working *
                </label>
                <textarea
                  rows={3}
                  required
                  value={explanation}
                  onChange={e => setExplanation(e.target.value)}
                  placeholder="Provide step-by-step mathematical working or grammatical concord rule explaining why the selected option is correct..."
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Question Approval Status (for admins & reviewers) */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-100 border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-800 uppercase">Question Bank Status</div>
                  <div className="text-[11px] text-slate-500">Only "Approved" questions appear in candidate practice tests</div>
                </div>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as QuestionStatus)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-800"
                >
                  <option value="approved">Approved (Live)</option>
                  <option value="pending">Pending Review</option>
                  <option value="draft">Draft</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 px-6 py-4 flex items-center justify-between border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer border border-slate-300"
          >
            Cancel
          </button>

          <button
            type="submit"
            form="question-form"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer hover:scale-102"
          >
            <Save className="w-4 h-4" />
            <span>{questionToEdit ? 'Save Changes' : 'Add to Question Bank'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
