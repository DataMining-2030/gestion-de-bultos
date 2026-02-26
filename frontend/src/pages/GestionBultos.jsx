import React, { useState } from 'react';

function GestionBultos({ onBack }) {
  const [codigoBulto, setCodigoBulto] = useState('');
  const [bultoInfo, setBultoInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleBuscar = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setBultoInfo(null);

    if (!codigoBulto.trim()) {
      setError('Por favor ingresa un código de bulto');
      return;
    }

    setLoading(true);

    try {
      // Simulamos una búsqueda de bulto
      // TODO: Conectar con Blueyonder/Haana/SAP
      const mockBultoInfo = {
        codigo: codigoBulto,
        descripcion: 'Bulto de ejemplo',
        peso: '25.5 kg',
        origen: 'Centro Distribución A',
        destino: 'Centro Distribución B',
        estado: 'En tránsito',
        fechaCreacion: new Date().toLocaleDateString(),
        cliente: 'Cliente XYZ',
        referencia: 'REF-' + codigoBulto,
        estadoDetalle: [
          { fecha: '2026-02-25 10:30', evento: 'Escaneado en origen' },
          { fecha: '2026-02-25 14:15', evento: 'En tránsito' },
        ],
      };

      setTimeout(() => {
        setBultoInfo(mockBultoInfo);
        setLoading(false);
      }, 1000);
    } catch (err) {
      setError('Error al buscar bulto');
      setLoading(false);
    }
  };

  const handleGuardarEnHistorico = () => {
    if (!bultoInfo) return;

    // TODO: Guardar en base de datos
    setSuccess('✅ Bulto guardado en histórico exitosamente');
    setTimeout(() => {
      setCodigoBulto('');
      setBultoInfo(null);
      setSuccess('');
    }, 2000);
  };

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
              <h1 className="section-title mb-0">Gestión de Bultos</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Escanea o ingresa el código del bulto
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Formulario de búsqueda */}
        <div className="card mb-8">
          <form onSubmit={handleBuscar} className="space-y-4">
            <div className="form-group">
              <label htmlFor="codigoBulto" className="form-label">
                Código de Bulto
              </label>
              <div className="flex gap-2">
                <input
                  id="codigoBulto"
                  type="text"
                  value={codigoBulto}
                  onChange={(e) => setCodigoBulto(e.target.value)}
                  placeholder="Escanea o ingresa el código..."
                  className="input-field flex-1"
                  disabled={loading}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary whitespace-nowrap"
                >
                  {loading ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-danger-50 dark:bg-danger-900 border border-danger-200 dark:border-danger-700 rounded-lg animate-fade-in">
                <p className="text-sm text-danger-700 dark:text-danger-200">{error}</p>
              </div>
            )}
          </form>
        </div>

        {/* Información del Bulto */}
        {bultoInfo && (
          <div className="space-y-6 animate-slide-up">
            {/* Card principal */}
            <div className="card border-l-4 border-l-primary-500">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {bultoInfo.codigo}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {bultoInfo.descripcion}
                  </p>
                </div>
                <span className={`badge badge-${bultoInfo.estado === 'En tránsito' ? 'warning' : 'success'}`}>
                  {bultoInfo.estado}
                </span>
              </div>

              {/* Grid de información */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    Información General
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Cliente</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {bultoInfo.cliente}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Referencia</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {bultoInfo.referencia}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Peso</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {bultoInfo.peso}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    Ubicación
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Origen</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {bultoInfo.origen}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Destino</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {bultoInfo.destino}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Fecha Creación</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {bultoInfo.fechaCreacion}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline de estados */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Historial de Eventos
                </h4>
                <div className="space-y-4">
                  {bultoInfo.estadoDetalle.map((evento, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                        {idx < bultoInfo.estadoDetalle.length - 1 && (
                          <div className="w-0.5 h-8 bg-gray-300 dark:bg-gray-600 mt-2"></div>
                        )}
                      </div>
                      <div className="pb-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {evento.fecha}
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {evento.evento}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-3">
              <button
                onClick={handleGuardarEnHistorico}
                className="btn-success flex-1"
              >
                💾 Guardar en Histórico
              </button>
              <button
                onClick={() => {
                  setCodigoBulto('');
                  setBultoInfo(null);
                }}
                className="btn-outline flex-1"
              >
                Limpiar
              </button>
            </div>

            {success && (
              <div className="p-4 bg-success-50 dark:bg-success-900 border border-success-200 dark:border-success-700 rounded-lg animate-fade-in">
                <p className="text-sm text-success-700 dark:text-success-200">{success}</p>
              </div>
            )}
          </div>
        )}

        {/* Estado vacío */}
        {!bultoInfo && !loading && (
          <div className="card text-center py-12">
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
              📦 Ingresa un código de bulto para comenzar
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Puedes escanear o escribir el código manualmente
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default GestionBultos;
