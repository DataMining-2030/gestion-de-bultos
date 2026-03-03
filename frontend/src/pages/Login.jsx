import React, { useMemo, useState } from 'react';
import './Login.css';

function Login({ onLoginSuccess }) {
  const [usuario, setUsuario] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [mostrarContraseña, setMostrarContraseña] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  // Firma (mantener simple y propia del proyecto)
  const firma = useMemo(
    () => ({
      year: new Date().getFullYear(),
      product: 'Gestión de Bultos',
      version: 'v1.0.0',
    }),
    []
  );

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
      // Pequeño delay por si el backend aún está iniciando en el ejecutable
      await new Promise((r) => setTimeout(r, 300));
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
      // Mensaje más útil para builds empaquetados
      setError('No se pudo conectar con el servidor local (5000). Revisa los logs.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen login-bg px-4 flex items-center justify-center">
      <div className="mx-auto w-full max-w-[460px] animate-slide-up">
        {/* Título + Subtítulo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900 mb-1">
            <svg
              className="h-7 w-7 text-primary-600"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M3.5 7.2 12 3l8.5 4.2v9.6L12 21l-8.5-4.2V7.2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M12 21V12.2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M3.8 7.3 12 11.4l8.2-4.1"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
            <span>Gestión de Bultos</span>
          </div>
          <div className="text-xs text-slate-500">Inicia sesión en tu cuenta</div>
        </div>

        {/* Card */}
        <div className="login-card p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Usuario */}
            <div className="space-y-2">
              <label htmlFor="usuario" className="login-label">Usuario</label>
              <div className="login-input flex items-center gap-3 px-4">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"
                    stroke="#94a3b8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M20 21a8 8 0 1 0-16 0"
                    stroke="#94a3b8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <input
                  id="usuario"
                  type="text"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  placeholder="Ingresa tu usuario"
                  className="login-input__field login-input__placeholder"
                  disabled={loading}
                  autoFocus
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className="space-y-2">
              <label htmlFor="contraseña" className="login-label">
                Contraseña
              </label>
              <div className="login-input flex items-center gap-3 px-4">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M17 11V8a5 5 0 0 0-10 0v3"
                    stroke="#94a3b8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M7 11h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Z"
                    stroke="#94a3b8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                <input
                  id="contraseña"
                  type={mostrarContraseña ? 'text' : 'password'}
                  value={contraseña}
                  onChange={(e) => setContraseña(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  className="login-input__field login-input__placeholder"
                  disabled={loading}
                />

                <button
                  type="button"
                  onClick={() => setMostrarContraseña((v) => !v)}
                  className="ml-1 p-1 rounded-md hover:bg-slate-100 transition-colors"
                  aria-label={mostrarContraseña ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {mostrarContraseña ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
                        stroke="#94a3b8"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
                        stroke="#94a3b8"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-6.5 0-10-7-10-7a20.4 20.4 0 0 1 5.06-6.06"
                        stroke="#94a3b8"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M1 1l22 22"
                        stroke="#94a3b8"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M9.88 9.88A3 3 0 0 0 12 15a3 3 0 0 0 2.12-.88"
                        stroke="#94a3b8"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M14.12 14.12 9.88 9.88"
                        stroke="#94a3b8"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M8.3 5.1A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a20.6 20.6 0 0 1-4.2 5.2"
                        stroke="#94a3b8"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Mensajes */}
            {error && (
              <div className="p-3 rounded-xl border border-red-200 bg-red-50">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-red-700">{error}</p>
                  {typeof window !== 'undefined' &&
                    window.electron &&
                    typeof window.electron.openLogsFolder === 'function' && (
                      <button
                        type="button"
                        onClick={() => window.electron.openLogsFolder()}
                        className="text-xs font-semibold text-red-700 hover:underline whitespace-nowrap"
                      >
                        Abrir logs
                      </button>
                    )}
                </div>
              </div>
            )}

            {success && (
              <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50">
                <p className="text-sm text-emerald-700">{success}</p>
              </div>
            )}

            {/* Botón */}
            <button
              type="submit"
              disabled={loading}
              className={`login-submit w-full text-white flex items-center justify-center gap-2 ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Iniciando Sesión...
                </span>
              ) : (
                <>
                  Iniciar Sesión
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M5 12h12"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M13 6l6 6-6 6"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Firma */}
        <div className="login-signature">
          <div>
            Diseñado por <span className="login-signature__brand">Data Mining</span>
          </div>
          <div>
            © {firma.year} {firma.product} {firma.version}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
