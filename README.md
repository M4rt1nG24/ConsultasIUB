# MiTutoría - ConsultasIUB

Plataforma web institucional de la **Institución Universitaria de Barranquilla (IUB)** para la gestión digital, trazabilidad, asignación, atención y calificación de consultas y tutorías académicas, conectada en tiempo real con **FastAPI + PostgreSQL** en la nube.

---

## 🛠️ Tecnologías y Herramientas Utilizadas

| Capa / Categoría | Tecnología / Librería | Propósito en el Proyecto |
| :--- | :--- | :--- |
| **Framework Frontend** | **Angular 22.2.0** | Arquitectura 100% *Standalone Components*, reactividad con *Signals* (`signal`, `computed`, `effect`), control de flujo nativo (`@for`, `@if`) y *Lazy Loading*. |
| **Lenguaje** | **TypeScript 6.0** | Tipado estático estricto e interfaces de contrato con la API (`api-principal.ts`). |
| **Comunicación HTTP y Reactividad** | **RxJS 7.8 + Angular `HttpClient`** | Consumo de endpoints REST (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`), manejo de cabeceras `Authorization: Bearer <JWT>` y sincronización reactiva entre perfiles. |
| **Tablas Interactivas** | **DataTables (`[appDataTable]`)** | Directiva reutilizable (`DataTableDirective`) aplicada en todas las tablas del sistema con paginación, ordenamiento por columnas, selector de registros por página y exportación CSV. |
| **Seguridad y Permisos** | **JWT + Guards (`authGuard`, `roleGuard`)** | Autenticación contra `/auth/login` y `/auth/me`, protección de rutas y construcción dinámica del menú lateral exclusivamente desde la tabla `modulo_x_rol` (`rolxmodulo`) de la base de datos. |
| **Backend & Base de Datos** | **FastAPI (Python) + SQLAlchemy + PostgreSQL (Render)** | API REST desplegada en la nube (`https://sistemaconsultas-api.onrender.com`) con auditoría de creación/actualización y borrado lógico (`estado`). |
| **Componente IA** | **Ollama (LLM Local) + Open WebUI / Telegram Bot** | Widget de chat asistente IA integrado en el layout principal (`MainLayout`) conectado a `http://localhost:11434`. |
| **Estilos e Iconografía** | **CSS3 Custom Properties + Bootstrap Icons** | Diseño responsive, paleta institucional IUB y experiencia de usuario sin exposición de IDs de base de datos. |

---

## ✨ Cumplimiento de Requerimientos (Taller 1 - Corte 2)

- **100% Impulsado por Base de Datos:** Todos los usuarios, roles, permisos de módulos (`rolxmodulo`), programas académicos, asignaturas, asignaciones docente-módulo, disponibilidad docente, sedes, zonas, salones, solicitudes de consulta, comentarios, retroalimentaciones y calificaciones provienen de PostgreSQL.
- **Menú Dinámico por Rol (`rolxmodulo`):** Al iniciar sesión, el backend devuelve los módulos activos del rol desde la tabla `modulo_x_rol`. El servicio `Auth` construye el menú de navegación y valida el acceso a cada ruta según la base de datos.
- **Reflejo en Tiempo Real entre Roles:**
  - El **Estudiante** radica una consulta eligiendo asignatura, docente tutor, modalidad, sede/salón, fecha, hora y prioridad, y posteriormente califica la atención recibida (`1` a `5` estrellas + comentario).
  - El **Docente** visualiza la consulta en su bandeja, gestiona sus franjas de disponibilidad, atiende la sesión registrando asistencia y **retroalimentación docente**, la cual se refleja inmediatamente en el perfil del Estudiante y del Administrador.
  - El **Administrador** supervisa KPIs y reportes, reasigna consultas entre docentes y administra el catálogo institucional completo (Usuarios, Programas Académicos, Cursos, Permisos `rolxmodulo`, Sedes, Zonas y Salones).
- **Cero IDs Visibles:** Ninguna tabla ni formulario muestra o solicita IDs internos de base de datos; toda la interfaz opera con nombres descriptivos, siglas, radicados (`numeroConsulta`) y códigos institucionales.
- **Más de 10 Componentes Web Reutilizados:** Conjunto de 12 componentes/directivas transversales en `src/app/shared/`.

---

## 🚀 Requisitos y Puesta en Marcha

### Prerrequisitos
- **Node.js:** v18+ o v20+ (LTS recomendado)
- **npm:** v9+ o superior

### Configuración del Entorno (`src/environments/environment.ts`)
```typescript
export const environment = {
  production: false,
  apiUrl: 'https://sistemaconsultas-api.onrender.com'
};
```

### Instalación y Ejecución Local
```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm start
# Disponible en http://localhost:4200/

# 3. Compilar para producción
npm run build
# Genera artefactos en dist/Consultas-iub
```

---

## 🧭 Estructura de Rutas y Procesos CRUD por Rol

| Rol | Ruta | Módulo / Vista | Operaciones CRUD con Base de Datos |
| :--- | :--- | :--- | :--- |
| **Público** | `/principal` | Portal Institucional | Landing page con accesos por perfil |
| **Público** | `/login` | Autenticación JWT | `POST /auth/login`, `GET /auth/me`, `POST /auth/forgot-password` |
| **Público** | `/registro` | Registro Institucional | `POST /auth/register`, `GET /programas`, `GET /tipos-documento` |
| **ADMIN** | `/admin/reportes` | Reportes y Analítica | Lectura consolidada de KPIs, estados, calificaciones y exportación PDF |
| **ADMIN** | `/admin/usuarios` | Gestión de Usuarios | **CRUD completo:** `GET /usuarios`, `POST /usuarios`, `PUT /usuarios/{id}`, `DELETE /usuarios/{id}` / `PATCH /activar` |
| **ADMIN** | `/admin/programas` | Programas Académicos | **CRUD completo:** `GET /programas`, `POST /programas`, `PUT /programas/{id}`, `DELETE /programas/{id}` |
| **ADMIN** | `/admin/cursos-roles` | Cursos y Permisos (`rolxmodulo`) | **CRUD completo:** `/modulos`, `/docentes-modulos`, `/roles`, `/modulos-sistema` y `PUT /roles/{id}/modulos` |
| **ADMIN** | `/admin/consultas` | Reasignación de Consultas | `GET /solicitudes-consultas`, `PATCH /solicitudes-consultas/{id}/docente`, `PATCH /estado` |
| **ADMIN** | `/admin/sedes` | Gestión de Sedes y Zonas | **CRUD completo:** `GET/POST/PUT/DELETE /sedes` y `/zonas` |
| **ADMIN** | `/admin/salones` | Salones y Recursos Físicos | **CRUD completo:** `GET/POST/PUT/DELETE /recursos-fisicos` |
| **DOCENTE** | `/docente/asignadas` | Bandeja de Asignadas | Lectura con DataTable y cambio de estado (`PATCH /solicitudes-consultas/{id}/estado`) |
| **DOCENTE** | `/docente/atencion` | Atención de Consulta | Registro de retroalimentación (`POST /comentarios`), recurso físico y cierre (`FINALIZADA`) |
| **DOCENTE** | `/docente/historial` | Historial de Tutorías | Consulta histórica con retroalimentación docente, calificación del estudiante y acta F-IUB-04 |
| **DOCENTE** | `/docente/disponibilidad` | Mi Disponibilidad Horaria | **CRUD completo:** `GET/POST/PUT/DELETE /disponibilidad-docente` |
| **ESTUDIANTE** | `/estudiante/mis-solicitudes` | Mis Solicitudes | **CRUD completo:** Crear (`POST`), Listar con DataTable (`GET`), Editar/Reprogramar (`PUT`) y Cancelar (`PATCH /estado`) |
| **ESTUDIANTE** | `/estudiante/crear` | Crear Consulta | Radicación completa (`POST /solicitudes-consultas` + `PATCH /recurso-fisico`) |
| **ESTUDIANTE** | `/estudiante/detalle` | Detalle, Chat y Calificación | Seguimiento, CRUD de comentarios (`POST/PUT/DELETE /comentarios`) y Calificación (`POST /calificacion`) |
| **ESTUDIANTE** | `/estudiante/directorio-tutorias` | Directorio de Tutorías | Catálogo de docentes tutores, franjas de disponibilidad reales y agendamiento directo |

---

## 📄 Documentación Técnica Completa

Consulta el archivo [`DOCUMENTACION.md`](./DOCUMENTACION.md) para revisar la arquitectura detallada, el catálogo de los 12 componentes reutilizados, los servicios del núcleo (`ApiPrincipal`, `Auth`, `Data`, `EspaciosAux`) y el detalle de endpoints consumidos.

---

© 2026 **Institución Universitaria de Barranquilla (IUB)**. Sede Plaza de la Paz - Barranquilla, Colombia.
