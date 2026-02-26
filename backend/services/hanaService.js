/**
 * Servicio para conectar a SAP HANA
 * TODO: Instalar hana con: npm install @sap/hana-client
 */

const { obtenerCredencial } = require('../config/credenciales.config');

/**
 * Conectar a SAP HANA
 * @returns {Promise<Connection>} Conexión a HANA
 */
async function conectarHANA() {
  try {
    // TODO: Descomentar cuando se instale hana-client
    /*
    const hana = require('@sap/hana-client');
    
    const connOptions = {
      serverNode: obtenerCredencial('HANNA', 'address') + ':' + obtenerCredencial('HANNA', 'port'),
      uid: obtenerCredencial('HANNA', 'user'),
      pwd: obtenerCredencial('HANNA', 'password'),
    };

    const connection = await hana.createConnection().connect(connOptions);
    console.log('✅ Conectado a SAP HANA');
    return connection;
    */

    console.log('⚠️ HANA no está instalado aún. Usar: npm install @sap/hana-client');
    throw new Error('HANA client no instalado');
  } catch (error) {
    console.error('❌ Error al conectar a HANA:', error.message);
    throw error;
  }
}

/**
 * Obtener información de un bulto desde HANA
 * @param {string} codigoBulto - Código del bulto
 * @returns {Promise<Object>} Datos del bulto
 */
async function obtenerBultoHANA(codigoBulto) {
  try {
    // TODO: Implementar query a HANA
    // const connection = await conectarHANA();
    // const query = `SELECT * FROM BULTOS WHERE CODIGO = '${codigoBulto}'`;
    // const result = await connection.exec(query);
    // return result;

    console.log('Query HANA para bulto:', codigoBulto);
    throw new Error('HANA no configurado aún');
  } catch (error) {
    console.error('Error al obtener bulto desde HANA:', error.message);
    throw error;
  }
}

/**
 * Obtener información de SAP desde HANA
 * @param {string} documento - Documento SAP
 * @returns {Promise<Object>} Datos de SAP
 */
async function obtenerSAPdesdeHANA(documento) {
  try {
    // TODO: Implementar query a HANA para obtener datos de SAP
    // SELECT MANDT, EBELN, EBELP, LFIMG FROM EKPO WHERE EBELN = '${documento}'
    console.log('Query SAP para documento:', documento);
    throw new Error('HANA no configurado aún');
  } catch (error) {
    console.error('Error al obtener SAP desde HANA:', error.message);
    throw error;
  }
}

module.exports = {
  conectarHANA,
  obtenerBultoHANA,
  obtenerSAPdesdeHANA,
};
