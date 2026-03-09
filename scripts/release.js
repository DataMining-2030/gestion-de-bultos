#!/usr/bin/env node
/**
 * scripts/release.js
 * ---------------------------------------------------------
 * CLI interactivo para publicar una nueva versión.
 *
 * Uso:
 *   npm run release
 *   node scripts/release.js
 *
 * Pasos que ejecuta:
 *   1. Muestra versión actual
 *   2. Solicita tipo de bump (patch / minor / major)
 *   3. Solicita mensaje del commit
 *   4. git status → git add . → git commit
 *   5. npm version <bump>  (genera commit + tag vX.Y.Z automáticamente)
 *   6. git push origin main --follow-tags
 *   7. (Opcional) npm run dist:win
 * ---------------------------------------------------------
 * Convención:
 *   patch  (x.x.1) → Bug fix / corrección
 *   minor  (x.1.x) → Nueva funcionalidad compatible
 *   major  (1.x.x) → Cambio incompatible / rediseño
 */

'use strict';

const readline = require('readline');
const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Cargar GH_TOKEN desde .env raíz (si existe)
const ROOT_ENV = path.join(__dirname, '..', '.env');
if (fs.existsSync(ROOT_ENV)) {
  const lines = fs.readFileSync(ROOT_ENV, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (match) process.env[match[1]] = match[2];
  }
}

// ── Utilidades ────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');
const PKG_PATH = path.join(ROOT, 'package.json');

function readPkg() {
  return JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
}

function color(code, text) {
  return `\x1b[${code}m${text}\x1b[0m`;
}

const cyan   = (t) => color('36',   t);
const green  = (t) => color('32',   t);
const yellow = (t) => color('33',   t);
const red    = (t) => color('31;1', t);
const bold   = (t) => color('1',    t);
const dim    = (t) => color('2',    t);

function run(cmd, opts = {}) {
  console.log(dim(`  $ ${cmd}`));
  const result = spawnSync(cmd, {
    shell: true,
    cwd: ROOT,
    stdio: opts.silent ? 'pipe' : 'inherit',
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    const errMsg = result.stderr ? result.stderr.trim() : `Salió con código ${result.status}`;
    throw new Error(`Error ejecutando:\n  ${cmd}\n\n${errMsg}`);
  }
  return result.stdout ? result.stdout.trim() : '';
}

function separator() {
  console.log(dim('─'.repeat(50)));
}

// ── Prompt ────────────────────────────────────────────────

function prompt(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function selectBump(rl, currentVersion) {
  const [major, minor, patch] = currentVersion.split('.').map(Number);

  const opts = [
    { key: '1', label: 'patch', next: `${major}.${minor}.${patch + 1}`,   desc: 'Bug fix / corrección' },
    { key: '2', label: 'minor', next: `${major}.${minor + 1}.0`,           desc: 'Nueva funcionalidad compatible' },
    { key: '3', label: 'major', next: `${major + 1}.0.0`,                  desc: 'Cambio incompatible / rediseño' },
  ];

  console.log('');
  console.log(bold('  Selecciona el tipo de bump:'));
  opts.forEach((o) => {
    console.log(
      `  ${cyan(o.key + ')')} ${bold(o.label.padEnd(7))}  ${dim(currentVersion)} → ${green(o.next)}  ${dim(o.desc)}`
    );
  });
  console.log('');

  let choice = '';
  while (!['1', '2', '3'].includes(choice)) {
    choice = (await prompt(rl, `  Elige [1/2/3]: `)).trim();
  }

  return opts[Number(choice) - 1].label;
}

// ── Main ──────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log(bold(cyan('  ╔══════════════════════════════════╗')));
  console.log(bold(cyan('  ║     Gestion de Bultos – Release  ║')));
  console.log(bold(cyan('  ╚══════════════════════════════════╝')));
  console.log('');

  // Versión actual
  const pkg = readPkg();
  console.log(`  Versión actual: ${bold(yellow(pkg.version))}`);
  separator();

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  try {
    // ── 1. Tipo de bump
    const bump = await selectBump(rl, pkg.version);

    // ── 2. Mensaje de commit
    console.log('');
    let message = '';
    while (!message) {
      message = (await prompt(rl, `  Mensaje de commit ${dim('(ej: Agrega filtro por región)')}:\n  > `)).trim();
      if (!message) console.log(red('  ⚠  El mensaje no puede estar vacío.'));
    }

    // ── 3. Confirmar build
    const doBuild = (await prompt(rl, `\n  ¿Generar build de producción (dist:win)? ${dim('[s/N]')}: `))
      .trim().toLowerCase();
    const buildAfter = doBuild === 's' || doBuild === 'si' || doBuild === 'y' || doBuild === 'yes';

    console.log('');
    separator();
    console.log(bold('  Resumen:'));
    console.log(`    Bump     : ${cyan(bump)}`);
    console.log(`    Commit   : ${cyan(message)}`);
    console.log(`    Build    : ${buildAfter ? green('sí') : dim('no')}`);
    separator();

    const confirm = (await prompt(rl, `\n  ¿Confirmar? ${dim('[s/N]')}: `)).trim().toLowerCase();
    if (confirm !== 's' && confirm !== 'si' && confirm !== 'y' && confirm !== 'yes') {
      console.log(yellow('\n  Cancelado.\n'));
      rl.close();
      process.exit(0);
    }

    rl.close();

    console.log('');

    // ── Paso 1: git status (informativo)
    console.log(bold('📋 [1/5] Estado del repositorio:'));
    run('git status');
    console.log('');

    // ── Paso 2: git add
    console.log(bold('➕ [2/5] Agregando todos los cambios...'));
    run('git add .');
    console.log(green('  ✅ git add completado'));
    console.log('');

    // ── Paso 3: git commit
    // npm version creará su propio commit después, así que solo hacemos commit
    // si hay archivos staged. Si no hay nada staged, npm version igualmente
    // creará el commit de versión.
    console.log(bold(`💬 [3/5] Commit: "${message}"...`));
    try {
      run(`git commit -m "${message.replace(/"/g, '\\"')}"`);
      console.log(green('  ✅ Commit realizado'));
    } catch (e) {
      // Puede fallar si no hay nada que commitear (working tree limpio)
      if (e.message.includes('nothing to commit')) {
        console.log(yellow('  ⚠  Nada que commitear (working tree limpio). Continuando...'));
      } else {
        throw e;
      }
    }
    console.log('');

    // ── Paso 4: npm version (commit automático de versión + tag)
    console.log(bold(`🏷️  [4/5] Bumping versión (${bump})...`));
    run(`npm version ${bump} -m "v%s"`);
    const newPkg = readPkg();
    console.log(green(`  ✅ Versión actualizada: ${pkg.version} → ${bold(newPkg.version)}`));
    console.log('');

    // ── Paso 5: push
    console.log(bold('🚀 [5/5] Push a GitHub (commits + tags)...'));
    run('git push origin main --follow-tags');
    console.log(green('  ✅ Push completado'));
    console.log('');

    // ── Paso 6 (opcional): build + publicar a GitHub Releases
    if (buildAfter) {
      separator();
      console.log(bold('🔨 [6/6] Compilando y publicando en GitHub Releases...'));
      console.log(yellow('  ⏳ Esto puede tardar varios minutos...'));
      console.log('');

      if (!process.env.GH_TOKEN) {
        console.log(red('  ❌ No se encontró GH_TOKEN en .env. No se puede publicar en GitHub Releases.'));
        console.log(yellow('  ℹ️  Puedes compilar manualmente con: npm run dist:win'));
      } else {
        // Inyectar GH_TOKEN en el entorno del proceso hijo
        const buildResult = spawnSync(
          'npm run dist:win -- --publish always',
          {
            shell: true,
            cwd: ROOT,
            stdio: 'inherit',
            env: { ...process.env },
          }
        );
        if (buildResult.status !== 0) {
          throw new Error('Falló el build o la publicación en GitHub Releases.');
        }
        console.log('');
        console.log(green('  ✅ Build completado y publicado en GitHub Releases.'));
        console.log(dim('  Los usuarios con la app instalada recibirán el aviso de actualización automáticamente.'));
      }
    }

    separator();
    console.log('');
    console.log(green(bold(`  🎉 Release v${newPkg.version} publicado correctamente.`)));
    if (!buildAfter) {
      console.log(dim(`\n  Tip: cuando estés listo para generar el instalador:\n  npm run dist:win\n`));
    }
    console.log('');

  } catch (err) {
    rl.close();
    console.log('');
    console.error(red(`  ❌ Error durante el release:\n  ${err.message}`));
    console.log('');
    process.exit(1);
  }
}

main();
