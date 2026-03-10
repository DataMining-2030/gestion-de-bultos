import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';

function CargaMasivaExcel({ onBack, usuario }) {
  const [file, setFile] = useState(null);
  const [bultos, setBultos] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null); // { success: number, fails: number, id: string, errors: array }
  const fileInputRef = useRef(null);

  // 1. Descargar plantilla
  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Código Bulto'],
      ['BU123456780'],
      ['BU123456781'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Carga Masiva');

    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_carga_masiva.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // 2. Manejar selección de archivo y leer datos
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Leer arreglo de arreglos
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (json.length < 2) {
          alert("El archivo parece estar vacío o no tiene encabezados.");
          return;
        }

        // Asumimos que la columna 0 es "Código Bulto" (o iteramos salteando la fila 0)
        const codigosList = [];
        for (let i = 1; i < json.length; i++) {
          const row = json[i];
          const code = String(row[0] || '').trim().toUpperCase();
          if (code && !codigosList.includes(code)) {
            codigosList.push(code);
          }
        }
        
        setBultos(codigosList);
        setResults(null);
      } catch (err) {
        alert("Error al parsear el archivo Excel: " + err.message);
        setFile(null);
        setBultos([]);
      }
    };

    reader.readAsArrayBuffer(selectedFile);
  };

  const handleClearFile = () => {
    setFile(null);
    setBultos([]);
    setResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 3. Procesar bultos (mismo flujo que Pistoleo)
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
        const resInfo = await fetch(`http://localhost:5000/api/bultos/${encodeURIComponent(codigo)}`);
        if (!resInfo.ok) throw new Error('No se encontró información del bulto');
        const dataBulto = await resInfo.json();

        const bodyHistorico = {
          codigo_bulto: codigo,
          factura: dataBulto.bulto?.factura || null,
          ov: dataBulto.ov,
          fecha_documento: dataBulto.bulto?.fechaDocumento || null,
          usuario: usuario?.usuario || 'Sistema',
          ovInfo: dataBulto.ovInfo,
          wmsInfo: dataBulto.wmsIntegracion,
          accionRecomendada: dataBulto.accionRecomendada,
          id_carga_masiva: idCarga, 
        };

        const resSave = await fetch('http://localhost:5000/api/historico/guardar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyHistorico)
        });

        if (resSave.ok) {
          successCount++;
        } else {
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
    setBultos([]); 
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
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 mb-0">
                Subida de Archivo Excel
              </h1>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                Procesa cientos de bultos automáticamente a partir de una planilla XLSX
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 flex flex-col md:flex-row gap-6">
        
        {/* Lado Izquierdo: Pasos (Descargar y Subir) + Resumen */}
        <div className="w-full md:w-5/12 flex flex-col gap-6 shrink-0">
          
          {!results && (
            <>
              {/* Paso 1 */}
              <div className="card border-l-4 border-l-secondary-500">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">1. Descargar Plantilla</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Obtén el formato correcto. Solo los códigos listados en la primera columna debajo de "Código Bulto" serán leídos.
                </p>
                <button 
                  onClick={handleDownloadTemplate}
                  className="btn-secondary w-full flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Descargar .xlsx
                </button>
              </div>

              {/* Paso 2 */}
              <div className="card border-l-4 border-l-primary-500">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">2. Subir Archivo</h2>
                
                <input 
                  type="file" 
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  className="hidden"
                  id="excel-upload"
                  disabled={isProcessing}
                />
                
                {!file ? (
                  <label 
                    htmlFor="excel-upload" 
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg className="w-8 h-8 mb-2 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Clic para buscar Excel</p>
                    </div>
                  </label>
                ) : (
                  <div className="bg-primary-50 dark:bg-primary-900/30 border border-primary-200 p-3 rounded-lg flex justify-between items-center text-sm">
                    <span className="font-medium text-primary-800 dark:text-primary-200 truncate pr-2">
                      {file.name}
                    </span>
                    <button 
                      onClick={handleClearFile}
                      disabled={isProcessing}
                      className="text-gray-500 hover:text-danger-500 disabled:opacity-50"
                      title="Quitar archivo"
                    >
                      ✕
                    </button>
                  </div>
                )}
                
                <p className="text-xs text-center text-gray-500 mt-2">
                  Solo se aceptan archivos .xlsx/.xls
                </p>
              </div>

              {/* Botón de carga */}
              {bultos.length > 0 && (
                <div className="card bg-success-50 dark:bg-success-900/40 border-success-200">
                  <div className="text-center mb-3">
                    <span className="block text-3xl font-black text-success-600 dark:text-success-400">
                      {bultos.length}
                    </span>
                    <span className="text-sm font-semibold text-success-800 dark:text-success-200">
                      bultos leídos del Excel
                    </span>
                  </div>
                  <button
                    className="btn-success w-full flex items-center justify-center gap-2"
                    onClick={handleProcesar}
                    disabled={isProcessing}
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
                      'Subir Carga Masiva'
                    )}
                  </button>
                </div>
              )}
            </>
          )}

          {results && (
            <div className="card border-t-4 border-primary-500">
              <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-gray-100">Resumen Excel</h3>
              <div className="text-sm mb-4">
                <span className="block text-gray-500">ID Lote:</span>
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
                className="btn-primary w-full"
                onClick={handleClearFile}
              >
                Subir Otro Archivo
              </button>
            </div>
          )}
        </div>

        {/* Lado Derecho: Preview de Bultos */}
        <div className="flex-1 card flex flex-col overflow-hidden p-0 border-0 shadow-lg relative">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <h3 className="font-bold text-gray-800 dark:text-gray-200">
              {results ? 'Log de Errores' : 'Vista Previa (Primeros 100 max)'}
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-gray-900">
            {bultos.length === 0 && !results && !isProcessing && (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <div className="text-4xl mb-3 opacity-50">📊</div>
                <p>Sube un archivo para previsualizar los códigos.</p>
              </div>
            )}

            {results?.errors && results.errors.length > 0 && (
              <div className="mb-6">
                <div className="bg-danger-50 dark:bg-danger-900/30 border border-danger-200 p-3 rounded-lg flex flex-col gap-1 text-sm text-danger-800">
                  {results.errors.map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              </div>
            )}

            {results && results.errors && results.errors.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-success-500">
                <div className="text-4xl mb-3">✅</div>
                <p>Todo el lote fue procesado exitosamente sin errores.</p>
              </div>
            )}

            {!results && bultos.length > 0 && (
              <ul className="space-y-1">
                {bultos.slice(0, 100).map((code, idx) => (
                  <li key={idx} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm text-gray-700 border border-transparent">
                    <span className="text-gray-400 font-mono w-6 text-xs">{idx + 1}</span>
                    <span className="font-mono">{code}</span>
                  </li>
                ))}
                {bultos.length > 100 && (
                  <li className="p-2 text-center text-sm text-gray-500 italic">
                    ... y {bultos.length - 100} registros más listos para procesar.
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default CargaMasivaExcel;
