import { spawn } from 'child_process';
import waitOn from 'wait-on';

const isOffline = process.argv.includes('--offline');
if (isOffline) {
  process.env.VITE_OFFLINE_MODE = 'true';
}

console.log('Starting Vite dev server...');
const vite = spawn('bun', ['run', 'dev'], { shell: true, stdio: 'inherit' });

waitOn({ resources: ['http://localhost:5173'] }).then(() => {
  console.log('Vite server is ready. Launching Electron...');
  process.env.VITE_DEV_SERVER_URL = 'http://localhost:5173';
  const electron = spawn('bun', ['run', 'electron:start'], { shell: true, stdio: 'inherit' });
  
  electron.on('close', () => {
    console.log('Electron closed. Cleaning up background processes...');
    if (process.platform === 'win32') {
      const task = spawn('taskkill', ['/pid', vite.pid, '/f', '/t']);
      task.on('close', () => process.exit());
    } else {
      vite.kill();
      process.exit();
    }
  });
}).catch(err => {
  console.error('Error waiting for Vite:', err);
  if (process.platform === 'win32') {
    const task = spawn('taskkill', ['/pid', vite.pid, '/f', '/t']);
    task.on('close', () => process.exit(1));
  } else {
    vite.kill();
    process.exit(1);
  }
});
