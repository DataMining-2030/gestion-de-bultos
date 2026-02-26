const express = require('express');
const cors = require('cors');
require('dotenv').config();
const mysql = require('mysql2/promise');
const { validarCredenciales } = require('./config/credenciales.config');
const { obtenerBultoHANA } = require('./services/hanaService');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Pool de conexiones MySQL
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'password',
  database: process.env.MYSQL_DATABASE || 'gestion_bultos',
  port: process.env.MYSQL_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Inicializar tabla de histórico si no existe
async function inicializarTablaHistorico() {
  try {
    const connection = await pool.getConnection();
    
    const query = `
      CREATE TABLE IF NOT EXISTS cmk_HISTORICO_BULTOS (
        id INT AUTO_INCREMENT PRIMARY KEY,
        codigo_bulto VARCHAR(50) NOT NULL UNIQUE,
        factura VARCHAR(50),
        ov VARCHAR(50),
        fecha_documento DATE,
        fecha_ov DATE,
        fecha_ingreso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        usuario VARCHAR(100),
        INDEX idx_codigo (codigo_bulto),
        INDEX idx_factura (factura),
        INDEX idx_fecha_ingreso (fecha_ingreso)
      )
    `;
    
    await connection.query(query);
    
    // Limpiar datos de prueba si existen
    try {
      await connection.query('DELETE FROM cmk_HISTORICO_BULTOS');
      console.log('✅ Datos de prueba eliminados');
    } catch (e) {
      // Ignorar si falla
    }
    
    connection.release();
    console.log('✅ Tabla cmk_HISTORICO_BULTOS verificada/creada');
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

// Validar credenciales al iniciar
console.log('📋 Estado de credenciales:', validarCredenciales());

// Ruta base
app.get('/', (req, res) => {
  res.json({ mensaje: 'Servidor backend funcionando correctamente' });
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

    if (!codigo || codigo.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Código de bulto requerido' 
      });
    }

    console.log(`🔍 Buscando bulto: ${codigo}`);
    const datos = await obtenerBultoHANA(codigo);

    if (!datos || datos.length === 0) {
      return res.status(404).json({ 
        error: 'Bulto no encontrado' 
      });
    }

    // Encontrar el bulto exacto que se buscó (puede estar en cualquier posición)
    const bultoSearched = datos.find(item => 
      item.Bultos.toUpperCase().includes(codigo.toUpperCase())
    ) || datos[0];

    // Los otros son los que no coinciden con el bulto buscado
    const otrosBultos = datos.filter(item => 
      item.Bultos !== bultoSearched.Bultos
    );

    res.status(200).json({
      bulto: {
        codigo: bultoSearched.Bultos,
        factura: bultoSearched.FolioNum,
        cantidadBultos: bultoSearched.CANT_BULTOS,
        fechaDocumento: bultoSearched.DocDate,
        fechaOV: bultoSearched.FECHA_OV,
        ov: bultoSearched.OV,
      },
      otrosBultos: otrosBultos.map(item => ({
        codigo: item.Bultos,
        factura: item.FolioNum,
        cantidadBultos: item.CANT_BULTOS,
      })),
      totalBultosEnFactura: datos.length,
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
      'SELECT * FROM cmk_HISTORICO_BULTOS WHERE codigo_bulto = ?',
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
    const { codigo_bulto, factura, ov, fecha_documento, fecha_ov } = req.body;

    if (!codigo_bulto) {
      return res.status(400).json({ error: 'Código de bulto requerido' });
    }

    const connection = await pool.getConnection();

    // Verificar si ya existe
    const [existing] = await connection.query(
      'SELECT id FROM cmk_HISTORICO_BULTOS WHERE codigo_bulto = ?',
      [codigo_bulto]
    );

    if (existing.length > 0) {
      connection.release();
      return res.status(409).json({
        error: 'El bulto ya existe en histórico',
        existe: true
      });
    }

    // Insertar nuevo bulto
    const [result] = await connection.query(
      `INSERT INTO cmk_HISTORICO_BULTOS 
       (codigo_bulto, factura, ov, fecha_documento, fecha_ov) 
       VALUES (?, ?, ?, ?, ?)`,
      [codigo_bulto, factura, ov, fecha_documento, fecha_ov]
    );

    connection.release();

    console.log(`✅ Bulto guardado en histórico: ${codigo_bulto}`);

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
      `SELECT * FROM cmk_HISTORICO_BULTOS ORDER BY fecha_ingreso DESC`
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
      `SELECT codigo_bulto FROM cmk_HISTORICO_BULTOS WHERE codigo_bulto IN (${placeholders})`,
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
