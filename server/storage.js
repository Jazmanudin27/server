import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { encrypt, decrypt } from './cryptoUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const HOSTS_FILE = path.join(DATA_DIR, 'hosts.json');
const SNIPPETS_FILE = path.join(DATA_DIR, 'snippets.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default initial data including user's Hostinger VPS
const INITIAL_HOSTS = [
  {
    id: 'host-vps-hostinger-main',
    name: 'Hostinger Cloud VPS',
    hostname: 'srv903065.hstgr.cloud',
    ip: '31.97.109.165',
    port: 22,
    username: 'root',
    authType: 'password', // 'password' or 'key'
    password: encrypt('Jazman@271998'),
    privateKey: '',
    group: 'Production Servers',
    color: '#3b82f6',
    notes: 'Main Hostinger VPS Server',
    createdAt: new Date().toISOString()
  }
];

const INITIAL_SNIPPETS = [
  {
    id: 'snippet-1',
    title: 'System Info & Resource Usage',
    category: 'Monitoring',
    command: 'uname -a && uptime && free -h && df -h',
    description: 'Displays kernel version, uptime, RAM, and disk usage.'
  },
  {
    id: 'snippet-2',
    title: 'Check Running Docker Containers',
    category: 'Docker',
    command: 'docker ps -a',
    description: 'Lists all active and stopped Docker containers.'
  },
  {
    id: 'snippet-3',
    title: 'Check Open Ports',
    category: 'Network',
    command: 'netstat -tulpn || ss -tulpn',
    description: 'Shows listening network services and open ports.'
  },
  {
    id: 'snippet-4',
    title: 'Update System Packages (Ubuntu/Debian)',
    category: 'Maintenance',
    command: 'apt update && apt upgrade -y',
    description: 'Updates package lists and upgrades installed packages.'
  }
];

// Initialize files if they don't exist
if (!fs.existsSync(HOSTS_FILE)) {
  fs.writeFileSync(HOSTS_FILE, JSON.stringify(INITIAL_HOSTS, null, 2));
}

if (!fs.existsSync(SNIPPETS_FILE)) {
  fs.writeFileSync(SNIPPETS_FILE, JSON.stringify(INITIAL_SNIPPETS, null, 2));
}

export function getHosts(includeSensitive = false) {
  try {
    const raw = fs.readFileSync(HOSTS_FILE, 'utf8');
    const hosts = JSON.parse(raw);
    return hosts.map(h => {
      const copy = { ...h };
      if (!includeSensitive) {
        copy.password = copy.password ? '******' : '';
        copy.privateKey = copy.privateKey ? '******' : '';
      } else {
        if (copy.password) copy.password = decrypt(copy.password);
        if (copy.privateKey) copy.privateKey = decrypt(copy.privateKey);
      }
      return copy;
    });
  } catch (err) {
    console.error('Error reading hosts file:', err.message);
    return [];
  }
}

export function getHostById(id, includeSensitive = true) {
  const hosts = getHosts(true);
  const host = hosts.find(h => h.id === id);
  if (!host) return null;
  if (!includeSensitive) {
    host.password = host.password ? '******' : '';
    host.privateKey = host.privateKey ? '******' : '';
  }
  return host;
}

export function saveHost(hostData) {
  const hosts = getHosts(true);
  let isNew = false;
  
  const hostToSave = { ...hostData };
  if (hostToSave.password && hostToSave.password !== '******') {
    hostToSave.password = encrypt(hostToSave.password);
  } else if (hostToSave.id) {
    const existing = hosts.find(h => h.id === hostToSave.id);
    if (existing) hostToSave.password = encrypt(existing.password);
  }

  if (hostToSave.privateKey && hostToSave.privateKey !== '******') {
    hostToSave.privateKey = encrypt(hostToSave.privateKey);
  } else if (hostToSave.id) {
    const existing = hosts.find(h => h.id === hostToSave.id);
    if (existing) hostToSave.privateKey = encrypt(existing.privateKey);
  }

  if (!hostToSave.id) {
    hostToSave.id = `host-${Date.now()}`;
    hostToSave.createdAt = new Date().toISOString();
    hosts.push(hostToSave);
    isNew = true;
  } else {
    const index = hosts.findIndex(h => h.id === hostToSave.id);
    if (index >= 0) {
      hosts[index] = { ...hosts[index], ...hostToSave, updatedAt: new Date().toISOString() };
    } else {
      hosts.push(hostToSave);
    }
  }

  fs.writeFileSync(HOSTS_FILE, JSON.stringify(hosts, null, 2));
  return getHostById(hostToSave.id, false);
}

export function deleteHost(id) {
  const hosts = getHosts(true);
  const filtered = hosts.filter(h => h.id !== id);
  fs.writeFileSync(HOSTS_FILE, JSON.stringify(filtered, null, 2));
  return true;
}

export function getSnippets() {
  try {
    const raw = fs.readFileSync(SNIPPETS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

export function saveSnippet(snippetData) {
  const snippets = getSnippets();
  if (!snippetData.id) {
    snippetData.id = `snippet-${Date.now()}`;
    snippets.push(snippetData);
  } else {
    const index = snippets.findIndex(s => s.id === snippetData.id);
    if (index >= 0) snippets[index] = snippetData;
    else snippets.push(snippetData);
  }
  fs.writeFileSync(SNIPPETS_FILE, JSON.stringify(snippets, null, 2));
  return snippetData;
}

export function deleteSnippet(id) {
  const snippets = getSnippets();
  const filtered = snippets.filter(s => s.id !== id);
  fs.writeFileSync(SNIPPETS_FILE, JSON.stringify(filtered, null, 2));
  return true;
}
