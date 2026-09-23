import React from 'react';
import { 
  Terminal, 
  Server, 
  FolderGit2, 
  Code2, 
  Plus, 
  X, 
  Activity, 
  Layers,
  Settings,
  Globe
} from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  sessions, 
  activeSessionId, 
  setActiveSessionId, 
  closeSession,
  onOpenAddHost,
  onOpenQuickConnect,
  socketConnected 
}) {
  return (
    <header className="h-14 bg-slate-900/90 border-b border-slate-800/80 px-4 flex items-center justify-between backdrop-blur-md sticky top-0 z-30">
      {/* Left section: App Brand & Navigation */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => setActiveTab('hosts')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Terminal className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              TermiusWeb
            </span>
            <span className="block text-[10px] text-slate-400 font-mono -mt-1">
              v1.0 • SSH & SFTP Manager
            </span>
          </div>
        </div>

        {/* View Mode Tabs */}
        <nav className="flex items-center bg-slate-950/60 p-1 rounded-xl border border-slate-800/60 text-xs font-medium">
          <button
            onClick={() => setActiveTab('hosts')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'hosts'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Server Hosts</span>
          </button>

          <button
            onClick={() => setActiveTab('snippets')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'snippets'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Snippets</span>
          </button>
        </nav>
      </div>

      {/* Middle section: Active SSH Session Tabs */}
      <div className="flex-1 max-w-2xl mx-6 flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
        {sessions.map((sess) => {
          const isActive = activeTab === 'terminal' && activeSessionId === sess.id;
          return (
            <div
              key={sess.id}
              onClick={() => {
                setActiveSessionId(sess.id);
                setActiveTab('terminal');
              }}
              className={`group flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-mono cursor-pointer transition-all border ${
                isActive
                  ? 'bg-slate-800 text-cyan-400 border-cyan-500/40 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${sess.connected ? 'bg-emerald-400 animate-pulse-dot' : 'bg-amber-500'}`} />
              <span className="truncate max-w-[130px]">
                {sess.name || sess.host}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeSession(sess.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-700/60 rounded transition-all text-slate-400 hover:text-red-400"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Right section: Action Controls */}
      <div className="flex items-center space-x-2.5">
        <button
          onClick={onOpenQuickConnect}
          className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm"
        >
          <Globe className="w-3.5 h-3.5 text-blue-400" />
          <span>Quick SSH</span>
        </button>

        <button
          onClick={onOpenAddHost}
          className="flex items-center space-x-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shadow-md shadow-blue-500/20 active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Server</span>
        </button>

        {/* Backend Status Dot */}
        <div 
          className="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-950/80 rounded-lg border border-slate-800 text-[11px] text-slate-400"
          title={socketConnected ? 'Backend Server Online' : 'Backend Server Offline'}
        >
          <Activity className={`w-3.5 h-3.5 ${socketConnected ? 'text-emerald-400 animate-pulse' : 'text-rose-500'}`} />
          <span className="hidden sm:inline font-mono">{socketConnected ? 'Online' : 'Offline'}</span>
        </div>
      </div>
    </header>
  );
}
