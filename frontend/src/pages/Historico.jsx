import React, { useState, useMemo, useEffect } from 'react';

function Historico({ onBack, onBultoSelected }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [bultos, setBultos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const itemsPerPage = 10;

  // Cargar datos del histórico
  useEffect(() => {
    cargarHistorico();
  }, []);

  const cargarHistorico = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('http://localhost:5000/api/historico/listar');
      
      if (!response.ok) {
        throw new Error('Error al obtener histórico');
      }

      const datos = await response.json();
      
      // Transformar datos de la BD a formato de tabla
      const bultosProcesados = datos.map((item) => ({
        id: item.id,
        codigo: item.codigo_bulto,
        factura: item.factura || '-',
        ov: item.ov || '-',
        fecha_documento: item.fecha_documento ? new Date(item.fecha_documento).toLocaleDateString('es-CL') : '-',
        fecha_ov: item.fecha_ov ? new Date(item.fecha_ov).toLocaleDateString('es-CL') : '-',
        fecha_ingreso: new Date(item.fecha_ingreso).toLocaleDateString('es-CL')
      }));

      setBultos(bultosProcesados);
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Error al cargar histórico');
      setBultos([]);
      setLoading(false);
    }
  };

  // Filtros
  const bultosFiltrados = useMemo(() => {
    return bultos.filter((bulto) => {
      const matchSearch =
        bulto.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bulto.factura.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bulto.ov.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [bultos, searchTerm]);

  // Paginación
  const totalPages = Math.ceil(bultosFiltrados.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const bultosPaginados = bultosFiltrados.slice(startIdx, endIdx);

  const handleExportar = () => {
    // TODO: Exportar a CSV/Excel
    alert('Exportando ' + bultosFiltrados.length + ' bultos...');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              ← Atrás
            </button>
            <div>
              <h1 className="section-title mb-0">Histórico de Bultos</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total: {bultosFiltrados.length} bultos ingresados
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtros */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="form-group">
              <label htmlFor="search" className="form-label">
                Bulto
              </label>
              <input
                id="search"
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Código, Factura u OV..."
                className="input-field"
              />
            </div>

            <div className="form-group flex items-end">
              <button 
                onClick={cargarHistorico} 
                className="btn-secondary w-full"
              >
                🔄 Actualizar
              </button>
            </div>

            <div className="form-group flex items-end">
              <button onClick={handleExportar} className="btn-secondary w-full">
                📥 Exportar
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="card mb-6 p-4 bg-danger-50 dark:bg-danger-900 border border-danger-200 dark:border-danger-700">
            <p className="text-sm text-danger-700 dark:text-danger-200">❌ {error}</p>
          </div>
        )}

        {/* Cargando */}
        {loading && (
          <div className="card text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">⏳ Cargando histórico...</p>
          </div>
        )}

        {/* Tabla */}
        {!loading && (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">Código Bulto</th>
                    <th className="table-header-cell">Factura</th>
                    <th className="table-header-cell">OV</th>
                    <th className="table-header-cell">Fecha Documento</th>
                    <th className="table-header-cell">Fecha OV</th>
                    <th className="table-header-cell">Ingreso</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {bultosPaginados.length > 0 ? (
                    bultosPaginados.map((bulto) => (
                      <tr 
                        key={bulto.id} 
                        className="table-row cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                        onClick={() => {
                          // Si viene onBultoSelected, lo usamos para ir a gestión
                          if (onBultoSelected) {
                            onBultoSelected(bulto.codigo);
                          }
                        }}
                      >
                        <td className="table-cell font-semibold text-primary-600 dark:text-primary-400 hover:underline">
                          {bulto.codigo}
                        </td>
                        <td className="table-cell">{bulto.factura}</td>
                        <td className="table-cell">{bulto.ov}</td>
                        <td className="table-cell text-sm">{bulto.fecha_documento}</td>
                        <td className="table-cell text-sm">{bulto.fecha_ov}</td>
                        <td className="table-cell text-sm text-gray-500 dark:text-gray-400">
                          {bulto.fecha_ingreso}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="table-cell text-center py-8">
                        <p className="text-gray-500 dark:text-gray-400">
                          {searchTerm 
                            ? 'No hay bultos que coincidan con los filtros' 
                            : 'No hay bultos en el histórico aún'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Página {currentPage} de {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="btn-outline px-3 py-1 text-sm disabled:opacity-50"
                  >
                    ← Anterior
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="btn-outline px-3 py-1 text-sm disabled:opacity-50"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Resumen */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="card text-center">
              <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                {bultos.length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Total Ingresados
              </p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-success-600 dark:text-success-400">
                {bultosFiltrados.length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Coinciden Búsqueda
              </p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-secondary-600 dark:text-secondary-400">
                {totalPages}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Páginas
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Historico;
