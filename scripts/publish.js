/**
 * scripts/publish.js
 * --------------------------------------------------
 * Publica el build actual a GitHub Releases.
 * Útil cuando el push y el build deben hacerse por
 * separado (ej: el release falló solo en el build).
 *
 * Uso:
 *   npm run dist:publish
 * --------------------------------------------------
 */
'use strict';

const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

// Cargar GH_TOKEN desde .env raíz
const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] = m[2];
  }
}

if (!process.env.GH_TOKEN) {
  console.error('\n  Error: GH_TOKEN no encontrado en .env\n');
  process.exit(1);
}

function run(cmd) {
  console.log('\n  $', cmd);
  const r = spawnSync(cmd, { shell: true, cwd: ROOT, stdio: 'inherit', env: { ...process.env } });
  if (r.status !== 0) {
    console.error('\n  Error ejecutando:', cmd);
    process.exit(1);
  }
}

console.log('\n  Publicando en GitHub Releases...\n');
run('git push origin main --follow-tags');
run('npm run dist:win -- --publish always');
console.log('\n  Release publicado correctamente.\n');
