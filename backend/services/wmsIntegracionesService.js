const sql = require('mssql');
const { obtenerCredencial } = require('../config/credenciales.config');

let poolPromise = null;

function getSqlServerConfig() {
  const host = obtenerCredencial('BLUEYONDER', 'ip');
  const user = obtenerCredencial('BLUEYONDER', 'usuario');
  const password = obtenerCredencial('BLUEYONDER', 'contraseña');
  const database = obtenerCredencial('BLUEYONDER', 'database');
  const port = Number(obtenerCredencial('BLUEYONDER', 'puerto')) || 1433;

  return {
    server: host,
    port,
    user,
    password,
    database,
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
    requestTimeout: 30000,
    connectionTimeout: 15000,
  };
}

async function getPool() {
  if (!poolPromise) {
    const config = getSqlServerConfig();
    poolPromise = new sql.ConnectionPool(config).connect();
  }
  return poolPromise;
}

function normalizarBU(bu) {
  return String(bu ?? '').trim().toUpperCase();
}

/**
 * Obtiene la última integración (Salida Mercaderia) asociada a un BU.
 * Extrae el mensaje de error desde `respuesta` si existe.
 *
 * Nota: el error puede aplicar al envío completo (varios BU), por eso
 * explotamos `U_WMS_Bultos` en filas.
 *
 * @param {string} bu
 * @param {{ daysBack?: number }} [opts]
 * @returns {Promise<null | { bu: string, fecha: any, estado: string|null, trn_id: any, baseEntry: any, mensaje_error: string|null, codigo_error: string|null }>}
 */
async function obtenerUltimaIntegracionSalidaPorBU(bu, opts = {}) {
  const codigoBU = normalizarBU(bu);
  if (!codigoBU) return null;

  const daysBack = Number.isFinite(Number(opts.daysBack)) ? Number(opts.daysBack) : 14;

  const pool = await getPool();
  const request = pool.request();
  request.input('bu', sql.NVarChar(50), codigoBU);
  request.input('daysBack', sql.Int, daysBack);

  const query = `
    WITH src AS (
      SELECT
        v.id,
        v.fecha,
        v.[interface],
        v.estado,
        v.trn_id,
        v.BaseEntry,
        CASE
          WHEN ISJSON(v.envio) = 1 THEN JSON_VALUE(v.envio, '$.U_WMS_Bultos')
          ELSE NULL
        END AS u_wms_bultos,
        v.respuesta
      FROM dbo.v_integraciones v
      WHERE v.[interface] = 'Salida Mercaderia'
        AND v.fecha >= DATEADD(day, -@daysBack, GETDATE())
    ),
    exploded AS (
      SELECT
        s.fecha,
        s.estado,
        s.trn_id,
        s.BaseEntry,
        UPPER(LTRIM(RTRIM(x.value))) AS bu,
        s.respuesta
      FROM src s
      CROSS APPLY STRING_SPLIT(REPLACE(s.u_wms_bultos, ' ', ''), ',') x
      WHERE s.u_wms_bultos IS NOT NULL
    ),
    parsed AS (
      SELECT
        e.bu,
        e.fecha,
        e.estado,
        e.trn_id,
        e.BaseEntry,
        CASE
          WHEN e.respuesta IS NULL THEN NULL
          WHEN ISJSON(e.respuesta) = 1 THEN JSON_VALUE(e.respuesta, '$.error.message')
          WHEN CHARINDEX('{', e.respuesta) > 0
            AND ISJSON(SUBSTRING(e.respuesta, CHARINDEX('{', e.respuesta), LEN(e.respuesta))) = 1
            THEN JSON_VALUE(SUBSTRING(e.respuesta, CHARINDEX('{', e.respuesta), LEN(e.respuesta)), '$.error.message')
          ELSE NULL
        END AS mensaje_error,
        CASE
          WHEN e.respuesta IS NULL THEN NULL
          WHEN ISJSON(e.respuesta) = 1 THEN JSON_VALUE(e.respuesta, '$.error.code')
          WHEN CHARINDEX('{', e.respuesta) > 0
            AND ISJSON(SUBSTRING(e.respuesta, CHARINDEX('{', e.respuesta), LEN(e.respuesta))) = 1
            THEN JSON_VALUE(SUBSTRING(e.respuesta, CHARINDEX('{', e.respuesta), LEN(e.respuesta)), '$.error.code')
          ELSE NULL
        END AS codigo_error
      FROM exploded e
    )
    SELECT TOP 1
      bu,
      fecha,
      estado,
      trn_id,
      BaseEntry AS baseEntry,
      mensaje_error,
      codigo_error
    FROM parsed
    WHERE bu = @bu
    ORDER BY fecha DESC;
  `;

  const result = await request.query(query);
  const row = result && result.recordset && result.recordset[0] ? result.recordset[0] : null;
  if (!row) return null;

  return {
    bu: row.bu,
    fecha: row.fecha,
    estado: row.estado ?? null,
    trn_id: row.trn_id ?? null,
    baseEntry: row.baseEntry ?? null,
    mensaje_error: row.mensaje_error ?? null,
    codigo_error: row.codigo_error ?? null,
  };
}

module.exports = {
  obtenerUltimaIntegracionSalidaPorBU,
};

