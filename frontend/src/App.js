import React, { useState, useEffect } from 'react';

function App() {
  const [bultos, setBultos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('http://localhost:5000/api/bultos')
      .then(response => response.json())
      .then(data => {
        setBultos(data.bultos);
        setLoading(false);
      })
      .catch(err => {
        setError('Error al cargar los bultos');
        setLoading(false);
        console.error(err);
      });
  }, []);

  if (loading) return <div style={{ padding: '20px' }}>Cargando bultos...</div>;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Gestión de Bultos</h1>
      <p>¡Bienvenido!</p>
      
      <h2>Lista de Bultos</h2>
      {bultos.length > 0 ? (
        <table border="1" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={{ padding: '10px' }}>ID</th>
              <th style={{ padding: '10px' }}>Nombre</th>
              <th style={{ padding: '10px' }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {bultos.map(bulto => (
              <tr key={bulto.id}>
                <td style={{ padding: '10px' }}>{bulto.id}</td>
                <td style={{ padding: '10px' }}>{bulto.nombre}</td>
                <td style={{ padding: '10px' }}>{bulto.estado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No hay bultos disponibles</p>
      )}
    </div>
  );
}

export default App;
