-- Script para crear la tabla cmk_HISTORICO_BULTOS manualmente

CREATE DATABASE IF NOT EXISTS gestion_bultos;
USE gestion_bultos;

CREATE TABLE IF NOT EXISTS cmk_HISTORICO_BULTOS (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo_bulto VARCHAR(50) NOT NULL UNIQUE,
  factura VARCHAR(50),
  ov VARCHAR(50),
  fecha_documento DATE,
  fecha_ov DATE,
  fecha_ingreso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  usuario VARCHAR(100),
  INDEX idx_codigo (codigo_bulto),
  INDEX idx_factura (factura),
  INDEX idx_fecha_ingreso (fecha_ingreso)
);

-- Limpiar cualquier dato de prueba
DELETE FROM cmk_HISTORICO_BULTOS;

-- Verificar
SELECT * FROM cmk_HISTORICO_BULTOS;
