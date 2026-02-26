import React, { useState } from 'react';
import './Login.css';

function Login({ onLoginSuccess }) {
  const [usuario, setUsuario] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validaciones básicas
    if (!usuario || !contraseña) {
      setError('Por favor completa todos los campos');
      return;
    }

    if (usuario.length < 3) {
      setError('El usuario debe tener al menos 3 caracteres');
      return;
    }

    if (contraseña.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ usuario, contraseña }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('¡Login exitoso! Redirigiendo...');
        // Llamar callback de login exitoso con datos del usuario
        setTimeout(() => {
          if (onLoginSuccess) {
            onLoginSuccess(data.usuario);
          }
        }, 1000);
        setUsuario('');
        setContraseña('');
      } else {
        setError(data.mensaje || 'Error en el login. Intenta de nuevo.');
      }
    } catch (err) {
      setError('Error al conectar con el servidor');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md animate-slide-up">
        {/* Card principal */}
        <div className="card">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="section-title text-center">Gestión de Bultos</h1>
            <p className="section-subtitle text-center">Inicia sesión en tu cuenta</p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Usuario */}
            <div className="form-group">
              <label htmlFor="usuario" className="form-label">
                Usuario
              </label>
              <input
                id="usuario"
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Ingresa tu usuario"
                className="input-field"
                disabled={loading}
                autoFocus
              />
            </div>

            {/* Contraseña */}
            <div className="form-group">
              <label htmlFor="contraseña" className="form-label">
                Contraseña
              </label>
              <input
                id="contraseña"
                type="password"
                value={contraseña}
                onChange={(e) => setContraseña(e.target.value)}
                placeholder="••••••••"
                className="input-field"
                disabled={loading}
              />
            </div>

            {/* Mensajes de error */}
            {error && (
              <div className="p-4 bg-danger-50 dark:bg-danger-900 border border-danger-200 dark:border-danger-700 rounded-lg animate-fade-in">
                <p className="text-sm text-danger-700 dark:text-danger-200">{error}</p>
              </div>
            )}

            {/* Mensajes de éxito */}
            {success && (
              <div className="p-4 bg-success-50 dark:bg-success-900 border border-success-200 dark:border-success-700 rounded-lg animate-fade-in">
                <p className="text-sm text-success-700 dark:text-success-200">{success}</p>
              </div>
            )}

            {/* Botón de envío */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full btn-primary transition-all duration-200 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Iniciando sesión...
                </span>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          {/* Footer - Eliminado */}
        </div>

        {/* Versión de prueba */}
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg">
          <p className="text-xs text-blue-700 dark:text-blue-200 text-center">
            <strong>Prueba:</strong> Usa cualquier email y contraseña (mín. 6 caracteres)
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
