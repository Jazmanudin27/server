import React, { useState, useEffect } from 'react';
import {
  GitPullRequest,
  RefreshCw,
  RotateCcw,
  Play,
  Zap,
  Plus,
  Trash2,
  Activity,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Terminal,
  Settings,
  X
} from 'lucide-react';

const DEFAULT_ACTIONS = [
  // Git Actions
  { id: 'git-pull', label: 'git pull', cmd: 'git pull', category: 'Git', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60 hover:bg-emerald-900/50' },
  { id: 'git-status', label: 'git status', cmd: 'git status', category: 'Git', color: 'text-emerald-300 bg-emerald-950/30 border-emerald-800/50 hover:bg-emerald-900/40' },
  { id: 'git-reset', label: 'git reset --hard', cmd: 'git reset --hard', category: 'Git', color: 'text-rose-400 bg-rose-950/40 border-rose-800/60 hover:bg-rose-900/50' },
  
  // PM2 Actions
  { id: 'pm2-restart', label: 'pm2 restart all', cmd: 'pm2 restart all', category: 'PM2', color: 'text-amber-400 bg-amber-950/40 border-amber-800/60 hover:bg-amber-900/50' },
  { id: 'pm2-status', label: 'pm2 status', cmd: 'pm2 status', category: 'PM2', color: 'text-amber-300 bg-amber-950/30 border-amber-800/50 hover:bg-amber-900/40' },
  { id: 'pm2-logs', label: 'pm2 logs', cmd: 'pm2 logs --lines 30', category: 'PM2', color: 'text-yellow-400 bg-yellow-950/30 border-yellow-800/50 hover:bg-yellow-900/40' },

  // Docker Actions
  { id: 'docker-ps', label: 'docker ps', cmd: 'docker ps', category: 'Docker', color: 'text-blue-400 bg-blue-950/40 border-blue-800/60 hover:bg-blue-900/50' },
  { id: 'docker-restart', label: 'docker restart', cmd: 'docker compose restart', category: 'Docker', color: 'text-cyan-400 bg-cyan-950/40 border-cyan-800/60 hover:bg-cyan-900/50' },

  // System & Web Server
  { id: 'nginx-restart', label: 'nginx restart', cmd: 'systemctl restart nginx', category: 'System', color: 'text-indigo-400 bg-indigo-950/40 border-indigo-800/60 hover:bg-indigo-900/50' },
  { id: 'df-h', label: 'df -h (Disk)', cmd: 'df -h', category: 'System', color: 'text-slate-300 bg-slate-800/60 border-slate-700/60 hover:bg-slate-700/60' },
  { id: 'free-m', label: 'free -m (RAM)', cmd: 'free -m', category: 'System', color: 'text-slate-300 bg-slate-800/60 border-slate-700/60 hover:bg-slate-700/60' },
  { id: 'htop', label: 'htop', cmd: 'htop', category: 'System', color: 'text-purple-400 bg-purple-950/40 border-purple-800/60 hover:bg-purple-900/50' }
];

export default function QuickActionsBar({
  onRunCommand,
  onOpenSystemMonitor,
  quickStats
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [customActions, setCustomActions] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newCmd, setNewCmd] = useState('');
  const [newCategory, setNewCategory] = useState('Custom');

  // Load custom actions from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('termius_custom_quick_actions');
      if (saved) {
        setCustomActions(JSON.parse(saved));
      }
    } catch (e) {}
  }, []);

  const handleAddCustom = (e) => {
    e.preventDefault();
    if (!newLabel.trim() || !newCmd.trim()) return;

    const newItem = {
      id: `custom-${Date.now()}`,
      label: newLabel.trim(),
      cmd: newCmd.trim(),
      category: newCategory.trim() || 'Custom',
      color: 'text-cyan-300 bg-cyan-950/40 border-cyan-800/60 hover:bg-cyan-900/50'
    };

    const updated = [...customActions, newItem];
    setCustomActions(updated);
    try {
      localStorage.setItem('termius_custom_quick_actions', JSON.stringify(updated));
    } catch (e) {}

    setNewLabel('');
    setNewCmd('');
    setShowAddModal(false);
  };

  const handleDeleteCustom = (id) => {
    const updated = customActions.filter(a => a.id !== id);
    setCustomActions(updated);
    try {
      localStorage.setItem('termius_custom_quick_actions', JSON.stringify(updated));
    } catch (e) {}
  };

  const allActions = [...DEFAULT_ACTIONS, ...customActions];

  return (
    <div className="bg-slate-900/95 border-b border-slate-800/90 text-xs backdrop-blur-md select-none transition-all">
      {/* Top Header of the Bar */}
      <div className="px-3 py-1.5 flex items-center justify-between border-b border-slate-800/40">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-slate-300 font-semibold text-[11px] tracking-wide uppercase">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Quick Actions</span>
          </div>

          {/* Quick Monitor Metrics Shortcut Button */}
          {onOpenSystemMonitor && (
            <button
              onClick={onOpenSystemMonitor}
              className="flex items-center space-x-2 px-2.5 py-0.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono transition-all text-slate-300 hover:text-cyan-400 group"
              title="Buka System Monitor Hardware (CPU, RAM, ROM)"
            >
              <Cpu className="w-3 h-3 text-cyan-400 group-hover:animate-pulse" />
              <span>System Monitor</span>
              {quickStats && (
                <div className="flex items-center space-x-1.5 ml-1 text-[10px]">
                  <span className="text-cyan-400">CPU {quickStats.cpu}%</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-indigo-400">RAM {quickStats.ram}%</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-emerald-400">ROM {quickStats.rom}%</span>
                </div>
              )}
            </button>
          )}
        </div>

        {/* Right Toggle controls */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
            title="Tambah Tombol Perintah Cepat Kustom"
          >
            <Plus className="w-3 h-3 text-cyan-400" />
            <span>+ Tombol</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            title={isExpanded ? 'Collapse Bar' : 'Expand Bar'}
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Button Row / Carousel */}
      {isExpanded && (
        <div className="px-3 py-2 flex items-center space-x-1.5 overflow-x-auto no-scrollbar font-mono text-[11px]">
          {allActions.map((act) => (
            <div key={act.id} className="relative group/btn flex-shrink-0">
              <button
                onClick={() => onRunCommand(act.cmd)}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border font-medium transition-all shadow-sm active:scale-95 ${act.color}`}
                title={`Ketik "${act.cmd}" ke terminal`}
              >
                <span>{act.label}</span>
              </button>

              {/* Delete button if custom */}
              {act.id.startsWith('custom-') && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCustom(act.id);
                  }}
                  className="absolute -top-1 -right-1 hidden group-hover/btn:flex w-4 h-4 bg-rose-600 hover:bg-rose-500 text-white rounded-full items-center justify-center text-[9px] shadow-sm"
                  title="Hapus tombol kustom"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Custom Button Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                <span>Tambah Tombol Cepat</span>
              </h4>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustom} className="space-y-3 font-sans">
              <div>
                <label className="block text-slate-400 text-xs mb-1">Nama Tombol (Label)</label>
                <input
                  type="text"
                  placeholder="Contoh: npm build, restart backend"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-1">Perintah Terminal (Command)</label>
                <input
                  type="text"
                  placeholder="Contoh: cd /var/www && git pull"
                  value={newCmd}
                  onChange={(e) => setNewCmd(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-xl text-xs shadow-md shadow-cyan-600/30"
                >
                  Simpan Tombol
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
