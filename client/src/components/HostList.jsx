import React, { useState } from 'react';
import HostCard from './HostCard.jsx';
import { Search, Server, Plus, Filter, LayoutGrid, List } from 'lucide-react';

export default function HostList({ 
  hosts, 
  onConnectSSH, 
  onOpenSFTP, 
  onEditHost, 
  onDeleteHost, 
  onAddHost,
  onTestConnection 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('All');

  const groups = ['All', ...new Set(hosts.map(h => h.group || 'General'))];

  const filteredHosts = hosts.filter(h => {
    const matchesSearch = 
      h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (h.ip && h.ip.includes(searchTerm)) ||
      (h.hostname && h.hostname.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (h.username && h.username.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesGroup = selectedGroup === 'All' || (h.group || 'General') === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40 p-6 rounded-3xl border border-slate-800/80 shadow-xl backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Server Connections & Hosts</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono font-normal">
              {hosts.length} saved
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Access your VPS, Cloud instances & dedicated servers directly from your browser.
          </p>
        </div>

        <button
          onClick={onAddHost}
          className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/25 transition-all active:scale-95 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Server</span>
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, IP address, hostname, or user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/50 transition-all"
          />
        </div>

        {/* Group Filter Chips */}
        <div className="flex items-center space-x-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
          {groups.map(group => (
            <button
              key={group}
              onClick={() => setSelectedGroup(group)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                selectedGroup === group
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              {group}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Servers */}
      {filteredHosts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredHosts.map(host => (
            <HostCard
              key={host.id}
              host={host}
              onConnectSSH={onConnectSSH}
              onOpenSFTP={onOpenSFTP}
              onEdit={onEditHost}
              onDelete={onDeleteHost}
              onTestConnection={onTestConnection}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-dashed border-slate-800/80">
          <Server className="w-12 h-12 text-slate-600 mx-auto mb-3 animate-bounce" />
          <h3 className="text-lg font-semibold text-slate-300">No servers found</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto mt-1">
            {searchTerm ? 'No server matches your search term.' : 'Click "Add New Server" above to save your first VPS / Server credentials.'}
          </p>
        </div>
      )}
    </div>
  );
}
