import React, { useState } from 'react';
import { 
  Code2, 
  Terminal, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  Play, 
  Tag, 
  Search,
  Sparkles
} from 'lucide-react';

export default function SnippetManager({ 
  snippets, 
  onSaveSnippet, 
  onDeleteSnippet, 
  onRunSnippet, 
  hasActiveSession 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');
  const [copiedId, setCopiedId] = useState(null);

  // New Snippet Form Modal
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: 'General',
    command: '',
    description: ''
  });

  const categories = ['All', ...new Set(snippets.map(s => s.category || 'General'))];

  const filteredSnippets = snippets.filter(s => {
    const matchSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        s.command.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = selectedCat === 'All' || (s.category || 'General') === selectedCat;
    return matchSearch && matchCat;
  });

  const copyCommand = (id, command) => {
    navigator.clipboard.writeText(command);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.command) return;
    onSaveSnippet(formData);
    setFormData({ title: '', category: 'General', command: '', description: '' });
    setShowModal(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900/90 to-purple-950/40 p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Code2 className="w-6 h-6 text-purple-400" />
            <span>Command Snippet Library</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Save reusable bash commands and execute them instantly across your active SSH terminal tabs.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-purple-500/25 transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Snippet</span>
        </button>
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search commands or snippet title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/80"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto max-w-full">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                selectedCat === cat
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Snippet Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSnippets.map(snippet => (
          <div
            key={snippet.id}
            className="bg-slate-900/70 hover:bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-all flex flex-col justify-between shadow-lg"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/40">
                    {snippet.category || 'General'}
                  </span>
                  <h3 className="font-semibold text-slate-100 text-base mt-1.5">
                    {snippet.title}
                  </h3>
                </div>

                <button
                  onClick={() => onDeleteSnippet(snippet.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {snippet.description && (
                <p className="text-slate-400 text-xs mt-1">
                  {snippet.description}
                </p>
              )}

              {/* Code display block */}
              <div className="mt-3 bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-cyan-300 overflow-x-auto relative group">
                <code>{snippet.command}</code>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-end space-x-2">
              <button
                onClick={() => copyCommand(snippet.id, snippet.command)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium flex items-center space-x-1.5"
              >
                {copiedId === snippet.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy</span>
              </button>

              <button
                onClick={() => onRunSnippet(snippet.command)}
                disabled={!hasActiveSession}
                className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-md flex items-center space-x-1.5"
                title={hasActiveSession ? 'Execute in active SSH terminal tab' : 'No active SSH terminal tab'}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run in Terminal</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Snippet Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAddSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Add New Command Snippet</h3>
            
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Snippet Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Check Disk Space"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Category</label>
              <input
                type="text"
                placeholder="e.g. Docker, Monitoring, Nginx"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Bash Command / Script</label>
              <textarea
                required
                rows={3}
                placeholder="e.g. docker ps -a"
                value={formData.command}
                onChange={e => setFormData({ ...formData, command: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-cyan-300 font-mono focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Description (Optional)</label>
              <input
                type="text"
                placeholder="Short explanation of what this script does"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold"
              >
                Save Snippet
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
