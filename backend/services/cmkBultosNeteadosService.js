/**
 * Consultas a las vistas MySQL:
 * - cmk_bultos_neteados
 *
 * Nota: aunque el neteo se calcule por SKU/LOTE, aquí consolidamos por BU.
 */

/**
 * @param {import('mysql2/promise').Pool} pool
 * @param {string} bu
 * @returns {Promise<null | { ordnum: string, ov_norm: string }>}
 */
async function obtenerOVDesdeBUNeteado(pool, bu) {
  const codigo = String(bu ?? '').trim();
  if (!codigo) return null;

  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(
      `
        SELECT
          ordnum,
          ov_norm,
          MAX(fecha_ult_mov) AS fecha_ult_mov
        FROM cmk_bultos_neteados
        WHERE BU = ?
        GROUP BY ordnum, ov_norm
        ORDER BY fecha_ult_mov DESC
        LIMIT 1
      `,
      [codigo]
    );
    if (!rows || rows.length === 0) return null;

    return {
      ordnum: rows[0].ordnum,
      ov_norm: String(rows[0].ov_norm ?? '').trim(),
    };
  } finally {
    connection.release();
  }
}

/**
 * @param {import('mysql2/promise').Pool} pool
 * @param {string|number} ovNorm
 * @returns {Promise<Array<{ codigo: string, ov: string }>>}
 */
async function obtenerBUsNeteadosPorOV(pool, ovNorm) {
  const ov = String(ovNorm ?? '').trim();
  if (!ov) return [];

  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(
      `
        SELECT
          BU,
          SUM(uni_neta) AS uni_neta
        FROM cmk_bultos_neteados
        WHERE ov_norm = ?
        GROUP BY BU
        HAVING SUM(uni_neta) > 0
        ORDER BY BU
      `,
      [ov]
    );

    return (rows || [])
      .map((r) => ({
        codigo: String(r.BU ?? '').trim(),
        ov,
      }))
      .filter((b) => b.codigo);
  } finally {
    connection.release();
  }
}

module.exports = {
  obtenerOVDesdeBUNeteado,
  obtenerBUsNeteadosPorOV,
};

