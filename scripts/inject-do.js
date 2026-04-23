// Post-build script: injects Durable Object classes into SvelteKit's _worker.js
// Used by Cloudflare git integration (build: vite build && node scripts/inject-do.js)

import { buildSync } from 'esbuild';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const DO_SOURCES = [
  { src: join(root, 'src/do/booty-chat.js'), className: 'BootyChatRoom' }
];

const workerPath = join(root, '.svelte-kit/cloudflare/_worker.js');

if (!existsSync(workerPath)) {
  console.error('❌ _worker.js not found. Run vite build first.');
  process.exit(1);
}

let workerContent = readFileSync(workerPath, 'utf8');

for (const { src, className } of DO_SOURCES) {
  if (!existsSync(src)) {
    console.error(`❌ DO source not found: ${src}`);
    process.exit(1);
  }

  // Bundle the DO class
  const result = buildSync({
    entryPoints: [src],
    bundle: true,
    format: 'esm',
    target: 'es2022',
    write: false,
    platform: 'browser'
  });

  const doCode = result.outputFiles[0].text;
  console.log(`✅ Bundled ${className} (${doCode.length} bytes)`);

  // Append DO export to worker
  workerContent += `\n\n// --- Durable Object: ${className} (injected) ---\n${doCode}\nexport { ${className} };\n`;
}

writeFileSync(workerPath, workerContent);
console.log('✅ Durable Objects injected into _worker.js');
