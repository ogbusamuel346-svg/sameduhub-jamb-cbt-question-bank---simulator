import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { StorageService } from '../services/storage.ts';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Download,
  Terminal,
  RefreshCw,
  Server,
  ShieldCheck,
  Zap
} from 'lucide-react';

export const NeonSyncModal: React.FC = () => {
  const { neonConfig, testNeonConnection, questions, showToast } = useApp();

  const [isTesting, setIsTesting] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'schema' | 'sql_seed'>('status');

  const schemaDdl = StorageService.generatePostgreSqlSchema();
  const sqlSeed = StorageService.exportQuestionsAsSql(questions);

  const handleTest = async () => {
    setIsTesting(true);
    await testNeonConnection();
    setIsTesting(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard!`, 'success');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-in fade-in">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-emerald-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30 mb-2">
            <Zap className="w-3.5 h-3.5" />
            NEON SERVERLESS POSTGRESQL HOSTING
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Neon Database, Auth & Storage</h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Persistent cloud storage for the SamEduHub Question Bank and Candidate CBT Test Sessions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTest}
            disabled={isTesting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? 'Pinging Neon...' : 'Test Connection'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('status')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'status'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Server className="w-4 h-4 text-emerald-400" />
          <span>Connection & Status</span>
        </button>

        <button
          onClick={() => setActiveTab('schema')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'schema'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Terminal className="w-4 h-4 text-blue-400" />
          <span>PostgreSQL Schema DDL</span>
        </button>

        <button
          onClick={() => setActiveTab('sql_seed')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'sql_seed'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Database className="w-4 h-4 text-orange-400" />
          <span>Question Bank SQL Inserts</span>
        </button>
      </div>

      {/* Tab 1: Connection & Status */}
      {activeTab === 'status' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
            <h3 className="font-bold text-base text-slate-900 mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Neon connection is server-managed
            </h3>

            <p className="text-sm text-slate-600 leading-relaxed mb-5">
              Database credentials stay on the server and are injected by Neon.
              This browser never accepts or stores a PostgreSQL password. Use
              <code className="mx-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-800">neon env pull</code>
              to configure the linked branch locally.
            </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="text-slate-400 font-semibold">Neon Host:</div>
                  <div className="font-mono text-slate-700 truncate">{neonConfig.host}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="text-slate-400 font-semibold">Database:</div>
                  <div className="font-mono text-slate-700">{neonConfig.databaseName}</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center gap-2 text-xs">
                  <span className={`w-3 h-3 rounded-full ${neonConfig.isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                  <span className="font-bold text-slate-700">
                    Status: {neonConfig.isConnected ? 'Connected & Active' : 'Offline / Unverified'}
                  </span>
                  {neonConfig.lastTestedAt && (
                    <span className="text-slate-400 text-[11px]">
                      (Last checked {new Date(neonConfig.lastTestedAt).toLocaleTimeString()})
                    </span>
                  )}
                </div>

                <span className="text-[11px] font-semibold text-slate-500">Auth and API requests use Neon</span>
              </div>
          </div>

          {/* Architecture Card */}
          <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200">
            <h4 className="font-bold text-sm text-slate-900 mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Production Ready Dual-Tier Architecture
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              SamEduHub uses a high-performance hybrid storage model. Instant local persistence and offline caching guarantee that candidates never lose an ongoing CBT test during network drops. All completed test records, questions, and syllabus structures synchronize directly with Neon PostgreSQL.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <strong className="block text-slate-800 mb-0.5">1. Zero Downtime</strong>
                <span className="text-slate-500">Local-first exam engine operates smoothly even without Internet connection.</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <strong className="block text-slate-800 mb-0.5">2. Neon Cloud Backup</strong>
                <span className="text-slate-500">Questions and test sessions are ready for Neon serverless ingestion.</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <strong className="block text-slate-800 mb-0.5">3. 100% Type-Safe</strong>
                <span className="text-slate-500">Strict schema validation ensures zero corrupt question records.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: PostgreSQL Schema DDL */}
      {activeTab === 'schema' && (
        <div className="bg-slate-950 rounded-3xl p-6 text-slate-200 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-sm text-white font-mono">schema.sql for Neon PostgreSQL</h3>
              <p className="text-xs text-slate-400">Run this in your Neon SQL Editor to create tables for users, questions, and test sessions.</p>
            </div>
            <button
              onClick={() => copyToClipboard(schemaDdl, 'PostgreSQL Schema')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy SQL</span>
            </button>
          </div>

          <pre className="p-4 bg-slate-900/90 rounded-2xl overflow-x-auto text-xs font-mono text-emerald-300 leading-relaxed max-h-[500px]">
            {schemaDdl}
          </pre>
        </div>
      )}

      {/* Tab 3: Question Bank SQL Inserts */}
      {activeTab === 'sql_seed' && (
        <div className="bg-slate-950 rounded-3xl p-6 text-slate-200 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-sm text-white font-mono">seed_questions.sql for Neon</h3>
              <p className="text-xs text-slate-400">
                Contains SQL INSERT queries for {questions.length} questions in the question bank.
              </p>
            </div>
            <button
              onClick={() => copyToClipboard(sqlSeed, 'SQL Inserts')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy SQL Inserts</span>
            </button>
          </div>

          <pre className="p-4 bg-slate-900/90 rounded-2xl overflow-x-auto text-xs font-mono text-amber-200 leading-relaxed max-h-[500px]">
            {sqlSeed}
          </pre>
        </div>
      )}
    </div>
  );
};
