const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const { validarCredenciales, obtenerCredencial } = require('./config/credenciales.config');
const { obtenerBultoHANA, obtenerBultosPorOVHANA, obtenerTrazabilidadOVHANA } = require('./services/hanaService');
const { obtenerBultosPorOVDesdeBYProduccion, obtenerBultosPorOV } = require('./services/byProduccionService');
const { obtenerUnidadesNetasPorBU } = require('./services/bultosNetoService');
const { obtenerOVDesdeBUNeteado, obtenerBUsNeteadosPorOV } = require('./services/cmkBultosNeteadosService');
const { obtenerUltimaIntegracionSalidaPorBU } = require('./services/wmsIntegracionesService');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

function normalizarTexto(value) {
  return String(value ?? '').trim().toLowerCase();
}

function esOVCerrada(ovInfo) {
  const v = normalizarTexto(ovInfo?.['Estado OV'] ?? ovInfo?.ov_estado ?? '');
  if (!v) return false;
  return v === 'c' || v === 'cerrada' || v.startsWith('cerrad');
}

function tieneErrorInventario(wmsInfo) {
  if (!wmsInfo) return false;
  const txt = `${wmsInfo.mensaje_error || ''} ${wmsInfo.tipo_error || ''}`.toLowerCase();
  return (
    txt.includes('negative inventory') ||
    txt.includes('cantidad supera la ov') ||
    txt.includes('insufficient quantity') ||
    // equivalentes en español (por si llega mapeado)
    txt.includes('diferencia de inventario') ||
    txt.includes('sobreasignación') ||
    txt.includes('sobreasignacion') ||
    txt.includes('inventario insuficiente')
  );
}

function determinarAccionRecomendada({ ovInfo, factura, wmsInfo }) {
  // Reglas (orden de prioridad) según feedback usuario:
  // 1) OV cerrada -> Apartar pallet a recepcion
  // 2) Tiene factura -> Evaluar Despacho
  // 3) Error inventario -> Apartar pallet para revision de inventario
  // 4) Otro -> Accion no especificada

  if (esOVCerrada(ovInfo)) return 'Apartar pallet a recepcion';
  if (factura) return 'Evaluar Despacho';
  if (tieneErrorInventario(wmsInfo)) return 'Apartar pallet para revision de inventario';
  return 'Accion no especificada';
}

// Pool de conexiones MySQL
const pool = mysql.createPool({
  host: obtenerCredencial('MYSQL', 'host'),
  user: obtenerCredencial('MYSQL', 'user'),
  password: obtenerCredencial('MYSQL', 'password'),
  database: obtenerCredencial('MYSQL', 'database'),
  port: obtenerCredencial('MYSQL', 'port'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Inicializar tabla de histórico si no existe
async function inicializarTablaHistorico() {
  try {
    const connection = await pool.getConnection();

    const query = `
      CREATE TABLE IF NOT EXISTS cmk_bultos_historicos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        codigo_bulto VARCHAR(50) NOT NULL UNIQUE,
        factura VARCHAR(50),
        ov VARCHAR(50),
        fecha_documento DATE,
        fecha_ingreso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        usuario VARCHAR(100),
        ov_comuna VARCHAR(100),
        ov_region VARCHAR(100),
        ov_estado VARCHAR(50),
        ov_estratificacion VARCHAR(150),
        ov_direccion VARCHAR(255),
        ov_ruta VARCHAR(100),
        ov_cliente VARCHAR(255),
        ov_fecha DATETIME,
        wms_estado VARCHAR(20),
        wms_codigo_error VARCHAR(50),
        wms_tipo_error VARCHAR(100),
        wms_mensaje_error TEXT,
        wms_mensaje_usuario TEXT,
        wms_fecha DATETIME,
        wms_trn_id VARCHAR(50),
        accion_recomendada VARCHAR(150),
        bultos_ov INT DEFAULT 0,
        ingresados_ov INT DEFAULT 0,
        facturas_ov INT DEFAULT 0,
        INDEX idx_codigo (codigo_bulto),
        INDEX idx_factura (factura),
        INDEX idx_fecha_ingreso (fecha_ingreso)
      )
    `;

    await connection.query(query);

    // Asegurar columnas nuevas en tablas existentes
    const [dbRow] = await connection.query('SELECT DATABASE() AS db');
    const dbName = (dbRow && dbRow[0] && dbRow[0].db) || process.env.MYSQL_DATABASE;

    async function addColumnIfMissing(columnName, columnSql) {
      const [rows] = await connection.query(
        `
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = ?
            AND table_name = 'cmk_bultos_historicos'
            AND column_name = ?
          LIMIT 1
        `,
        [dbName, columnName]
      );
      if (!rows || rows.length === 0) {
        await connection.query(
          `ALTER TABLE cmk_bultos_historicos ADD COLUMN ${columnName} ${columnSql}`
        );
        console.log(`✅ Columna agregada en histórico: ${columnName}`);
      }
    }

    await addColumnIfMissing('ov_comuna', 'VARCHAR(100) NULL');
    await addColumnIfMissing('ov_region', 'VARCHAR(100) NULL');
    await addColumnIfMissing('ov_estado', 'VARCHAR(50) NULL');
    await addColumnIfMissing('ov_estratificacion', 'VARCHAR(150) NULL');
    await addColumnIfMissing('ov_direccion', 'VARCHAR(255) NULL');
    await addColumnIfMissing('ov_ruta', 'VARCHAR(100) NULL');
    await addColumnIfMissing('ov_cliente', 'VARCHAR(255) NULL');
    await addColumnIfMissing('ov_fecha', 'DATETIME NULL');
    await addColumnIfMissing('wms_estado', 'VARCHAR(20) NULL');
    await addColumnIfMissing('wms_codigo_error', 'VARCHAR(50) NULL');
    await addColumnIfMissing('wms_tipo_error', 'VARCHAR(100) NULL');
    await addColumnIfMissing('wms_mensaje_error', 'TEXT NULL');
    await addColumnIfMissing('wms_mensaje_usuario', 'TEXT NULL');
    await addColumnIfMissing('wms_fecha', 'DATETIME NULL');
    await addColumnIfMissing('wms_trn_id', 'VARCHAR(50) NULL');
    await addColumnIfMissing('accion_recomendada', 'VARCHAR(150) NULL');
    await addColumnIfMissing('bultos_ov', 'INT DEFAULT 0');
    await addColumnIfMissing('ingresados_ov', 'INT DEFAULT 0');
    await addColumnIfMissing('facturas_ov', 'INT DEFAULT 0');

    // Dejar solo UNA fecha OV consolidada (ov_fecha). Intentar eliminar fecha_ov si existe.
    const [fechaOvCol] = await connection.query(
      `
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = ?
          AND table_name = 'cmk_bultos_historicos'
          AND column_name = 'fecha_ov'
        LIMIT 1
      `,
      [dbName]
    );
    if (fechaOvCol && fechaOvCol.length) {
      try {
        await connection.query('ALTER TABLE cmk_bultos_historicos DROP COLUMN fecha_ov');
        console.log('✅ Columna eliminada del histórico: fecha_ov');
      } catch (e) {
        // si no se puede (por permisos/locks), lo dejamos
      }
    }

    connection.release();
    console.log('✅ Tabla cmk_bultos_historicos verificada/creada');
  } catch (error) {
    console.error('❌ Error al inicializar tabla:', error.message);
    console.error('   Detalles:', error);
  }
}

// Llamar al inicializar
inicializarTablaHistorico();

// Inicializar tabla de usuarios
async function inicializarTablaUsuarios() {
  try {
    const connection = await pool.getConnection();

    const query = `
      CREATE TABLE IF NOT EXISTS cmk_usuarios_bulto (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario VARCHAR(50) NOT NULL UNIQUE,
        contraseña VARCHAR(255) NOT NULL,
        tipo_permiso VARCHAR(50) DEFAULT 'dev',
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        activo BOOLEAN DEFAULT TRUE,
        INDEX idx_usuario (usuario)
      )
    `;

    await connection.query(query);

    // Verificar si existe el usuario 'david'
    const [usuarioExistente] = await connection.query(
      'SELECT id FROM cmk_usuarios_bulto WHERE usuario = ?',
      ['david']
    );

    // Si no existe, crear usuario david
    if (usuarioExistente.length === 0) {
      await connection.query(
        'INSERT INTO cmk_usuarios_bulto (usuario, contraseña, tipo_permiso) VALUES (?, ?, ?)',
        ['david', '123456', 'dev']
      );
      console.log('✅ Usuario david creado');
    }

    connection.release();
    console.log('✅ Tabla cmk_usuarios_bulto verificada/creada');
  } catch (error) {
    console.error('❌ Error al inicializar tabla de usuarios:', error.message);
  }
}

// Llamar al inicializar
inicializarTablaUsuarios();

// Inicializar tabla de exportaciones (auditoría)
async function inicializarTablaExportaciones() {
  try {
    const connection = await pool.getConnection();

    const query = `
      CREATE TABLE IF NOT EXISTS cmk_bultos_exportado (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fecha_exportacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        usuario VARCHAR(100) NOT NULL,
        origen VARCHAR(50) DEFAULT 'Historico',
        formato VARCHAR(10) DEFAULT 'xlsx',
        filename VARCHAR(255),
        total_registros INT DEFAULT 0,
        filtro_bulto VARCHAR(100),
        filtro_ov VARCHAR(100),
        filtro_factura VARCHAR(100),
        filtro_cliente VARCHAR(255),
        filtro_estratificacion VARCHAR(255),
        filtro_accion VARCHAR(255),
        filtro_fecha_ingreso VARCHAR(20),
        filtros_json LONGTEXT,
        INDEX idx_usuario (usuario),
        INDEX idx_fecha_exportacion (fecha_exportacion),
        INDEX idx_origen (origen)
      )
    `;

    await connection.query(query);

    // Asegurar columna nueva si la tabla ya existía
    const [dbRow] = await connection.query('SELECT DATABASE() AS db');
    const dbName = (dbRow && dbRow[0] && dbRow[0].db) || process.env.MYSQL_DATABASE;
    const [col] = await connection.query(
      `
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = ?
          AND table_name = 'cmk_bultos_exportado'
          AND column_name = 'filtro_accion'
        LIMIT 1
      `,
      [dbName]
    );
    if (!col || col.length === 0) {
      await connection.query('ALTER TABLE cmk_bultos_exportado ADD COLUMN filtro_accion VARCHAR(255) NULL');
      console.log('✅ Columna agregada en exportaciones: filtro_accion');
    }

    connection.release();
    console.log('✅ Tabla cmk_bultos_exportado verificada/creada');
  } catch (error) {
    console.error('❌ Error al inicializar tabla de exportaciones:', error.message);
  }
}

inicializarTablaExportaciones();

// Validar credenciales al iniciar
console.log('📋 Estado de credenciales:', validarCredenciales());

// Ruta base
app.get('/', (req, res) => {
  res.json({ mensaje: 'Servidor backend funcionando correctamente' });
});

// Consulta "en vivo" a BY (SQL Server): integración Salida Mercaderia por BU
app.get('/api/wms/integracion/:bu', async (req, res) => {
  try {
    const bu = String(req.params.bu ?? '').trim();
    if (!bu) return res.status(400).json({ error: 'BU requerido' });

    const daysBack = req.query && req.query.daysBack ? Number(req.query.daysBack) : 14;
    const data = await obtenerUltimaIntegracionSalidaPorBU(bu, { daysBack });
    return res.status(200).json({ bu, data });
  } catch (error) {
    console.error('❌ Error al consultar integración WMS:', error.message);
    return res.status(500).json({ error: 'Error al consultar integración WMS' });
  }
});

// Registrar exportaciones (auditoría)
app.post('/api/exportaciones/registrar', async (req, res) => {
  try {
    const {
      usuario,
      origen,
      formato,
      filename,
      total_registros,
      filtros,
    } = req.body || {};

    const usuarioStr = String(usuario ?? '').trim();
    if (!usuarioStr) {
      return res.status(400).json({ error: 'Usuario exportador requerido' });
    }

    const origenStr = String(origen ?? 'Historico').trim() || 'Historico';
    const formatoStr = String(formato ?? 'xlsx').trim() || 'xlsx';
    const filenameStr = filename ? String(filename).trim() : null;
    const total = Number.isFinite(Number(total_registros)) ? Number(total_registros) : 0;

    const f = filtros && typeof filtros === 'object' ? filtros : {};
    const filtroBulto = f.bulto ? String(f.bulto).trim() : null;
    const filtroOv = f.ov ? String(f.ov).trim() : null;
    const filtroFactura = f.factura ? String(f.factura).trim() : null;
    const filtroCliente = f.cliente ? String(f.cliente).trim() : null;
    const filtroEstrat = f.estratificacion ? String(f.estratificacion).trim() : null;
    const filtroAccion = f.accion ? String(f.accion).trim() : null;
    const filtroFechaIngreso = f.fecha_ingreso ? String(f.fecha_ingreso).trim() : null;
    const filtrosJson = JSON.stringify(f);

    const connection = await pool.getConnection();
    await connection.query(
      `
        INSERT INTO cmk_bultos_exportado (
          usuario,
          origen,
          formato,
          filename,
          total_registros,
          filtro_bulto,
          filtro_ov,
          filtro_factura,
          filtro_cliente,
          filtro_estratificacion,
          filtro_accion,
          filtro_fecha_ingreso,
          filtros_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        usuarioStr,
        origenStr,
        formatoStr,
        filenameStr,
        total,
        filtroBulto,
        filtroOv,
        filtroFactura,
        filtroCliente,
        filtroEstrat,
        filtroAccion,
        filtroFechaIngreso,
        filtrosJson,
      ]
    );
    connection.release();

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('❌ Error al registrar exportación:', error.message);
    return res.status(500).json({ error: 'Error al registrar exportación' });
  }
});

// Ruta de login
app.post('/api/login', async (req, res) => {
  try {
    const { usuario, contraseña } = req.body;

    // Validaciones básicas
    if (!usuario || !contraseña) {
      return res.status(400).json({
        mensaje: 'Usuario y contraseña son requeridos'
      });
    }

    if (usuario.length < 3) {
      return res.status(400).json({
        mensaje: 'El usuario debe tener al menos 3 caracteres'
      });
    }

    if (contraseña.length < 6) {
      return res.status(400).json({
        mensaje: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    // Buscar usuario en la BD
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT id, usuario, tipo_permiso, activo FROM cmk_usuarios_bulto WHERE usuario = ? AND contraseña = ?',
      [usuario, contraseña]
    );
    connection.release();

    if (rows.length === 0) {
      return res.status(401).json({
        mensaje: 'Usuario o contraseña incorrectos'
      });
    }

    const usuarioData = rows[0];

    if (!usuarioData.activo) {
      return res.status(403).json({
        mensaje: 'El usuario está inactivo'
      });
    }

    // Login exitoso
    res.status(200).json({
      mensaje: 'Login exitoso',
      usuario: {
        id: usuarioData.id,
        usuario: usuarioData.usuario,
        tipo_permiso: usuarioData.tipo_permiso
      },
      token: 'fake-jwt-token-' + Date.now(),
    });
  } catch (error) {
    console.error('❌ Error en login:', error.message);
    res.status(500).json({
      mensaje: 'Error en el login',
      detalle: error.message
    });
  }
});

// Ruta para obtener información de un bulto desde HANA
app.get('/api/bultos/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    const codigoBulto = (codigo || '').trim().toUpperCase();
    if (!codigoBulto) {
      return res.status(400).json({ error: 'Código de bulto requerido' });
    }

    console.log(`🔍 Buscando bulto: ${codigoBulto}`);

    // ══════════════════════════════════════════════════════════════════
    // FAST PATH: leer desde cmk_bultos_cache (pre-calculado por sync_bultos.py)
    // ══════════════════════════════════════════════════════════════════
    try {
      const conn = await pool.getConnection();

      // 1) Datos del bulto buscado
      const [cacheRows] = await conn.query(
        'SELECT * FROM cmk_bultos_cache WHERE codigo_bulto = ? LIMIT 1',
        [codigoBulto]
      );

      if (cacheRows && cacheRows.length > 0) {
        const c = cacheRows[0];
        const ov = c.ov_norm || null;

        // 2) Todos los bultos de la misma OV desde cache
        let todos = [];
        if (ov) {
          const [ovRows] = await conn.query(
            'SELECT * FROM cmk_bultos_cache WHERE ov_norm = ? ORDER BY codigo_bulto ASC',
            [ov]
          );
          todos = (ovRows || []).map((r) => ({
            codigo: r.codigo_bulto,
            factura: r.factura || null,
            cantidadBultos: r.cantidad_bultos ?? null,
            fechaDocumento: r.fecha_documento || null,
            fechaOV: r.fecha_ov || null,
            ov: r.ov_norm || null,
          }));
        } else {
          todos = [{
            codigo: c.codigo_bulto,
            factura: c.factura || null,
            cantidadBultos: c.cantidad_bultos ?? null,
            fechaDocumento: c.fecha_documento || null,
            fechaOV: c.fecha_ov || null,
            ov: ov,
          }];
        }

        conn.release();

        // 3) Reconstruir ovInfo con la misma estructura que el frontend espera
        const ovInfo = {
          'Estado OV': c.estado_ov || null,
          'Cliente': c.cliente || null,
          'Estratificación': c.estratificacion || null,
          'Región': c.region || null,
          'Comuna': c.comuna || null,
          'Direccion': c.direccion || null,
          'Ruta OV': c.ruta_ov || null,
          'Fecha OV': c.fecha_ov || null,
        };

        // 4) WMS con la misma estructura que el frontend espera
        const wmsIntegracion = (c.wms_estado || c.wms_mensaje) ? {
          estado: c.wms_estado || null,
          codigo_error: c.wms_codigo_error || null,
          tipo_error: c.wms_tipo_error || null,
          mensaje_error: c.wms_mensaje || null,
          mensaje_usuario: c.wms_mensaje || null,
          fecha: c.wms_fecha || null,
          trn_id: null,
        } : null;

        // 5) Bulto buscado y grupos por factura
        const buscado = todos.find((b) => b.codigo.toUpperCase() === codigoBulto) || todos[0];
        const facturaPrincipal = buscado?.factura || null;
        const keySinFactura = '__SIN_FACTURA__';

        const gruposMap = new Map();
        todos.forEach((b) => {
          const key = b.factura ? String(b.factura) : keySinFactura;
          if (!gruposMap.has(key)) gruposMap.set(key, []);
          gruposMap.get(key).push(b);
        });

        const keyPrincipal = facturaPrincipal ? String(facturaPrincipal) : keySinFactura;
        const keysFactura = Array.from(gruposMap.keys()).filter((k) => k !== keySinFactura);
        keysFactura.sort((a, b) => a.localeCompare(b, 'es'));

        const grupos = [];
        if (gruposMap.has(keyPrincipal)) {
          grupos.push({ factura: keyPrincipal === keySinFactura ? null : keyPrincipal, esPrincipal: true, bultos: gruposMap.get(keyPrincipal) });
        }
        keysFactura.filter((k) => k !== keyPrincipal).forEach((k) => {
          grupos.push({ factura: k, esPrincipal: false, bultos: gruposMap.get(k) });
        });
        if (keySinFactura !== keyPrincipal && gruposMap.has(keySinFactura)) {
          grupos.push({ factura: null, esPrincipal: false, bultos: gruposMap.get(keySinFactura) });
        }

        console.log(`✅ Bulto servido desde cache en ~0ms | OV=${ov} | BUs en OV=${todos.length}`);

        return res.status(200).json({
          ov,
          fuenteOV: 'CACHE',
          ovInfo,
          wmsIntegracion,
          accionRecomendada: c.accion_recomendada || 'Acción no especificada',
          bulto: buscado,
          grupos,
          totalBultosOV: todos.length,
          sync_at: c.sync_at || null,
        });
      }

      conn.release();
      console.log(`⚠️ BU ${codigoBulto} no está en cache → fallback a HANA/WMS`);
    } catch (cacheErr) {
      console.warn('⚠️ Error leyendo cache, usando flujo original:', cacheErr.message);
    }

    // ══════════════════════════════════════════════════════════════════
    // FALLBACK: flujo original (HANA + WMS) si el bulto no está en cache
    // ══════════════════════════════════════════════════════════════════

    let ov = null;
    let fuenteOV = null;
    let byData = null;

    let ovFromNeto = null;
    try {
      ovFromNeto = await obtenerOVDesdeBUNeteado(pool, codigoBulto);
    } catch (e) {
      console.warn('⚠️ No se pudo consultar cmk_bultos_neteados (BU):', e.message);
      ovFromNeto = null;
    }
    if (ovFromNeto && ovFromNeto.ov_norm) {
      ov = ovFromNeto.ov_norm;
      fuenteOV = 'CMK_BULTOS_NETEADOS';
      console.log(`✅ OV desde SQL (cmk_bultos_neteados): ${ov}`);
    } else {
      const datosFacturaHana = await obtenerBultoHANA(codigoBulto);
      if (datosFacturaHana && datosFacturaHana.length > 0) {
        const exact =
          datosFacturaHana.find((r) =>
            String(r.Bultos || '').toUpperCase().includes(codigoBulto.toUpperCase())
          ) || datosFacturaHana[0];
        ov = exact.OV;
        fuenteOV = 'HANA';
        console.log(`ℹ️ OV desde HANA (fallback): ${ov}`);
      } else {
        byData = await obtenerBultosPorOVDesdeBYProduccion(pool, codigoBulto);
        if (byData) {
          ov = byData.ov;
          fuenteOV = 'BY_PRODUCCION';
          console.log(`ℹ️ OV desde MySQL by_produccion (fallback): ${ov}`);
        }
      }
    }

    if (!ov) {
      return res.status(404).json({ error: 'Bulto no encontrado' });
    }

    let byOVRowsValidos = [];
    try {
      byOVRowsValidos = await obtenerBUsNeteadosPorOV(pool, ov);
      console.log(`✅ BU neteados desde SQL (cmk_bultos_neteados): ${byOVRowsValidos.length}`);
    } catch (e) {
      console.warn('⚠️ No se pudo consultar cmk_bultos_neteados (OV):', e.message);
      byOVRowsValidos = [];
    }

    if (!byOVRowsValidos || byOVRowsValidos.length === 0) {
      console.log('⚠️ cmk_bultos_neteados no devolvió filas; usando neteo por backend desde by_produccion.');
      const byOVRows = await obtenerBultosPorOV(pool, ov);
      const net = await obtenerUnidadesNetasPorBU(pool, {
        ovRaw: null,
        ov,
        buList: (byOVRows || []).map((b) => b.codigo),
      });

      byOVRowsValidos = (byOVRows || [])
        .filter((b) => {
          const key = String(b.codigo || '').trim().toUpperCase();
          if (!key) return false;
          if (!net.has(key)) return true;
          return (net.get(key) || 0) > 0;
        })
        .map((b) => ({ codigo: b.codigo, ov: b.ov }));

      console.log(`✅ BU neteados por fallback (backend): ${byOVRowsValidos.length}`);
    }

    const hanaOVRows = await obtenerBultosPorOVHANA(ov);

    const map = new Map();
    (byOVRowsValidos || []).forEach((r) => {
      const key = String(r.codigo || '').trim();
      if (!key) return;
      const upper = key.toUpperCase();
      map.set(upper, { codigo: key, factura: null, cantidadBultos: null, fechaDocumento: null, fechaOV: null, ov: r.ov ?? ov });
    });
    (hanaOVRows || []).forEach((r) => {
      const key = String(r.Bultos || '').trim();
      if (!key) return;
      const upper = key.toUpperCase();
      const prev = map.get(upper);
      map.set(upper, {
        codigo: key,
        factura: r.FolioNum || prev?.factura || null,
        cantidadBultos: r.CANT_BULTOS ?? prev?.cantidadBultos ?? null,
        fechaDocumento: r.DocDate || prev?.fechaDocumento || null,
        fechaOV: r.FECHA_OV || prev?.fechaOV || null,
        ov: r.OV ?? prev?.ov ?? ov,
      });
    });

    const todos = Array.from(map.values()).sort((a, b) => a.codigo.localeCompare(b.codigo, 'es'));
    const buscado = todos.find((b) => b.codigo.toUpperCase() === codigoBulto.toUpperCase()) || todos[0];
    const facturaPrincipal = buscado.factura || null;
    const keySinFactura = '__SIN_FACTURA__';

    const gruposMap = new Map();
    todos.forEach((b) => {
      const key = b.factura ? String(b.factura) : keySinFactura;
      if (!gruposMap.has(key)) gruposMap.set(key, []);
      gruposMap.get(key).push(b);
    });
    for (const list of gruposMap.values()) {
      list.sort((a, b) => a.codigo.localeCompare(b.codigo, 'es'));
    }

    const keyPrincipal = facturaPrincipal ? String(facturaPrincipal) : keySinFactura;
    const keysFactura = Array.from(gruposMap.keys()).filter((k) => k !== keySinFactura);
    keysFactura.sort((a, b) => a.localeCompare(b, 'es'));

    const grupos = [];
    if (gruposMap.has(keyPrincipal)) {
      grupos.push({ factura: keyPrincipal === keySinFactura ? null : keyPrincipal, esPrincipal: true, bultos: gruposMap.get(keyPrincipal) });
    }
    keysFactura.filter((k) => k !== keyPrincipal).forEach((k) => {
      grupos.push({ factura: k, esPrincipal: false, bultos: gruposMap.get(k) });
    });
    if (keySinFactura !== keyPrincipal && gruposMap.has(keySinFactura)) {
      grupos.push({ factura: null, esPrincipal: false, bultos: gruposMap.get(keySinFactura) });
    }

    let ovInfo = null;
    try {
      ovInfo = await obtenerTrazabilidadOVHANA(ov);
      if (ovInfo && ovInfo.Comuna) {
        const comunaOrigen = String(ovInfo.Comuna).trim();
        const connection = await pool.getConnection();
        try {
          const tryTables = async (tableName) => {
            const [rows] = await connection.query(
              `SELECT comuna_corregida FROM ${tableName} WHERE comuna_origen = ? LIMIT 1`,
              [comunaOrigen]
            );
            return rows && rows[0] ? rows[0].comuna_corregida : null;
          };
          let corregida = null;
          try { corregida = await tryTables('`_comuna_mapeo`'); } catch (e) { }
          if (!corregida) { try { corregida = await tryTables('`comuna_mapeo`'); } catch (e) { } }
          if (corregida) ovInfo.Comuna = corregida;
          const comunaParaRegion = String(ovInfo.Comuna || comunaOrigen).trim();
          if (comunaParaRegion) {
            const tryRegion = async (tableName) => {
              const [rows] = await connection.query(
                `SELECT nombre_region FROM ${tableName} WHERE nombre_comuna = ? LIMIT 1`,
                [comunaParaRegion]
              );
              return rows && rows[0] ? rows[0].nombre_region : null;
            };
            let region = null;
            try { region = await tryRegion('`_regiones_y_comunas`'); } catch (e) { }
            if (!region) { try { region = await tryRegion('`regiones_y_comunas`'); } catch (e) { } }
            if (region) ovInfo['Región'] = region;
          }
        } finally {
          connection.release();
        }
      }
    } catch (e) {
      ovInfo = null;
    }

    let wmsIntegracion = null;
    try {
      wmsIntegracion = await obtenerUltimaIntegracionSalidaPorBU(codigoBulto, { daysBack: 60 });
    } catch (e) {
      console.warn('⚠️ No se pudo obtener integración WMS para BU:', codigoBulto, '-', e.message);
      wmsIntegracion = null;
    }

    const accionRecomendada = determinarAccionRecomendada({
      ovInfo,
      factura: buscado?.factura || null,
      wmsInfo: wmsIntegracion,
    });

    res.status(200).json({
      ov,
      fuenteOV,
      ovInfo,
      wmsIntegracion,
      accionRecomendada,
      bulto: buscado,
      grupos,
      totalBultosOV: todos.length,
    });
  } catch (error) {
    console.error('❌ Error al obtener bulto:', error.message);
    res.status(500).json({
      error: 'Error al obtener información del bulto',
      detalle: error.message
    });
  }
});


// Ruta para verificar si un bulto está en histórico
app.get('/api/historico/verificar/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    const connection = await pool.getConnection();

    const [rows] = await connection.query(
      'SELECT * FROM cmk_bultos_historicos WHERE codigo_bulto = ?',
      [codigo]
    );

    connection.release();

    if (rows.length > 0) {
      res.status(200).json({
        existe: true,
        bulto: rows[0]
      });
    } else {
      res.status(200).json({
        existe: false
      });
    }
  } catch (error) {
    console.error('❌ Error al verificar histórico:', error.message);
    res.status(500).json({
      error: 'Error al verificar histórico',
      detalle: error.message
    });
  }
});

// Ruta para guardar bulto en histórico
app.post('/api/historico/guardar', async (req, res) => {
  try {
    const { codigo_bulto, factura, ov, fecha_documento, usuario, ovInfo, wmsInfo, accionRecomendada } = req.body;

    if (!codigo_bulto) {
      return res.status(400).json({ error: 'Código de bulto requerido' });
    }

    const connection = await pool.getConnection();

    // Verificar si ya existe
    const [existing] = await connection.query(
      'SELECT id FROM cmk_bultos_historicos WHERE codigo_bulto = ?',
      [codigo_bulto]
    );

    if (existing.length > 0) {
      connection.release();
      return res.status(409).json({
        error: 'El bulto ya existe en histórico',
        existe: true
      });
    }

    // Formatear fecha_documento para MySQL (DATE)
    let fecha_doc = null;
    if (fecha_documento) {
      const d = new Date(fecha_documento);
      if (!Number.isNaN(d.getTime())) {
        // Obtenemos solo YYYY-MM-DD
        fecha_doc = d;
      }
    }

    const ov_comuna = ovInfo?.Comuna ?? null;
    const ov_region = ovInfo?.['Región'] ?? null;
    const ov_estado = ovInfo?.['Estado OV'] ?? null;
    const ov_estratificacion = ovInfo?.['Estratificación'] ?? null;
    const ov_direccion = ovInfo?.Direccion ?? null;
    const ov_ruta = ovInfo?.['Ruta OV'] ?? null;
    const ov_cliente = ovInfo?.Cliente ?? null;
    const ov_fecha_raw = ovInfo?.['Fecha OV'] ?? null;

    // mysql2 formatea Date correctamente a DATETIME
    let ov_fecha = null;
    if (ov_fecha_raw) {
      const d = ov_fecha_raw instanceof Date ? ov_fecha_raw : new Date(ov_fecha_raw);
      if (!Number.isNaN(d.getTime())) ov_fecha = d;
    }

    // WMS/Integración (opcional)
    const wms_estado = wmsInfo?.estado ?? null;
    const wms_codigo_error = wmsInfo?.codigo_error ?? null;
    const wms_tipo_error = wmsInfo?.tipo_error ?? null;
    const wms_mensaje_error = wmsInfo?.mensaje_error ?? null;
    const wms_mensaje_usuario = wmsInfo?.mensaje_usuario ?? null;
    const wms_trn_id = wmsInfo?.trn_id ?? null;
    let wms_fecha = null;
    if (wmsInfo?.fecha) {
      const d = wmsInfo.fecha instanceof Date ? wmsInfo.fecha : new Date(wmsInfo.fecha);
      if (!Number.isNaN(d.getTime())) wms_fecha = d;
    }

    const accion =
      (accionRecomendada && String(accionRecomendada).trim()) ||
      determinarAccionRecomendada({ ovInfo, factura, wmsInfo });

    // CALCULAR RESUMENES DE LA OV
    let bultos_ov = 0;
    let ingresados_ov = 0;
    let facturas_ov = 0;

    if (ov) {
      try {
        // Total bultos en cache para esta OV
        const [totalRows] = await connection.query(
          'SELECT COUNT(*) as total, COUNT(DISTINCT factura) as facturas FROM cmk_bultos_cache WHERE ov_norm = ?',
          [ov]
        );
        bultos_ov = totalRows[0].total || 0;
        facturas_ov = totalRows[0].facturas || 0;

        // Total bultos YA ingresados en historico para esta OV
        const [ingresadosRows] = await connection.query(
          'SELECT COUNT(*) as ingresados FROM cmk_bultos_historicos WHERE ov = ?',
          [ov]
        );
        // +1 porque estamos insertando este ahora
        ingresados_ov = (ingresadosRows[0].ingresados || 0) + 1;
      } catch (e) {
        console.warn('⚠️ Error al calcular resumen de OV:', e.message);
      }
    }

    // Insertar nuevo bulto
    const [result] = await connection.query(
      `INSERT INTO cmk_bultos_historicos 
       (codigo_bulto, factura, ov, fecha_documento, usuario,
        ov_comuna, ov_region, ov_estado, ov_estratificacion, ov_direccion, ov_ruta, ov_cliente, ov_fecha,
        wms_estado, wms_codigo_error, wms_tipo_error, wms_mensaje_error, wms_mensaje_usuario, wms_fecha, wms_trn_id,
        accion_recomendada, bultos_ov, ingresados_ov, facturas_ov) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codigo_bulto,
        factura,
        ov,
        fecha_doc,
        usuario ?? null,
        ov_comuna,
        ov_region,
        ov_estado,
        ov_estratificacion,
        ov_direccion,
        ov_ruta,
        ov_cliente,
        ov_fecha,
        wms_estado,
        wms_codigo_error,
        wms_tipo_error,
        wms_mensaje_error,
        wms_mensaje_usuario,
        wms_fecha,
        wms_trn_id,
        accion,
        bultos_ov,
        ingresados_ov,
        facturas_ov
      ]
    );

    connection.release();

    console.log(`✅ Bulto guardado en histórico: ${codigo_bulto} (OV: ${ov}, Bultos: ${bultos_ov}, Ingresados: ${ingresados_ov}, Facturas: ${facturas_ov})`);

    res.status(201).json({
      mensaje: 'Bulto guardado en histórico exitosamente',
      id: result.insertId
    });
  } catch (error) {
    console.error('❌ Error al guardar en histórico:', error.message);
    res.status(500).json({
      error: 'Error al guardar en histórico',
      detalle: error.message
    });
  }
});

// Ruta para obtener todos los bultos del histórico
app.get('/api/historico/listar', async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [rows] = await connection.query(
      `SELECT * FROM cmk_bultos_historicos ORDER BY fecha_ingreso DESC`
    );

    connection.release();

    res.status(200).json(rows);
  } catch (error) {
    console.error('❌ Error al obtener histórico:', error.message);
    res.status(500).json({
      error: 'Error al obtener histórico',
      detalle: error.message
    });
  }
});

// Ruta para verificar múltiples bultos
app.post('/api/historico/verificar-multiples', async (req, res) => {
  try {
    const { codigos } = req.body;

    if (!Array.isArray(codigos) || codigos.length === 0) {
      return res.status(400).json({ error: 'Array de códigos requerido' });
    }

    const connection = await pool.getConnection();

    // Crear placeholders para la query
    const placeholders = codigos.map(() => '?').join(',');
    const [rows] = await connection.query(
      `SELECT codigo_bulto FROM cmk_bultos_historicos WHERE codigo_bulto IN (${placeholders})`,
      codigos
    );

    connection.release();

    const resultado = {};
    codigos.forEach(codigo => {
      resultado[codigo] = rows.some(row => row.codigo_bulto === codigo);
    });

    res.status(200).json(resultado);
  } catch (error) {
    console.error('❌ Error al verificar múltiples bultos:', error.message);
    res.status(500).json({
      error: 'Error al verificar histórico',
      detalle: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
