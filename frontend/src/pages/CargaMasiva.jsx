import React, { useState } from 'react';
import CargaMasivaPistoleo from './CargaMasivaPistoleo';
import CargaMasivaExcel from './CargaMasivaExcel';

function CargaMasiva({ onBack, usuario }) {
  const [metodo, setMetodo] = useState(null); // 'pistoleo' | 'excel' | null

  if (metodo === 'pistoleo') {
    return <CargaMasivaPistoleo onBack={() => setMetodo(null)} usuario={usuario} />;
  }

  if (metodo === 'excel') {
    return <CargaMasivaExcel onBack={() => setMetodo(null)} usuario={usuario} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                ← Atrás
              </button>
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 mb-0">
                Seleccionar Método de Carga
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4">
            Carga Masiva al Histórico
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Selecciona la forma en la que deseas ingresar múltiples bultos rápida y secuencialmente.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Opción Pistoleo */}
          <button
            onClick={() => setMetodo('pistoleo')}
            className="card text-left cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group border-2 border-transparent hover:border-primary-500"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-primary-50 dark:bg-gray-800 p-2 rounded-xl shadow-sm border border-primary-100 dark:border-gray-700 group-hover:scale-110 group-hover:shadow-md transition-all">
                <img 
                  src="./Pistola.png" 
                  alt="Escáner" 
                  className="w-12 h-12 object-contain"
                />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              Por Pistoleo Rápido
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Escanea físicamente o tipea los códigos de los bultos uno por uno en secuencia. Ideal para consolidar pales o carros manualmente.
            </p>
            <div className="flex items-center text-primary-500 font-medium group-hover:translate-x-2 transition-transform">
              Comenzar Pistoleo
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
          </button>

          {/* Opción Excel */}
          <button
            onClick={() => setMetodo('excel')}
            className="card text-left cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group border-2 border-transparent hover:border-success-500"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="text-success-600 bg-success-50 dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-success-100 dark:border-gray-700 group-hover:scale-110 group-hover:shadow-md transition-all text-4xl">
                📊
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-success-600 dark:group-hover:text-success-400 transition-colors">
              Por Archivo Excel
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Sube un documento con la lista de bultos para procesar decenas o cientos de registros extraídos de otro sistema en un solo paso.
            </p>
            <div className="flex items-center text-success-500 font-medium group-hover:translate-x-2 transition-transform">
              Subir Plantilla
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
          </button>
        </div>
      </main>
    </div>
  );
}

export default CargaMasiva;
