import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { 
  Terminal as TermIcon, 
  Trash2, 
  Maximize2, 
  Minimize2, 
  Palette, 
  FolderGit2, 
  RefreshCw,
  Zap,
  Sliders,
  AlertTriangle,
  CheckCircle,
  Copy
} from 'lucide-react';

const THEMES = {
  dracula: {
    name: 'Dracula',
    background: '#1e1e2e',
    foreground: '#f8f8f2',
    cursor: '#f8f8f2',
    black: '#21222c',
    red: '#ff5555',
    green: '#50fa7b',
    yellow: '#f1fa8c',
    blue: '#bd93f9',
    magenta: '#ff79c6',
    cyan: '#8be9fd',
    white: '#f8f8f2'
  },
  oneDark: {
    name: 'One Dark',
    background: '#1e222a',
    foreground: '#abb2bf',
    cursor: '#528bff',
    black: '#1e222a',
    red: '#e06c75',
    green: '#98c379',
    yellow: '#d19a66',
    blue: '#61afef',
    magenta: '#c678dd',
    cyan: '#56b6c2',
    white: '#abb2bf'
  },
  monokai: {
    name: 'Monokai',
    background: '#272822',
    foreground: '#f8f8f2',
    cursor: '#f8f8f0',
    black: '#272822',
    red: '#f92672',
    green: '#a6e22e',
    yellow: '#e6db74',
    blue: '#66d9ef',
    magenta: '#ae81ff',
    cyan: '#a6e22e',
    white: '#f8f8f2'
  },
  nord: {
    name: 'Nord',
    background: '#2e3440',
    foreground: '#d8dee9',
    cursor: '#d8dee9',
    black: '#3b4252',
    red: '#bf616a',
    green: '#a3be8c',
    yellow: '#ebcb8b',
    blue: '#81a1c1',
    magenta: '#b48ead',
    cyan: '#88c0d0',
    white: '#e5e9f0'
  }
};

export default function TerminalView({ session, socket, onOpenSFTP }) {
  const terminalRef = useRef(null);
  const xtermInstance = useRef(null);
  const fitAddonInstance = useRef(null);

  const [themeKey, setThemeKey] = useState('dracula');
  const [fontSize, setFontSize] = useState(14);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Connecting to SSH...');
  const [statusType, setStatusType] = useState('connecting'); // 'connecting' | 'connected' | 'error' | 'closed'

  useEffect(() => {
    if (!terminalRef.current || !socket) return;

    // Initialize XTerm Instance
    const term = new XTerm({
      fontFamily: '"Fira Code", monospace',
      fontSize: fontSize,
      cursorBlink: true,
      cursorStyle: 'block',
      theme: THEMES[themeKey],
      scrollback: 5000,
      convertEol: true
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermInstance.current = term;
    fitAddonInstance.current = fitAddon;

    // Send SSH Connect payload if not already connected
    const initialCols = term.cols || 80;
    const initialRows = term.rows || 24;

    socket.emit('ssh:connect', {
      sessionId: session.id,
      hostId: session.hostId,
      config: session.config,
      termCols: initialCols,
      termRows: initialRows
    });

    // Event Listeners from Socket.io
    const handleSshData = ({ sessionId, data }) => {
      if (sessionId === session.id) {
        term.write(data);
      }
    };

    const handleSshStatus = ({ sessionId, status, message }) => {
      if (sessionId === session.id) {
        setStatusType(status);
        setStatusMessage(message);
      }
    };

    const handleSshReady = ({ sessionId }) => {
      if (sessionId === session.id) {
        setStatusType('connected');
        setStatusMessage('SSH Session Active');
        term.focus();
      }
    };

    const handleSshError = ({ sessionId, error }) => {
      if (sessionId === session.id) {
        setStatusType('error');
        setStatusMessage(`SSH Error: ${error}`);
        term.writeln(`\r\n\x1b[31;1m[ERROR]: ${error}\x1b[0m\r\n`);
      }
    };

    const handleSshClosed = ({ sessionId, message }) => {
      if (sessionId === session.id) {
        setStatusType('closed');
        setStatusMessage(message || 'SSH Session Closed');
        term.writeln(`\r\n\x1b[33;1m[DISCONNECTED]: Connection closed.\x1b[0m\r\n`);
      }
    };

    socket.on('ssh:data', handleSshData);
    socket.on('ssh:status', handleSshStatus);
    socket.on('ssh:ready', handleSshReady);
    socket.on('ssh:error', handleSshError);
    socket.on('ssh:closed', handleSshClosed);

    // Terminal Data (Keyboard typing) -> Socket
    const onDataDisposable = term.onData((data) => {
      socket.emit('ssh:input', { sessionId: session.id, data });
    });

    // Window & Terminal Resize Handler
    const handleResize = () => {
      if (fitAddonInstance.current && xtermInstance.current) {
        try {
          fitAddonInstance.current.fit();
          const cols = xtermInstance.current.cols;
          const rows = xtermInstance.current.rows;
          socket.emit('ssh:resize', { sessionId: session.id, cols, rows });
        } catch (e) {
          // ignore fit error during tab switch
        }
      }
    };

    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(terminalRef.current);

    return () => {
      onDataDisposable.dispose();
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      socket.off('ssh:data', handleSshData);
      socket.off('ssh:status', handleSshStatus);
      socket.off('ssh:ready', handleSshReady);
      socket.off('ssh:error', handleSshError);
      socket.off('ssh:closed', handleSshClosed);
      term.dispose();
    };
  }, [session.id]);

  // Update theme dynamically
  useEffect(() => {
    if (xtermInstance.current) {
      xtermInstance.current.options.theme = THEMES[themeKey];
    }
  }, [themeKey]);

  // Update font size dynamically
  useEffect(() => {
    if (xtermInstance.current && fitAddonInstance.current) {
      xtermInstance.current.options.fontSize = fontSize;
      setTimeout(() => fitAddonInstance.current.fit(), 50);
    }
  }, [fontSize]);

  const sendSpecialKey = (keyString) => {
    if (socket) {
      socket.emit('ssh:input', { sessionId: session.id, data: keyString });
    }
  };

  const clearTerminal = () => {
    if (xtermInstance.current) {
      xtermInstance.current.clear();
    }
  };

  const reconnect = () => {
    if (socket && xtermInstance.current) {
      xtermInstance.current.clear();
      setStatusType('connecting');
      setStatusMessage('Reconnecting...');
      socket.emit('ssh:connect', {
        sessionId: session.id,
        hostId: session.hostId,
        config: session.config,
        termCols: xtermInstance.current.cols || 80,
        termRows: xtermInstance.current.rows || 24
      });
    }
  };

  return (
    <div className={`flex flex-col h-full bg-slate-950 ${isFullScreen ? 'fixed inset-0 z-50 p-2 bg-slate-950' : ''}`}>
      {/* Terminal Toolbar */}
      <div className="h-10 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between text-xs font-mono text-slate-300">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className={`w-2.5 h-2.5 rounded-full ${
              statusType === 'connected' ? 'bg-emerald-400 animate-pulse' :
              statusType === 'connecting' ? 'bg-amber-400 animate-pulse' :
              'bg-rose-500'
            }`} />
            <span className="font-semibold text-slate-200">{session.name || session.host}</span>
            <span className="text-slate-500">• {session.username}@{session.host}</span>
          </div>

          <span className="hidden md:inline-block px-2 py-0.5 rounded bg-slate-800 text-[11px] text-slate-400">
            {statusMessage}
          </span>
        </div>

        {/* Quick Toolbar Controls */}
        <div className="flex items-center space-x-2">
          {/* Quick Signal Buttons */}
          <div className="hidden lg:flex items-center space-x-1 border-r border-slate-800 pr-2">
            <button 
              onClick={() => sendSpecialKey('\x03')}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded text-[11px] font-bold"
              title="Send Ctrl + C (SIGINT)"
            >
              Ctrl+C
            </button>
            <button 
              onClick={() => sendSpecialKey('\x1a')}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded text-[11px] font-bold"
              title="Send Ctrl + Z (SIGTSTP)"
            >
              Ctrl+Z
            </button>
          </div>

          {/* Theme Selector */}
          <div className="flex items-center space-x-1">
            <Palette className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={themeKey}
              onChange={(e) => setThemeKey(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-300 rounded px-2 py-0.5 text-[11px] focus:outline-none"
            >
              {Object.keys(THEMES).map(k => (
                <option key={k} value={k}>{THEMES[k].name}</option>
              ))}
            </select>
          </div>

          {/* Font Size Selector */}
          <div className="hidden sm:flex items-center space-x-1">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 text-slate-300 rounded px-2 py-0.5 text-[11px] focus:outline-none"
            >
              <option value={12}>12px</option>
              <option value={14}>14px</option>
              <option value={16}>16px</option>
              <option value={18}>18px</option>
            </select>
          </div>

          <button
            onClick={() => onOpenSFTP(session)}
            className="p-1.5 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 rounded transition-colors"
            title="Open SFTP Browser for this session"
          >
            <FolderGit2 className="w-4 h-4" />
          </button>

          <button
            onClick={clearTerminal}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors"
            title="Clear Terminal Output"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={reconnect}
            className="p-1.5 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 rounded transition-colors"
            title="Reconnect Session"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Terminal Container */}
      <div 
        className="flex-1 w-full relative overflow-hidden" 
        style={{ backgroundColor: THEMES[themeKey].background }}
      >
        <div ref={terminalRef} className="h-full w-full" />
      </div>
    </div>
  );
}
