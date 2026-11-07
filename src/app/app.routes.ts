import { Routes } from '@angular/router';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  // Ruta raíz: redirige a /principal (o a /login según prefieras)
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  // Ruta /principal → Landing Page pública (Sin Sidebar del sistema)
  {
    path: 'principal',
    loadComponent: () =>
      import('./features/principal/page/principal-page/principal-page')
        .then(m => m.PrincipalPage)
  },

  // =========================================================================
  // AUTENTICACIÓN (Vistas públicas sin Sidebar)
  // =========================================================================
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login').then(m => m.Login)
  },
  {
    path: 'registro',
    loadComponent: () =>
      import('./features/auth/registro/registro').then(m => m.Registro)
  },

  // =========================================================================
  // LAYOUT CONTENEDOR (Con Sidebar y Navbar reutilizables para los 3 roles)
  // =========================================================================
  {
    path: '',
    loadComponent: () =>
      import('./layouts/main-layout/main-layout').then(m => m.MainLayout),
    children: [

      // ---------------------------------------------------------------------
      // ROL 1: ADMINISTRADOR
      // ---------------------------------------------------------------------
      {
        path: 'admin',
        canActivate: [roleGuard],
        data: { role: 'ADMIN' },
        children: [
          {
            path: 'reportes',
            loadComponent: () =>
              import('./features/administrador/dashboard-reportes/dashboard-reportes')
                .then(m => m.DashboardReportes)
          },
          {
            path: 'usuarios',
            loadComponent: () =>
              import('./features/administrador/gestion-usuarios/gestion-usuarios')
                .then(m => m.GestionUsuarios)
          },
          {
            path: 'consultas',
            loadComponent: () =>
              import('./features/administrador/reasignacion-consultas/reasignacion-consultas')
                .then(m => m.ReasignacionConsultas)
          },
          {
            path: 'cursos-roles',
            loadComponent: () =>
              import('./features/administrador/gestion-cursos-roles/gestion-cursos-roles')
                .then(m => m.GestionCursosRoles)
          },
          {
            path: 'sedes',
            loadComponent: () =>
              import('./features/administrador/gestion-sedes/gestion-sedes')
                .then(m => m.GestionSedes)
          },
          {
            path: 'salones',
            loadComponent: () =>
              import('./features/administrador/gestion-salones/gestion-salones')
                .then(m => m.GestionSalones)
          },
          {
            path: 'programas',
            loadComponent: () =>
              import('./features/administrador/gestion-programas/gestion-programas')
                .then(m => m.GestionProgramas)
          },
          // Si entra solo a "/admin", lo lleva a "/admin/reportes"
          { path: '', redirectTo: 'reportes', pathMatch: 'full' }
        ]
      },

      // ---------------------------------------------------------------------
      // ROL 2: DOCENTE
      // ---------------------------------------------------------------------
      {
        path: 'docente',
        canActivate: [roleGuard],
        data: { role: 'DOCENTE' },
        children: [
          {
            path: 'asignadas',
            loadComponent: () =>
              import('./features/docente/bandeja-asignadas/bandeja-asignadas')
                .then(m => m.BandejaAsignadas)
          },
          {
            path: 'atencion', // Tip: puedes usar 'atencion/:id' si pasas el ID de la consulta
            loadComponent: () =>
              import('./features/docente/atencion-consulta/atencion-consulta')
                .then(m => m.AtencionConsulta)
          },
          {
            path: 'historial',
            loadComponent: () =>
              import('./features/docente/historial-tutorias/historial-tutorias')
                .then(m => m.HistorialTutorias)
          },
          {
            path: 'disponibilidad',
            loadComponent: () =>
              import('./features/docente/disponibilidad-docente/disponibilidad-docente')
                .then(m => m.DisponibilidadDocente)
          },
          // Si entra solo a "/docente", lo lleva a "/docente/asignadas"
          { path: '', redirectTo: 'asignadas', pathMatch: 'full' }
        ]
      },

      // ---------------------------------------------------------------------
      // ROL 3: ESTUDIANTE
      // ---------------------------------------------------------------------
      {
        path: 'estudiante',
        canActivate: [roleGuard],
        data: { role: 'ESTUDIANTE' },
        children: [
          {
            path: 'mis-solicitudes',
            loadComponent: () =>
              import('./features/estudiante/mis-solicitudes/mis-solicitudes')
                .then(m => m.MisSolicitudes)
          },
          {
            path: 'crear',
            loadComponent: () =>
              import('./features/estudiante/crear-consulta/crear-consulta')
                .then(m => m.CrearConsulta)
          },
          {
            path: 'detalle', // Tip: puedes usar 'detalle/:id' para ver una solicitud específica
            loadComponent: () =>
              import('./features/estudiante/detalle-interaccion/detalle-interaccion')
                .then(m => m.DetalleInteraccion)
          },
          // Si entra solo a "/estudiante", lo lleva a "/estudiante/mis-solicitudes"
          { path: '', redirectTo: 'mis-solicitudes', pathMatch: 'full' },

          {
            path: 'directorio-tutorias',
            loadComponent: () =>
              import('./features/estudiante/directorio-tutorias/directorio-tutorias')
                .then(m => m.DirectorioTutorias)
          }


        ]
      }
    ]
  },

  // Ruta comodín
  {
    path: '**',
    redirectTo: 'login'
  }
];