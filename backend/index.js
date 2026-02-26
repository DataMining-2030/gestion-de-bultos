const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { validarCredenciales } = require('./config/credenciales.config');
const { obtenerBultoHANA } = require('./services/hanaService');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Validar credenciales al iniciar
console.log('📋 Estado de credenciales:', validarCredenciales());

// Ruta base
app.get('/', (req, res) => {
  res.json({ mensaje: 'Servidor backend funcionando correctamente' });
});

// Ruta de login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  // Validaciones básicas
  if (!email || !password) {
    return res.status(400).json({ 
      mensaje: 'Email y contraseña son requeridos' 
    });
  }

  // Validar email (formato básico)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      mensaje: 'Email inválido' 
    });
  }

  // Validar contraseña (mínimo 6 caracteres)
  if (password.length < 6) {
    return res.status(400).json({ 
      mensaje: 'La contraseña debe tener al menos 6 caracteres' 
    });
  }

  // Simulamos un login exitoso (sin base de datos)
  // TODO: Conectar con base de datos real
  res.status(200).json({
    mensaje: 'Login exitoso',
    usuario: {
      id: 1,
      email: email,
      nombre: email.split('@')[0],
    },
    token: 'fake-jwt-token-' + Date.now(),
  });
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

    // Procesar datos
    const bultoInfo = datos[0]; // Primer resultado es el bulto buscado
    const otrosBultos = datos.slice(1); // Resto son otros bultos en la misma factura

    res.status(200).json({
      bulto: {
        codigo: codigo,
        factura: bultoInfo.FolioNum,
        cantidadBultos: bultoInfo.CANT_BULTOS,
        fechaDocumento: bultoInfo.DocDate,
        fechaOV: bultoInfo.FECHA_OV,
        ov: bultoInfo.OV,
      },
      otrosBultos: otrosBultos.map(item => ({
        codigo: item.Bultos,
        factura: item.FolioNum,
        cantidadBultos: item.CANT_BULTOS,
      })),
    });
  } catch (error) {
    console.error('❌ Error al obtener bulto:', error.message);
    res.status(500).json({ 
      error: 'Error al obtener información del bulto',
      detalle: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
