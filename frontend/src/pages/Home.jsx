import React, { useState } from 'react';
import GestionBultos from './GestionBultos';
import Historico from './Historico';
import Dashboard from './Dashboard';

function Home({ onLogout }) {
  const [currentPage, setCurrentPage] = useState('home');
  const [user] = useState({
    nombre: 'Usuario',
    email: 'usuario@email.com',
  });

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
    },
  ];

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  // Renderizar pantalla de Gestión de Bultos
  if (currentPage === 'bultos') {
    return <GestionBultos onBack={() => setCurrentPage('home')} />;
  }

  // Renderizar pantalla de Histórico
  if (currentPage === 'historico') {
    return <Historico onBack={() => setCurrentPage('home')} />;
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
              <h1 className="section-title mb-0">Gestión de Bultos</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Bienvenido, {user.nombre}
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
          <h2 className="section-title mb-2">¿Qué deseas hacer?</h2>
          <p className="section-subtitle">Selecciona una opción para continuar</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {menuOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setCurrentPage(option.id)}
                className="card hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-left group cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="text-5xl">{option.icono}</div>
                  <div className={`badge badge-${option.color}`}>
                    Disponible
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {option.titulo}
                </h3>

                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {option.descripcion}
                </p>

                <div className="flex items-center text-primary-500 group-hover:translate-x-2 transition-transform">
                  <span className="text-sm font-medium">Acceder</span>
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

          {/* Info del Usuario */}
          <div className="card bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zm-11-1a1 1 0 11-2 0 1 1 0 012 0zM8 8a1 1 0 000 2h6a1 1 0 000-2H8zm1 5a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Información de la sesión
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Email: {user.email}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Home;
