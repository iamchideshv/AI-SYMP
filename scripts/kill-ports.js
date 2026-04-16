import { execSync } from 'child_process';

const PORTS = [5173, 8000];

console.log('🔍 Checking for processes blocking ports:', PORTS.join(', '));

PORTS.forEach(port => {
  try {
    // Windows command to find process ID by port
    const output = execSync(`netstat -ano | findstr :${port}`).toString();
    const lines = output.split('\n');
    const pids = new Set();

    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length > 4) {
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && !isNaN(pid)) {
          pids.add(pid);
        }
      }
    });

    pids.forEach(pid => {
      console.log(`💀 Killing process ${pid} on port ${port}...`);
      try {
        execSync(`taskkill /F /PID ${pid}`);
      } catch (e) {
        // Ignore errors if process already closed
      }
    });
  } catch (err) {
    // If findstr doesn't find anything, it exits with code 1
    // console.log(`✅ Port ${port} is clear.`);
  }
});

console.log('🚀 Ports cleared.');
