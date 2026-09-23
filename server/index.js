import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { Client as SSHClient } from 'ssh2';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  getHosts,
  getHostById,
  saveHost,
  deleteHost,
  getSnippets,
  saveSnippet,
  deleteSnippet
} from './storage.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Active SSH connections map: sessionId -> { client, stream, sftp }
const activeSessions = new Map();

// REST API Endpoints

// Get all hosts (passwords masked)
app.get('/api/hosts', (req, res) => {
  const hosts = getHosts(false);
  res.json(hosts);
});

// Save / Update host
app.post('/api/hosts', (req, res) => {
  try {
    const saved = saveHost(req.body);
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete host
app.delete('/api/hosts/:id', (req, res) => {
  try {
    deleteHost(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Quick test SSH connection without saving
app.post('/api/hosts/test', (req, res) => {
  const { ip, port, username, password, privateKey } = req.body;
  const conn = new SSHClient();

  let responded = false;
  const timeout = setTimeout(() => {
    if (!responded) {
      responded = true;
      conn.end();
      res.status(408).json({ success: false, error: 'Connection timeout (10s)' });
    }
  }, 10000);

  conn.on('ready', () => {
    if (!responded) {
      responded = true;
      clearTimeout(timeout);
      conn.end();
      res.json({ success: true, message: 'SSH Connection Successful!' });
    }
  });

  conn.on('error', (err) => {
    if (!responded) {
      responded = true;
      clearTimeout(timeout);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  try {
    const sshConfig = {
      host: ip,
      port: parseInt(port || 22),
      username: username || 'root',
      readyTimeout: 10000
    };
    if (password) sshConfig.password = password;
    if (privateKey) sshConfig.privateKey = privateKey;
    conn.connect(sshConfig);
  } catch (err) {
    if (!responded) {
      responded = true;
      clearTimeout(timeout);
      res.status(400).json({ success: false, error: err.message });
    }
  }
});

// Snippets API
app.get('/api/snippets', (req, res) => {
  res.json(getSnippets());
});

app.post('/api/snippets', (req, res) => {
  try {
    const saved = saveSnippet(req.body);
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/snippets/:id', (req, res) => {
  try {
    deleteSnippet(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend build if exists (for unified production server)
const clientBuildPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientBuildPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }
  res.sendFile(path.join(clientBuildPath, 'index.html'), (err) => {
    if (err) next();
  });
});

// WebSocket Handling for Realtime SSH Terminal & SFTP
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Initiate SSH Connection
  socket.on('ssh:connect', ({ sessionId, hostId, config, termCols = 80, termRows = 24 }) => {
    let sshParams = {};

    if (hostId) {
      const savedHost = getHostById(hostId, true);
      if (!savedHost) {
        socket.emit('ssh:error', { sessionId, error: 'Host configuration not found' });
        return;
      }
      sshParams = {
        host: savedHost.ip || savedHost.hostname,
        port: parseInt(savedHost.port || 22),
        username: savedHost.username || 'root',
        password: savedHost.password,
        privateKey: savedHost.privateKey
      };
    } else if (config) {
      sshParams = {
        host: config.ip || config.hostname,
        port: parseInt(config.port || 22),
        username: config.username || 'root',
        password: config.password,
        privateKey: config.privateKey
      };
    }

    if (!sshParams.host) {
      socket.emit('ssh:error', { sessionId, error: 'Target IP/Host is required' });
      return;
    }

    const conn = new SSHClient();

    conn.on('ready', () => {
      socket.emit('ssh:status', { sessionId, status: 'connected', message: 'SSH Ready. Opening PTY shell...' });

      // Request Interactive Shell PTY
      conn.shell({ term: 'xterm-256color', cols: termCols, rows: termRows }, (err, stream) => {
        if (err) {
          socket.emit('ssh:error', { sessionId, error: `Shell error: ${err.message}` });
          conn.end();
          return;
        }

        // Store active session
        activeSessions.set(sessionId, { client: conn, stream, hostInfo: sshParams });

        socket.emit('ssh:ready', { sessionId });

        // Forward incoming terminal output to browser
        stream.on('data', (data) => {
          socket.emit('ssh:data', { sessionId, data: data.toString('utf-8') });
        });

        stream.on('close', () => {
          socket.emit('ssh:closed', { sessionId, message: 'SSH Stream closed by remote server' });
          conn.end();
          activeSessions.delete(sessionId);
        });
      });
    });

    conn.on('error', (err) => {
      console.error(`[SSH Error ${sessionId}]:`, err.message);
      socket.emit('ssh:error', { sessionId, error: err.message });
      activeSessions.delete(sessionId);
    });

    conn.on('end', () => {
      socket.emit('ssh:status', { sessionId, status: 'disconnected', message: 'SSH connection ended' });
      activeSessions.delete(sessionId);
    });

    try {
      socket.emit('ssh:status', { sessionId, status: 'connecting', message: `Connecting to ${sshParams.username}@${sshParams.host}:${sshParams.port}...` });
      conn.connect({
        ...sshParams,
        readyTimeout: 20000,
        keepaliveInterval: 10000
      });
    } catch (err) {
      socket.emit('ssh:error', { sessionId, error: err.message });
    }
  });

  // Handle Terminal User Input (Keyboard typing, copy paste)
  socket.on('ssh:input', ({ sessionId, data }) => {
    const sess = activeSessions.get(sessionId);
    if (sess && sess.stream) {
      sess.stream.write(data);
    }
  });

  // Handle Terminal Resize
  socket.on('ssh:resize', ({ sessionId, cols, rows }) => {
    const sess = activeSessions.get(sessionId);
    if (sess && sess.stream && cols > 0 && rows > 0) {
      sess.stream.setWindow(rows, cols, 0, 0);
    }
  });

  // Handle Explicit Session Disconnect
  socket.on('ssh:disconnect', ({ sessionId }) => {
    const sess = activeSessions.get(sessionId);
    if (sess) {
      if (sess.stream) sess.stream.end();
      if (sess.client) sess.client.end();
      activeSessions.delete(sessionId);
    }
  });

  // SFTP Operations via WebSocket
  socket.on('sftp:list', ({ sessionId, remotePath = '/' }) => {
    const sess = activeSessions.get(sessionId);
    if (!sess || !sess.client) {
      socket.emit('sftp:error', { sessionId, error: 'SSH session not active' });
      return;
    }

    sess.client.sftp((err, sftp) => {
      if (err) {
        socket.emit('sftp:error', { sessionId, error: `SFTP Subsystem Error: ${err.message}` });
        return;
      }
      sftp.readdir(remotePath, (err, list) => {
        if (err) {
          socket.emit('sftp:error', { sessionId, error: err.message });
          return;
        }
        const formatted = list.map(item => ({
          name: item.filename,
          isDir: (item.attrs.mode & 0o040000) === 0o040000,
          size: item.attrs.size,
          mtime: new Date(item.attrs.mtime * 1000).toISOString(),
          permissions: item.attrs.mode.toString(8)
        })).sort((a, b) => {
          if (a.isDir && !b.isDir) return -1;
          if (!a.isDir && b.isDir) return 1;
          return a.name.localeCompare(b.name);
        });

        socket.emit('sftp:list:res', { sessionId, currentPath: remotePath, items: formatted });
      });
    });
  });

  socket.on('sftp:readfile', ({ sessionId, filePath }) => {
    const sess = activeSessions.get(sessionId);
    if (!sess || !sess.client) return;

    sess.client.sftp((err, sftp) => {
      if (err) {
        socket.emit('sftp:error', { sessionId, error: err.message });
        return;
      }
      sftp.readFile(filePath, 'utf8', (err, content) => {
        if (err) {
          socket.emit('sftp:error', { sessionId, error: err.message });
          return;
        }
        socket.emit('sftp:readfile:res', { sessionId, filePath, content });
      });
    });
  });

  socket.on('sftp:writefile', ({ sessionId, filePath, content }) => {
    const sess = activeSessions.get(sessionId);
    if (!sess || !sess.client) return;

    sess.client.sftp((err, sftp) => {
      if (err) {
        socket.emit('sftp:error', { sessionId, error: err.message });
        return;
      }
      sftp.writeFile(filePath, content, 'utf8', (err) => {
        if (err) {
          socket.emit('sftp:error', { sessionId, error: err.message });
          return;
        }
        socket.emit('sftp:writefile:res', { sessionId, filePath, success: true });
      });
    });
  });

  socket.on('sftp:rm', ({ sessionId, filePath, isDir }) => {
    const sess = activeSessions.get(sessionId);
    if (!sess || !sess.client) return;

    sess.client.sftp((err, sftp) => {
      if (err) return;
      const fn = isDir ? sftp.rmdir.bind(sftp) : sftp.unlink.bind(sftp);
      fn(filePath, (err) => {
        if (err) {
          socket.emit('sftp:error', { sessionId, error: err.message });
        } else {
          socket.emit('sftp:rm:res', { sessionId, filePath, success: true });
        }
      });
    });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Web Termius Backend Server running on http://0.0.0.0:${PORT}`);
});
