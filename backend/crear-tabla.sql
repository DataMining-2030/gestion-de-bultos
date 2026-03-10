-- Script para crear la tabla cmk_HISTORICO_BULTOS manualmente

CREATE DATABASE IF NOT EXISTS gestion_bultos;
USE gestion_bultos;

-- Script para crear la tabla cmk_bultos_historicos manualmente
-- Esta tabla se crea automáticamente al iniciar el backend si no existe.

CREATE TABLE IF NOT EXISTS cmk_bultos_historicos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo_bulto VARCHAR(50) NOT NULL UNIQUE,
    factura VARCHAR(50),
    ov VARCHAR(50),
    fecha_documento DATE,
    fecha_ingreso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario VARCHAR(100),
    ov_comuna VARCHAR(100),
    ov_region VARCHAR(100),
    ov_estado VARCHAR(50),
    ov_estratificacion VARCHAR(150),
    ov_direccion VARCHAR(255),
    ov_ruta VARCHAR(100),
    ov_cliente VARCHAR(255),
    ov_fecha DATETIME,
    wms_estado VARCHAR(20),
    wms_codigo_error VARCHAR(50),
    wms_tipo_error VARCHAR(100),
    wms_mensaje_error TEXT,
    wms_mensaje_usuario TEXT,
    wms_fecha DATETIME,
    wms_trn_id VARCHAR(50),
    accion_recomendada VARCHAR(150),
    bultos_ov INT DEFAULT 0,
    ingresados_ov INT DEFAULT 0,
    facturas_ov INT DEFAULT 0,
    id_carga_masiva VARCHAR(50),
    INDEX idx_codigo (codigo_bulto),
    INDEX idx_factura (factura),
    INDEX idx_fecha_ingreso (fecha_ingreso)
);

-- Para pruebas manuales:
-- DELETE FROM cmk_bultos_historicos;
-- SELECT * FROM cmk_bultos_historicos;
