const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { validarCredenciales } = require('./config/credenciales.config');

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

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
