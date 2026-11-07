# Documentación Técnica del Proyecto - MiTutoría IUB (ConsultasIUB)

**Versión del Documento:** 3.0.0 (Taller 1 - Corte 2)  
**Fecha:** Noviembre 2026  
**Institución:** Institución Universitaria de Barranquilla (IUB)  
**Stack Frontend:** Angular 22.2.0, TypeScript 6.0.2, RxJS 7.8, DataTables Custom Directive, Bootstrap Icons  
**Stack Backend y BD:** FastAPI (Python), SQLAlchemy, JWT Bearer Auth, PostgreSQL en la nube (`https://sistemaconsultas-api.onrender.com`)  
**Componente IA:** Ollama (LLM Local) + Open WebUI + Integración BotFather de Telegram  

---

## 1. Visión General y Arquitectura

**ConsultasIUB (MiTutoría)** es una aplicación web empresarial conectada 100% en tiempo real a una base de datos relacional **PostgreSQL** mediante una API REST en **FastAPI**. Permite gestionar de principio a fin el ciclo de vida de las consultas académicas entre **Estudiantes**, **Docentes** y **Administradores (Coordinación)**.

### 1.1. Principios Técnicos Implementados
1. **100% Datos desde Base de Datos (Cero Datos Quemados):** Ningún catálogo ni registro está codificado estáticamente en el frontend. Los módulos del menú lateral (`modulo_x_rol`), programas académicos, asignaturas, docentes, disponibilidad horaria, sedes, zonas, recursos físicos (salones) y solicitudes de consulta se obtienen directamente desde la API.
2. **Reflejo Inmediato entre Roles:** Cualquier acción ejecutada en un rol (radicar una solicitud como Estudiante, registrar retroalimentación o cambiar estado como Docente, calificar la atención como Estudiante o reasignar docente/administrar catálogos como Administrador) persiste en PostgreSQL y se visualiza al instante en los demás perfiles.
3. **Ocultamiento Total de IDs:** En cumplimiento estricto de las directrices de experiencia de usuario, ninguna tabla ni formulario expone IDs primarios o foráneos ni solicita insertar IDs manualmente.
4. **Tablas con Librería DataTable (`[appDataTable]`):** Todas las tablas de los tres roles implementan búsqueda, ordenamiento dinámico por columna, selector de cantidad de filas (`5`, `10`, `25`, `50`), paginación completa y exportación a CSV.

---

## 2. Estructura del Proyecto Frontend

```text
Consultas-iub/
├── src/
│   ├── environments/
│   │   └── environment.ts                     # Configuración de apiUrl (Render / Local)
│   ├── app/
│   │   ├── core/
│   │   │   ├── guards/
│   │   │   │   ├── auth-guard.ts              # Verificación de sesión JWT activa
│   │   │   │   └── role.guard.ts              # Validación de rol y permisos según BD (rolxmodulo)
│   │   │   └── services/
│   │   │       ├── api-principal.ts           # Cliente HTTP tipado para todos los endpoints de FastAPI
│   │   │       ├── auth.ts                    # Autenticación JWT, perfil (/auth/me) y menú dinámico por rol
│   │   │       ├── data.ts                    # Sincronización reactiva de consultas, cursos, programas y usuarios
│   │   │       ├── espacios-aux.ts            # Sincronización reactiva de sedes, zonas y recursos físicos
│   │   │       └── ollama.services.ts         # Servicio de apoyo para integración con LLM local
│   │   ├── layouts/
│   │   │   └── main-layout/                   # Contenedor principal con Sidebar dinámico, Navbar, Footer y Chat IA
│   │   ├── features/
│   │   │   ├── administrador/
│   │   │   │   ├── dashboard-reportes/        # KPIs en vivo, métricas por asignatura y exportación PDF
│   │   │   │   ├── gestion-usuarios/          # CRUD completo de usuarios (/usuarios)
│   │   │   │   ├── gestion-programas/         # CRUD completo de programas académicos (/programas)
│   │   │   │   ├── gestion-cursos-roles/      # CRUD de cursos (/modulos) y permisos por rol (/roles/{id}/modulos)
│   │   │   │   ├── reasignacion-consultas/    # Reasignación de docente tutor y cambio de estado de consultas
│   │   │   │   ├── gestion-sedes/             # CRUD completo de sedes (/sedes) y zonas (/zonas)
│   │   │   │   └── gestion-salones/           # CRUD completo de salones/recursos físicos (/recursos-fisicos)
│   │   │   ├── docente/
│   │   │   │   ├── bandeja-asignadas/         # Solicitudes asignadas al docente con acciones de estado
│   │   │   │   ├── atencion-consulta/         # Registro de asistencia, retroalimentación docente y cierre
│   │   │   │   ├── historial-tutorias/        # Historial de sesiones, calificaciones recibidas y acta F-IUB-04
│   │   │   │   ├── disponibilidad-docente/    # CRUD completo de disponibilidad horaria (/disponibilidad-docente)
│   │   │   │   └── metricas-curso/            # Indicadores de desempeño del docente
│   │   │   ├── estudiante/
│   │   │   │   ├── mis-solicitudes/           # CRUD de solicitudes del estudiante (Crear, Listar, Editar, Cancelar)
│   │   │   │   ├── crear-consulta/            # Formulario completo de radicación con sede y salón real
│   │   │   │   ├── detalle-interaccion/       # Trazabilidad, retroalimentación docente, comentarios y calificación
│   │   │   │   └── directorio-tutorias/       # Directorio de docentes tutores y agendamiento de citas
│   │   │   ├── auth/
│   │   │   │   ├── login/                     # Inicio de sesión JWT y recuperación de contraseña
│   │   │   │   └── registro/                  # Registro institucional conectado a /auth/register
│   │   │   └── principal/
│   │   │       └── page/principal-page/       # Landing page institucional
│   │   └── shared/
│   │       ├── directives/
│   │       │   └── datatable.directive.ts     # Directiva DataTable reutilizada en todas las tablas
│   │       └── components/                    # 11 Componentes UI reutilizables
```

---

## 3. Catálogo de Componentes Web Reutilizados (Mínimo 10 requeridos)

El proyecto cuenta con **12 elementos reutilizables** (11 componentes standalone + 1 directiva de tabla interactiva) distribuidos transversalmente en todas las vistas:

1. **`app-header` (`src/app/shared/components/header`)**: Encabezado institucional adaptable (`institucional`, `dashboard`, `compacto`) con proyección de contenido `<ng-content>`.
2. **`app-footer` (`src/app/shared/components/footer`)**: Pie de página institucional con variantes `completo` y `compacto`.
3. **`app-navbar` (`src/app/shared/components/navbar`)**: Barra superior del panel de trabajo con notificaciones en tiempo real (`/notificaciones`), selector de usuario y cierre de sesión.
4. **`app-sidebar` (`src/app/shared/components/sidebar`)**: Barra lateral de navegación que renderiza los módulos permitidos según la tabla `modulo_x_rol`.
5. **`app-nav` (`src/app/shared/components/nav`)**: Barra de navegación pública horizontal.
6. **`app-page-header` (`src/app/shared/components/page-header`)**: Cabecera estandarizada para cada módulo (badge de rol, título, subtítulo y acciones).
7. **`app-kpi-card` (`src/app/shared/components/kpi-card`)**: Tarjeta de indicadores numéricos clave (KPIs) con variantes semánticas (`primary`, `success`, `warning`, `danger`).
8. **`app-status-badge` (`src/app/shared/components/status-badge`)**: Insignia visual normalizada para estados (`Pendiente`, `Programada`, `Completada`, `Cancelada`, `Activo`, `Inactivo`).
9. **`app-priority-badge` (`src/app/shared/components/priority-badge`)**: Insignia visual para niveles de prioridad (`Alta`, `Media`, `Baja`).
10. **`app-filter-bar` (`src/app/shared/components/filter-bar`)**: Barra de búsqueda reactiva reutilizable con filtro de texto y proyección de selectores adicionales.
11. **`app-ticket-timeline` (`src/app/shared/components/ticket-timeline`)**: Línea de tiempo de trazabilidad para el seguimiento de estados de una consulta.
12. **`[appDataTable]` (`src/app/shared/directives/datatable.directive.ts`)**: Directiva DataTable aplicada a todas las tablas HTML del sistema (paginación, ordenamiento por columna, conteo de registros y exportación CSV).

---

## 4. Servicios del Núcleo e Integración con la API (`src/app/core/services`)

### 4.1. `ApiPrincipal` (`api-principal.ts`)
Centraliza todas las peticiones HTTP hacia `environment.apiUrl` (`https://sistemaconsultas-api.onrender.com`), inyectando automáticamente el encabezado `Authorization: Bearer <token>` y mapeando los esquemas de FastAPI:
- **Autenticación (`/auth`):** `POST /auth/login`, `POST /auth/register`, `GET /auth/me`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/cambiar-password`.
- **Usuarios (`/usuarios`):** `GET /usuarios`, `GET /usuarios/docentes`, `POST /usuarios`, `PUT /usuarios/{id}`, `DELETE /usuarios/{id}`, `PATCH /usuarios/{id}/activar`.
- **Roles y Permisos (`/roles`, `/modulos-sistema`):** `GET /roles`, `GET /roles/{id}/modulos`, `PUT /roles/{id}/modulos`, `GET /modulos-sistema`.
- **Programas y Asignaturas (`/programas`, `/modulos`, `/docentes-modulos`):** CRUD completo de programas académicos, módulos/asignaturas y asignación de docentes tutores.
- **Disponibilidad Docente (`/disponibilidad-docente`):** `GET`, `POST`, `PUT` y `DELETE` de franjas horarias por día de la semana (`1..7`), hora de inicio y hora de fin.
- **Infraestructura Física (`/sedes`, `/zonas`, `/recursos-fisicos`):** CRUD completo de sedes, zonas y salones/laboratorios.
- **Solicitudes de Consulta (`/solicitudes-consultas`):**
  - `GET /solicitudes-consultas` (incluye `nombrePrograma`, `recursoFisicoId`, `nombreRecursoFisico`, `calificacion` y `retroalimentacionDocente`).
  - `POST /solicitudes-consultas` (creación de solicitud).
  - `PUT /solicitudes-consultas/{id}` (actualización y reprogramación con motivo).
  - `PATCH /solicitudes-consultas/{id}/estado` (cambio de estado: `PENDIENTE`, `ACEPTADA`, `RECHAZADA`, `CANCELADA`, `FINALIZADA`).
  - `PATCH /solicitudes-consultas/{id}/docente` (reasignación de docente tutor).
  - `PATCH /solicitudes-consultas/{id}/recurso-fisico` (asignación de salón/aula física).
  - `POST /solicitudes-consultas/{id}/calificacion` y `GET /solicitudes-consultas/{id}/calificacion`.
- **Comentarios y Retroalimentación (`/comentarios`):** `GET /comentarios/solicitud/{id}`, `POST /comentarios`, `PUT /comentarios/{id}`, `DELETE /comentarios/{id}`.
- **Notificaciones (`/notificaciones`):** `GET /notificaciones`, `PATCH /notificaciones/{id}/leida`, `PATCH /notificaciones/leer-todas`, `DELETE /notificaciones/{id}`.

### 4.2. `Auth` (`auth.ts`)
- Gestiona el estado de sesión (`tokenJWT`, `rolActivo`, `nombreActivo`, `correoActivo`, `identificacionActiva`).
- Construye dinámicamente el menú lateral (`construirMenuDesdeBD`) únicamente a partir de los módulos activos que devuelve PostgreSQL en `POST /auth/login` y `GET /auth/me` desde la tabla `modulo_x_rol`.

### 4.3. `Data` (`data.ts`)
- Sincroniza y mantiene en signals reactivos las solicitudes de consulta, cursos, programas, tipos de documento, docentes disponibles y usuarios.
- Garantiza que cada dato registrado o editado en cualquier rol (incluyendo la retroalimentación del docente y la calificación del estudiante) se guarde en PostgreSQL y se actualice automáticamente en todas las vistas.

### 4.4. `EspaciosAux` (`espacios-aux.ts`)
- Sincroniza desde PostgreSQL los catálogos de sedes (`/sedes`), zonas (`/zonas`) y salones/recursos físicos (`/recursos-fisicos`) para su uso tanto en los módulos de administración como en el agendamiento de consultas presenciales.

---

## 5. Flujo Principal Inter-Roles (Validación en Tiempo Real)

1. **Estudiante crea consulta (`/estudiante/crear` o `/estudiante/mis-solicitudes`):**
   - Selecciona asignatura, docente tutor, modalidad (Presencial con sede y salón real de la BD, o Virtual), fecha, hora, prioridad y descripción.
   - Se ejecuta `POST /solicitudes-consultas` (y `PATCH /recurso-fisico` si es presencial).
2. **Administrador supervisa o reasigna (`/admin/consultas` y `/admin/reportes`):**
   - Visualiza la nueva consulta en las métricas y en la tabla de gestión; puede reasignar el docente (`PATCH /solicitudes-consultas/{id}/docente`) o gestionar el estado.
3. **Docente atiende y brinda retroalimentación (`/docente/asignadas` y `/docente/atencion`):**
   - Visualiza la consulta asignada en su bandeja.
   - En **Atención de Consulta**, registra el tipo de atención, marca la asistencia, escribe las **observaciones y retroalimentación docente** (`POST /comentarios`) y finaliza la sesión (`PATCH /solicitudes-consultas/{id}/estado` -> `FINALIZADA`).
4. **Estudiante visualiza la retroalimentación y califica (`/estudiante/detalle` y `/estudiante/mis-solicitudes`):**
   - Al ingresar al perfil de Estudiante, ve el estado `Completada` y la **Retroalimentación del Docente** enviada desde el rol Docente.
   - Califica la tutoría de `1` a `5` estrellas con un comentario (`POST /solicitudes-consultas/{id}/calificacion`), calificación que se refleja inmediatamente en el **Historial de Tutorías** del Docente (`/docente/historial`) y en el **Dashboard** del Administrador.

---

© 2026 **Institución Universitaria de Barranquilla (IUB)**. Barranquilla, Atlántico, Colombia.
