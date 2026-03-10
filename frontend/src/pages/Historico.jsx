import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';

function Historico({ onBack, onBultoSelected, usuario }) {
  const DEFAULT_COL_WIDTHS = {
    codigo: 176, // w-44
    ov: 96, // w-24
    ov_fecha: 160, // w-40
    ov_estado: 112, // w-28
    ov_cliente: 256, // w-64
    ov_estratificacion: 160, // w-40
    ov_region: 128, // w-32
    ov_comuna: 128, // w-32
    ov_direccion: 420, // w-[420px]
    ov_ruta: 128, // w-32
    factura: 112, // w-28
    fecha_documento: 160, // w-40
    wms_tipo_error: 176, // w-44
    accion_recomendada: 220,
    bultos_ov: 120,
    ingresados_ov: 150,
    facturas_ov: 140,
    id_carga_masiva: 180, // w-44
    usuario: 112, // w-28
    fecha_ingreso: 160, // w-40
  };

  const MIN_COL_W = 80;
  const MAX_COL_W = 520;

  const [colWidths, setColWidths] = useState(DEFAULT_COL_WIDTHS);
  const [resizing, setResizing] = useState(null); // { key, startX, startW }

  const [filters, setFilters] = useState({
    bulto: '',
    ov: '',
    factura: '',
    cliente: '',
    estratificacion: '',
    accion: '',
    id_carga: '',
    fecha_ingreso: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [bultos, setBultos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const itemsPerPage = 10;

  useEffect(() => {
    if (!resizing) return undefined;

    const onMove = (e) => {
      const dx = e.clientX - resizing.startX;
      const next = Math.max(MIN_COL_W, Math.min(MAX_COL_W, resizing.startW + dx));
      setColWidths((p) => ({ ...p, [resizing.key]: next }));
    };

    const onUp = () => {
      setResizing(null);
      try {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      } catch (e) {
        // ignore
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    try {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } catch (e) {
      // ignore
    }

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      try {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      } catch (e) {
        // ignore
      }
    };
  }, [resizing]);

  const formatDate = (value) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('es-CL');
  };

  const formatDateTime = (value) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    const fecha = d.toLocaleDateString('es-CL');
    const hora = d.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `${fecha} ${hora}`;
  };

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
        // OV (primero)
        ov: item.ov || '-',
        ov_fecha: formatDateTime(item.ov_fecha),
        ov_estado: item.ov_estado || '-',
        ov_cliente: item.ov_cliente || '-',
        ov_estratificacion: item.ov_estratificacion || '-',
        ov_region: item.ov_region || '-',
        ov_comuna: item.ov_comuna || '-',
        ov_direccion: item.ov_direccion || '-',
        ov_ruta: item.ov_ruta || '-',

        // Factura y otros (al final)
        factura: item.factura || '-',
        fecha_documento: formatDate(item.fecha_documento),
        wms_tipo_error: item.wms_tipo_error || '-',
        accion_recomendada: item.accion_recomendada || '-',
        bultos_ov: item.bultos_ov || 0,
        ingresados_ov: item.ingresados_ov || 0,
        facturas_ov: item.facturas_ov || 0,
        id_carga_masiva: item.id_carga_masiva || '-',
        usuario: item.usuario || '-',
        fecha_ingreso: formatDateTime(item.fecha_ingreso),
        fecha_ingreso_raw: item.fecha_ingreso ? new Date(item.fecha_ingreso) : null,
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
    const norm = (v) => String(v ?? '').trim().toLowerCase();
    const f = {
      bulto: norm(filters.bulto),
      ov: norm(filters.ov),
      factura: norm(filters.factura),
      cliente: norm(filters.cliente),
      estratificacion: norm(filters.estratificacion),
      accion: norm(filters.accion),
      id_carga: norm(filters.id_carga),
      fecha_ingreso: String(filters.fecha_ingreso || '').trim(), // YYYY-MM-DD
    };

    let start = null;
    let end = null;
    if (f.fecha_ingreso) {
      start = new Date(`${f.fecha_ingreso}T00:00:00`);
      end = new Date(`${f.fecha_ingreso}T00:00:00`);
      end.setDate(end.getDate() + 1);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        start = null;
        end = null;
      }
    }

    return bultos.filter((b) => {
      if (f.bulto && !norm(b.codigo).includes(f.bulto)) return false;
      if (f.ov && !norm(b.ov).includes(f.ov)) return false;
      if (f.factura && !norm(b.factura).includes(f.factura)) return false;
      if (f.cliente && !norm(b.ov_cliente).includes(f.cliente)) return false;
      if (f.estratificacion && !norm(b.ov_estratificacion).includes(f.estratificacion)) return false;
      if (f.accion && !norm(b.accion_recomendada).includes(f.accion)) return false;
      if (f.id_carga && !norm(b.id_carga_masiva).includes(f.id_carga)) return false;

      if (start && end) {
        const d = b.fecha_ingreso_raw instanceof Date ? b.fecha_ingreso_raw : null;
        if (!d || Number.isNaN(d.getTime())) return false;
        if (d < start || d >= end) return false;
      }

      return true;
    });
  }, [bultos, filters]);

  const hasAnyFilter =
    !!filters.bulto ||
    !!filters.ov ||
    !!filters.factura ||
    !!filters.cliente ||
    !!filters.estratificacion ||
    !!filters.accion ||
    !!filters.id_carga ||
    !!filters.fecha_ingreso;

  // Paginación
  const totalPages = Math.ceil(bultosFiltrados.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const bultosPaginados = bultosFiltrados.slice(startIdx, endIdx);

  const handleExportar = async () => {
    if (!bultosFiltrados || bultosFiltrados.length === 0) {
      alert('No hay registros para exportar');
      return;
    }

    const headers = [
      'Código Bulto',
      'OV',
      'Fecha OV',
      'Estado OV',
      'Cliente',
      'Estratificación',
      'Región',
      'Comuna',
      'Dirección',
      'Ruta OV',
      'Factura',
      'Fecha Documento',
      'Motivo WMS',
      'Acción',
      'Bultos OV',
      'Ingresados OV',
      'Facturas OV',
      'ID Carga Masiva',
      'Usuario',
      'Ingreso',
    ];

    const rows = bultosFiltrados.map((b) => [
      b.codigo,
      b.ov,
      b.ov_fecha,
      b.ov_estado,
      b.ov_cliente,
      b.ov_estratificacion,
      b.ov_region,
      b.ov_comuna,
      b.ov_direccion,
      b.ov_ruta,
      b.factura,
      b.fecha_documento,
      b.wms_tipo_error,
      b.accion_recomendada,
      b.bultos_ov,
      b.ingresados_ov,
      b.facturas_ov,
      b.id_carga_masiva,
      b.usuario,
      b.fecha_ingreso,
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };
    ws['!cols'] = [
      { wch: 18 },
      { wch: 10 },
      { wch: 18 },
      { wch: 12 },
      { wch: 40 },
      { wch: 22 },
      { wch: 18 },
      { wch: 18 },
      { wch: 50 },
      { wch: 14 },
      { wch: 12 },
      { wch: 16 },
      { wch: 22 },
      { wch: 28 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 22 },
      { wch: 14 },
      { wch: 18 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historico');

    const fileSafeTs = new Date()
      .toISOString()
      .slice(0, 19)
      .replace('T', '_')
      .replaceAll(':', '-');
    const filename = `historico_bultos_${fileSafeTs}.xlsx`;

    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    // En Electron: guardar con "Guardar como..." y registrar solo si se guardó realmente
    const canElectronSave =
      typeof window !== 'undefined' &&
      window.electron &&
      typeof window.electron.saveXlsx === 'function';

    if (canElectronSave) {
      const result = await window.electron.saveXlsx({
        defaultFilename: filename,
        data: out,
      });

      if (result && result.cancelled) {
        return; // el usuario canceló: NO registrar exportación
      }

      const savedFilename = result && result.savedFilename ? result.savedFilename : filename;

      try {
        fetch('http://localhost:5000/api/exportaciones/registrar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            usuario: usuario?.usuario || null,
            origen: 'Historico',
            formato: 'xlsx',
            filename: savedFilename,
            total_registros: bultosFiltrados.length,
            filtros: filters,
          }),
        }).catch(() => { });
      } catch (e) {
        // Ignorar: el archivo ya fue guardado
      }
      return;
    }

    // Fallback navegador (no podemos saber si guardó): descarga directa SIN registrar
    const blob = new Blob([out], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 mb-0">
                Histórico de Bultos
              </h1>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
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
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-4">
            <div className="form-group">
              <label htmlFor="f_bulto" className="form-label">
                Bulto
              </label>
              <input
                id="f_bulto"
                type="text"
                value={filters.bulto}
                onChange={(e) => {
                  setFilters((p) => ({ ...p, bulto: e.target.value }));
                  setCurrentPage(1);
                }}
                placeholder="BU000..."
                className="input-field"
              />
            </div>

            <div className="form-group">
              <label htmlFor="f_ov" className="form-label">
                OV
              </label>
              <input
                id="f_ov"
                type="text"
                value={filters.ov}
                onChange={(e) => {
                  setFilters((p) => ({ ...p, ov: e.target.value }));
                  setCurrentPage(1);
                }}
                placeholder="331909"
                className="input-field"
              />
            </div>

            <div className="form-group">
              <label htmlFor="f_factura" className="form-label">
                Factura
              </label>
              <input
                id="f_factura"
                type="text"
                value={filters.factura}
                onChange={(e) => {
                  setFilters((p) => ({ ...p, factura: e.target.value }));
                  setCurrentPage(1);
                }}
                placeholder="710662"
                className="input-field"
              />
            </div>

            <div className="form-group">
              <label htmlFor="f_cliente" className="form-label">
                Cliente
              </label>
              <input
                id="f_cliente"
                type="text"
                value={filters.cliente}
                onChange={(e) => {
                  setFilters((p) => ({ ...p, cliente: e.target.value }));
                  setCurrentPage(1);
                }}
                placeholder="SOCIEDAD..."
                className="input-field"
              />
            </div>

            <div className="form-group">
              <label htmlFor="f_estrat" className="form-label">
                Estratificación
              </label>
              <input
                id="f_estrat"
                type="text"
                value={filters.estratificacion}
                onChange={(e) => {
                  setFilters((p) => ({ ...p, estratificacion: e.target.value }));
                  setCurrentPage(1);
                }}
                placeholder="RETAIL"
                className="input-field"
              />
            </div>

            <div className="form-group">
              <label htmlFor="f_accion" className="form-label">
                Acción
              </label>
              <input
                id="f_accion"
                type="text"
                value={filters.accion}
                onChange={(e) => {
                  setFilters((p) => ({ ...p, accion: e.target.value }));
                  setCurrentPage(1);
                }}
                placeholder="Evaluar despacho..."
                className="input-field"
              />
            </div>

            <div className="form-group">
              <label htmlFor="f_ingreso" className="form-label">
                Fecha ingreso
              </label>
              <input
                id="f_ingreso"
                type="date"
                value={filters.fecha_ingreso}
                onChange={(e) => {
                  setFilters((p) => ({ ...p, fecha_ingreso: e.target.value }));
                  setCurrentPage(1);
                }}
                className="input-field"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="f_id_carga" className="form-label">
                ID Carga Masiva
              </label>
              <input
                id="f_id_carga"
                type="text"
                value={filters.id_carga}
                onChange={(e) => {
                  setFilters((p) => ({ ...p, id_carga: e.target.value }));
                  setCurrentPage(1);
                }}
                placeholder="CM-2026..."
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-group flex items-end">
              <button onClick={cargarHistorico} className="btn-secondary w-full">
                🔄 Actualizar
              </button>
            </div>

            <div className="form-group flex items-end">
              <button onClick={handleExportar} className="btn-secondary w-full">
                📥 Exportar
              </button>
            </div>

            <div className="form-group flex items-end">
              <button
                onClick={() => {
                  setFilters({
                    bulto: '',
                    ov: '',
                    factura: '',
                    cliente: '',
                    estratificacion: '',
                    accion: '',
                    id_carga: '',
                    fecha_ingreso: '',
                  });
                  setCurrentPage(1);
                }}
                className="btn-outline w-full"
              >
                Limpiar filtros
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
              <table className="table table-fixed min-w-[1600px]">
                <thead className="table-header">
                  <tr>
                    {[
                      { key: 'codigo', label: 'Código Bulto' },
                      { key: 'ov', label: 'OV' },
                      { key: 'ov_fecha', label: 'Fecha OV' },
                      { key: 'ov_estado', label: 'Estado OV' },
                      { key: 'ov_cliente', label: 'Cliente' },
                      { key: 'ov_estratificacion', label: 'Estratificación' },
                      { key: 'ov_region', label: 'Región' },
                      { key: 'ov_comuna', label: 'Comuna' },
                      { key: 'ov_direccion', label: 'Dirección' },
                      { key: 'ov_ruta', label: 'Ruta OV' },
                      { key: 'factura', label: 'Factura' },
                      { key: 'fecha_documento', label: 'Fecha Documento' },
                      { key: 'wms_tipo_error', label: 'Motivo WMS' },
                      { key: 'accion_recomendada', label: 'Acción' },
                      { key: 'bultos_ov', label: 'Bultos OV' },
                      { key: 'ingresados_ov', label: 'Ingresados OV' },
                      { key: 'facturas_ov', label: 'Facturas OV' },
                      { key: 'id_carga_masiva', label: 'ID Carga Masiva' },
                      { key: 'usuario', label: 'Usuario' },
                      { key: 'fecha_ingreso', label: 'Ingreso' },
                    ].map((c, idx) => {
                      const totalCols = 20;
                      const isLast = idx === totalCols - 1;
                      return (
                        <th
                          key={c.key}
                          className="table-header-cell whitespace-nowrap relative select-none pr-3"
                          style={{ width: colWidths[c.key] }}
                        >
                          {c.label}
                          {!isLast && (
                            <span
                              role="separator"
                              aria-orientation="vertical"
                              title="Arrastra para ajustar ancho"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setResizing({
                                  key: c.key,
                                  startX: e.clientX,
                                  startW: colWidths[c.key] || MIN_COL_W,
                                });
                              }}
                              className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize"
                            />
                          )}
                        </th>
                      );
                    })}
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
                        <td
                          className="table-cell font-semibold text-primary-600 dark:text-primary-400 hover:underline whitespace-nowrap"
                          style={{ width: colWidths.codigo }}
                        >
                          {bulto.codigo}
                        </td>
                        <td className="table-cell whitespace-nowrap" style={{ width: colWidths.ov }}>
                          {bulto.ov}
                        </td>
                        <td className="table-cell text-sm whitespace-nowrap" style={{ width: colWidths.ov_fecha }}>
                          {bulto.ov_fecha}
                        </td>
                        <td className="table-cell whitespace-nowrap" style={{ width: colWidths.ov_estado }}>
                          {bulto.ov_estado}
                        </td>
                        <td
                          className="table-cell whitespace-nowrap truncate"
                          title={bulto.ov_cliente}
                          style={{ width: colWidths.ov_cliente }}
                        >
                          {bulto.ov_cliente}
                        </td>
                        <td
                          className="table-cell whitespace-nowrap truncate"
                          title={bulto.ov_estratificacion}
                          style={{ width: colWidths.ov_estratificacion }}
                        >
                          {bulto.ov_estratificacion}
                        </td>
                        <td
                          className="table-cell whitespace-nowrap truncate"
                          title={bulto.ov_region}
                          style={{ width: colWidths.ov_region }}
                        >
                          {bulto.ov_region}
                        </td>
                        <td
                          className="table-cell whitespace-nowrap truncate"
                          title={bulto.ov_comuna}
                          style={{ width: colWidths.ov_comuna }}
                        >
                          {bulto.ov_comuna}
                        </td>
                        <td
                          className="table-cell whitespace-nowrap truncate"
                          title={bulto.ov_direccion}
                          style={{ width: colWidths.ov_direccion }}
                        >
                          {bulto.ov_direccion}
                        </td>
                        <td
                          className="table-cell whitespace-nowrap truncate"
                          title={bulto.ov_ruta}
                          style={{ width: colWidths.ov_ruta }}
                        >
                          {bulto.ov_ruta}
                        </td>
                        <td className="table-cell whitespace-nowrap" style={{ width: colWidths.factura }}>
                          {bulto.factura}
                        </td>
                        <td className="table-cell text-sm whitespace-nowrap" style={{ width: colWidths.fecha_documento }}>
                          {bulto.fecha_documento}
                        </td>
                        <td
                          className="table-cell whitespace-nowrap truncate"
                          title={bulto.wms_tipo_error}
                          style={{ width: colWidths.wms_tipo_error }}
                        >
                          {bulto.wms_tipo_error}
                        </td>
                        <td
                          className="table-cell whitespace-nowrap truncate"
                          title={bulto.accion_recomendada}
                          style={{ width: colWidths.accion_recomendada }}
                        >
                          {bulto.accion_recomendada}
                        </td>
                        <td className="table-cell whitespace-nowrap text-center font-bold" style={{ width: colWidths.bultos_ov }}>
                          {bulto.bultos_ov}
                        </td>
                        <td className="table-cell whitespace-nowrap text-center font-bold text-primary-600 dark:text-primary-400" style={{ width: colWidths.ingresados_ov }}>
                          {bulto.ingresados_ov}
                        </td>
                        <td className="table-cell whitespace-nowrap text-center" style={{ width: colWidths.facturas_ov }}>
                          {bulto.facturas_ov}
                        </td>
                        <td className="table-cell whitespace-nowrap text-sm font-mono text-gray-500 bg-gray-100 dark:bg-gray-800" style={{ width: colWidths.id_carga_masiva }}>
                          {bulto.id_carga_masiva}
                        </td>
                        <td className="table-cell whitespace-nowrap" style={{ width: colWidths.usuario }}>
                          {bulto.usuario}
                        </td>
                        <td
                          className="table-cell text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap"
                          style={{ width: colWidths.fecha_ingreso }}
                        >
                          {bulto.fecha_ingreso}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="19" className="table-cell text-center py-8">
                        <p className="text-gray-500 dark:text-gray-400">
                          {hasAnyFilter
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
