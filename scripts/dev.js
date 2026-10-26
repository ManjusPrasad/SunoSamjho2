import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('========================================================');
console.log('🚀  SUNOSAMJHO LIVE - REAL-TIME CONVERSATION PLATFORM  🚀');
console.log('========================================================');

const apiProcess = spawn('npx', ['tsx', 'watch', 'src/server.ts'], {
  cwd: path.join(rootDir, 'services', 'api'),
  shell: true,
  stdio: 'inherit',
});

const webProcess = spawn('npx', ['vite'], {
  cwd: path.join(rootDir, 'apps', 'web'),
  shell: true,
  stdio: 'inherit',
});

const cleanExit = () => {
  apiProcess.kill();
  webProcess.kill();
  process.exit(0);
};

process.on('SIGINT', cleanExit);
process.on('SIGTERM', cleanExit);
