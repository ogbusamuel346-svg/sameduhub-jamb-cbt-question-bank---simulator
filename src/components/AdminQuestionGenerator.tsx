import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { JAMB_SUBJECTS, JAMB_SYLLABUS_SOURCE_URL, SUBJECT_TOPICS } from '../data/subjects.ts';
import { GenerationDifficulty, OptionKey, Question, QuestionGenerationScope } from '../types/index.ts';
import { QuestionEditorModal } from './QuestionEditorModal.tsx';
import {
  AlertTriangle,
  Edit3,
  FileQuestion,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react';

interface AdminQuestionGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminQuestionGenerator: React.FC<AdminQuestionGeneratorProps> = ({ isOpen, onClose }) => {
  const {
    questions,
    generateQuestions,
  } = useApp();
  const [subjectId, setSubjectId] = useState('english');
  const [scope, setScope] = useState<QuestionGenerationScope>('whole_subject');
  const [topic, setTopic] = useState(SUBJECT_TOPICS.english?.[0] || '');
  const [difficulty, setDifficulty] = useState<GenerationDifficulty>('mixed');
  const [count, setCount] = useState(60);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedIds, setGeneratedIds] = useState<string[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  const availableTopics = SUBJECT_TOPICS[subjectId] || [];
  const generatedQuestions = useMemo(
    () => generatedIds.map(id => questions.find(question => question.id === id)).filter((question): question is Question => !!question),
    [generatedIds, questions],
  );

  const handleSubjectChange = (nextSubjectId: string) => {
    setSubjectId(nextSubjectId);
    setTopic(SUBJECT_TOPICS[nextSubjectId]?.[0] || '');
  };

  const handleGenerate = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsGenerating(true);
    const generatedQuestions = await generateQuestions({
      subjectId,
      scope,
      topic: scope === 'whole_subject' ? '' : topic,
      difficulty,
      count: Math.min(60, Math.max(1, Number(count) || 1)),
    });
    if (generatedQuestions.length > 0) setGeneratedIds(generatedQuestions.map(question => question.id));
    setIsGenerating(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-6xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[94vh]">
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 px-6 py-5 text-white flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-orange-500/20 text-orange-300 border border-orange-400/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold">Admin Question Generator</h2>
              <p className="text-xs text-slate-300 mt-1">Generate and publish up to 60 original JAMB-style practice questions across the complete subject syllabus.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10" aria-label="Close generator">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
            <div className="text-xs leading-relaxed">
              <strong className="block text-sm mb-1">Practice questions — automatically published</strong>
              Generated content is original practice material, not official JAMB questions and not endorsed by JAMB.
              Review or edit any item after generation if you find an issue.
              <a className="block mt-1 font-semibold underline" href={JAMB_SYLLABUS_SOURCE_URL} target="_blank" rel="noreferrer">
                JAMB IBASS syllabus reference
              </a>
            </div>
          </div>

          <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 rounded-2xl border border-slate-200 bg-slate-50">
            <label className="text-xs font-bold text-slate-700">
              Subject
              <select value={subjectId} onChange={event => handleSubjectChange(event.target.value)} className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm">
                {JAMB_SUBJECTS.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-700">
              Coverage
              <select value={scope} onChange={event => setScope(event.target.value as QuestionGenerationScope)} className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm">
                <option value="whole_subject">Whole subject syllabus</option>
                <option value="topic">Single syllabus topic</option>
              </select>
            </label>
            {scope === 'topic' ? (
              <label className="text-xs font-bold text-slate-700">
                Topic
                <select value={topic} onChange={event => setTopic(event.target.value)} className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm">
                  {availableTopics.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            ) : (
              <div className="text-xs font-bold text-slate-700">
                Syllabus coverage
                <div className="mt-1.5 min-h-[42px] flex items-center px-3 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-800 font-semibold">
                  All {availableTopics.length} catalog topics
                </div>
              </div>
            )}
            <label className="text-xs font-bold text-slate-700">
              Difficulty
              <select value={difficulty} onChange={event => setDifficulty(event.target.value as GenerationDifficulty)} className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm">
                <option value="mixed">Balanced JAMB mix</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
            <label className="text-xs font-bold text-slate-700">
              Number of questions (1–60)
              <input type="number" min={1} max={60} value={count} onChange={event => setCount(Math.min(60, Math.max(1, Number(event.target.value) || 1)))} className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm" />
            </label>
            <div className="md:col-span-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] text-slate-500">The batch is distributed across the selected subject topics and published immediately for candidate practice.</p>
              <button type="submit" disabled={isGenerating || (scope === 'topic' && !topic)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 disabled:opacity-60 text-white text-xs font-bold shadow-md">
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isGenerating ? 'Generating questions…' : 'Generate question batch'}
              </button>
            </div>
          </form>

          {generatedQuestions.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">Published question batch</h3>
                  <p className="text-xs text-slate-500">These questions are already available in candidate practice tests. You can edit them if needed.</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">{generatedQuestions.length} published</span>
                </div>
              </div>

              <div className="space-y-4">
                {generatedQuestions.map((question, index) => (
                  <article key={question.id} className={`rounded-2xl border p-4 space-y-3 ${question.status === 'approved' ? 'border-emerald-300 bg-emerald-50/30' : question.status === 'rejected' ? 'border-red-200 bg-red-50/30' : 'border-orange-200 bg-white'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-[11px] font-bold">
                        <span className="w-6 h-6 rounded-lg bg-indigo-700 text-white flex items-center justify-center">{index + 1}</span>
                        <span className="px-2 py-1 rounded bg-indigo-100 text-indigo-800">{JAMB_SUBJECTS.find(subject => subject.id === question.subjectId)?.name}</span>
                        <span className="px-2 py-1 rounded bg-slate-100 text-slate-700">{question.topic}</span>
                        <span className="px-2 py-1 rounded bg-amber-100 text-amber-800 capitalize">{question.difficulty}</span>
                        <span className="px-2 py-1 rounded bg-emerald-500 text-white uppercase">Practice question</span>
                      </div>
                      <span className={`text-[10px] font-extrabold uppercase ${question.status === 'approved' ? 'text-emerald-700' : question.status === 'rejected' ? 'text-red-700' : 'text-orange-700'}`}>{question.status}</span>
                    </div>

                    {question.passage && <div className="text-xs text-slate-600 bg-blue-50 rounded-xl p-3 border border-blue-100"><strong>Passage:</strong> {question.passage}</div>}
                    <h4 className="text-sm font-bold text-slate-900 leading-relaxed">{question.questionText}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(['A', 'B', 'C', 'D'] as OptionKey[]).map(key => (
                        <div key={key} className={`p-2.5 rounded-xl border text-xs flex gap-2 ${key === question.correctAnswer ? 'border-emerald-400 bg-emerald-50 text-emerald-950 font-semibold' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                          <span className="font-extrabold">{key}.</span><span>{question.options[key]}</span>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700"><strong>Explanation:</strong> {question.explanation}</div>

                    <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-slate-100">
                      <button onClick={() => setEditingQuestion(question)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"><Edit3 className="w-3.5 h-3.5" /> Edit</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {generatedQuestions.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
              <FileQuestion className="w-9 h-9 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold">Choose a subject and generate a full-syllabus practice batch.</p>
              <p className="text-xs mt-1">Generated questions are published immediately for candidate practice.</p>
            </div>
          )}
        </div>

        <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex justify-end">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300">Close</button>
        </div>
      </div>

      <QuestionEditorModal isOpen={!!editingQuestion} onClose={() => setEditingQuestion(null)} questionToEdit={editingQuestion} />
    </div>
  );
};
