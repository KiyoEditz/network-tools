// scripts/build-preload.js
import esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export async function buildPreload() {
  console.log('⚡ Bundling Electron Preload (CommonJS)...');
  await esbuild.build({
    entryPoints: [path.join(rootDir, 'src/preload/index.ts')],
    outfile: path.join(rootDir, 'dist/preload/index.cjs'),
    bundle: true,
    format: 'cjs',
    platform: 'node',
    target: 'node20',
    external: ['electron'],
  });
  console.log('✅ Preload bundled successfully into dist/preload/index.cjs');
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('scripts/build-preload.js')) {
  buildPreload().catch((err) => {
    console.error('❌ Failed to bundle preload script:', err);
    process.exit(1);
  });
}
