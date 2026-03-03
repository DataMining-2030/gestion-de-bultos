import React, { useState } from 'react';
import GestionBultos from './GestionBultos';
import Historico from './Historico';
import Dashboard from './Dashboard';

function Home({ onLogout, usuario }) {
  const [currentPage, setCurrentPage] = useState('home');
  const [codigoBultoABuscar, setCodigoBultoABuscar] = useState(null);

  const menuOptions = [
    {
      id: 'bultos',
      titulo: 'Gestión de Bultos',
      descripcion: 'Administra y controla tus bultos',
      icono: '📦',
      color: 'primary',
    },
    {
      id: 'historico',
      titulo: 'Histórico',
      descripcion: 'Consulta el historial de operaciones',
      icono: '📋',
      color: 'secondary',
    },
    {
      id: 'dashboard',
      titulo: 'Dashboard',
      descripcion: 'Visualiza estadísticas y reportes',
      icono: '📊',
      color: 'success',
      disabled: true,
    },
  ];

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  // Renderizar pantalla de Gestión de Bultos
  if (currentPage === 'bultos') {
    return (
      <GestionBultos 
        onBack={() => {
          setCodigoBultoABuscar(null);
          setCurrentPage('home');
        }}
        codigoBultoInicial={codigoBultoABuscar}
        usuario={usuario}
      />
    );
  }

  // Renderizar pantalla de Histórico
  if (currentPage === 'historico') {
    return (
      <Historico 
        onBack={() => setCurrentPage('home')}
        usuario={usuario}
        onBultoSelected={(codigo) => {
          // Guardar el código y ir a gestión de bultos
          setCodigoBultoABuscar(codigo);
          setCurrentPage('bultos');
        }}
      />
    );
  }

  // Renderizar pantalla de Dashboard
  if (currentPage === 'dashboard') {
    return <Dashboard onBack={() => setCurrentPage('home')} />;
  }

  // Pantalla principal (Home)
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="mb-0 inline-flex items-center gap-2 text-2xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
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
              </h1>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                Bienvenido, {usuario?.usuario || 'Usuario'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="btn-outline px-4 py-2 text-sm"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Grid de Opciones */}
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 mb-2">
            ¿Qué deseas hacer?
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Selecciona una opción para continuar
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {menuOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  if (option.disabled) return;
                  setCurrentPage(option.id);
                }}
                disabled={option.disabled}
                aria-disabled={option.disabled ? 'true' : 'false'}
                className={`card transition-all duration-300 text-left group ${
                  option.disabled
                    ? 'opacity-60 cursor-not-allowed'
                    : 'cursor-pointer hover:shadow-lg hover:-translate-y-1'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="text-5xl">{option.icono}</div>
                  {option.disabled && (
                    <span className="badge bg-gray-100 text-gray-700 text-xs font-semibold">
                      No disponible
                    </span>
                  )}
                </div>

                <h3
                  className={`text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 transition-colors ${
                    option.disabled
                      ? ''
                      : 'group-hover:text-primary-600 dark:group-hover:text-primary-400'
                  }`}
                >
                  {option.titulo}
                </h3>

                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {option.descripcion}
                </p>

                <div
                  className={`flex items-center transition-transform ${
                    option.disabled
                      ? 'text-gray-400'
                      : 'text-primary-500 group-hover:translate-x-2'
                  }`}
                >
                  <span className="text-sm font-medium">
                    {option.disabled ? 'No disponible' : 'Acceder'}
                  </span>
                  <svg
                    className="w-4 h-4 ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </button>
            ))}
          </div>

        </div>
      </main>
    </div>
  );
}

export default Home;
