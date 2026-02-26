# Gestión de Bultos

Aplicación Electron + React + Node.js para gestión de bultos con integración a SAP HANA y Blueyonder.

## 🚀 Instalación (2 Pasos)

### Para Usuarios Finales

**Descarga y ejecuta:**
```
instalador-gestion-bultos.exe
```

Eso es todo. El instalador hace todo automáticamente.

---

### Para Desarrolladores

**Requisitos**
- Node.js v24.14.0+
- npm (viene con Node.js)

**Instalar desde código fuente:**
```bash
git clone https://github.com/DataMining-2030/gestion-de-bultos.git
cd gestion-de-bultos
node install.js
npm run electron-dev
```

**Generar instalador .exe:**
```bash
node build-installer.js
```

Esto genera `instalador-gestion-bultos.exe` que puedes distribuir a usuarios finales.

## 📋 Configuración de credenciales

Las credenciales se almacenan en el archivo `.env` que **NO debe compartirse ni subirse a Git**.

### Archivo `.env`
```
HANNA_ADDRESS=192.168.75.6
HANNA_PORT=30013
HANNA_USER=usuario_sap
HANNA_PASSWORD=contraseña_sap
BLUEYONDER_IP=192.168.75.6
BLUEYONDER_USER=usuario_by
BLUEYONDER_PASSWORD=contraseña_by
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=password
```

⚠️ **SEGURIDAD**: Nunca compartas el archivo `.env` con credenciales reales

## 🏗️ Estructura del proyecto

```
gestion-de-bultos/
├── frontend/          # React + Tailwind CSS
├── backend/           # Node.js + Express
├── electron/          # Configuración Electron
├── main.js           # Punto de entrada Electron
├── preload.js        # Seguridad Electron
└── package.json      # Dependencias raíz
```

## 🔧 Desarrollo

### Modo desarrollo
```bash
npm run electron-dev
```

### Solo frontend
```bash
cd frontend
npm start
```

### Solo backend
```bash
cd backend
npm start
```

## 📦 Build para producción

```bash
npm run build
npm run electron-build
```

## 🛡️ Notas de seguridad

- **Nunca commits .env** - Está en .gitignore
- **Usa .env.example** - Como plantilla
- **Cambia contraseñas** - Después de cada instalación
- **Protege credenciales** - No las compartas por email

## 📞 Soporte

Para reportar problemas o sugerencias, abre un issue en GitHub.

## 📄 Licencia

Uso interno - Clinical Market

---

**Última actualización:** 2026-02-25
