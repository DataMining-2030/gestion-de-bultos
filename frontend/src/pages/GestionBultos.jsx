import React, { useState, useEffect } from 'react';

function GestionBultos({ onBack, codigoBultoInicial }) {
  const [codigoBulto, setCodigoBulto] = useState('');
  const [bultoInfo, setBultoInfo] = useState(null);
  const [otrosBultos, setOtrosBultos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [estadoHistorico, setEstadoHistorico] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [bultosAGuardar, setBultosAGuardar] = useState([]);

  // Limpiar todo al montar el componente
  useEffect(() => {
    // Limpiar siempre al entrar
    setCodigoBulto('');
    setBultoInfo(null);
    setOtrosBultos([]);
    setEstadoHistorico({});
    setError('');
    setSuccess('');
    setShowConfirm(false);
  }, []);

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
    setOtrosBultos([]);
    setEstadoHistorico({});
    setShowConfirm(false);

    if (!codigo || !codigo.trim()) {
      setError('Por favor ingresa un código de bulto');
      return;
    }

    setLoading(true);

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
        totalEnFactura: data.totalBultosEnFactura,
      });

      if (data.otrosBultos && data.otrosBultos.length > 0) {
        setOtrosBultos(data.otrosBultos);
      }

      // Verificar estado en histórico
      await verificarEnHistorico([data.bulto.codigo, ...data.otrosBultos.map(b => b.codigo)]);

      setLoading(false);
    } catch (err) {
      setError(err.message || 'Error al buscar bulto');
      setLoading(false);
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
        const bulto = codigo === bultoInfo.codigo ? bultoInfo : otrosBultos.find(b => b.codigo === codigo);
        
        const response = await fetch('http://localhost:5000/api/historico/guardar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codigo_bulto: bulto.codigo,
            factura: bulto.factura,
            ov: bulto.ov,
            fecha_documento: bulto.fechaDocumento,
            fecha_ov: bulto.fechaOV
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
        setOtrosBultos([]);
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
                Bulto
              </label>
              <div className="flex gap-2">
                <input
                  id="codigoBulto"
                  type="text"
                  value={codigoBulto}
                  onChange={(e) => setCodigoBulto(e.target.value)}
                  placeholder="Escanea o ingresa el bulto..."
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
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {bultoInfo.codigo}
                    </h2>
                    {(() => {
                      const estado = getEstadoIndicador(bultoInfo.codigo);
                      return (
                        <span className={`text-2xl font-bold ${estado.color}`}>
                          {estado.icon}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Grid de información */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Factura</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {bultoInfo.factura}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Fecha Documento</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {new Date(bultoInfo.fechaDocumento).toLocaleDateString('es-CL')}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">N° OV</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {bultoInfo.ov}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Fecha OV</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {new Date(bultoInfo.fechaOV).toLocaleDateString('es-CL')}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Bultos Ingresados</p>
                      <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
                        {(() => {
                          const ingresados = [bultoInfo.codigo, ...otrosBultos.map(b => b.codigo)].filter(
                            codigo => estadoHistorico[codigo]
                          ).length;
                          const total = [bultoInfo.codigo, ...otrosBultos.map(b => b.codigo)].length;
                          return `${ingresados}/${total}`;
                        })()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Bultos en Factura</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {bultoInfo.totalEnFactura} bultos
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Otros bultos en la factura */}
            {otrosBultos.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  📦 Otros Bultos en Factura {bultoInfo.factura}
                  <span className="text-sm font-normal text-gray-600 dark:text-gray-400 ml-2">
                    ({otrosBultos.length} bultos adicionales)
                  </span>
                </h3>

                <div className="space-y-2">
                  {otrosBultos.map((bulto, idx) => {
                    const estado = getEstadoIndicador(bulto.codigo);
                    return (
                      <div 
                        key={idx} 
                        className={`flex items-center gap-3 p-3 ${estado.bg} rounded-lg border ${
                          estadoHistorico[bulto.codigo] ? 'border-success-200' : 'border-danger-200'
                        }`}
                      >
                        <div className={`text-2xl font-bold ${estado.color}`}>
                          {estado.icon}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {bulto.codigo}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Factura: {bulto.factura} | Cantidad: {bulto.cantidadBultos}
                          </p>
                        </div>
                        <span className={`badge ${estado.bg} ${estado.color} text-xs font-semibold`}>
                          {estado.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
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
                  setOtrosBultos([]);
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
