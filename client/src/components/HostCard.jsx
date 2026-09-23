import React, { useState } from 'react';
import { 
  Server, 
  Terminal, 
  FolderGit2, 
  Play, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  Copy,
  MoreVertical,
  ExternalLink
} from 'lucide-react';

export default function HostCard({ host, onConnectSSH, onOpenSFTP, onEdit, onDelete, onTestConnection }) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: boolean, message: string }
  const [copied, setCopied] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await onTestConnection(host);
      setTestResult(res);
    } catch (err) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const copySSHCommand = (e) => {
    e.stopPropagation();
    const cmd = `ssh ${host.username || 'root'}@${host.ip || host.hostname} -p ${host.port || 22}`;
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative bg-slate-900/70 hover:bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-blue-900/10 flex flex-col justify-between">
      {/* Accent strip */}
      <div 
        className="absolute top-0 left-6 right-6 h-1 rounded-b-full opacity-75 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: host.color || '#3b82f6' }}
      />

      <div>
        {/* Header line: Title & Group */}
        <div className="flex items-start justify-between mb-3 mt-1">
          <div className="flex items-center space-x-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md"
              style={{ backgroundColor: `${host.color || '#3b82f6'}25`, color: host.color || '#3b82f6' }}
            >
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-base tracking-tight group-hover:text-blue-400 transition-colors">
                {host.name}
              </h3>
              <div className="flex items-center space-x-2 mt-0.5">
                <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md border border-slate-700/60">
                  {host.group || 'General'}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {host.username}@{host.ip || host.hostname}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => onEdit(host)}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              title="Edit Server"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(host.id)}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
              title="Delete Server"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Server Details Grid */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 my-3 space-y-2 text-xs font-mono">
          <div className="flex justify-between items-center text-slate-400">
            <span>Host / IP:</span>
            <span className="text-slate-200 select-all font-medium">{host.ip || host.hostname}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>Port:</span>
            <span className="text-slate-200">{host.port || 22}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>Auth Mode:</span>
            <span className="text-cyan-400 capitalize">{host.authType || 'Password'}</span>
          </div>
          {host.notes && (
            <div className="pt-1 text-[11px] text-slate-400 font-sans italic border-t border-slate-800/60">
              "{host.notes}"
            </div>
          )}
        </div>
      </div>

      {/* Test Result Indicator */}
      {testResult && (
        <div className={`mb-3 p-2 rounded-lg text-xs font-mono flex items-center space-x-2 ${
          testResult.success 
            ? 'bg-emerald-950/60 border border-emerald-800/80 text-emerald-300' 
            : 'bg-rose-950/60 border border-rose-800/80 text-rose-300'
        }`}>
          {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span className="truncate">{testResult.message || testResult.error}</span>
        </div>
      )}

      {/* Card Footer Actions */}
      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
        <button
          onClick={copySSHCommand}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-all flex items-center space-x-1"
          title="Copy SSH Command string"
        >
          {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={handleTest}
          disabled={testing}
          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-all flex items-center space-x-1.5 border border-slate-700/60 disabled:opacity-50"
        >
          {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" /> : <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />}
          <span>Test</span>
        </button>

        <button
          onClick={() => onOpenSFTP(host)}
          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-all flex items-center space-x-1.5 border border-slate-700/60"
        >
          <FolderGit2 className="w-3.5 h-3.5 text-indigo-400" />
          <span>SFTP</span>
        </button>

        <button
          onClick={() => onConnectSSH(host)}
          className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/30 transition-all flex items-center justify-center space-x-1.5 active:scale-95"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Connect</span>
        </button>
      </div>
    </div>
  );
}
