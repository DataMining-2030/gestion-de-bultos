-- Crear tabla de usuarios para CMK
CREATE TABLE IF NOT EXISTS cmk_usuarios_bulto (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario VARCHAR(50) NOT NULL UNIQUE,
  contraseña VARCHAR(255) NOT NULL,
  tipo_permiso VARCHAR(50) DEFAULT 'dev',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  activo BOOLEAN DEFAULT TRUE,
  INDEX idx_usuario (usuario)
);

-- Insertar usuario de prueba
INSERT INTO cmk_usuarios_bulto (usuario, contraseña, tipo_permiso) 
VALUES ('david', '123456', 'dev');

-- Verificar
SELECT * FROM cmk_usuarios_bulto;
