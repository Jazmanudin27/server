import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

import Navbar from './components/Navbar.jsx';
import HostList from './components/HostList.jsx';
import TerminalView from './components/TerminalView.jsx';
import SFTPExplorer from './components/SFTPExplorer.jsx';
import SnippetManager from './components/SnippetManager.jsx';
import AddHostModal from './components/AddHostModal.jsx';
import QuickConnectModal from './components/QuickConnectModal.jsx';

// Determine backend socket server URL
const SOCKET_URL = import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin;

export default function App() {
  const [socket, setSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);

  // Active view tab: 'hosts' | 'terminal' | 'sftp' | 'snippets'
  const [activeTab, setActiveTab] = useState('hosts');

  // Hosts & Snippets state
  const [hosts, setHosts] = useState([]);
  const [snippets, setSnippets] = useState([]);

  // SSH Terminal Sessions
  const [sessions, setSessions] = useState([]); // [{ id, name, host, username, hostId, config, connected }]
  const [activeSessionId, setActiveSessionId] = useState(null);

  // SFTP Target Session
  const [sftpSession, setSftpSession] = useState(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [hostToEdit, setHostToEdit] = useState(null);
  const [isQuickModalOpen, setIsQuickModalOpen] = useState(false);

  // Initialize Socket.io connection
  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10
    });

    newSocket.on('connect', () => {
      console.log('[Socket] Connected to backend');
      setSocketConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('[Socket] Disconnected from backend');
      setSocketConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Fetch hosts & snippets from API
  const fetchHosts = async () => {
    try {
      const res = await fetch('/api/hosts');
      if (res.ok) {
        const data = await res.json();
        setHosts(data);
      }
    } catch (err) {
      console.error('Failed to fetch hosts:', err);
    }
  };

  const fetchSnippets = async () => {
    try {
      const res = await fetch('/api/snippets');
      if (res.ok) {
        const data = await res.json();
        setSnippets(data);
      }
    } catch (err) {
      console.error('Failed to fetch snippets:', err);
    }
  };

  useEffect(() => {
    fetchHosts();
    fetchSnippets();
  }, []);

  // Start new SSH session for a host
  const handleConnectSSH = (host) => {
    const sessionId = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newSession = {
      id: sessionId,
      name: host.name || host.ip || host.hostname,
      host: host.ip || host.hostname,
      username: host.username || 'root',
      hostId: host.id,
      connected: true
    };

    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(sessionId);
    setActiveTab('terminal');
  };

  // Quick unsaved SSH connection
  const handleQuickConnect = (config) => {
    const sessionId = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newSession = {
      id: sessionId,
      name: `Quick (${config.username}@${config.ip})`,
      host: config.ip,
      username: config.username || 'root',
      config: config,
      connected: true
    };

    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(sessionId);
    setActiveTab('terminal');
  };

  // Open SFTP for a host or active session
  const handleOpenSFTP = (hostOrSession) => {
    // Check if there is an active SSH session matching this host
    let sessionToUse = null;

    if (hostOrSession.id && sessions.some(s => s.id === hostOrSession.id)) {
      sessionToUse = hostOrSession;
    } else {
      // Create session first or find existing
      const existing = sessions.find(s => s.hostId === hostOrSession.id);
      if (existing) {
        sessionToUse = existing;
      } else {
        const sessionId = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        sessionToUse = {
          id: sessionId,
          name: hostOrSession.name || hostOrSession.ip,
          host: hostOrSession.ip || hostOrSession.hostname,
          username: hostOrSession.username || 'root',
          hostId: hostOrSession.id,
          connected: true
        };
        setSessions(prev => [...prev, sessionToUse]);
        setActiveSessionId(sessionId);
      }
    }

    setSftpSession(sessionToUse);
    setActiveTab('sftp');
  };

  // Close session tab
  const handleCloseSession = (sessionId) => {
    if (socket) {
      socket.emit('ssh:disconnect', { sessionId });
    }
    const remaining = sessions.filter(s => s.id !== sessionId);
    setSessions(remaining);
    if (activeSessionId === sessionId) {
      if (remaining.length > 0) {
        setActiveSessionId(remaining[remaining.length - 1].id);
      } else {
        setActiveSessionId(null);
        setActiveTab('hosts');
      }
    }
  };

  // Save / Update host
  const handleSaveHost = async (hostData) => {
    try {
      const res = await fetch('/api/hosts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hostData)
      });
      if (res.ok) {
        fetchHosts();
      }
    } catch (err) {
      console.error('Error saving host:', err);
    }
  };

  // Delete host
  const handleDeleteHost = async (id) => {
    if (!window.confirm('Are you sure you want to delete this server profile?')) return;
    try {
      const res = await fetch(`/api/hosts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchHosts();
      }
    } catch (err) {
      console.error('Error deleting host:', err);
    }
  };

  // Test host connection API
  const handleTestConnection = async (host) => {
    const res = await fetch('/api/hosts/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ip: host.ip || host.hostname,
        port: host.port || 22,
        username: host.username || 'root',
        password: host.password,
        privateKey: host.privateKey
      })
    });
    return await res.json();
  };

  // Save / Delete snippet
  const handleSaveSnippet = async (snippetData) => {
    try {
      const res = await fetch('/api/snippets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snippetData)
      });
      if (res.ok) fetchSnippets();
    } catch (err) {
      console.error('Error saving snippet:', err);
    }
  };

  const handleDeleteSnippet = async (id) => {
    try {
      const res = await fetch(`/api/snippets/${id}`, { method: 'DELETE' });
      if (res.ok) fetchSnippets();
    } catch (err) {
      console.error('Error deleting snippet:', err);
    }
  };

  // Execute snippet in current active SSH tab
  const handleRunSnippet = (command) => {
    if (socket && activeSessionId) {
      socket.emit('ssh:input', { sessionId: activeSessionId, data: command + '\n' });
      setActiveTab('terminal');
    }
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sessions={sessions}
        activeSessionId={activeSessionId}
        setActiveSessionId={setActiveSessionId}
        closeSession={handleCloseSession}
        onOpenAddHost={() => {
          setHostToEdit(null);
          setIsAddModalOpen(true);
        }}
        onOpenQuickConnect={() => setIsQuickModalOpen(true)}
        socketConnected={socketConnected}
      />

      {/* Main Content Area depending on active tab */}
      <main className="flex-1 relative overflow-hidden">
        {activeTab === 'hosts' && (
          <div className="h-full overflow-y-auto">
            <HostList
              hosts={hosts}
              onConnectSSH={handleConnectSSH}
              onOpenSFTP={handleOpenSFTP}
              onEditHost={(host) => {
                setHostToEdit(host);
                setIsAddModalOpen(true);
              }}
              onDeleteHost={handleDeleteHost}
              onAddHost={() => {
                setHostToEdit(null);
                setIsAddModalOpen(true);
              }}
              onTestConnection={handleTestConnection}
            />
          </div>
        )}

        {activeTab === 'terminal' && (
          <div className="h-full w-full">
            {activeSession ? (
              <TerminalView
                session={activeSession}
                socket={socket}
                onOpenSFTP={handleOpenSFTP}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <p>No active SSH terminal tab selected.</p>
                <button
                  onClick={() => setActiveTab('hosts')}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold"
                >
                  Select Server Host
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'sftp' && (
          <div className="h-full w-full">
            {sftpSession || activeSession ? (
              <SFTPExplorer
                session={sftpSession || activeSession}
                socket={socket}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <p>Select a server host to open SFTP File Explorer.</p>
                <button
                  onClick={() => setActiveTab('hosts')}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold"
                >
                  Go to Server Hosts
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'snippets' && (
          <div className="h-full overflow-y-auto">
            <SnippetManager
              snippets={snippets}
              onSaveSnippet={handleSaveSnippet}
              onDeleteSnippet={handleDeleteSnippet}
              onRunSnippet={handleRunSnippet}
              hasActiveSession={!!activeSessionId}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      <AddHostModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveHost}
        hostToEdit={hostToEdit}
      />

      <QuickConnectModal
        isOpen={isQuickModalOpen}
        onClose={() => setIsQuickModalOpen(false)}
        onConnect={handleQuickConnect}
      />
    </div>
  );
}
