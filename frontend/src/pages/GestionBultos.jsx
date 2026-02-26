import React, { useState } from 'react';

function GestionBultos({ onBack }) {
  const [codigoBulto, setCodigoBulto] = useState('');
  const [bultoInfo, setBultoInfo] = useState(null);
  const [otrosBultos, setOtrosBultos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleBuscar = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setBultoInfo(null);
    setOtrosBultos([]);

    if (!codigoBulto.trim()) {
      setError('Por favor ingresa un código de bulto');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`http://localhost:5000/api/bultos/${codigoBulto.trim()}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Bulto no encontrado');
      }

      const data = await response.json();
      
      setBultoInfo({
        codigo: data.bulto.codigo,
        factura: data.bulto.factura,
        cantidadBultos: data.bulto.cantidadBultos,
        fechaDocumento: data.bulto.fechaDocumento,
        fechaOV: data.bulto.fechaOV,
        ov: data.bulto.ov,
      });

      if (data.otrosBultos && data.otrosBultos.length > 0) {
        setOtrosBultos(data.otrosBultos);
      }

      setLoading(false);
    } catch (err) {
      setError(err.message || 'Error al buscar bulto');
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
      setOtrosBultos([]);
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
                Escanea o ingresa el código del bulto para obtener información de HANA
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
                    Factura: {bultoInfo.factura}
                  </p>
                </div>
                <span className="badge badge-success">
                  Encontrado en HANA
                </span>
              </div>

              {/* Grid de información */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    Información de HANA
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Factura (FolioNum)</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {bultoInfo.factura}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Cantidad de Bultos</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {bultoInfo.cantidadBultos}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Fecha Documento</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {new Date(bultoInfo.fechaDocumento).toLocaleDateString('es-CL')}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    Orden de Venta
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">OV (Orden de Venta)</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {bultoInfo.ov}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Fecha OV</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {new Date(bultoInfo.fechaOV).toLocaleDateString('es-CL')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Otros bultos en la factura */}
              {otrosBultos.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Otros Bultos en Factura {bultoInfo.factura}
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="table-striped w-full text-sm">
                      <thead>
                        <tr>
                          <th>Código</th>
                          <th>Cantidad</th>
                          <th>Factura</th>
                        </tr>
                      </thead>
                      <tbody>
                        {otrosBultos.map((bulto, idx) => (
                          <tr key={idx}>
                            <td className="font-medium">{bulto.codigo}</td>
                            <td>{bulto.cantidadBultos}</td>
                            <td>{bulto.factura}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
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
                  setOtrosBultos([]);
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
              Los datos se cargarán directamente desde HANA
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default GestionBultos;
