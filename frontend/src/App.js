import React, { useState } from 'react';
import Login from './pages/Login';
import Home from './pages/Home';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [usuarioActual, setUsuarioActual] = useState(null);

  const handleLoginSuccess = (usuarioData) => {
    setUsuarioActual(usuarioData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsuarioActual(null);
  };

  return (
    <>
      {isAuthenticated ? (
        <Home onLogout={handleLogout} usuario={usuarioActual} />
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </>
  );
}

export default App;
