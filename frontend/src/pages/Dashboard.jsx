import React from 'react';

function Dashboard({ onBack }) {
  const stats = [
    {
      titulo: 'Bultos Hoy',
      valor: 24,
      cambio: '+12%',
      color: 'primary',
      icono: '📦',
    },
    {
      titulo: 'Entregados',
      valor: 18,
      cambio: '+8%',
      color: 'success',
      icono: '✅',
    },
    {
      titulo: 'En Tránsito',
      valor: 5,
      cambio: '-2%',
      color: 'warning',
      icono: '🚚',
    },
    {
      titulo: 'Pendientes',
      valor: 1,
      cambio: 'Sin cambios',
      color: 'secondary',
      icono: '⏳',
    },
  ];

  const actividadReciente = [
    {
      bulto: 'BUL-001',
      evento: 'Entregado',
      hora: 'Hace 2 horas',
      estado: 'success',
    },
    {
      bulto: 'BUL-005',
      evento: 'En tránsito',
      hora: 'Hace 1 hora',
      estado: 'warning',
    },
    {
      bulto: 'BUL-003',
      evento: 'Escaneado',
      hora: 'Hace 30 min',
      estado: 'info',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              ← Atrás
            </button>
            <div>
              <h1 className="section-title mb-0">Dashboard</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Resumen de operaciones
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Grid de estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, idx) => (
            <div key={idx} className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.titulo}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                    {stat.valor}
                  </p>
                </div>
                <span className="text-2xl">{stat.icono}</span>
              </div>
              <div className={`text-xs font-medium ${
                stat.color === 'primary'
                  ? 'text-primary-600 dark:text-primary-400'
                  : stat.color === 'success'
                  ? 'text-success-600 dark:text-success-400'
                  : stat.color === 'warning'
                  ? 'text-warning-600 dark:text-warning-400'
                  : 'text-secondary-600 dark:text-secondary-400'
              }`}>
                {stat.cambio}
              </div>
            </div>
          ))}
        </div>

        {/* Contenido principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gráfico (placeholder) */}
          <div className="lg:col-span-2 card">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              Tendencia de Bultos (últimos 7 días)
            </h3>
            <div className="h-64 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded">
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  📊 Gráfico de tendencias
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  (Conectar con datos reales)
                </p>
              </div>
            </div>
          </div>

          {/* Actividad Reciente */}
          <div className="card">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              Actividad Reciente
            </h3>
            <div className="space-y-3">
              {actividadReciente.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 pb-3 border-b border-gray-200 dark:border-gray-700 last:border-0 last:pb-0"
                >
                  <div className="text-xl">
                    {item.estado === 'success'
                      ? '✅'
                      : item.estado === 'warning'
                      ? '🟡'
                      : '🔵'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {item.bulto}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {item.evento}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {item.hora}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Métricas adicionales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Centros de Distribución */}
          <div className="card">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              Centros de Distribución
            </h3>
            <div className="space-y-3">
              {[
                { nombre: 'Centro A', bultos: 8, estado: 'Activo' },
                { nombre: 'Centro B', bultos: 12, estado: 'Activo' },
                { nombre: 'Centro C', bultos: 4, estado: 'Activo' },
              ].map((centro, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {centro.nombre}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {centro.bultos} bultos
                    </p>
                  </div>
                  <span className="badge badge-success text-xs">
                    {centro.estado}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Clientes Top */}
          <div className="card">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              Clientes Principales
            </h3>
            <div className="space-y-3">
              {[
                { nombre: 'Cliente A', bultos: 15, porcentaje: 42 },
                { nombre: 'Cliente B', bultos: 12, porcentaje: 33 },
                { nombre: 'Cliente C', bultos: 9, porcentaje: 25 },
              ].map((cliente, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {cliente.nombre}
                    </p>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {cliente.bultos}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-primary-500 h-2 rounded-full"
                      style={{ width: `${cliente.porcentaje}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
