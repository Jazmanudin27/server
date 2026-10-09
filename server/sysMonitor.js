import { Client as SSHClient } from 'ssh2';

// Python script to extract complete metrics from Linux system
const PYTHON_SCRIPT = `
import json, os, subprocess, platform

uptime = ""
try:
    uptime = subprocess.check_output("uptime -p 2>/dev/null || uptime", shell=True, text=True).strip()
except Exception:
    uptime = "unknown"

os_name = "Linux"
try:
    if os.path.exists("/etc/os-release"):
        with open("/etc/os-release") as f:
            for line in f:
                if line.startswith("PRETTY_NAME="):
                    os_name = line.split("=", 1)[1].strip().strip('"')
                    break
except Exception:
    pass

cpu_model = "Unknown Processor"
cpu_cores = os.cpu_count() or 1
try:
    with open("/proc/cpuinfo") as f:
        for line in f:
            if "model name" in line:
                cpu_model = line.split(":", 1)[1].strip()
                break
except Exception:
    pass

load_avg = [0.0, 0.0, 0.0]
try:
    load_avg = list(os.getloadavg())
except Exception:
    pass

cpu_usage = 0.0
try:
    out = subprocess.check_output("top -bn1 | grep -i 'Cpu(s)'", shell=True, text=True)
    parts = out.replace("%Cpu(s):","").replace("Cpu(s):","").split(",")
    us = float(parts[0].strip().split()[0])
    sy = float(parts[1].strip().split()[0])
    cpu_usage = round(us + sy, 1)
except Exception:
    cpu_usage = round((load_avg[0] / cpu_cores) * 100, 1)

mem = {"total": 0, "used": 0, "free": 0, "available": 0, "percent": 0, "swap_total": 0, "swap_used": 0, "swap_percent": 0}
try:
    out = subprocess.check_output("free -b", shell=True, text=True).splitlines()
    for l in out:
        parts = l.split()
        if len(parts) >= 4 and parts[0].startswith("Mem:"):
            total = int(parts[1])
            free = int(parts[3])
            avail = int(parts[6]) if len(parts) >= 7 else free
            used_real = total - avail
            mem["total"] = total
            mem["used"] = used_real
            mem["free"] = free
            mem["available"] = avail
            mem["percent"] = round((used_real / total) * 100, 1) if total > 0 else 0
        elif len(parts) >= 4 and parts[0].startswith("Swap:"):
            stotal = int(parts[1])
            sused = int(parts[2])
            mem["swap_total"] = stotal
            mem["swap_used"] = sused
            mem["swap_percent"] = round((sused / stotal) * 100, 1) if stotal > 0 else 0
except Exception:
    pass

disks = []
root_disk = {"filesystem": "root", "mount": "/", "size": 0, "used": 0, "avail": 0, "percent": 0}
try:
    out = subprocess.check_output("df -B1 -x tmpfs -x devtmpfs -x squashfs -x overlay 2>/dev/null || df -B1", shell=True, text=True).splitlines()
    for l in out[1:]:
        parts = l.split()
        if len(parts) >= 6:
            fs, size, used, avail, pcent, mnt = parts[0], int(parts[1]), int(parts[2]), int(parts[3]), parts[4], parts[5]
            try:
                p_val = float(pcent.replace("%", ""))
            except:
                p_val = 0.0
            disk_item = {"filesystem": fs, "size": size, "used": used, "avail": avail, "percent": p_val, "mount": mnt}
            disks.append(disk_item)
            if mnt == "/" or (not root_disk.get("size") and "/" in mnt):
                root_disk = disk_item
except Exception:
    pass

procs = []
try:
    out = subprocess.check_output("ps -eo pid,user,%cpu,%mem,comm --sort=-%cpu 2>/dev/null | head -n 11", shell=True, text=True).splitlines()
    for l in out[1:]:
        parts = l.split(None, 4)
        if len(parts) >= 5:
            procs.append({
                "pid": parts[0],
                "user": parts[1],
                "cpu": float(parts[2]),
                "mem": float(parts[3]),
                "name": parts[4]
            })
except Exception:
    pass

pm2_info = {"installed": False, "apps": []}
try:
    pm2_j = subprocess.check_output("pm2 jlist 2>/dev/null", shell=True, text=True)
    apps = json.loads(pm2_j)
    pm2_info["installed"] = True
    pm2_info["apps"] = [{"name": a.get("name"), "status": a.get("pm2_env",{}).get("status","unknown"), "cpu": a.get("monit",{}).get("cpu",0), "memory": a.get("monit",{}).get("memory",0)} for a in apps]
except Exception:
    pass

docker_info = {"installed": False, "containers": []}
try:
    dock_out = subprocess.check_output("docker ps --format '{{.Names}}|{{.Status}}|{{.Image}}' 2>/dev/null", shell=True, text=True).splitlines()
    docker_info["installed"] = True
    docker_info["containers"] = [{"name": d.split("|")[0], "status": d.split("|")[1] if len(d.split("|"))>1 else "", "image": d.split("|")[2] if len(d.split("|"))>2 else ""} for d in dock_out if d.strip()]
except Exception:
    pass

hname = "unknown"
try:
    hname = subprocess.check_output("hostname", shell=True, text=True).strip()
except Exception:
    pass

result = {
    "hostname": hname,
    "os": os_name,
    "kernel": platform.release(),
    "arch": platform.machine(),
    "uptime": uptime,
    "cpu": {
        "model": cpu_model,
        "cores": cpu_cores,
        "usage": min(100.0, max(0.0, cpu_usage)),
        "loadAvg": load_avg
    },
    "memory": mem,
    "disk": {
        "root": root_disk,
        "mounts": disks
    },
    "processes": procs,
    "pm2": pm2_info,
    "docker": docker_info,
    "timestamp": int(__import__("time").time() * 1000)
}

print("###JSON_START###" + json.dumps(result) + "###JSON_END###")
`;

// Base64 command representation to prevent any bash quoting issues
const B64_PY = Buffer.from(PYTHON_SCRIPT).toString('base64');
const STATS_COMMAND = `
if command -v python3 >/dev/null 2>&1; then
  python3 -c "import base64; exec(base64.b64decode('${B64_PY}').decode('utf-8'))"
else
  HN=$(hostname 2>/dev/null || uname -n)
  KN=$(uname -r)
  AR=$(uname -m)
  UP=$(uptime -p 2>/dev/null || uptime)
  OS="Linux"
  if [ -f /etc/os-release ]; then
    OS=$(grep '^PRETTY_NAME=' /etc/os-release | cut -d= -f2 | tr -d '"')
  fi
  CPUM=$(grep -m1 'model name' /proc/cpuinfo 2>/dev/null | cut -d: -f2 | sed 's/^[ \\t]*//' || echo "CPU")
  CPUC=$(nproc 2>/dev/null || echo 1)
  LOAD=$(cat /proc/loadavg 2>/dev/null | awk '{print "[" $1 "," $2 "," $3 "]"}')
  MEM_TOTAL=$(free -b 2>/dev/null | awk '/^Mem:/ {print $2}')
  MEM_AVAIL=$(free -b 2>/dev/null | awk '/^Mem:/ {print ($7 ? $7 : $4)}')
  MEM_USED=$((MEM_TOTAL - MEM_AVAIL))
  MEM_PCENT=$(( (MEM_USED * 100) / MEM_TOTAL ))
  ROOT_SIZE=$(df -B1 / 2>/dev/null | awk 'NR==2 {print $2}')
  ROOT_USED=$(df -B1 / 2>/dev/null | awk 'NR==2 {print $3}')
  ROOT_AVAIL=$(df -B1 / 2>/dev/null | awk 'NR==2 {print $4}')
  ROOT_PCENT=$(df -B1 / 2>/dev/null | awk 'NR==2 {print $5}' | tr -d '%')
  echo "###JSON_START###{\\"hostname\\":\\"$HN\\",\\"os\\":\\"$OS\\",\\"kernel\\":\\"$KN\\",\\"arch\\":\\"$AR\\",\\"uptime\\":\\"$UP\\",\\"cpu\\":{\\"model\\":\\"$CPUM\\",\\"cores\\":$CPUC,\\"usage\\":$MEM_PCENT,\\"loadAvg\\":$LOAD},\\"memory\\":{\\"total\\":$MEM_TOTAL,\\"used\\":$MEM_USED,\\"free\\":$MEM_AVAIL,\\"available\\":$MEM_AVAIL,\\"percent\\":$MEM_PCENT,\\"swap_total\\":0,\\"swap_used\\":0,\\"swap_percent\\":0},\\"disk\\":{\\"root\\":{\\"filesystem\\":\\"/\\",\\"mount\\":\\"/\\",\\"size\\":$ROOT_SIZE,\\"used\\":$ROOT_USED,\\"avail\\":$ROOT_AVAIL,\\"percent\\":$ROOT_PCENT},\\"mounts\\":[]},\\"processes\\":[],\\"pm2\\":{\\"installed\\":false,\\"apps\\":[]},\\"docker\\":{\\"installed\\":false,\\"containers\\":[]},\\"timestamp\\":$(date +%s000)}###JSON_END###"
fi
`;

/**
 * Execute command on an existing SSH Client instance
 */
export function execOnClient(client, command, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    let output = '';
    let errorOutput = '';
    let finished = false;

    const timer = setTimeout(() => {
      if (!finished) {
        finished = true;
        reject(new Error('SSH command timeout'));
      }
    }, timeoutMs);

    client.exec(command, (err, stream) => {
      if (err) {
        clearTimeout(timer);
        return reject(err);
      }

      stream.on('data', (data) => {
        output += data.toString('utf-8');
      });

      stream.stderr.on('data', (data) => {
        errorOutput += data.toString('utf-8');
      });

      stream.on('close', (code) => {
        clearTimeout(timer);
        if (!finished) {
          finished = true;
          resolve({ code, stdout: output, stderr: errorOutput });
        }
      });
    });
  });
}

/**
 * Fetch complete system metrics (CPU, RAM, ROM/Disk, Uptime, Processes)
 */
export async function getSystemStats(client) {
  const result = await execOnClient(client, STATS_COMMAND, 15000);
  const match = result.stdout.match(/###JSON_START###([\s\S]*?)###JSON_END###/);
  
  if (match && match[1]) {
    try {
      return JSON.parse(match[1].trim());
    } catch (parseErr) {
      throw new Error(`Failed to parse system metrics JSON: ${parseErr.message}`);
    }
  }

  throw new Error('Unable to extract system metrics from remote host. Output: ' + (result.stdout || result.stderr || 'empty output'));
}

/**
 * Execute a standalone SSH command using connection params
 */
export function executeStandaloneCommand(sshConfig, command, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const conn = new SSHClient();
    let responded = false;

    const timer = setTimeout(() => {
      if (!responded) {
        responded = true;
        conn.end();
        reject(new Error('SSH connection timeout'));
      }
    }, timeoutMs);

    conn.on('ready', async () => {
      try {
        const res = await execOnClient(conn, command, timeoutMs - 5000);
        if (!responded) {
          responded = true;
          clearTimeout(timer);
          conn.end();
          resolve(res);
        }
      } catch (err) {
        if (!responded) {
          responded = true;
          clearTimeout(timer);
          conn.end();
          reject(err);
        }
      }
    });

    conn.on('error', (err) => {
      if (!responded) {
        responded = true;
        clearTimeout(timer);
        reject(err);
      }
    });

    try {
      conn.connect({
        host: sshConfig.ip || sshConfig.hostname,
        port: parseInt(sshConfig.port || 22),
        username: sshConfig.username || 'root',
        password: sshConfig.password,
        privateKey: sshConfig.privateKey,
        readyTimeout: 10000
      });
    } catch (connErr) {
      clearTimeout(timer);
      reject(connErr);
    }
  });
}
