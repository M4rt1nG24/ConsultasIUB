# MiTutoría - ConsultasIUB

Plataforma oficial de la **Institución Universitaria de Barranquilla (IUB)** para la gestión digital, trazabilidad, asignación y atención de tutorías académicas, monitorías y semilleros de investigación.

---

## 🏛️ Características Principales

- **Cero Papel:** Eliminación de formatos físicos mediante radicación y atención digital auditada.
- **Arquitectura Multi-Rol:** Módulos personalizados para **Estudiante**, **Docente** y **Coordinación (Administrador)**.
- **Componentes Compartidos Unificados:** Encabezado institucional (`Header`) y pie de página (`Footer`) aplicados a todos los módulos.
- **Simulador de Roles en Vivo:** Selector interactivo para alternar entre roles y probar flujos de usuario durante la evaluación del proyecto.
- **Tecnología de Punta:** Desarrollado sobre **Angular 22**, componentes **Standalone**, reactividad con **Signals**, nueva sintaxis de control de flujo (`@for`, `@if`), enrutamiento perezoso (*Lazy Loading*) y Vite.

---

## 🚀 Requisitos y Puesta en Marcha

### Prerrequisitos
- **Node.js:** v18+ o v20+ (recomendado LTS)
- **npm:** v9+ o superior

### Instalación de Dependencias
```bash
npm install
```

### Servidor de Desarrollo Local
Para iniciar el servidor de desarrollo con recarga automática:
```bash
npm start
# o también:
ng serve
```
La aplicación estará disponible en [http://localhost:4200/](http://localhost:4200/).

### Compilación para Producción
```bash
npm run build
```
Los artefactos compilados y optimizados se generarán en la carpeta `dist/Consultas-iub`.

### Ejecución de Pruebas Unitarias
```bash
npm test
```

---

## 🧭 Estructura de Rutas y Módulos

| Ruta | Módulo / Vista | Descripción |
| :--- | :--- | :--- |
| `/principal` | Portal Público | Landing page institucional con accesos rápidos por rol |
| `/login` | Autenticación | Inicio de sesión con simulador interactivo de roles |
| `/registro` | Registro | Formulario de registro institucional IUB |
| `/admin/reportes` | Coordinación | Dashboard de estadísticas, KPIs y exportación PDF |
| `/admin/usuarios` | Coordinación | Gestión y filtrado de usuarios por rol y estado |
| `/admin/consultas` | Coordinación | Reasignación de consultas represadas o vencidas |
| `/admin/cursos-roles` | Coordinación | Administración de asignaturas y asignación de cupos |
| `/docente/asignadas` | Docentes | Bandeja de solicitudes de tutoría asignadas |
| `/docente/atencion` | Docentes | Formulario de atención, observaciones y control de asistencia |
| `/docente/historial` | Docentes | Historial de tutorías realizadas |
| `/estudiante/mis-solicitudes` | Estudiantes | Listado y seguimiento de tutorías solicitadas |
| `/estudiante/crear` | Estudiantes | Radicación de nueva consulta académica |
| `/estudiante/detalle` | Estudiantes | Trazabilidad y respuesta del docente |
| `/estudiante/directorio-tutorias`| Estudiantes | Directorio de docentes, horarios y enlaces de atención |

---

## 🎨 Paleta Institucional IUB

- **Azul Marino IUB:** `#071936` / `#0f2c59`
- **Azul Corporativo:** `#1e56a0` / `#2563eb`
- **Cyan / Acento:** `#38bdf8`
- **Fondo de Interfaz:** `#f1f5f9` / `#ffffff`
- **Éxito (Completado):** `#22c55e` / `#dcfce7`
- **Alerta (Pendiente):** `#f59e0b` / `#fef3c7`

---

## 📄 Documentación Técnica Completa

Para conocer todos los detalles técnicos, diagramas de arquitectura, especificación de componentes compartidos, modelos y servicios, consulta el archivo [DOCUMENTACION.md](file:///c:/Users/MARTIN/Downloads/consultasiub/ConsultasIUB/DOCUMENTACION.md).

---

© 2026 **Institución Universitaria de Barranquilla (IUB)**. Sede Plaza de la Paz - Barranquilla, Colombia.
