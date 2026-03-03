/**
 * Servicio para conectar a SAP HANA
 * Tabla: CMK_DOC_LOTE
 * Campos: Bultos, CANT_BULTOS, DocDate, FECHA_OV, FolioNum, OV
 */

const hana = require('@sap/hana-client');

function combinarFechaHora(fecha, hora) {
  if (!fecha) return null;

  let y;
  let m;
  let d;

  const asDate = fecha instanceof Date ? fecha : null;
  if (asDate && !Number.isNaN(asDate.getTime())) {
    y = asDate.getFullYear();
    m = asDate.getMonth();
    d = asDate.getDate();
  } else {
    const s = String(fecha).trim();
    const match = s.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      y = Number(match[1]);
      m = Number(match[2]) - 1;
      d = Number(match[3]);
    } else {
      const dt = new Date(fecha);
      if (Number.isNaN(dt.getTime())) return null;
      y = dt.getFullYear();
      m = dt.getMonth();
      d = dt.getDate();
    }
  }

  // Hora_OV viene como HHMM (ej 1514 => 15:14, 945 => 09:45)
  if (hora === undefined || hora === null || String(hora).trim() === '') {
    return new Date(y, m, d, 0, 0, 0, 0);
  }

  const num = Number(String(hora).trim());
  if (!Number.isFinite(num)) {
    return new Date(y, m, d, 0, 0, 0, 0);
  }

  const hhmm = String(Math.trunc(num)).padStart(4, '0');
  const hh = Number(hhmm.slice(0, 2));
  const mm = Number(hhmm.slice(2, 4));

  if (Number.isNaN(hh) || Number.isNaN(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) {
    return new Date(y, m, d, 0, 0, 0, 0);
  }

  return new Date(y, m, d, hh, mm, 0, 0);
}

function normalizarEstadoOV(value) {
  const v = String(value ?? '').trim().toUpperCase();
  if (v === 'O') return 'Abierta';
  if (v === 'C') return 'Cerrada';
  return value ?? null;
}

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
 * Obtener TODOS los bultos asociados a una OV desde HANA.
 * Nota: algunos bultos pueden venir concatenados con ';', se expanden.
 * @param {string|number} ov
 * @returns {Promise<Array<Object>>}
 */
async function obtenerBultosPorOVHANA(ov) {
  const ovValue = ov === undefined || ov === null ? '' : String(ov).trim();
  if (!ovValue) return [];

  let connection;
  try {
    connection = await conectarHANA();

    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          "Bultos",
          "CANT_BULTOS",
          "DocDate",
          "FECHA_OV",
          "FolioNum",
          "OV"
        FROM "_SYS_BIC"."BI_CMK/CMK_DOC_LOTE"
        WHERE "OV" = '${ovValue}'
        ORDER BY "FolioNum", "Bultos"
      `;

      console.log(`📝 Obteniendo bultos de HANA para OV: ${ovValue}`);

      connection.exec(query, (err, result) => {
        connection.close((closeErr) => {
          if (closeErr) console.error('Error cerrando conexión:', closeErr);
        });

        if (err) {
          console.error('❌ Error en query HANA (OV):', err.message);
          reject(err);
          return;
        }

        const bultosExpandidos = [];
        (result || []).forEach((row) => {
          if (row.Bultos && row.Bultos.includes(';')) {
            const codigos = row.Bultos.split(';').map((b) => b.trim()).filter(Boolean);
            codigos.forEach((codigo) => {
              bultosExpandidos.push({
                Bultos: codigo,
                CANT_BULTOS: row.CANT_BULTOS,
                DocDate: row.DocDate,
                FECHA_OV: row.FECHA_OV,
                FolioNum: row.FolioNum,
                OV: row.OV,
              });
            });
          } else {
            bultosExpandidos.push(row);
          }
        });

        resolve(bultosExpandidos);
      });
    });
  } catch (error) {
    console.error('Error al obtener bultos por OV desde HANA:', error.message);
    throw error;
  }
}

/**
 * Obtener trazabilidad/resumen de la OV desde CMK_TRAZABILIDAD_OV
 * @param {string|number} ov
 * @returns {Promise<null | { Comuna: any, FechaHora_OV: any, Estado_Documento_OV: any, Nombre_Tipo_Operacion_OV: any, Calle_OV: any }>}
 */
async function obtenerTrazabilidadOVHANA(ov) {
  const ovValue = ov === undefined || ov === null ? '' : String(ov).trim();
  if (!ovValue) return null;

  let connection;
  try {
    connection = await conectarHANA();

    const execQuery = (query) =>
      new Promise((resolve, reject) => {
        connection.exec(query, (err, result) => {
          if (err) reject(err);
          else resolve(result || []);
        });
      });

    // Algunas instalaciones lo exponen como vista en _SYS_BIC y otras como tabla/objeto directo.
    const sources = [
      `"_SYS_BIC"."BI_CMK/CMK_TRAZABILIDAD_OV"`,
      `"BI_CMK"."CMK_TRAZABILIDAD_OV"`,
      `"CMK_TRAZABILIDAD_OV"`,
    ];

    console.log(`📝 Obteniendo trazabilidad OV desde HANA: ${ovValue}`);

    let lastErr = null;
    for (const src of sources) {
      // Variantes de nombres de columnas: en HANA, si fueron creadas sin comillas suelen quedar en MAYÚSCULAS.
      // Columnas reales (según revisión): Comuna_OV, Fecha_OV, Estado_Documento_OV, Nombre_Tipo_Operacion_OV, Calle_OV,
      //                                  Nombre_Cliente_OV, Ruta_OV, Numero_SAP_OV
      const columnVariants = [
        // 1) Columnas exactamente como las entregaste (case-sensitive con comillas)
        {
          comuna: `"Comuna_OV"`,
          fecha: `"Fecha_OV"`,
          hora: `"Hora_OV"`,
          estado: `"Estado_Documento_OV"`,
          estr: `"Nombre_Tipo_Operacion_OV"`,
          calle: `"Calle_OV"`,
          cliente: `"Nombre_Cliente_OV"`,
          ruta: `"Ruta_OV"`,
          ov: `"Numero_SAP_OV"`,
          orderBy: `"Fecha_OV"`,
        },
        // 2) Sin comillas (HANA las resuelve a MAYÚSCULAS)
        {
          comuna: `Comuna_OV`,
          fecha: `Fecha_OV`,
          hora: `Hora_OV`,
          estado: `Estado_Documento_OV`,
          estr: `Nombre_Tipo_Operacion_OV`,
          calle: `Calle_OV`,
          cliente: `Nombre_Cliente_OV`,
          ruta: `Ruta_OV`,
          ov: `Numero_SAP_OV`,
          orderBy: `Fecha_OV`,
        },
        // 3) MAYÚSCULAS entre comillas
        {
          comuna: `"COMUNA_OV"`,
          fecha: `"FECHA_OV"`,
          hora: `"HORA_OV"`,
          estado: `"ESTADO_DOCUMENTO_OV"`,
          estr: `"NOMBRE_TIPO_OPERACION_OV"`,
          calle: `"CALLE_OV"`,
          cliente: `"NOMBRE_CLIENTE_OV"`,
          ruta: `"RUTA_OV"`,
          ov: `"NUMERO_SAP_OV"`,
          orderBy: `"FECHA_OV"`,
        },
      ];

      for (const c of columnVariants) {
        const query = `
          SELECT
            ${c.comuna}  AS "Comuna_OV",
            ${c.fecha}   AS "Fecha_OV",
            ${c.hora}    AS "Hora_OV",
            ${c.estado}  AS "Estado_Documento_OV",
            ${c.estr}    AS "Nombre_Tipo_Operacion_OV",
            ${c.calle}   AS "Calle_OV",
            ${c.cliente} AS "Nombre_Cliente_OV",
            ${c.ruta}    AS "Ruta_OV"
          FROM ${src}
          WHERE TO_NVARCHAR(${c.ov}) = '${ovValue}'
          ORDER BY ${c.orderBy} DESC
          LIMIT 1
        `;

        try {
          // eslint-disable-next-line no-await-in-loop
          const rows = await execQuery(query);
          if (!rows || rows.length === 0) {
            return null;
          }
          const r = rows[0] || {};
          const fechaOv = combinarFechaHora(r.Fecha_OV ?? null, r.Hora_OV ?? null);

          // Normalizar llaves a lo que espera el frontend (labels en pantalla)
          return {
            Comuna: r.Comuna_OV ?? null,
            'Fecha OV': fechaOv ?? (r.Fecha_OV ?? null),
            'Estado OV': normalizarEstadoOV(r.Estado_Documento_OV),
            Estratificación: r.Nombre_Tipo_Operacion_OV ?? null,
            Direccion: r.Calle_OV ?? null,
            Cliente: r.Nombre_Cliente_OV ?? null,
            'Ruta OV': r.Ruta_OV ?? null,
          };
        } catch (e) {
          lastErr = e;
          // probar siguiente variante de columnas / fuente
        }
      }
    }

    if (lastErr) throw lastErr;
    return null;
  } catch (error) {
    console.error('Error al obtener trazabilidad OV desde HANA:', error.message);
    throw error;
  } finally {
    if (connection) {
      connection.close((closeErr) => {
        if (closeErr) console.error('Error cerrando conexión:', closeErr);
      });
    }
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
  obtenerBultosPorOVHANA,
  obtenerTrazabilidadOVHANA,
  obtenerSAPdesdeHANA,
};
