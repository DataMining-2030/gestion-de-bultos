#!/usr/bin/env node

/**
 * Script para generar el instalador .exe
 * Ejecutar: node build-installer.js
 * 
 * Genera un archivo .exe que el usuario puede descargar y ejecutar
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n╔════════════════════════════════════════╗');
console.log('║  Generador de Instalador .exe          ║');
console.log('╚════════════════════════════════════════╝\n');

try {
  console.log('📦 Paso 1: Verificando pkg...\n');
  
  try {
    execSync('pkg --version', { stdio: 'pipe' });
    console.log('  ✅ pkg está instalado\n');
  } catch {
    console.log('  ⏳ Instalando pkg globalmente...');
    execSync('npm install -g pkg', { stdio: 'pipe' });
    console.log('  ✅ pkg instalado\n');
  }

  console.log('🔨 Paso 2: Generando instalador .exe\n');
  console.log('  ⏳ Empaquetando... (esto puede tardar ~1 minuto)\n');

  const comando = 'pkg install.js --targets win --output instalador-gestion-bultos.exe --compress Brotli';
  execSync(comando, { stdio: 'inherit' });

  console.log('\n✅ Instalador generado exitosamente\n');

  console.log('╔════════════════════════════════════════╗');
  console.log('║  ✅ ¡Archivo listo!                   ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log('📁 Archivo generado:\n');
  console.log('  instalador-gestion-bultos.exe\n');

  console.log('📋 Para distribuir:\n');
  console.log('  1. Sube el archivo .exe a un servidor');
  console.log('  2. Los usuarios lo descargan y hacen doble-click');
  console.log('  3. Se instala automáticamente\n');

  console.log('💡 Tamaño aproximado: 100-150 MB\n');

} catch (error) {
  console.error('\n❌ Error al generar el instalador:');
  console.error('   ' + error.message);
  
  if (error.message.includes('pkg')) {
    console.log('\n💡 Solución:');
    console.log('  npm install -g pkg\n');
  }
  
  process.exit(1);
}
