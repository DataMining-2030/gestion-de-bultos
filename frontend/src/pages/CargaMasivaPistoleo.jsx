import React, { useState, useRef, useEffect } from 'react';

function CargaMasivaPistoleo({ onBack, usuario }) {
  const [bultos, setBultos] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null); // { success: number, fails: number, id: string }
  const inputRef = useRef(null);

  useEffect(() => {
    // Mantener el foco en el input para pistolear rápido
    if (inputRef.current && !isProcessing && !results) {
      inputRef.current.focus();
    }
  }, [bultos, isProcessing, results]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = inputVal.trim().toUpperCase();
      if (code && !bultos.includes(code)) {
        setBultos((prev) => [code, ...prev]);
      }
      setInputVal('');
    }
  };

  const removeBulto = (indexToRemove) => {
    setBultos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleProcesar = async () => {
    if (bultos.length === 0) return;
    setIsProcessing(true);
    setResults(null);

    let idCarga = 'CM-000001';
    try {
      const resId = await fetch('http://localhost:5000/api/historico/next-carga-id');
      if (resId.ok) {
        const dataId = await resId.json();
        if (dataId.id) idCarga = dataId.id;
      }
    } catch (err) {
      console.warn('⚠️ No se pudo obtener el ID de carga secuencial, usando fallback.', err);
    }

    let successCount = 0;
    let failCount = 0;
    const errors = [];

    // Por cada bulto: 1) Traer info, 2) Guardar en histórico
    for (const codigo of bultos) {
      try {
        // 1. Obtener Info
        const resInfo = await fetch(`http://localhost:5000/api/bultos/${encodeURIComponent(codigo)}`);
        if (!resInfo.ok) {
          throw new Error('No se encontró información del bulto');
        }
        const dataBulto = await resInfo.json();

        // 2. Guardar en histórico con id_carga_masiva
        const bodyHistorico = {
          codigo_bulto: codigo,
          factura: dataBulto.bulto?.factura || null,
          ov: dataBulto.ov,
          fecha_documento: dataBulto.bulto?.fechaDocumento || null,
          usuario: usuario?.usuario || 'Sistema',
          ovInfo: dataBulto.ovInfo,
          wmsInfo: dataBulto.wmsIntegracion,
          accionRecomendada: dataBulto.accionRecomendada,
          id_carga_masiva: idCarga, // ← IMPORTANTE
        };

        const resSave = await fetch('http://localhost:5000/api/historico/guardar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyHistorico)
        });

        if (resSave.ok) {
          successCount++;
        } else {
          // Si ya existe (409), u otro error
          const errData = await resSave.json();
          if (resSave.status === 409) {
            failCount++;
            errors.push(`${codigo}: Ya existe en histórico`);
          } else {
            throw new Error(errData.error || 'Error al guardar');
          }
        }
      } catch (err) {
        failCount++;
        errors.push(`${codigo}: ${err.message}`);
      }
    }

    setIsProcessing(false);
    setResults({
      success: successCount,
      fails: failCount,
      id: idCarga,
      errors
    });
    setBultos([]); // Limpiar la lista tras procesar
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              disabled={isProcessing}
              className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium disabled:opacity-50"
            >
              ← Atrás
            </button>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100 mb-0">
                Pistoleo de Carga Masiva
              </h1>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                Ingresa bultos secuencialmente leyendo el código de barras
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 flex flex-col md:flex-row gap-6">
        {/* Lado Izquierdo: Input y Resumen */}
        <div className="w-full md:w-1/3 flex flex-col gap-6 shrink-0">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Ingreso de Bulto</h2>
            <div className="form-group mb-0">
              <input
                ref={inputRef}
                type="text"
                placeholder="Escanea aquí..."
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isProcessing || results !== null}
                className="input-field w-full text-center text-xl font-semibold uppercase placeholder-gray-400"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                Presiona <strong>Enter</strong> o usa el salto de línea de la pistola.
              </p>
            </div>
          </div>

          {!results && (
            <div className="card bg-primary-50 dark:bg-primary-900 border-primary-200">
              <div className="text-center">
                <span className="block text-4xl font-black text-primary-600 dark:text-primary-400">
                  {bultos.length}
                </span>
                <span className="text-sm font-semibold text-primary-800 dark:text-primary-200">
                  bultos por procesar
                </span>
              </div>
              <button
                className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
                onClick={handleProcesar}
                disabled={bultos.length === 0 || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Procesando...
                  </>
                ) : (
                  'Confirmar y Cargar'
                )}
              </button>
            </div>
          )}

          {results && (
            <div className="card">
              <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-gray-100">Resumen Carga</h3>
              <div className="text-sm mb-4">
                <span className="block text-gray-500">ID:</span>
                <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded select-all">{results.id}</span>
              </div>
              <ul className="space-y-2 mb-4">
                <li className="flex justify-between items-center text-sm font-medium text-success-600">
                  <span>Exitosos:</span>
                  <span className="bg-success-100 px-2 py-0.5 rounded-full">{results.success}</span>
                </li>
                <li className="flex justify-between items-center text-sm font-medium text-danger-600">
                  <span>Fallidos / Duplicados:</span>
                  <span className="bg-danger-100 px-2 py-0.5 rounded-full">{results.fails}</span>
                </li>
              </ul>
              <button
                className="btn-outline w-full"
                onClick={() => setResults(null)}
              >
                Nueva Carga Masiva
              </button>
            </div>
          )}
        </div>

        {/* Lado Derecho: Lista de Escaneados */}
        <div className="flex-1 card flex flex-col overflow-hidden p-0 border-0 shadow-lg relative">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">Bultos en Sesión</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-gray-900">
            {bultos.length === 0 && !results && !isProcessing && (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <div className="text-4xl mb-3">📦</div>
                <p>Lista vacía. Comienza a escanear.</p>
              </div>
            )}

            {results?.errors && results.errors.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-danger-600 text-sm mb-2 uppercase break-words">Log de Errores ({results.errors.length})</h4>
                <div className="bg-danger-50 dark:bg-danger-900/30 border border-danger-200 p-3 rounded-lg flex flex-col gap-1 text-sm text-danger-800">
                  {results.errors.map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              </div>
            )}

            {!isProcessing && bultos.length > 0 && (
              <ul className="space-y-2">
                {bultos.map((code, idx) => (
                  <li key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 animate-slide-up group">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 font-mono w-6">{bultos.length - idx}</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{code}</span>
                    </div>
                    <button
                      onClick={() => removeBulto(idx)}
                      title="Eliminar de la lista"
                      className="text-gray-400 hover:text-danger-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default CargaMasivaPistoleo;
