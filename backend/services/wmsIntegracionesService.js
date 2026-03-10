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

function limpiarMensajeError(value) {
  const s = String(value ?? '').trim();
  if (!s) return null;

  // Quitar sufijos técnicos tipo: [DocumentLines.BaseEntry][line: 1]
  const sinSufijo = s.replace(/\s*\[DocumentLines\.BaseEntry\]\[line:\s*\d+\]\s*$/i, '').trim();
  return sinSufijo || null;
}

function obtenerTipoErrorDesdeTexto(respuesta) {
  const r = String(respuesta ?? '').trim();
  if (!r) return null;

  const includes = (needle) => r.toLowerCase().includes(String(needle).toLowerCase());

  if (includes('base documents has already been closed')) return 'documento base cerrado';
  if (includes('negative inventory')) return 'diferencia de inventario';
  if (includes('target item number does not match')) return 'item no cuadra en el documento base';
  if (includes('invalid record offset')) return 'error de formato';
  if (includes('is inactive')) return 'cliente inactivo';
  if (includes('internal error')) return 'error interno';
  if (includes('cannot be copied partially')) return 'no copia parcial';
  if (includes('cantidad supera la ov')) return 'sobreasignación';
  if (includes('proxy server could not handle')) return 'conexión';
  if (includes('read timed out')) return 'conexión';
  if (includes('insufficient quantity')) return 'inventario insuficiente';
  return 'Otro / Sin Error';
}

function capitalizarPrimera(s) {
  const str = String(s ?? '').trim();
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function obtenerMensajeUsuario({ tipoError, mensajeRaw }) {
  const tipo = String(tipoError ?? '').trim();
  const raw = String(mensajeRaw ?? '').trim();

  if (!tipo || tipo === 'Otro / Sin Error') return raw || null;

  // Cuando existe detalle con SKU/LOTE, lo incorporamos en el mensaje en español
  if (tipo === 'inventario insuficiente') {
    const itemMatch = raw.match(/item\s+([A-Z0-9_-]+)/i);
    const batchMatch = raw.match(/batch\s+([A-Z0-9_-]+)/i);
    const item = itemMatch ? itemMatch[1] : null;
    const batch = batchMatch ? batchMatch[1] : null;

    if (item && batch) return `Inventario insuficiente para item ${item} (lote ${batch})`;
    if (item) return `Inventario insuficiente para item ${item}`;
    return 'Inventario insuficiente';
  }

  // Para el resto, usamos el tipo en español como mensaje principal
  return capitalizarPrimera(tipo);
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
 * @returns {Promise<null | { bu: string, fecha: any, estado: string|null, trn_id: any, mensaje_error: string|null, mensaje_usuario: string|null, codigo_error: string|null, tipo_error: string|null }>}
 */
async function obtenerUltimaIntegracionSalidaPorBU(bu, opts = {}) {
  const codigoBU = normalizarBU(bu);
  if (!codigoBU) return null;

  const daysBack = Number.isFinite(Number(opts.daysBack)) ? Number(opts.daysBack) : 60;

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
        -- Intentar extraer U_WMS_Bultos desde JSON
        CASE
          WHEN ISJSON(v.envio) = 1 THEN JSON_VALUE(v.envio, '$.U_WMS_Bultos')
          WHEN CHARINDEX('{', v.envio) > 0
            AND ISJSON(SUBSTRING(v.envio, CHARINDEX('{', v.envio), LEN(v.envio))) = 1
            THEN JSON_VALUE(SUBSTRING(v.envio, CHARINDEX('{', v.envio), LEN(v.envio)), '$.U_WMS_Bultos')
          ELSE NULL
        END AS u_wms_bultos,
        v.envio,
        v.respuesta
      FROM dbo.v_integraciones v
      WHERE LTRIM(RTRIM(v.[interface])) = 'Salida Mercaderia'
        AND v.fecha >= DATEADD(day, -@daysBack, GETDATE())
    ),

    -- Camino 1: extraccion JSON (U_WMS_Bultos encontrado)
    exploded_json AS (
      SELECT
        s.fecha,
        s.estado,
        s.trn_id,
        UPPER(
          LTRIM(RTRIM(
            REPLACE(REPLACE(x.value, '"', ''), '''', '')
          ))
        ) AS bu,
        s.respuesta
      FROM src s
      CROSS APPLY STRING_SPLIT(REPLACE(ISNULL(s.u_wms_bultos, ''), ' ', ''), ';') x
      WHERE s.u_wms_bultos IS NOT NULL
        AND LEN(LTRIM(RTRIM(x.value))) > 0
    ),

    -- Camino 2 (fallback): el BU aparece en el texto de envio
    --   cuando el parseo JSON no extrae U_WMS_Bultos
    exploded_text AS (
      SELECT DISTINCT
        s.fecha,
        s.estado,
        s.trn_id,
        @bu AS bu,
        s.respuesta
      FROM src s
      WHERE s.u_wms_bultos IS NULL
        AND CHARINDEX(@bu, UPPER(ISNULL(CAST(s.envio AS NVARCHAR(MAX)), ''))) > 0
    ),

    combined AS (
      SELECT * FROM exploded_json WHERE bu = @bu
      UNION ALL
      SELECT * FROM exploded_text
    ),

    parsed AS (
      SELECT
        c.bu,
        c.fecha,
        c.estado,
        c.trn_id,
        c.respuesta,
        CASE
          WHEN c.respuesta IS NULL THEN NULL
          WHEN ISJSON(c.respuesta) = 1 THEN JSON_VALUE(c.respuesta, '$.error.message')
          WHEN CHARINDEX('{', c.respuesta) > 0
            AND ISJSON(SUBSTRING(c.respuesta, CHARINDEX('{', c.respuesta), LEN(c.respuesta))) = 1
            THEN JSON_VALUE(SUBSTRING(c.respuesta, CHARINDEX('{', c.respuesta), LEN(c.respuesta)), '$.error.message')
          ELSE NULL
        END AS mensaje_error,
        CASE
          WHEN c.respuesta IS NULL THEN NULL
          WHEN ISJSON(c.respuesta) = 1 THEN JSON_VALUE(c.respuesta, '$.error.code')
          WHEN CHARINDEX('{', c.respuesta) > 0
            AND ISJSON(SUBSTRING(c.respuesta, CHARINDEX('{', c.respuesta), LEN(c.respuesta))) = 1
            THEN JSON_VALUE(SUBSTRING(c.respuesta, CHARINDEX('{', c.respuesta), LEN(c.respuesta)), '$.error.code')
          ELSE NULL
        END AS codigo_error
      FROM combined c
    )
    SELECT TOP 1
      bu,
      fecha,
      estado,
      trn_id,
      respuesta,
      mensaje_error,
      codigo_error
    FROM parsed
    ORDER BY fecha DESC;
  `;

  const result = await request.query(query);
  const row = result && result.recordset && result.recordset[0] ? result.recordset[0] : null;
  if (!row) return null;

  const mensaje = limpiarMensajeError(row.mensaje_error);
  const tipo = obtenerTipoErrorDesdeTexto(row.respuesta || mensaje || '');
  const mensajeUsuario = obtenerMensajeUsuario({ tipoError: tipo, mensajeRaw: mensaje || row.respuesta || '' });

  return {
    bu: row.bu,
    fecha: row.fecha,
    estado: row.estado ?? null,
    trn_id: row.trn_id ?? null,
    // Mantener el detalle original (aquí suele venir SKU/LOTE). El motivo en español va en `tipo_error`.
    mensaje_error: mensaje,
    // Mensaje para UI (español; incluye SKU/LOTE si se logra extraer)
    mensaje_usuario: mensajeUsuario,
    codigo_error: row.codigo_error ?? null,
    tipo_error: tipo,
  };
}

module.exports = {
  obtenerUltimaIntegracionSalidaPorBU,
};

