import { spawn } from 'node:child_process';
import net from 'node:net';

function checkPort(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(500);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      resolve(false);
    });
    socket.connect(port, '127.0.0.1');
  });
}

async function waitForServer(port, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await checkPort(port)) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Timeout waiting for port ${port}`);
}

async function main() {
  console.log('🚀 Starting Vite dev server...');
  const vite = spawn('npx', ['vite'], {
    stdio: 'inherit',
    shell: true,
  });

  console.log('⏳ Waiting for Vite on http://localhost:5173...');
  await waitForServer(5173);
  console.log('✅ Vite is ready!');

  console.log('📦 Compiling Electron Main Process...');
  const tsc = spawn('npx', ['tsc', '-p', 'tsconfig.main.json'], {
    stdio: 'inherit',
    shell: true,
  });

  await new Promise((resolve, reject) => {
    tsc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`TypeScript compilation failed with code ${code}`));
    });
  });

  console.log('⚡ Launching Electron...');
  const electron = spawn('npx', ['electron', 'dist/main/index.js'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, VITE_DEV_SERVER_URL: 'http://localhost:5173' },
  });

  electron.on('close', () => {
    vite.kill();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
