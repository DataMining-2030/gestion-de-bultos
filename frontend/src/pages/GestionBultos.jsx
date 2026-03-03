import React, { useEffect, useState } from 'react';

function GestionBultos({ onBack, codigoBultoInicial, usuario }) {
  const [codigoBulto, setCodigoBulto] = useState('');
  const [bultoInfo, setBultoInfo] = useState(null);
  const [gruposBultos, setGruposBultos] = useState([]);
  const [gruposColapsados, setGruposColapsados] = useState({});
  const [loading, setLoading] = useState(false);
  const [busquedaLenta, setBusquedaLenta] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [estadoHistorico, setEstadoHistorico] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [bultosAGuardar, setBultosAGuardar] = useState([]);

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

  const getConteoIngresados = (codigos) => {
    const list = Array.isArray(codigos) ? codigos : [];
    const total = list.length;
    const ingresados = list.reduce((acc, c) => acc + (estadoHistorico[c] ? 1 : 0), 0);
    return { total, ingresados, faltan: Math.max(0, total - ingresados) };
  };

  const getMetricasOV = () => {
    const bultos = (gruposBultos || []).flatMap((g) => g?.bultos || []);
    const codigos = bultos.map((b) => b.codigo).filter(Boolean);
    const { total, ingresados, faltan } = getConteoIngresados(codigos);
    const facturados = bultos.filter((b) => b && b.factura).length;
    const sinFactura = Math.max(0, total - facturados);
    const facturasOV = new Set(bultos.map((b) => (b && b.factura ? String(b.factura) : null)).filter(Boolean))
      .size;
    return { total, facturasOV, ingresados, faltan, facturados, sinFactura };
  };

  // Limpiar todo al montar el componente
  useEffect(() => {
    // Limpiar siempre al entrar
    setCodigoBulto('');
    setBultoInfo(null);
    setGruposBultos([]);
    setGruposColapsados({});
    setEstadoHistorico({});
    setError('');
    setSuccess('');
    setShowConfirm(false);
  }, []);

  // Inicializar estado de colapso cada vez que llegan grupos nuevos
  useEffect(() => {
    const next = {};
    (gruposBultos || []).forEach((g) => {
      const key = g?.factura ? String(g.factura) : '__SIN_FACTURA__';
      next[key] = true; // por defecto: colapsado (el usuario despliega lo que necesita)
    });
    setGruposColapsados(next);
  }, [gruposBultos]);

  // Si viene codigoBultoInicial, buscar automáticamente
  useEffect(() => {
    if (codigoBultoInicial) {
      buscarBulto(codigoBultoInicial);
    }
  }, [codigoBultoInicial]);

  const buscarBulto = async (codigo) => {
    setError('');
    setSuccess('');
    setBultoInfo(null);
    setGruposBultos([]);
    setGruposColapsados({});
    setEstadoHistorico({});
    setShowConfirm(false);

    if (!codigo || !codigo.trim()) {
      setError('Por favor ingresa un código de bulto');
      return;
    }

    setLoading(true);
    setBusquedaLenta(false);
    const slowTimer = setTimeout(() => setBusquedaLenta(true), 1200);

    try {
      const response = await fetch(`http://localhost:5000/api/bultos/${codigo.trim()}`);
      
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
        totalEnOV: data.totalBultosOV,
        ovInfo: data.ovInfo || null,
        wmsIntegracion: data.wmsIntegracion || null,
        accionRecomendada: data.accionRecomendada || null,
      });

      setGruposBultos(Array.isArray(data.grupos) ? data.grupos : []);
      setGruposColapsados({});
      setEstadoHistorico({});

      const codigosParaVerificar = (Array.isArray(data.grupos) ? data.grupos : [])
        .flatMap((g) => (g?.bultos || []).map((b) => b.codigo))
        .filter(Boolean);

      await verificarEnHistorico(codigosParaVerificar.length ? codigosParaVerificar : [data.bulto.codigo]);

    } catch (err) {
      setError(err.message || 'Error al buscar bulto');
    } finally {
      clearTimeout(slowTimer);
      setLoading(false);
      setBusquedaLenta(false);
    }
  };

  const handleBuscar = async (e) => {
    e.preventDefault();
    buscarBulto(codigoBulto);
  };

  const verificarEnHistorico = async (codigos) => {
    try {
      const response = await fetch('http://localhost:5000/api/historico/verificar-multiples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigos })
      });

      if (response.ok) {
        const resultado = await response.json();
        setEstadoHistorico(resultado);
      }
    } catch (err) {
      console.error('Error verificando histórico:', err);
    }
  };

  const handleGuardarEnHistorico = () => {
    if (!bultoInfo) return;

    // Solo guardar el bulto principal (el que se buscó)
    if (estadoHistorico[bultoInfo.codigo]) {
      setConfirmMessage(
        `⚠️ Este bulto ya está en histórico:\n${bultoInfo.codigo}\n\n¿Deseas intentar guardarlo de todas formas?`
      );
      setBultosAGuardar([bultoInfo.codigo]);
      setShowConfirm(true);
    } else {
      guardarBultosEnHistorico([bultoInfo.codigo]);
    }
  };

  const guardarBultosEnHistorico = async (codigos) => {
    try {
      let guardados = 0;

      for (const codigo of codigos) {
        const bulto =
          codigo === bultoInfo.codigo
            ? bultoInfo
            : gruposBultos
                .flatMap((g) => g.bultos || [])
                .find((b) => b.codigo === codigo);
        
        const response = await fetch('http://localhost:5000/api/historico/guardar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codigo_bulto: bulto.codigo,
            factura: bulto.factura,
            ov: bulto.ov,
            fecha_documento: bulto.fechaDocumento,
            fecha_ov: bulto.fechaOV,
            usuario: usuario?.usuario || null,
            ovInfo: bultoInfo?.ovInfo || null,
            wmsInfo: bultoInfo?.wmsIntegracion || null,
            accionRecomendada: bultoInfo?.accionRecomendada || null,
          })
        });

        if (response.ok) {
          guardados++;
          // Actualizar estado
          const nuevoEstado = { ...estadoHistorico };
          nuevoEstado[codigo] = true;
          setEstadoHistorico(nuevoEstado);
        }
      }

      setSuccess(`✅ ${guardados} bulto(s) guardado(s) en histórico exitosamente`);
      setShowConfirm(false);
      
      setTimeout(() => {
        setCodigoBulto('');
        setBultoInfo(null);
        setGruposBultos([]);
        setEstadoHistorico({});
        setSuccess('');
      }, 2000);
    } catch (err) {
      setError('Error al guardar bultos: ' + err.message);
    }
  };

  const getEstadoIndicador = (codigo) => {
    if (estadoHistorico[codigo]) {
      return { icon: '✓', color: 'text-success-600', bg: 'bg-success-50', label: 'En histórico' };
    } else {
      return { icon: '✕', color: 'text-danger-600', bg: 'bg-danger-50', label: 'Nuevo' };
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
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              ← Atrás
            </button>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 mb-0">
                Gestión de Bultos
              </h1>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                Escanea o ingresa el código del bulto para obtener información de MySQL y HANA
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* Formulario de búsqueda */}
        <div className="card p-3 mb-4">
          <form onSubmit={handleBuscar} className="space-y-3">
            <div className="form-group">
              <label htmlFor="codigoBulto" className="form-label">
                Bulto
              </label>
              <div className="flex gap-2">
                <input
                  id="codigoBulto"
                  type="text"
                  value={codigoBulto}
                  onChange={(e) => setCodigoBulto(e.target.value)}
                  placeholder="Escanea o ingresa el bulto..."
                  className="input-field flex-1 h-10 py-1.5 text-sm"
                  disabled={loading}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary whitespace-nowrap h-10 py-1.5 text-sm px-4"
                >
                  <span className="inline-flex items-center gap-2">
                    {loading && (
                      <svg
                        className="h-4 w-4 animate-spin text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          opacity="0.25"
                        />
                        <path
                          d="M22 12a10 10 0 0 1-10 10"
                          stroke="currentColor"
                          strokeWidth="4"
                          strokeLinecap="round"
                          opacity="0.9"
                        />
                      </svg>
                    )}
                    {loading ? 'Buscando…' : 'Buscar'}
                  </span>
                </button>
              </div>
            </div>

            {loading && (
              <div className="h-1 w-full overflow-hidden rounded bg-gray-200 dark:bg-gray-700">
                <div className="h-full w-full bg-gradient-to-r from-primary-600 via-primary-400 to-primary-600 animate-pulse" />
              </div>
            )}

            {error && (
              <div className="p-4 bg-danger-50 dark:bg-danger-900 border border-danger-200 dark:border-danger-700 rounded-lg animate-fade-in">
                <p className="text-sm text-danger-700 dark:text-danger-200">{error}</p>
              </div>
            )}
          </form>
        </div>

        {/* Placeholder mientras busca (evita sensación de “pegado”) */}
        {loading && !bultoInfo && (
          <div className="card p-4 mb-4 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-3" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-28 mt-3" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-44" />
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-28 mt-3" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-36" />
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-28" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-28 mt-3" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
              </div>
            </div>
          </div>
        )}

        {/* Información del Bulto */}
        {bultoInfo && (
          <div className="space-y-3 animate-slide-up">
            {/* Card principal */}
            <div className="card p-3 border-l-4 border-l-primary-500">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                      {bultoInfo.codigo}
                    </h2>
                    {(() => {
                      const estado = getEstadoIndicador(bultoInfo.codigo);
                      return (
                        <span className={`text-base font-bold ${estado.color}`}>
                          {estado.icon}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Grid de información */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                <div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">N° OV</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {bultoInfo.ov || '-'}
                      </p>
                    </div>
                    {bultoInfo.ovInfo && (
                      <div className="pt-1 space-y-1.5">
                        {[
                          { label: 'Fecha OV', value: formatDateTime(bultoInfo.ovInfo['Fecha OV']) },
                          { label: 'Estado OV', value: bultoInfo.ovInfo['Estado OV'] || '-' },
                          { label: 'Cliente', value: bultoInfo.ovInfo.Cliente || '-' },
                          { label: 'Estratificación', value: bultoInfo.ovInfo.Estratificación || '-' },
                          { label: 'Región', value: bultoInfo.ovInfo['Región'] || '-' },
                          { label: 'Comuna', value: bultoInfo.ovInfo.Comuna || '-' },
                          { label: 'Dirección', value: bultoInfo.ovInfo.Direccion || '-' },
                          { label: 'Ruta OV', value: bultoInfo.ovInfo['Ruta OV'] || '-' },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="grid grid-cols-[110px_1fr] gap-2 items-start"
                          >
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                              {item.label}
                            </p>
                            <p className="text-[11px] font-medium text-gray-900 dark:text-gray-100 break-words">
                              {item.value}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Factura</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {bultoInfo.factura || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Fecha Documento</p>
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100">
                        {formatDate(bultoInfo.fechaDocumento)}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Total bultos (OV)
                      </p>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {(() => getMetricasOV().total)()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Facturas (OV)
                      </p>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {(() => getMetricasOV().facturasOV)()}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Ingresados
                        </p>
                        <p className="text-sm font-bold text-primary-600 dark:text-primary-400">
                          {(() => getMetricasOV().ingresados)()}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Faltan
                        </p>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                          {(() => getMetricasOV().faltan)()}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Facturados
                        </p>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                          {(() => getMetricasOV().facturados)()}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Sin factura
                        </p>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                          {(() => getMetricasOV().sinFactura)()}
                        </p>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {/* Integración WMS -> SAP (si existe) */}
              {bultoInfo.wmsIntegracion && (
                <div
                  className={`mt-2 rounded-lg border p-3 ${
                    bultoInfo.wmsIntegracion.mensaje_error
                      ? 'bg-danger-50 dark:bg-danger-900 border-danger-200 dark:border-danger-700'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <p className="text-[11px] text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-1">
                    Integración WMS → SAP
                  </p>
                  {bultoInfo.accionRecomendada && (
                    <p className="text-xs text-gray-800 dark:text-gray-100 mb-1">
                      Acción: <span className="font-semibold">{bultoInfo.accionRecomendada}</span>
                    </p>
                  )}
                  <p className="text-xs text-gray-800 dark:text-gray-100">
                    Estado: <span className="font-semibold">{bultoInfo.wmsIntegracion.estado || '-'}</span>
                    {bultoInfo.wmsIntegracion.codigo_error ? (
                      <span className="ml-2 text-gray-600 dark:text-gray-300">
                        Código: <span className="font-semibold">{bultoInfo.wmsIntegracion.codigo_error}</span>
                      </span>
                    ) : null}
                    {bultoInfo.wmsIntegracion.tipo_error ? (
                      <span className="ml-2 text-gray-600 dark:text-gray-300">
                        Motivo: <span className="font-semibold">{bultoInfo.wmsIntegracion.tipo_error}</span>
                      </span>
                    ) : null}
                    {bultoInfo.wmsIntegracion.fecha ? (
                      <span className="ml-2 text-gray-600 dark:text-gray-300">
                        Fecha: <span className="font-semibold">{formatDateTime(bultoInfo.wmsIntegracion.fecha)}</span>
                      </span>
                    ) : null}
                  </p>
                  {(bultoInfo.wmsIntegracion.mensaje_usuario || bultoInfo.wmsIntegracion.mensaje_error) ? (
                    <p className="text-xs text-danger-700 dark:text-danger-200 mt-2 whitespace-pre-wrap">
                      {bultoInfo.wmsIntegracion.mensaje_usuario || bultoInfo.wmsIntegracion.mensaje_error}
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            {/* Bultos de la OV agrupados por factura / sin factura */}
            {gruposBultos.length > 0 && (
              <div className="space-y-3">
                {gruposBultos.map((grupo, idxGrupo) => {
                  const tituloGrupo = grupo.factura ? `Factura ${grupo.factura}` : 'Sin factura';
                  const count = (grupo.bultos || []).length;
                  const groupKey = grupo.factura ? String(grupo.factura) : '__SIN_FACTURA__';
                  const colapsado = !!gruposColapsados[groupKey];
                  const codigosGrupo = (grupo.bultos || []).map((b) => b.codigo).filter(Boolean);
                  const conteoGrupo = getConteoIngresados(codigosGrupo);
                  return (
                    <div key={idxGrupo} className="card p-4">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          📦 {tituloGrupo}
                          <span className="text-xs font-normal text-gray-600 dark:text-gray-400 ml-2">
                            ({count} bultos)
                            {' · '}Ingresados: {conteoGrupo.ingresados}
                            {' · '}Faltan: {conteoGrupo.faltan}
                            {grupo.esPrincipal ? ' · del bulto escaneado' : ''}
                          </span>
                        </h3>

                        <button
                          type="button"
                          onClick={() =>
                            setGruposColapsados((prev) => ({
                              ...prev,
                              [groupKey]: !prev[groupKey],
                            }))
                          }
                          className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 inline-flex items-center gap-1"
                          aria-expanded={!colapsado}
                        >
                          {colapsado ? 'Mostrar' : 'Ocultar'}
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                            className={`transition-transform ${colapsado ? '' : 'rotate-180'}`}
                          >
                            <path
                              d="M6 9l6 6 6-6"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      </div>

                      {!colapsado && (
                        <div className="space-y-2">
                          {(grupo.bultos || []).map((bulto, idx) => {
                            const estado = getEstadoIndicador(bulto.codigo);
                            const esEscaneado =
                              bultoInfo?.codigo &&
                              bulto.codigo?.toUpperCase() === bultoInfo.codigo.toUpperCase();
                            return (
                              <div
                                key={`${idxGrupo}-${idx}`}
                                className={`flex items-center gap-3 px-3 py-1.5 ${estado.bg} rounded-lg border ${
                                  estadoHistorico[bulto.codigo] ? 'border-success-200' : 'border-danger-200'
                                }`}
                              >
                                <div className={`text-base font-bold ${estado.color}`}>
                                  {estado.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                      {bulto.codigo}
                                    </p>
                                    {esEscaneado && (
                                      <span className="badge bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-100 text-[11px]">
                                        Escaneado
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-gray-600 dark:text-gray-400">
                                    Factura: {bulto.factura || '-'} | OV: {bulto.ov || '-'}
                                  </p>
                                </div>
                                <span className={`badge ${estado.bg} ${estado.color} text-xs font-semibold`}>
                                  {estado.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

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
                  setGruposBultos([]);
                  setEstadoHistorico({});
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

        {/* Modal de confirmación */}
        {showConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                ⚠️ Confirmación
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-6 whitespace-pre-line">
                {confirmMessage}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="btn-outline flex-1"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => guardarBultosEnHistorico(bultosAGuardar)}
                  className="btn-success flex-1"
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Estado vacío */}
        {!bultoInfo && !loading && (
          <div className="card text-center py-8">
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
              📦 Ingresa un código de bulto para comenzar
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default GestionBultos;
