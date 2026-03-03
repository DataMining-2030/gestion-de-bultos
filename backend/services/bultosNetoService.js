/**
 * Neto de unidades por BU para excluir "bultos fantasma".
 *
 * Basado en la lógica de Power BI:
 * - GENMOV:
 *   - NoBU -> BU = +trnqty al BU destino
 *   - BU -> BU = -trnqty al BU origen y +trnqty al BU destino
 * - UPCK sobre BU = -trnqty al BU (se imputa a la OV del último GENMOV hacia ese BU por SKU/LOT)
 */

function normalizarOV(ovRaw) {
  const s = String(ovRaw ?? '').trim();
  if (!s) return s;
  const m = s.match(/(\d{6})\s*$/);
  if (m) return m[1];
  return s.length >= 6 ? s.slice(-6) : s;
}

function startsWithBU(value) {
  return String(value ?? '').toUpperCase().startsWith('BU');
}

function toDateMs(value) {
  const d = new Date(value);
  const ms = d.getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * @param {import('mysql2/promise').Pool} pool
 * @param {{ ovRaw?: string|number, ov?: string|number, buList: string[] }} params
 * @returns {Promise<Map<string, number>>} Map BU->uniNeta
 */
async function obtenerUnidadesNetasPorBU(pool, { ovRaw, ov, buList }) {
  const ovRawStr = String(ovRaw ?? '').trim();
  const ovNorm = normalizarOV(ov ?? ovRawStr);
  const bu = Array.isArray(buList) ? buList.filter(Boolean) : [];

  if (!bu.length) return new Map();

  const connection = await pool.getConnection();
  try {
    // GENMOV del ordnum "raw" (ej: OV_331909)
    let genmovRows = [];
    if (ovRawStr) {
      const [rows] = await connection.query(
        `
          SELECT
            trndte,
            ordnum,
            prtnum,
            lotnum,
            lodnum,
            to_lodnum,
            trnqty
          FROM by_produccion
          WHERE actcod = 'GENMOV'
            AND ordnum = ?
            AND to_lodnum LIKE 'BU%'
            AND lodnum <> to_lodnum
            AND trnqty <> 0
        `,
        [ovRawStr]
      );
      genmovRows = rows || [];
    } else {
      // Si no tenemos ovRaw, intentar con ov normalizada y con prefijo
      const candidates = [];
      if (ovNorm) candidates.push(ovNorm);
      if (ovNorm && /^\d{6}$/.test(String(ovNorm))) candidates.push(`OV_${ovNorm}`);

      for (const cand of candidates) {
        // eslint-disable-next-line no-await-in-loop
        const [rows] = await connection.query(
          `
            SELECT
              trndte,
              ordnum,
              prtnum,
              lotnum,
              lodnum,
              to_lodnum,
              trnqty
            FROM by_produccion
            WHERE actcod = 'GENMOV'
              AND ordnum = ?
              AND to_lodnum LIKE 'BU%'
              AND lodnum <> to_lodnum
              AND trnqty <> 0
          `,
          [cand]
        );
        if (rows && rows.length) {
          genmovRows = rows;
          break;
        }
      }
    }

    // Índice para imputar OV en UPCK: (BU, SKU, LOT) -> lista ordenada por trndte
    const index = new Map();
    let minTrndteMs = null;

    for (const r of genmovRows) {
      const buTo = String(r.to_lodnum ?? '').trim();
      const sku = String(r.prtnum ?? '').trim();
      const lot = String(r.lotnum ?? '').trim();
      const ordRaw = String(r.ordnum ?? '').trim();
      if (!buTo || !sku || !lot || !ordRaw) continue;

      const ms = toDateMs(r.trndte);
      if (ms !== null) {
        minTrndteMs = minTrndteMs === null ? ms : Math.min(minTrndteMs, ms);
      }

      const key = `${buTo.toUpperCase()}|${sku}|${lot}`;
      const arr = index.get(key) || [];
      arr.push({ ms: ms ?? -1, ordnum: ordRaw });
      index.set(key, arr);
    }

    for (const arr of index.values()) {
      arr.sort((a, b) => a.ms - b.ms);
    }

    // UPCK para BUs de la OV (si no hay genmov, no imputamos nada)
    let upckRows = [];
    if (index.size) {
      // Para acotar: desde la primera fecha GENMOV (si existe)
      if (minTrndteMs !== null) {
        const minDate = new Date(minTrndteMs);
        const [rows] = await connection.query(
          `
            SELECT
              trndte,
              prtnum,
              lotnum,
              lodnum,
              trnqty
            FROM by_produccion
            WHERE actcod = 'UPCK'
              AND lodnum LIKE 'BU%'
              AND trnqty <> 0
              AND lodnum IN (?)
              AND trndte >= ?
          `,
          [bu, minDate]
        );
        upckRows = rows || [];
      } else {
        const [rows] = await connection.query(
          `
            SELECT
              trndte,
              prtnum,
              lotnum,
              lodnum,
              trnqty
            FROM by_produccion
            WHERE actcod = 'UPCK'
              AND lodnum LIKE 'BU%'
              AND trnqty <> 0
              AND lodnum IN (?)
          `,
          [bu]
        );
        upckRows = rows || [];
      }
    }

    // Neto por BU
    const net = new Map();
    const add = (codigoBU, delta) => {
      const key = String(codigoBU ?? '').trim().toUpperCase();
      if (!key || !startsWithBU(key)) return;
      const prev = net.get(key) || 0;
      net.set(key, prev + (Number(delta) || 0));
    };

    // GENMOV: entradas/salidas
    for (const r of genmovRows) {
      const qty = Number(r.trnqty) || 0;
      if (!qty) continue;
      const from = String(r.lodnum ?? '').trim();
      const to = String(r.to_lodnum ?? '').trim();

      if (!startsWithBU(to)) continue;
      if (String(from).trim() === String(to).trim()) continue;

      if (startsWithBU(from)) {
        // BU -> BU
        add(from, -qty);
        add(to, qty);
      } else {
        // NoBU -> BU
        add(to, qty);
      }
    }

    // UPCK: reversa sobre BU (imputada a la OV)
    for (const r of upckRows) {
      const buFrom = String(r.lodnum ?? '').trim();
      const sku = String(r.prtnum ?? '').trim();
      const lot = String(r.lotnum ?? '').trim();
      const qty = Number(r.trnqty) || 0;
      if (!buFrom || !sku || !lot || !qty) continue;

      const key = `${buFrom.toUpperCase()}|${sku}|${lot}`;
      const arr = index.get(key);
      if (!arr || !arr.length) continue;

      const ms = toDateMs(r.trndte);
      if (ms === null) continue;

      // último GENMOV <= fecha UPCK
      let lo = 0;
      let hi = arr.length - 1;
      let best = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (arr[mid].ms <= ms) {
          best = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      if (best === -1) continue;

      const ovImputada = normalizarOV(arr[best].ordnum);
      if (!ovNorm || ovImputada !== ovNorm) continue;

      add(buFrom, -qty);
    }

    return net;
  } finally {
    connection.release();
  }
}

module.exports = {
  obtenerUnidadesNetasPorBU,
};

