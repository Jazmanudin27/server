import React, { useState, useEffect } from 'react';
import {
  Cpu,
  HardDrive,
  Activity,
  Server,
  RefreshCw,
  X,
  Clock,
  Layers,
  Terminal,
  Play,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Box,
  Pause,
  ArrowUpRight
} from 'lucide-react';

export default function SystemMonitorModal({
  isOpen,
  onClose,
  host,
  session,
  socket,
  onRunCommandInTerminal
}) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(4); // seconds
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'processes' | 'disks' | 'services'
  const [executingCmd, setExecutingCmd] = useState(null);
  const [cmdOutput, setCmdOutput] = useState(null);

  const targetHostId = host?.id || session?.hostId;
  const targetSessionId = session?.id;
  const hostDisplayName = host?.name || session?.name || host?.ip || session?.host || 'Server';
  const hostIp = host?.ip || host?.hostname || session?.host || '';

  // Fetch Stats Logic
  const fetchStats = () => {
    if (!isOpen) return;
    setError(null);

    // If socket is available, emit event
    if (socket && (targetSessionId || targetHostId)) {
      setLoading(prev => (stats ? false : true));
      socket.emit('sys:stats:fetch', {
        sessionId: targetSessionId,
        hostId: targetHostId
      });
      return;
    }

    // Fallback to REST API
    if (targetHostId) {
      setLoading(prev => (stats ? false : true));
      fetch(`/api/hosts/${targetHostId}/stats`)
        .then(res => res.json())
        .then(data => {
          setLoading(false);
          if (data.success && data.stats) {
            setStats(data.stats);
          } else {
            setError(data.error || 'Failed to fetch server metrics');
          }
        })
        .catch(err => {
          setLoading(false);
          setError(err.message);
        });
    }
  };

  // Socket listener
  useEffect(() => {
    if (!socket || !isOpen) return;

    const handleStatsData = ({ sessionId, hostId, stats: newStats }) => {
      if ((targetSessionId && sessionId === targetSessionId) || (targetHostId && hostId === targetHostId)) {
        setStats(newStats);
        setLoading(false);
        setError(null);
      }
    };

    const handleStatsError = ({ sessionId, hostId, error: err }) => {
      if ((targetSessionId && sessionId === targetSessionId) || (targetHostId && hostId === targetHostId)) {
        setError(err);
        setLoading(false);
      }
    };

    socket.on('sys:stats:data', handleStatsData);
    socket.on('sys:stats:error', handleStatsError);

    return () => {
      socket.off('sys:stats:data', handleStatsData);
      socket.off('sys:stats:error', handleStatsError);
    };
  }, [socket, isOpen, targetSessionId, targetHostId]);

  // Initial fetch and auto-refresh timer
  useEffect(() => {
    if (!isOpen) {
      setStats(null);
      setError(null);
      return;
    }

    fetchStats();

    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchStats();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [isOpen, autoRefresh, refreshInterval, targetSessionId, targetHostId]);

  if (!isOpen) return null;

  // Formatting helpers
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getPercentColor = (percent) => {
    if (percent >= 85) return 'text-rose-400 bg-rose-500/20 border-rose-500/40';
    if (percent >= 65) return 'text-amber-400 bg-amber-500/20 border-amber-500/40';
    return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40';
  };

  const getProgressBarColor = (percent) => {
    if (percent >= 85) return 'bg-gradient-to-r from-rose-500 to-red-600';
    if (percent >= 65) return 'bg-gradient-to-r from-amber-400 to-orange-500';
    return 'bg-gradient-to-r from-emerald-400 to-cyan-500';
  };

  // Run Quick Command directly from Monitor
  const handleQuickRun = async (cmd) => {
    if (onRunCommandInTerminal && targetSessionId) {
      onRunCommandInTerminal(cmd);
      onClose();
      return;
    }

    setExecutingCmd(cmd);
    setCmdOutput('Executing command...');
    try {
      const res = await fetch(`/api/hosts/${targetHostId}/exec`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd })
      });
      const data = await res.json();
      setCmdOutput(data.stdout || data.stderr || (data.success ? 'Command executed successfully.' : data.error));
    } catch (err) {
      setCmdOutput(`Error: ${err.message}`);
    } finally {
      setExecutingCmd(null);
    }
  };

  const cpuUsage = stats?.cpu?.usage ?? 0;
  const ramUsage = stats?.memory?.percent ?? 0;
  const diskUsage = stats?.disk?.root?.percent ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-slate-100">{hostDisplayName}</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-800/60 text-cyan-400 font-mono">
                  {hostIp}
                </span>
                {stats && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 font-medium">
                    Online
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {stats?.os || 'Linux System'} • Kernel {stats?.kernel || '-'} • Uptime: {stats?.uptime || 'Checking...'}
              </p>
            </div>
          </div>

          {/* Top Actions: Refresh & Close */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                autoRefresh
                  ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Live Auto-Refresh"
            >
              {autoRefresh ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span>Live ({refreshInterval}s)</span>
                </>
              ) : (
                <>
                  <Pause className="w-3 h-3" />
                  <span>Paused</span>
                </>
              )}
            </button>

            <button
              onClick={fetchStats}
              disabled={loading}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-all"
              title="Refresh Metrics Now"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-6 py-2 border-b border-slate-800/60 bg-slate-900/60 flex items-center justify-between text-xs">
          <div className="flex space-x-2">
            {[
              { id: 'overview', label: 'Ringkasan Hardware', icon: Activity },
              { id: 'disks', label: 'ROM / Storage Detail', icon: HardDrive },
              { id: 'processes', label: 'Top Processes', icon: Layers },
              { id: 'quick', label: 'Perintah Cepat', icon: Zap }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl font-medium transition-all ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {stats?.timestamp && (
            <span className="text-[11px] text-slate-500 font-mono">
              Update: {new Date(stats.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/60 flex items-start space-x-3 text-rose-300 text-xs">
              <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-sm">Gagal Mengambil Metrik Server</span>
                <span>{error}</span>
                <p className="mt-1 text-rose-400/80">Pastikan server dapat dihubungi melalui SSH dan credential valid.</p>
              </div>
            </div>
          )}

          {loading && !stats && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
              <p className="text-sm font-mono">Mengumpulkan metrik CPU, RAM, ROM, dan Proses dari server...</p>
            </div>
          )}

          {stats && (
            <>
              {/* Top 3 Core Metric Cards: CPU, RAM, ROM */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 1. CPU Card */}
                <div className="bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/40 rounded-2xl p-5 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">CPU Usage</span>
                    </div>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full border font-mono font-bold ${getPercentColor(cpuUsage)}`}>
                      {cpuUsage}%
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="w-full bg-slate-800/80 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${getProgressBarColor(cpuUsage)}`}
                        style={{ width: `${Math.min(100, Math.max(0, cpuUsage))}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                      <span>Cores: <strong className="text-slate-200">{stats.cpu.cores} vCPU</strong></span>
                      <span>Load: <strong className="text-slate-200">{stats.cpu.loadAvg?.join(', ') || '-'}</strong></span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate font-mono" title={stats.cpu.model}>
                      {stats.cpu.model}
                    </p>
                  </div>
                </div>

                {/* 2. RAM Card */}
                <div className="bg-slate-950/60 border border-slate-800/80 hover:border-indigo-500/40 rounded-2xl p-5 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                        <Activity className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">RAM / Memory</span>
                    </div>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full border font-mono font-bold ${getPercentColor(ramUsage)}`}>
                      {ramUsage}%
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="w-full bg-slate-800/80 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${getProgressBarColor(ramUsage)}`}
                        style={{ width: `${Math.min(100, Math.max(0, ramUsage))}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                      <span>Terpakai: <strong className="text-slate-200">{formatBytes(stats.memory.used)}</strong></span>
                      <span>Total: <strong className="text-slate-200">{formatBytes(stats.memory.total)}</strong></span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                      <span>Free: {formatBytes(stats.memory.free)}</span>
                      <span>Avail: {formatBytes(stats.memory.available)}</span>
                    </div>
                  </div>
                </div>

                {/* 3. ROM / Disk Storage Card */}
                <div className="bg-slate-950/60 border border-slate-800/80 hover:border-emerald-500/40 rounded-2xl p-5 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                        <HardDrive className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">ROM / Storage (Root)</span>
                    </div>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full border font-mono font-bold ${getPercentColor(diskUsage)}`}>
                      {diskUsage}%
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="w-full bg-slate-800/80 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${getProgressBarColor(diskUsage)}`}
                        style={{ width: `${Math.min(100, Math.max(0, diskUsage))}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                      <span>Terpakai: <strong className="text-slate-200">{formatBytes(stats.disk.root.used)}</strong></span>
                      <span>Total: <strong className="text-slate-200">{formatBytes(stats.disk.root.size)}</strong></span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                      <span>Tersedia: {formatBytes(stats.disk.root.avail)}</span>
                      <span>Mount: {stats.disk.root.mount}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* View Switch Content */}

              {/* 1. Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  {/* System & Runtime Specs */}
                  <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center space-x-2">
                      <Server className="w-4 h-4 text-cyan-400" />
                      <span>Informasi Spesifikasi Sistem</span>
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                        <span className="text-slate-500 block text-[11px]">Operating System</span>
                        <span className="font-semibold text-slate-200">{stats.os}</span>
                      </div>
                      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                        <span className="text-slate-500 block text-[11px]">Architecture & Kernel</span>
                        <span className="font-semibold text-slate-200">{stats.arch} • {stats.kernel}</span>
                      </div>
                      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                        <span className="text-slate-500 block text-[11px]">Server Hostname</span>
                        <span className="font-semibold text-slate-200">{stats.hostname}</span>
                      </div>
                      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                        <span className="text-slate-500 block text-[11px]">Uptime</span>
                        <span className="font-semibold text-slate-200">{stats.uptime}</span>
                      </div>
                    </div>
                  </div>

                  {/* PM2 & Docker Services status */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* PM2 Section */}
                    <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Zap className="w-4 h-4 text-amber-400" />
                          <h4 className="text-xs font-bold text-slate-200">PM2 Process Manager</h4>
                        </div>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full ${stats.pm2.installed ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50' : 'bg-slate-800 text-slate-400'}`}>
                          {stats.pm2.installed ? `${stats.pm2.apps.length} Apps Active` : 'Not Installed'}
                        </span>
                      </div>
                      {stats.pm2.installed && stats.pm2.apps.length > 0 ? (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto font-mono text-xs">
                          {stats.pm2.apps.map((app, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-slate-900/70 p-2 rounded-xl border border-slate-800/70">
                              <div className="flex items-center space-x-2">
                                <span className={`w-2 h-2 rounded-full ${app.status === 'online' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                                <span className="font-semibold text-slate-200">{app.name}</span>
                              </div>
                              <div className="flex items-center space-x-3 text-slate-400 text-[11px]">
                                <span>CPU: {app.cpu}%</span>
                                <span>RAM: {formatBytes(app.memory)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">Tidak ada aplikasi PM2 yang sedang berjalan.</p>
                      )}
                    </div>

                    {/* Docker Section */}
                    <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Box className="w-4 h-4 text-blue-400" />
                          <h4 className="text-xs font-bold text-slate-200">Docker Containers</h4>
                        </div>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full ${stats.docker.installed ? 'bg-blue-950 text-blue-400 border border-blue-800/50' : 'bg-slate-800 text-slate-400'}`}>
                          {stats.docker.installed ? `${stats.docker.containers.length} Containers` : 'Not Installed'}
                        </span>
                      </div>
                      {stats.docker.installed && stats.docker.containers.length > 0 ? (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto font-mono text-xs">
                          {stats.docker.containers.map((c, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-slate-900/70 p-2 rounded-xl border border-slate-800/70">
                              <div className="flex items-center space-x-2 truncate">
                                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                                <span className="font-semibold text-slate-200 truncate">{c.name}</span>
                              </div>
                              <span className="text-[11px] text-slate-400 truncate max-w-[150px]">{c.status}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">Tidak ada container Docker yang aktif saat ini.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Disks & Storage Tab */}
              {activeTab === 'disks' && (
                <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center space-x-2">
                    <HardDrive className="w-4 h-4 text-emerald-400" />
                    <span>Daftar Partisi & Mount Disk (ROM)</span>
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="p-3">Filesystem</th>
                          <th className="p-3">Mount Point</th>
                          <th className="p-3">Total Size</th>
                          <th className="p-3">Used</th>
                          <th className="p-3">Available</th>
                          <th className="p-3">Usage %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {stats.disk.mounts.map((d, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/30">
                            <td className="p-3 text-slate-300 font-semibold">{d.filesystem}</td>
                            <td className="p-3 text-cyan-400">{d.mount}</td>
                            <td className="p-3 text-slate-300">{formatBytes(d.size)}</td>
                            <td className="p-3 text-slate-300">{formatBytes(d.used)}</td>
                            <td className="p-3 text-emerald-400">{formatBytes(d.avail)}</td>
                            <td className="p-3">
                              <div className="flex items-center space-x-2">
                                <div className="w-24 bg-slate-800 rounded-full h-2 overflow-hidden">
                                  <div
                                    className={`h-full ${getProgressBarColor(d.percent)}`}
                                    style={{ width: `${Math.min(100, d.percent)}%` }}
                                  />
                                </div>
                                <span className={`text-[11px] font-bold ${getPercentColor(d.percent).split(' ')[0]}`}>
                                  {d.percent}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 3. Top Processes Tab */}
              {activeTab === 'processes' && (
                <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>Top Running Processes (Highest CPU & Memory)</span>
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="p-3">PID</th>
                          <th className="p-3">User</th>
                          <th className="p-3">CPU %</th>
                          <th className="p-3">Mem %</th>
                          <th className="p-3">Command</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {stats.processes.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/30">
                            <td className="p-3 text-slate-400">{p.pid}</td>
                            <td className="p-3 text-slate-300">{p.user}</td>
                            <td className="p-3 text-cyan-400 font-semibold">{p.cpu}%</td>
                            <td className="p-3 text-indigo-400 font-semibold">{p.mem}%</td>
                            <td className="p-3 text-slate-200 truncate max-w-xs" title={p.name}>{p.name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 4. Quick Actions Tab inside Monitor */}
              {activeTab === 'quick' && (
                <div className="space-y-4">
                  <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span>Jalankan Perintah Populer (Git, PM2, Docker, Service)</span>
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {[
                        { label: 'Git Pull', cmd: 'git pull', cat: 'Git', color: 'hover:border-emerald-500/50 text-emerald-400' },
                        { label: 'Git Status', cmd: 'git status', cat: 'Git', color: 'hover:border-emerald-500/50 text-emerald-300' },
                        { label: 'Git Reset Hard', cmd: 'git reset --hard', cat: 'Git', color: 'hover:border-rose-500/50 text-rose-400' },
                        { label: 'PM2 Restart All', cmd: 'pm2 restart all', cat: 'PM2', color: 'hover:border-amber-500/50 text-amber-400' },
                        { label: 'PM2 Status / List', cmd: 'pm2 status', cat: 'PM2', color: 'hover:border-amber-500/50 text-amber-300' },
                        { label: 'PM2 Logs (50 lines)', cmd: 'pm2 logs --lines 50', cat: 'PM2', color: 'hover:border-amber-500/50 text-amber-300' },
                        { label: 'Docker PS', cmd: 'docker ps', cat: 'Docker', color: 'hover:border-blue-500/50 text-blue-400' },
                        { label: 'Docker Compose Restart', cmd: 'docker compose restart', cat: 'Docker', color: 'hover:border-blue-500/50 text-blue-300' },
                        { label: 'Restart Nginx', cmd: 'systemctl restart nginx', cat: 'System', color: 'hover:border-cyan-500/50 text-cyan-400' },
                        { label: 'Disk Space (df -h)', cmd: 'df -h', cat: 'System', color: 'hover:border-slate-500 text-slate-300' },
                        { label: 'Memory Free (free -m)', cmd: 'free -m', cat: 'System', color: 'hover:border-slate-500 text-slate-300' }
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleQuickRun(item.cmd)}
                          disabled={executingCmd === item.cmd}
                          className={`flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-left transition-all ${item.color} group`}
                        >
                          <div>
                            <span className="text-xs font-semibold block text-slate-200">{item.label}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{item.cmd}</span>
                          </div>
                          <Play className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {cmdOutput && (
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-xs">
                      <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                        <span>Command Output:</span>
                        <button onClick={() => setCmdOutput(null)} className="hover:text-white">Clear</button>
                      </div>
                      <pre className="text-slate-200 whitespace-pre-wrap max-h-60 overflow-y-auto">{cmdOutput}</pre>
                    </div>
                  )}
                </div>
              )}

            </>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>Real-time Host Telemetry via SSH Agent</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
