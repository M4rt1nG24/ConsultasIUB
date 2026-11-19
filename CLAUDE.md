# Guía del Proyecto: Consultas-iub

Plataforma de gestión de consultas y tutorías académicas para la Institución Universitaria de Barranquilla (IUB).

## Comandos Principales
- **Desarrollo:** `npm start` (ejecuta `ng serve --proxy-config proxy.conf.json` en `http://localhost:4200`)
- **Compilación:** `npm run build`
- **Pruebas:** `npm test`

## Arquitectura y Tecnologías
- **Frontend:** Angular 19+ (Standalone Components, Signals, Reactive Forms / Template-driven Forms).
- **Estilos:** CSS modular por componente, Bootstrap Icons.
- **Rutas y Módulos:**
  - `src/app/features/administrador/`: Reportes, gestión de usuarios, asignación de cursos y roles, gestión de sedes y salones.
  - `src/app/features/docente/`: Bandeja de consultas asignadas, atención de consulta, creación de consulta por docente, disponibilidad e historial.
  - `src/app/features/estudiante/`: Mis solicitudes, crear consulta, detalle e interacción, directorio de tutorías.
  - `src/app/features/auth/`: Login y registro institucional.
- **Servicios Core:**
  - `ApiPrincipal`: Comunicación HTTP con backend FastAPI / Node.
  - `Auth`: Manejo de autenticación JWT y roles (`ADMIN`, `DOCENTE`, `ESTUDIANTE`).
  - `Data`: Estado reactivo con Signals y sincronización de consultas y catálogos.
  - `ReporteExcelService`: Generación de formato oficial FR-GPA-16-V8 en `.xlsx` y `.csv`.

## Convenciones de Código
- Mantener componentes standalone.
- Utilizar Signals de Angular (`signal`, `computed`) para el estado reactivo en los componentes y servicios.
- No modificar el backend si las instrucciones del usuario piden cambios exclusivos en el frontend.
- Cero IDs numéricos planos expuestos en tablas/vistas orientadas al usuario final.
