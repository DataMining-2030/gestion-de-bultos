#!/usr/bin/env node

/**
 * Instalador Simple - Gestión de Bultos
 * Ejecutar: node install.js
 * 
 * Este script solo:
 * 1. Verifica requisitos
 * 2. Instala dependencias
 * 3. Listo para usar
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');
const os = require('os');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function pregunta(texto) {
  return new Promise((resolve) => {
    rl.question(texto, (respuesta) => {
      resolve(respuesta);
    });
  });
}

function ejecutar(comando, descripcion) {
  try {
    console.log(`  ⏳ ${descripcion}...`);
    execSync(comando, { stdio: 'pipe', cwd: process.cwd() });
    console.log(`  ✅ ${descripcion}`);
    return true;
  } catch (error) {
    console.error(`  ❌ Error en: ${descripcion}`);
    console.error(`     ${error.message}`);
    return false;
  }
}

function verificarRequisito(comando, nombre) {
  try {
    execSync(`${comando} --version`, { stdio: 'pipe' });
    console.log(`  ✅ ${nombre} instalado`);
    return true;
  } catch {
    console.log(`  ❌ ${nombre} NO instalado`);
    return false;
  }
}

async function instalar() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   Instalador - Gestión de Bultos      ║');
  console.log('║          Versión 1.0.0                ║');
  console.log('╚════════════════════════════════════════╝\n');

  try {
    // Paso 1: Verificar requisitos
    console.log('📋 Paso 1: Verificando requisitos\n');
    
    let requisitosOk = true;
    
    if (!verificarRequisito('node', 'Node.js')) {
      console.log('   ⚠️  Descarga Node.js desde https://nodejs.org/\n');
      requisitosOk = false;
    }
    
    if (!verificarRequisito('npm', 'npm')) {
      console.log('   ⚠️  npm viene con Node.js\n');
      requisitosOk = false;
    }

    if (!requisitosOk) {
      console.log('❌ Por favor instala los requisitos e intenta de nuevo\n');
      rl.close();
      process.exit(1);
    }

    console.log('\n✅ Todos los requisitos están instalados\n');

    // Paso 2: Información
    console.log('ℹ️  Paso 2: Información\n');
    console.log('  Sistema: ' + os.platform());
    console.log('  Arquitectura: ' + os.arch());
    console.log('  Carpeta de instalación: ' + process.cwd() + '\n');

    const continuar = await pregunta('¿Continuar con la instalación? (s/n): ');
    
    if (continuar.toLowerCase() !== 's' && continuar.toLowerCase() !== 'si') {
      console.log('\n❌ Instalación cancelada\n');
      rl.close();
      process.exit(0);
    }

    // Paso 3: Instalar dependencias
    console.log('\n📦 Paso 3: Instalando dependencias\n');

    if (!ejecutar('npm install', 'Dependencias raíz')) {
      throw new Error('Error en dependencias raíz');
    }

    if (!ejecutar('cd frontend && npm install && cd ..', 'Dependencias frontend')) {
      throw new Error('Error en frontend');
    }

    if (!ejecutar('cd backend && npm install && cd ..', 'Dependencias backend')) {
      throw new Error('Error en backend');
    }

    // Éxito
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  ✅ ¡Instalación completada!          ║');
    console.log('╚════════════════════════════════════════╝\n');

    console.log('📋 Próximos pasos:\n');
    console.log('  Para iniciar la aplicación:\n');
    console.log('    npm run electron-dev\n');
    console.log('  O para desarrollo frontend solamente:\n');
    console.log('    cd frontend && npm start\n');

    rl.close();
  } catch (error) {
    console.error('\n❌ Error durante la instalación:');
    console.error('   ' + error.message);
    console.log('\n💡 Asegúrate de tener:\n');
    console.log('  • Node.js v24.14.0+');
    console.log('  • npm v11.9.0+');
    console.log('  • Conexión a internet\n');
    rl.close();
    process.exit(1);
  }
}

instalar();
