import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('========================================================');
console.log('🚀  SUNOSAMJHO LIVE - REAL-TIME CONVERSATION PLATFORM  🚀');
console.log('========================================================');

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const apiProcess = spawn(npmCmd, ['run', 'dev:api'], {
  cwd: rootDir,
  shell: true,
  stdio: ['ignore', 'inherit', 'inherit'],
});

const webProcess = spawn(npmCmd, ['run', 'dev:web'], {
  cwd: rootDir,
  shell: true,
  stdio: ['ignore', 'inherit', 'inherit'],
});

const cleanExit = () => {
  apiProcess.kill();
  webProcess.kill();
  process.exit(0);
};

process.on('SIGINT', cleanExit);
process.on('SIGTERM', cleanExit);
