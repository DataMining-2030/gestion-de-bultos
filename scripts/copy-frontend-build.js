const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

async function rmDirSafe(dir) {
  if (!fs.existsSync(dir)) return;
  await fsp.rm(dir, { recursive: true, force: true });
}

async function copyDir(src, dest) {
  await ensureDir(dest);
  const entries = await fsp.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      await fsp.copyFile(srcPath, destPath);
    }
  }
}

async function main() {
  const root = path.resolve(__dirname, '..');
  const src = path.join(root, 'frontend', 'build');
  const dest = path.join(root, 'build');

  if (!fs.existsSync(src)) {
    console.error(`No existe frontend/build. Ejecuta primero: npm run build:frontend`);
    process.exit(1);
  }

  await rmDirSafe(dest);
  await copyDir(src, dest);
  console.log('✅ Copiado frontend/build -> build/');
}

main().catch((e) => {
  console.error('❌ Error copiando build:', e && e.message ? e.message : e);
  process.exit(1);
});

