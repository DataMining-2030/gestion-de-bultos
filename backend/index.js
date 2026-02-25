const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Rutas básicas
app.get('/', (req, res) => {
  res.json({ mensaje: 'Servidor backend funcionando correctamente' });
});

// Ruta de login (a implementar)
app.post('/api/login', (req, res) => {
  res.json({ 
    mensaje: 'Ruta de login pendiente de implementar',
    status: 'pending'
  });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
