import { build } from 'esbuild';

// Build main process
build({
  entryPoints: ['electron/main.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: 'dist-electron/main.cjs',
  external: ['electron'],
  format: 'cjs',
  platform: 'node',
  packages: 'external',
}).catch(() => process.exit(1));

// Build preload script
build({
  entryPoints: ['electron/preload.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: 'dist-electron/preload.cjs',
  external: ['electron'],
  format: 'cjs',
  platform: 'node',
  packages: 'external',
}).catch(() => process.exit(1));

console.log('Electron build complete');
