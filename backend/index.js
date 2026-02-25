const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ mensaje: 'Servidor backend funcionando correctamente' });
});

app.get('/api/bultos', (req, res) => {
  res.json({ 
    bultos: [
      { id: 1, nombre: 'Bulto 1', estado: 'Pendiente' },
      { id: 2, nombre: 'Bulto 2', estado: 'En tránsito' },
      { id: 3, nombre: 'Bulto 3', estado: 'Entregado' }
    ] 
  });
});

app.post('/api/bultos', (req, res) => {
  const { nombre } = req.body;
  res.json({ 
    id: 4, 
    nombre: nombre, 
    estado: 'Pendiente',
    mensaje: 'Bulto creado exitosamente' 
  });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
