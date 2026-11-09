import { spawn } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';

function checkHttp(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(600, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function checkPort(port, host = '127.0.0.1') {
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
    socket.connect(port, host);
  });
}

async function waitForServer(timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await checkHttp('http://127.0.0.1:5173')) return true;
    if (await checkHttp('http://localhost:5173')) return true;
    if (await checkPort(5173, '127.0.0.1')) return true;
    if (await checkPort(5173, '::1')) return true;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('Timeout waiting for Vite dev server on port 5173');
}

async function main() {
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
  console.log('✅ Main process compiled!');

  console.log('🚀 Starting Vite dev server...');
  const vite = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', '5173'], {
    stdio: 'inherit',
    shell: true,
  });

  console.log('⏳ Waiting for Vite on http://127.0.0.1:5173...');
  await waitForServer();
  console.log('✅ Vite is ready!');

  console.log('⚡ Launching Electron...');
  const electron = spawn('npx', ['electron', 'dist/main/index.js'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, VITE_DEV_SERVER_URL: 'http://127.0.0.1:5173' },
  });

  electron.on('close', () => {
    try {
      vite.kill();
    } catch {}
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
