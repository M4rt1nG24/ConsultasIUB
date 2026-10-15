import { Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { Header } from '../../shared/components/header/header';
import { Footer } from '../../shared/components/footer/footer';

export type RolUsuario = 'ADMIN' | 'DOCENTE' | 'ESTUDIANTE';

interface OpcionMenu {
  titulo: string;
  ruta: string;
  icono: string;
  rol: RolUsuario;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Header, Footer],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css'
})
export class MainLayout {
  private router = inject(Router);

  // Rol activo (Por defecto ESTUDIANTE)
  rolActual = signal<RolUsuario>('ESTUDIANTE');

  private todasLasOpciones: OpcionMenu[] = [
    // ROL 1: ADMINISTRADOR
    { titulo: 'Reportes', ruta: '/admin/reportes', icono: "", rol: 'ADMIN' },
    { titulo: 'Gestión de Usuarios', ruta: '/admin/usuarios', icono: '', rol: 'ADMIN' },
    { titulo: 'Reasignar Consultas', ruta: '/admin/consultas', icono: '', rol: 'ADMIN' },
    { titulo: 'Cursos y Roles', ruta: '/admin/cursos-roles', icono: '', rol: 'ADMIN' },

    // ROL 2: DOCENTE
    { titulo: 'Bandeja Asignadas', ruta: '/docente/asignadas', icono: '', rol: 'DOCENTE' },
    { titulo: 'Atención de Consulta', ruta: '/docente/atencion', icono: '', rol: 'DOCENTE' },
    { titulo: 'Historial de Tutorías', ruta: '/docente/historial', icono: '', rol: 'DOCENTE' },

    // ROL 3: ESTUDIANTE
    { titulo: 'Mis Solicitudes', ruta: '/estudiante/mis-solicitudes', icono: '', rol: 'ESTUDIANTE' },
    { titulo: 'Crear Consulta', ruta: '/estudiante/crear', icono: '', rol: 'ESTUDIANTE' },
    { titulo: 'Detalle Interacción', ruta: '/estudiante/detalle', icono: '', rol: 'ESTUDIANTE' },
    { titulo: 'Directorio tutorias ', ruta: '/estudiante/directorio-tutorias', icono: '', rol: 'ESTUDIANTE' },
  ];

  // Filtra los botones del Sidebar según el rol seleccionado
  menuDelRol = computed(() =>
    this.todasLasOpciones.filter(opcion => opcion.rol === this.rolActual())
  );

  // Método para cambiar de rol desde el select de prueba y navegar a su primera ruta
  cambiarRol(nuevoRol: RolUsuario) {
    this.rolActual.set(nuevoRol);
    const primeraRuta = this.menuDelRol()[0]?.ruta;
    if (primeraRuta) {
      this.router.navigate([primeraRuta]);
    }
  }
}