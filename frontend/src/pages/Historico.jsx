import React, { useState, useMemo } from 'react';

function Historico({ onBack }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Datos de prueba
  const [bultos] = useState([
    {
      id: 1,
      codigo: 'BUL-001',
      cliente: 'Cliente A',
      peso: '15.5 kg',
      origen: 'CD-A',
      destino: 'CD-B',
      estado: 'Entregado',
      fecha: '2026-02-25',
    },
    {
      id: 2,
      codigo: 'BUL-002',
      cliente: 'Cliente B',
      peso: '22.3 kg',
      origen: 'CD-A',
      destino: 'CD-C',
      estado: 'En tránsito',
      fecha: '2026-02-25',
    },
    {
      id: 3,
      codigo: 'BUL-003',
      cliente: 'Cliente A',
      peso: '18.0 kg',
      origen: 'CD-B',
      destino: 'CD-A',
      estado: 'Pendiente',
      fecha: '2026-02-24',
    },
    {
      id: 4,
      codigo: 'BUL-004',
      cliente: 'Cliente C',
      peso: '30.2 kg',
      origen: 'CD-C',
      destino: 'CD-B',
      estado: 'Entregado',
      fecha: '2026-02-24',
    },
    {
      id: 5,
      codigo: 'BUL-005',
      cliente: 'Cliente B',
      peso: '12.5 kg',
      origen: 'CD-A',
      destino: 'CD-D',
      estado: 'En tránsito',
      fecha: '2026-02-24',
    },
  ]);

  // Filtros
  const bultosFiltrados = useMemo(() => {
    return bultos.filter((bulto) => {
      const matchSearch =
        bulto.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bulto.cliente.toLowerCase().includes(searchTerm.toLowerCase());
      const matchEstado =
        filtroEstado === 'todos' || bulto.estado === filtroEstado;
      return matchSearch && matchEstado;
    });
  }, [bultos, searchTerm, filtroEstado]);

  // Paginación
  const totalPages = Math.ceil(bultosFiltrados.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const bultosPaginados = bultosFiltrados.slice(startIdx, endIdx);

  const handleExportar = () => {
    // TODO: Exportar a CSV/Excel
    alert('Exportando ' + bultosFiltrados.length + ' bultos...');
  };

  const getBadgeColor = (estado) => {
    switch (estado) {
      case 'Entregado':
        return 'success';
      case 'En tránsito':
        return 'warning';
      case 'Pendiente':
        return 'secondary';
      default:
        return 'primary';
    }
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
              <h1 className="section-title mb-0">Histórico de Bultos</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total: {bultosFiltrados.length} bultos
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
                Buscar
              </label>
              <input
                id="search"
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Código o cliente..."
                className="input-field"
              />
            </div>

            <div className="form-group">
              <label htmlFor="estado" className="form-label">
                Estado
              </label>
              <select
                id="estado"
                value={filtroEstado}
                onChange={(e) => {
                  setFiltroEstado(e.target.value);
                  setCurrentPage(1);
                }}
                className="input-field"
              >
                <option value="todos">Todos</option>
                <option value="Pendiente">Pendiente</option>
                <option value="En tránsito">En tránsito</option>
                <option value="Entregado">Entregado</option>
              </select>
            </div>

            <div className="form-group flex items-end">
              <button onClick={handleExportar} className="btn-secondary w-full">
                📥 Exportar
              </button>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Código</th>
                  <th className="table-header-cell">Cliente</th>
                  <th className="table-header-cell">Peso</th>
                  <th className="table-header-cell">Origen</th>
                  <th className="table-header-cell">Destino</th>
                  <th className="table-header-cell">Estado</th>
                  <th className="table-header-cell">Fecha</th>
                  <th className="table-header-cell text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {bultosPaginados.length > 0 ? (
                  bultosPaginados.map((bulto) => (
                    <tr key={bulto.id} className="table-row">
                      <td className="table-cell font-semibold text-primary-600 dark:text-primary-400">
                        {bulto.codigo}
                      </td>
                      <td className="table-cell">{bulto.cliente}</td>
                      <td className="table-cell">{bulto.peso}</td>
                      <td className="table-cell">{bulto.origen}</td>
                      <td className="table-cell">{bulto.destino}</td>
                      <td className="table-cell">
                        <span className={`badge badge-${getBadgeColor(bulto.estado)}`}>
                          {bulto.estado}
                        </span>
                      </td>
                      <td className="table-cell text-sm text-gray-500 dark:text-gray-400">
                        {bulto.fecha}
                      </td>
                      <td className="table-cell text-center">
                        <button className="text-primary-500 hover:text-primary-700 text-sm font-medium">
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="table-cell text-center py-8">
                      <p className="text-gray-500 dark:text-gray-400">
                        No hay bultos que coincidan con los filtros
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

        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="card text-center">
            <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
              {bultosFiltrados.filter((b) => b.estado === 'Entregado').length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Entregados
            </p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-warning-600 dark:text-warning-400">
              {bultosFiltrados.filter((b) => b.estado === 'En tránsito').length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              En Tránsito
            </p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-secondary-600 dark:text-secondary-400">
              {bultosFiltrados.filter((b) => b.estado === 'Pendiente').length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Pendientes
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Historico;
