import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  FileText, 
  ChevronRight, 
  ArrowLeft, 
  RefreshCw, 
  Download, 
  Trash2, 
  Plus, 
  FileEdit, 
  Eye, 
  Save, 
  X, 
  Loader2, 
  Search,
  HardDrive,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

export default function SFTPExplorer({ session, socket }) {
  const [currentPath, setCurrentPath] = useState('/');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);

  // File Editor Modal State
  const [editingFile, setEditingFile] = useState(null); // { filePath, content }
  const [editContent, setEditContent] = useState('');
  const [savingFile, setSavingFile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Request directory contents
  const loadDirectory = (targetPath) => {
    if (!socket || !session) return;
    setLoading(true);
    setErrorMsg(null);
    socket.emit('sftp:list', { sessionId: session.id, remotePath: targetPath });
  };

  useEffect(() => {
    loadDirectory(currentPath);
  }, [currentPath, session.id]);

  useEffect(() => {
    if (!socket) return;

    const handleListRes = ({ sessionId, currentPath: resPath, items: resItems }) => {
      if (sessionId === session.id) {
        setItems(resItems);
        setCurrentPath(resPath);
        setLoading(false);
      }
    };

    const handleReadRes = ({ sessionId, filePath, content }) => {
      if (sessionId === session.id) {
        setEditingFile(filePath);
        setEditContent(content);
        setLoading(false);
      }
    };

    const handleWriteRes = ({ sessionId, filePath, success }) => {
      if (sessionId === session.id && success) {
        setSavingFile(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    };

    const handleRmRes = ({ sessionId, success }) => {
      if (sessionId === session.id && success) {
        loadDirectory(currentPath);
      }
    };

    const handleError = ({ sessionId, error }) => {
      if (sessionId === session.id) {
        setErrorMsg(error);
        setLoading(false);
      }
    };

    socket.on('sftp:list:res', handleListRes);
    socket.on('sftp:readfile:res', handleReadRes);
    socket.on('sftp:writefile:res', handleWriteRes);
    socket.on('sftp:rm:res', handleRmRes);
    socket.on('sftp:error', handleError);

    return () => {
      socket.off('sftp:list:res', handleListRes);
      socket.off('sftp:readfile:res', handleReadRes);
      socket.off('sftp:writefile:res', handleWriteRes);
      socket.off('sftp:rm:res', handleRmRes);
      socket.off('sftp:error', handleError);
    };
  }, [socket, session.id, currentPath]);

  const navigateUp = () => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const parent = '/' + parts.join('/');
    setCurrentPath(parent || '/');
  };

  const handleItemClick = (item) => {
    if (item.isDir) {
      const newPath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`;
      setCurrentPath(newPath);
    } else {
      // Read file
      const filePath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`;
      setLoading(true);
      socket.emit('sftp:readfile', { sessionId: session.id, filePath });
    }
  };

  const handleSaveFile = () => {
    if (!editingFile) return;
    setSavingFile(true);
    socket.emit('sftp:writefile', {
      sessionId: session.id,
      filePath: editingFile,
      content: editContent
    });
  };

  const handleDeleteItem = (item, e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete ${item.name}?`)) return;
    const itemPath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`;
    socket.emit('sftp:rm', { sessionId: session.id, filePath: itemPath, isDir: item.isDir });
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const filteredItems = items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // Breadcrumbs generator
  const pathParts = currentPath.split('/').filter(Boolean);

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200">
      {/* SFTP Top Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Breadcrumbs & Navigation */}
        <div className="flex items-center space-x-2 overflow-x-auto">
          <button
            onClick={navigateUp}
            disabled={currentPath === '/'}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg text-slate-300 transition-colors"
            title="Go Up Directory"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-1 font-mono text-xs bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300">
            <button onClick={() => setCurrentPath('/')} className="hover:text-blue-400 font-bold flex items-center space-x-1">
              <HardDrive className="w-3.5 h-3.5" />
              <span>root</span>
            </button>
            {pathParts.map((part, index) => {
              const subPath = '/' + pathParts.slice(0, index + 1).join('/');
              return (
                <React.Fragment key={subPath}>
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <button onClick={() => setCurrentPath(subPath)} className="hover:text-blue-400">
                    {part}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Filter files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500 w-44"
            />
          </div>

          <button
            onClick={() => loadDirectory(currentPath)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-cyan-400 transition-colors"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error alert if any */}
      {errorMsg && (
        <div className="bg-rose-950/80 border-b border-rose-800/80 p-3 text-xs text-rose-300 flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* File List Table */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
            <span className="text-xs font-mono">Fetching remote directory...</span>
          </div>
        ) : (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="p-3">Name</th>
                  <th className="p-3">Size</th>
                  <th className="p-3">Permissions</th>
                  <th className="p-3">Modified</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredItems.map(item => (
                  <tr
                    key={item.name}
                    onClick={() => handleItemClick(item)}
                    className="hover:bg-slate-800/60 cursor-pointer transition-colors group"
                  >
                    <td className="p-3 font-medium text-slate-200 flex items-center space-x-2.5">
                      {item.isDir ? (
                        <Folder className="w-4 h-4 text-amber-400 shrink-0 fill-amber-400/20" />
                      ) : (
                        <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                      )}
                      <span className="group-hover:text-blue-400 transition-colors truncate max-w-xs">{item.name}</span>
                    </td>
                    <td className="p-3 text-slate-400">{item.isDir ? '--' : formatBytes(item.size)}</td>
                    <td className="p-3 text-slate-400 font-mono text-[11px]">{item.permissions}</td>
                    <td className="p-3 text-slate-400 text-[11px]">{new Date(item.mtime).toLocaleString()}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        {!item.isDir && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleItemClick(item);
                            }}
                            className="p-1 hover:bg-slate-700 text-slate-400 hover:text-blue-400 rounded"
                            title="Edit File"
                          >
                            <FileEdit className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDeleteItem(item, e)}
                          className="p-1 hover:bg-rose-950 text-slate-400 hover:text-rose-400 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Built-in File Editor Modal */}
      {editingFile && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span className="font-mono text-xs font-semibold text-slate-200">{editingFile}</span>
              </div>

              <div className="flex items-center space-x-2">
                {saveSuccess && (
                  <span className="text-emerald-400 text-xs font-mono flex items-center space-x-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Saved!</span>
                  </span>
                )}

                <button
                  onClick={handleSaveFile}
                  disabled={savingFile}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-all"
                >
                  {savingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Save File</span>
                </button>

                <button
                  onClick={() => setEditingFile(null)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Code Editor Body */}
            <div className="flex-1 p-3 bg-slate-950">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full h-full bg-transparent text-slate-200 font-mono text-xs focus:outline-none resize-none"
                spellCheck={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
