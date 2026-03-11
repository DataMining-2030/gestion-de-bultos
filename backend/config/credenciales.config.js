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

// Runtime Decryption Logic
function cargarVariablesEntorno() {
  const encPath = process && process.resourcesPath ? path.join(process.resourcesPath, 'backend', '.env.enc') : null;

  // 1. Intento cargar versión encriptada (Producción)
  if (encPath && fs.existsSync(encPath)) {
    try {
      const crypto = require('crypto');
      const encrypted = fs.readFileSync(encPath, 'utf8');
      
      const key = crypto.scryptSync('ccd_secure_key_2026_xyz', 'ccd_salt', 32);
      const iv = Buffer.alloc(16, 0);
      
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      const envConfig = dotenv.parse(decrypted);
      for (const k in envConfig) {
        process.env[k] = envConfig[k];
      }
      return '.env.enc (Encriptado)';
    } catch (err) {
      console.error('Error desencriptando credenciales:', err);
    }
  }

  // 2. Fallback a .env en texto plano (Desarrollo)
  const candidates = [
    path.join(__dirname, '..', '.env'),
    path.join(process.cwd(), 'backend', '.env'),
    path.join(process.cwd(), '.env')
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p });
      return p;
    }
  }

  throw new Error(`No se encontró backend/.env ni .env.enc en las rutas probadas.`);
}

const ENV_SOURCE = cargarVariablesEntorno();

function requiredEnv(name) {
  const v = process.env[name];
  if (v === undefined || v === null || String(v).trim() === '') {
    throw new Error(`Falta variable requerida en backend/.env (${ENV_SOURCE}): ${name}`);
  }
  return String(v).trim();
}

function requiredIntEnv(name) {
  const raw = requiredEnv(name);
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) {
    throw new Error(`Variable inválida (se esperaba número): ${name}=${raw}`);
  }
  return n;
}

// Credenciales desde entorno
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
