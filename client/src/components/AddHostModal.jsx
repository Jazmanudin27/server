import React, { useState, useEffect } from 'react';
import { Server, X, Shield, Key, Eye, EyeOff, Sparkles, Check } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#64748b'];

export default function AddHostModal({ isOpen, onClose, onSave, hostToEdit }) {
  const [formData, setFormData] = useState({
    name: '',
    ip: '',
    port: 22,
    username: 'root',
    authType: 'password',
    password: '',
    privateKey: '',
    group: 'Production Servers',
    color: '#3b82f6',
    notes: ''
  });

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (hostToEdit) {
      setFormData({
        id: hostToEdit.id,
        name: hostToEdit.name || '',
        ip: hostToEdit.ip || hostToEdit.hostname || '',
        port: hostToEdit.port || 22,
        username: hostToEdit.username || 'root',
        authType: hostToEdit.authType || 'password',
        password: hostToEdit.password || '',
        privateKey: hostToEdit.privateKey || '',
        group: hostToEdit.group || 'General',
        color: hostToEdit.color || '#3b82f6',
        notes: hostToEdit.notes || ''
      });
    } else {
      setFormData({
        name: '',
        ip: '',
        port: 22,
        username: 'root',
        authType: 'password',
        password: '',
        privateKey: '',
        group: 'Production Servers',
        color: '#3b82f6',
        notes: ''
      });
    }
  }, [hostToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.ip) return;
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative">
        {/* Modal Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-200"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-5">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: formData.color }}
          >
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {hostToEdit ? 'Edit Server Profile' : 'Add New Server Host'}
            </h2>
            <p className="text-slate-400 text-xs">Save connection settings for quick 1-click SSH access.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Server Name & Group */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Server Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. My Hostinger VPS"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Group / Tag</label>
              <input
                type="text"
                placeholder="e.g. Production, VPS"
                value={formData.group}
                onChange={e => setFormData({ ...formData, group: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Host IP / Domain & Port */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">Host IP or Domain *</label>
              <input
                type="text"
                required
                placeholder="e.g. 31.97.109.165 or srv903065.hstgr.cloud"
                value={formData.ip}
                onChange={e => setFormData({ ...formData, ip: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Port</label>
              <input
                type="number"
                value={formData.port}
                onChange={e => setFormData({ ...formData, port: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">SSH Username</label>
            <input
              type="text"
              placeholder="root"
              value={formData.username}
              onChange={e => setFormData({ ...formData, username: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Auth Type Switcher */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Authentication Method</label>
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, authType: 'password' })}
                className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                  formData.authType === 'password'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Password
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, authType: 'key' })}
                className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                  formData.authType === 'key'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                SSH Private Key
              </button>
            </div>
          </div>

          {/* Auth Inputs */}
          {formData.authType === 'password' ? (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="SSH Password"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-10 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">SSH Private Key (OpenSSH RSA/Ed25519 format)</label>
              <textarea
                rows={3}
                placeholder="-----BEGIN OPENSSH PRIVATE KEY-----..."
                value={formData.privateKey}
                onChange={e => setFormData({ ...formData, privateKey: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-cyan-300 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          {/* Color theme picker */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Color Tag</label>
            <div className="flex items-center space-x-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: c })}
                  className="w-6 h-6 rounded-full border-2 border-slate-800 flex items-center justify-center transition-transform hover:scale-110"
                  style={{ backgroundColor: c }}
                >
                  {formData.color === c && <Check className="w-3 h-3 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20"
            >
              {hostToEdit ? 'Update Server' : 'Save Server'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
