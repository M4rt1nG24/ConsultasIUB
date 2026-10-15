import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

export interface SolicitudEstudiante {
  id: number;
  radicado: string;
  asignatura: string;
  tema: string;
  tutor: string;
  fecha: string;
  estado: 'Programada' | 'Pendiente' | 'Completada';
  estadoClase: string;
  modalidad: string;
  ubicacion: string;
  observaciones: string;
}

@Component({
  imports: [CommonModule, FormsModule],
  selector: 'app-mis-solicitudes',
  styleUrl: './mis-solicitudes.css',
  templateUrl: './mis-solicitudes.html',
})
export class MisSolicitudes {
  private router = inject(Router);

  // Lista de solicitudes del estudiante
  solicitudes = signal<SolicitudEstudiante[]>([
    {
      id: 1,
      radicado: 'TUT-2026-1045',
      asignatura: 'Estructura de Datos',
      tema: 'Árboles binarios y balanceo AVL',
      tutor: 'Ing. Carlos Mendoza',
      fecha: '16/10/2026 - 10:00 AM',
      estado: 'Programada',
      estadoClase: 'status-assigned',
      modalidad: 'Presencial',
      ubicacion: 'Sede Plaza de la Paz - Sala de Cómputo 10',
      observaciones: 'El estudiante debe llevar el código del taller implementado hasta rotación simple.'
    },
    {
      id: 2,
      radicado: 'TUT-2026-1052',
      asignatura: 'Bases de Datos',
      tema: 'Normalización 3FN y Boyce-Codd',
      tutor: 'En asignación por Coordinación',
      fecha: '15/10/2026 - Tarde (02:00 PM)',
      estado: 'Pendiente',
      estadoClase: 'status-pending',
      modalidad: 'Virtual',
      ubicacion: 'Enlace Google Meet institucional (Pendiente confirmación)',
      observaciones: 'Solicitud en cola de revisión para asignación de tutor titular.'
    },
    {
      id: 3,
      radicado: 'TUT-2026-0988',
      asignatura: 'Programación Web',
      tema: 'Enrutamiento y Signals con Angular 22',
      tutor: 'Ing. Diana Rodríguez',
      fecha: '08/10/2026 - 02:00 PM',
      estado: 'Completada',
      estadoClase: 'status-done',
      modalidad: 'Presencial',
      ubicacion: 'Sede Plaza de la Paz - Laboratorio 3',
      observaciones: 'Tutoría finalizada y firmada digitalmente con control de asistencia (1).'
    }
  ]);

  // Modales
  modalDetalleAbierto = signal<boolean>(false);
  solicitudSeleccionada = signal<SolicitudEstudiante | null>(null);

  modalRapidoAbierto = signal<boolean>(false);
  nuevaAsignatura = 'Estructura de Datos';
  nuevoTema = '';
  nuevaModalidad = 'Presencial';
  nuevaFranja = 'Mañana (08:00 AM - 12:00 PM)';

  abrirDetalle(item: SolicitudEstudiante): void {
    this.solicitudSeleccionada.set(item);
    this.modalDetalleAbierto.set(true);
  }

  cerrarDetalle(): void {
    this.modalDetalleAbierto.set(false);
    this.solicitudSeleccionada.set(null);
  }

  abrirModalRapido(): void {
    this.modalRapidoAbierto.set(true);
  }

  cerrarModalRapido(): void {
    this.modalRapidoAbierto.set(false);
  }

  guardarSolicitudRapida(): void {
    if (!this.nuevoTema.trim()) {
      alert('Por favor especifica el tema o duda académica.');
      return;
    }

    const nuevoItem: SolicitudEstudiante = {
      id: Date.now(),
      radicado: `TUT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      asignatura: this.nuevaAsignatura,
      tema: this.nuevoTema,
      tutor: 'En asignación',
      fecha: 'Programada próximamente',
      estado: 'Pendiente',
      estadoClase: 'status-pending',
      modalidad: this.nuevaModalidad,
      ubicacion: this.nuevaModalidad === 'Presencial' ? 'Sede Plaza de la Paz' : 'Virtual Teams',
      observaciones: 'Solicitud radicada mediante formulario rápido.'
    };

    this.solicitudes.update(list => [nuevoItem, ...list]);
    this.nuevoTema = '';
    this.modalRapidoAbierto.set(false);
    alert(`¡Solicitud radicada con éxito! Número de radicado: ${nuevoItem.radicado}`);
  }

  irAFormularioCompleto(): void {
    this.modalRapidoAbierto.set(false);
    this.router.navigate(['/estudiante/crear']);
  }

  verFichaCompleta(item: SolicitudEstudiante): void {
    this.cerrarDetalle();
    this.router.navigate(['/estudiante/detalle']);
  }
}

