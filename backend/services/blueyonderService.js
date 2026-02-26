/**
 * Servicio para conectar a Blueyonder
 * TODO: Instalar con: npm install pg (para PostgreSQL)
 */

const { obtenerCredencial } = require('../config/credenciales.config');

/**
 * Conectar a Blueyonder
 * @returns {Promise<Pool>} Pool de conexión a Blueyonder
 */
async function conectarBlueyonder() {
  try {
    // TODO: Descomentar cuando se instale pg
    /*
    const { Pool } = require('pg');
    
    const pool = new Pool({
      host: obtenerCredencial('BLUEYONDER', 'ip'),
      port: obtenerCredencial('BLUEYONDER', 'puerto'),
      user: obtenerCredencial('BLUEYONDER', 'usuario'),
      password: obtenerCredencial('BLUEYONDER', 'contraseña'),
      database: obtenerCredencial('BLUEYONDER', 'database'),
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      console.error('Error inesperado en el pool de Blueyonder', err);
    });

    console.log('✅ Pool de conexión a Blueyonder creado');
    return pool;
    */

    console.log('⚠️ Blueyonder no está instalado aún. Usar: npm install pg');
    throw new Error('PostgreSQL client (pg) no instalado');
  } catch (error) {
    console.error('❌ Error al conectar a Blueyonder:', error.message);
    throw error;
  }
}

/**
 * Obtener información de shipment desde Blueyonder
 * @param {string} shipmentId - ID del shipment
 * @returns {Promise<Object>} Datos del shipment
 */
async function obtenerShipmentBlueyonder(shipmentId) {
  try {
    // TODO: Implementar query a Blueyonder
    // const pool = await conectarBlueyonder();
    // const result = await pool.query(
    //   'SELECT * FROM shipments WHERE shipment_id = $1',
    //   [shipmentId]
    // );
    // return result.rows[0];

    console.log('Query Blueyonder para shipment:', shipmentId);
    throw new Error('Blueyonder no configurado aún');
  } catch (error) {
    console.error('Error al obtener shipment desde Blueyonder:', error.message);
    throw error;
  }
}

/**
 * Obtener detalles de entrega
 * @param {string} trackingNumber - Número de tracking
 * @returns {Promise<Object>} Detalles de entrega
 */
async function obtenerDetallesEntregaBlueyonder(trackingNumber) {
  try {
    // TODO: Implementar query a Blueyonder
    console.log('Query detalles entrega:', trackingNumber);
    throw new Error('Blueyonder no configurado aún');
  } catch (error) {
    console.error(
      'Error al obtener detalles de entrega:',
      error.message
    );
    throw error;
  }
}

module.exports = {
  conectarBlueyonder,
  obtenerShipmentBlueyonder,
  obtenerDetallesEntregaBlueyonder,
};
