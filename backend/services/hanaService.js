/**
 * Servicio para conectar a SAP HANA
 * Tabla: CMK_DOC_LOTE
 * Campos: Bultos, CANT_BULTOS, DocDate, FECHA_OV, FolioNum, OV
 */

const hana = require('@sap/hana-client');

/**
 * Crear conexión a SAP HANA
 */
async function conectarHANA() {
  return new Promise((resolve, reject) => {
    const connOptions = {
      serverNode: process.env.HANNA_ADDRESS + ':' + process.env.HANNA_PORT,
      uid: process.env.HANNA_USER,
      pwd: process.env.HANNA_PASSWORD,
      useTLS: false,
    };

    console.log(`📡 Intentando conectar a HANA: ${connOptions.serverNode}`);
    console.log(`   Usuario: ${connOptions.uid}`);

    const connection = hana.createConnection();
    
    connection.connect(connOptions, (err) => {
      if (err) {
        console.error('❌ Error conectando a HANA:', err.message);
        console.error('   Código:', err.code);
        console.error('   Verifica: usuario, contraseña, host y puerto');
        reject(err);
      } else {
        console.log('✅ Conectado a SAP HANA exitosamente');
        resolve(connection);
      }
    });
  });
}

/**
 * Obtener información de un bulto desde HANA (CMK_DOC_LOTE)
 * @param {string} codigoBulto - Código del bulto a buscar
 * @returns {Promise<Object>} Datos del bulto y otros bultos en esa factura
 */
async function obtenerBultoHANA(codigoBulto) {
  let connection;
  try {
    connection = await conectarHANA();

    return new Promise((resolve, reject) => {
      // Query para obtener el bulto y TODOS los bultos de la misma factura
      const query = `
        SELECT 
          "Bultos",
          "CANT_BULTOS",
          "DocDate",
          "FECHA_OV",
          "FolioNum",
          "OV"
        FROM "_SYS_BIC"."BI_CMK/CMK_DOC_LOTE"
        WHERE "FolioNum" = (
          SELECT "FolioNum" 
          FROM "_SYS_BIC"."BI_CMK/CMK_DOC_LOTE"
          WHERE "Bultos" LIKE '%${codigoBulto}%'
          LIMIT 1
        )
        ORDER BY "Bultos"
      `;

      console.log(`📝 Obteniendo bultos de HANA para factura...`);

      connection.exec(query, (err, result) => {
        connection.close((closeErr) => {
          if (closeErr) console.error('Error cerrando conexión:', closeErr);
        });

        if (err) {
          console.error('❌ Error en query HANA:', err.message);
          reject(err);
        } else {
          // Procesar los resultados: dividir bultos concatenados
          const bultosExpandidos = [];
          
          result.forEach(row => {
            if (row.Bultos && row.Bultos.includes(';')) {
              // Si contiene múltiples bultos separados por ;
              const codigosBultos = row.Bultos.split(';').map(b => b.trim()).filter(b => b);
              codigosBultos.forEach(codigo => {
                bultosExpandidos.push({
                  Bultos: codigo,
                  CANT_BULTOS: row.CANT_BULTOS,
                  DocDate: row.DocDate,
                  FECHA_OV: row.FECHA_OV,
                  FolioNum: row.FolioNum,
                  OV: row.OV
                });
              });
            } else {
              // Si es un bulto único
              bultosExpandidos.push(row);
            }
          });

          console.log(`📦 Total de bultos expandidos: ${bultosExpandidos.length}`);
          resolve(bultosExpandidos);
        }
      });
    });
  } catch (error) {
    console.error('Error al obtener bulto desde HANA:', error.message);
    throw error;
  }
}

/**
 * Obtener información de SAP desde HANA
 * @param {string} documento - Número de documento OV
 * @returns {Promise<Object>} Datos de SAP asociados
 */
async function obtenerSAPdesdeHANA(documento) {
  let connection;
  try {
    connection = await conectarHANA();

    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          "OV",
          "FECHA_OV",
          "FolioNum",
          "CANT_BULTOS"
        FROM "BI_CMK"."CMK_DOC_LOTE"
        WHERE "OV" = '${documento}'
      `;

      connection.exec(query, (err, result) => {
        connection.close((closeErr) => {
          if (closeErr) console.error('Error cerrando conexión:', closeErr);
        });

        if (err) {
          console.error('❌ Error en query SAP:', err.message);
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
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
