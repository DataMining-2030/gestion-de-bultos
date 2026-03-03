/**
 * Configuración de credenciales desde backend/.env (ruta fija).
 *
 * Regla del proyecto:
 * - Todas las credenciales deben venir desde `Gestion_de_Bultos/backend/.env`
 * - No usar credenciales hardcodeadas como fallback
 */

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

function resolveBackendEnvPath() {
  const candidates = [
    // Dev y también prod si el .env se incluyó dentro de app/backend/.env
    path.join(__dirname, '..', '.env'),
    // Prod empaquetado: extraResources -> resources/backend/.env
    // process.resourcesPath existe en Electron empaquetado.
    ...(process && process.resourcesPath
      ? [path.join(process.resourcesPath, 'backend', '.env')]
      : []),
    // Ejecutando desde raíz del repo (fallback dev)
    path.join(process.cwd(), 'backend', '.env'),
  ];

  for (const p of candidates) {
    try {
      if (p && fs.existsSync(p)) return p;
    } catch (e) {
      // ignore
    }
  }

  const attempted = candidates.filter(Boolean).join(' | ');
  throw new Error(`No se encontró backend/.env. Rutas probadas: ${attempted}`);
}

const ENV_PATH = resolveBackendEnvPath();
dotenv.config({ path: ENV_PATH });

function requiredEnv(name) {
  const v = process.env[name];
  if (v === undefined || v === null || String(v).trim() === '') {
    throw new Error(`Falta variable requerida en backend/.env (${ENV_PATH}): ${name}`);
  }
  return String(v).trim();
}

function requiredIntEnv(name) {
  const raw = requiredEnv(name);
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) {
    throw new Error(`Variable inválida en backend/.env (se esperaba número): ${name}=${raw}`);
  }
  return n;
}

// Credenciales desde backend/.env
const CREDENCIALES = {
  HANNA: {
    address: requiredEnv('HANNA_ADDRESS'),
    port: requiredIntEnv('HANNA_PORT'),
    user: requiredEnv('HANNA_USER'),
    password: requiredEnv('HANNA_PASSWORD'),
  },
  // Nota: esta fuente se usa para BY/SQL Server (wms2024) en la integración WMS->SAP
  BLUEYONDER: {
    ip: requiredEnv('BLUEYONDER_IP'),
    usuario: requiredEnv('BLUEYONDER_USER'),
    contraseña: requiredEnv('BLUEYONDER_PASSWORD'),
    puerto: requiredIntEnv('BLUEYONDER_PORT'),
    database: requiredEnv('BLUEYONDER_DATABASE'),
  },
  MYSQL: {
    host: requiredEnv('MYSQL_HOST'),
    user: requiredEnv('MYSQL_USER'),
    password: requiredEnv('MYSQL_PASSWORD'),
    database: requiredEnv('MYSQL_DATABASE'),
    port: requiredIntEnv('MYSQL_PORT'),
  },
};

/**
 * Obtener credencial por fuente
 * @param {string} fuente - 'HANNA', 'BLUEYONDER' o 'MYSQL'
 * @param {string} campo - Campo específico de la credencial
 * @returns {string|number} Valor de la credencial
 */
function obtenerCredencial(fuente, campo) {
  try {
    if (!CREDENCIALES[fuente]) {
      throw new Error(`Fuente desconocida: ${fuente}`);
    }

    const credencial = CREDENCIALES[fuente][campo];
    if (credencial === undefined || credencial === null || String(credencial).trim() === '') {
      throw new Error(
        `Campo no encontrado: ${campo} en ${fuente}`
      );
    }

    return credencial;
  } catch (error) {
    console.error('Error al obtener credencial:', error.message);
    throw error;
  }
}

/**
 * Validar que todas las credenciales requeridas estén disponibles
 */
function validarCredenciales() {
  try {
    // Si la carga fue exitosa, las credenciales requeridas existen
    return {
      HANNA: true,
      BLUEYONDER: true,
      MYSQL: true,
    };
  } catch (e) {
    return {
      HANNA: false,
      BLUEYONDER: false,
      MYSQL: false,
      error: e.message,
    };
  }
}

module.exports = {
  CREDENCIALES,
  obtenerCredencial,
  validarCredenciales,
};
