/**
 * Configuración de credenciales desde múltiples fuentes
 * Orden de prioridad:
 * 1. Variables de entorno (.env)
 * 2. Variables de entorno del sistema
 * 3. Configuración hardcodeada (solo para desarrollo)
 */

const CREDENCIALES_DEFAULT = {
  HANNA: {
    address: '192.168.75.6',
    port: 30013,
    user: 'user_bi',
    password: 'A9CiQqFSz8',
    database: 'HDB',
  },
  BLUEYONDER: {
    ip: '192.168.75.6',
    usuario: 'user_bi',
    contraseña: 'A9CiQqFSz8',
    puerto: 5432,
    database: 'blueyonder_db',
  },
  MYSQL: {
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'gestion_bultos',
    port: 3306,
  },
};

/**
 * Obtener credenciales desde variables de entorno
 * Las variables deben tener formato: HANNA_ADDRESS, BLUEYONDER_IP, etc.
 */
function cargarCredencialesDelEntorno() {
  const credenciales = { ...CREDENCIALES_DEFAULT };

  // Variables HANNA
  if (process.env.HANNA_ADDRESS)
    credenciales.HANNA.address = process.env.HANNA_ADDRESS;
  if (process.env.HANNA_PORT)
    credenciales.HANNA.port = parseInt(process.env.HANNA_PORT);
  if (process.env.HANNA_USER)
    credenciales.HANNA.user = process.env.HANNA_USER;
  if (process.env.HANNA_PASSWORD)
    credenciales.HANNA.password = process.env.HANNA_PASSWORD;

  // Variables BLUEYONDER
  if (process.env.BLUEYONDER_IP)
    credenciales.BLUEYONDER.ip = process.env.BLUEYONDER_IP;
  if (process.env.BLUEYONDER_USER)
    credenciales.BLUEYONDER.usuario = process.env.BLUEYONDER_USER;
  if (process.env.BLUEYONDER_PASSWORD)
    credenciales.BLUEYONDER.contraseña = process.env.BLUEYONDER_PASSWORD;
  if (process.env.BLUEYONDER_PORT)
    credenciales.BLUEYONDER.puerto = parseInt(process.env.BLUEYONDER_PORT);

  // Variables MYSQL
  if (process.env.MYSQL_HOST) credenciales.MYSQL.host = process.env.MYSQL_HOST;
  if (process.env.MYSQL_USER) credenciales.MYSQL.user = process.env.MYSQL_USER;
  if (process.env.MYSQL_PASSWORD)
    credenciales.MYSQL.password = process.env.MYSQL_PASSWORD;
  if (process.env.MYSQL_DATABASE)
    credenciales.MYSQL.database = process.env.MYSQL_DATABASE;
  if (process.env.MYSQL_PORT)
    credenciales.MYSQL.port = parseInt(process.env.MYSQL_PORT);

  return credenciales;
}

// Cargar credenciales desde variables de entorno
const CREDENCIALES = cargarCredencialesDelEntorno();

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
    if (credencial === undefined) {
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
  const fuentes = Object.keys(CREDENCIALES);
  const resultado = {};

  fuentes.forEach((fuente) => {
    resultado[fuente] = Object.keys(CREDENCIALES[fuente]).length > 0;
  });

  return resultado;
}

module.exports = {
  CREDENCIALES,
  obtenerCredencial,
  validarCredenciales,
};
