/**
 * Obtención de bultos desde MySQL (tabla by_produccion).
 *
 * Reglas:
 * - actcod = 'GENMOV' (movimiento de embalaje)
 * - bulto desde columna to_lodnum cuando parte con 'BU'
 * - OV desde columna ordnum
 */

function normalizarOV(ovRaw) {
  const s = String(ovRaw ?? '').trim();
  if (!s) return s;
  const m = s.match(/(\d{6})\s*$/);
  if (m) return m[1];
  return s.length >= 6 ? s.slice(-6) : s;
}

/**
 * @param {import('mysql2/promise').Pool} pool
 * @param {string} codigoBulto
 * @returns {Promise<null | { ovRaw: string|number, ov: string, bultos: Array<{ codigo: string, ov: string }> }>}
 */
async function obtenerBultosPorOVDesdeBYProduccion(pool, codigoBulto) {
  const codigo = (codigoBulto || '').trim();
  if (!codigo) return null;
  if (!codigo.toUpperCase().startsWith('BU')) return null;

  const connection = await pool.getConnection();
  try {
    const [ovRows] = await connection.query(
      `
        SELECT ordnum
        FROM by_produccion
        WHERE actcod = ?
          AND to_lodnum = ?
          AND to_lodnum LIKE 'BU%'
        LIMIT 1
      `,
      ['GENMOV', codigo]
    );

    if (!ovRows || ovRows.length === 0) return null;

    const ovRaw = ovRows[0].ordnum;
    const ov = normalizarOV(ovRaw);

    const [bultosRows] = await connection.query(
      `
        SELECT DISTINCT
          to_lodnum AS codigo,
          ordnum   AS ov
        FROM by_produccion
        WHERE actcod = ?
          AND ordnum = ?
          AND to_lodnum LIKE 'BU%'
        ORDER BY to_lodnum
      `,
      ['GENMOV', ovRaw]
    );

    const bultos = (bultosRows || [])
      .map((r) => ({
        codigo: (r.codigo || '').trim(),
        ov: normalizarOV(r.ov),
      }))
      .filter((b) => b.codigo);

    if (bultos.length === 0) return null;

    return { ovRaw, ov, bultos };
  } finally {
    connection.release();
  }
}

/**
 * @param {import('mysql2/promise').Pool} pool
 * @param {string|number} ovValue
 * @returns {Promise<Array<{ codigo: string, ov: string }>>}
 */
async function obtenerBultosPorOV(pool, ovValue) {
  const ovRaw = ovValue === undefined || ovValue === null ? '' : String(ovValue).trim();
  if (!ovRaw) return [];

  const connection = await pool.getConnection();
  try {
    async function queryByOV(value) {
      const [rows] = await connection.query(
        `
          SELECT DISTINCT
            to_lodnum AS codigo,
            ordnum   AS ov
          FROM by_produccion
          WHERE actcod = ?
            AND ordnum = ?
            AND to_lodnum LIKE 'BU%'
          ORDER BY to_lodnum
        `,
        ['GENMOV', value]
      );
      return rows || [];
    }

    let rows = await queryByOV(ovRaw);
    if (rows.length === 0) {
      // Si viene normalizada (6 dígitos), intentar también con prefijo OV_
      if (/^\d{6}$/.test(ovRaw)) {
        rows = await queryByOV(`OV_${ovRaw}`);
      }
    }

    return (rows || [])
      .map((r) => ({
        codigo: (r.codigo || '').trim(),
        ov: normalizarOV(r.ov),
      }))
      .filter((b) => b.codigo);
  } finally {
    connection.release();
  }
}

module.exports = {
  obtenerBultosPorOVDesdeBYProduccion,
  obtenerBultosPorOV,
};

