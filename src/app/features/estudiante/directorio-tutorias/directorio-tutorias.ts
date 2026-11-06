import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Data } from '../../../core/services/data';
import { DataTableDirective } from '../../../shared/directives/datatable.directive';

export interface TutorDocente {
  id: number;
  nombre: string;
  cargo: string;
  area: string;
  horario: string;
  ubicacion: string;
  correo: string;
  avatarBg: string;
  iniciales: string;
}

@Component({
  imports: [CommonModule, FormsModule, DataTableDirective],
  selector: 'app-directorio-tutorias',
  styleUrl: './directorio-tutorias.css',
  templateUrl: './directorio-tutorias.html',
})
export class DirectorioTutorias {
  private router = inject(Router);
  private dataService = inject(Data);

  busqueda = signal<string>('');

  tutores = signal<TutorDocente[]>([
    {
      id: 1,
      nombre: 'Ing. Carlos Mendoza',
      cargo: 'Docente Titular',
      area: 'Algoritmia y Estructura de Datos',
      horario: 'Mar - Jue: 02:00 PM a 04:00 PM',
      ubicacion: 'Sede Plaza de la Paz - Sala 10',
      correo: 'cmendoza@unibarranquilla.edu.co',
      avatarBg: '#1e40af',
      iniciales: 'CM'
    },
    {
      id: 2,
      nombre: 'Ing. Diana Rodríguez',
      cargo: 'Docente / Investigadora',
      area: 'Desarrollo Web & Bases de Datos',
      horario: 'Lun - Mié: 10:00 AM a 12:00 PM',
      ubicacion: 'Virtual / Google Meet institucional',
      correo: 'drodriguez@unibarranquilla.edu.co',
      avatarBg: '#047857',
      iniciales: 'DR'
    },
    {
      id: 3,
      nombre: 'Andrés Camargo',
      cargo: 'Monitor Académico',
      area: 'Fundamentos de Programación',
      horario: 'Viernes: 08:00 AM a 12:00 PM',
      ubicacion: 'Sede Plaza de la Paz - Sala 27',
      correo: 'acamargo@unibarranquilla.edu.co',
      avatarBg: '#b45309',
      iniciales: 'AC'
    },
    {
      id: 4,
      nombre: 'Ing. Roberto Pineda',
      cargo: 'Docente de Planta',
      area: 'Inteligencia Artificial y Machine Learning',
      horario: 'Mié - Vie: 03:00 PM a 05:00 PM',
      ubicacion: 'Laboratorio de Innovación 4',
      correo: 'rpineda@unibarranquilla.edu.co',
      avatarBg: '#6d28d9',
      iniciales: 'RP'
    }
  ]);

  tutoresFiltrados = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    if (!q) return this.tutores();
    return this.tutores().filter(t =>
      t.nombre.toLowerCase().includes(q) ||
      t.area.toLowerCase().includes(q) ||
      t.ubicacion.toLowerCase().includes(q) ||
      t.cargo.toLowerCase().includes(q)
    );
  });

  // Modal de solicitud de cita
  modalCitaAbierto = signal<boolean>(false);
  tutorSeleccionado = signal<TutorDocente | null>(null);

  fechaCita = '2026-10-20';
  franjaCita = 'Tarde (02:00 PM - 04:00 PM)';
  modalidadCita = 'Presencial';
  temaCita = '';

  abrirSolicitudCita(tutor: TutorDocente): void {
    this.tutorSeleccionado.set(tutor);
    this.temaCita = '';
    this.modalCitaAbierto.set(true);
  }

  cerrarModalCita(): void {
    this.modalCitaAbierto.set(false);
    this.tutorSeleccionado.set(null);
  }

  confirmarCita(): void {
    if (!this.temaCita.trim()) {
      alert('Por favor describe brevemente el tema o motivo de la cita.');
      return;
    }

    const tutor = this.tutorSeleccionado();
    const nueva = this.dataService.crearConsulta({
      asignatura: tutor?.area || 'Estructura de Datos',
      tutor: tutor?.nombre || 'Ing. Carlos Mendoza',
      modalidad: this.modalidadCita,
      franja: this.franjaCita,
      fecha: `${this.fechaCita} - ${this.franjaCita.split(' ')[0]}`,
      ubicacion: tutor?.ubicacion || 'Sede Plaza de la Paz',
      tema: this.temaCita.trim(),
      descripcion: `Cita solicitada desde el Directorio de Tutorías con ${tutor?.nombre}.`
    });

    alert(`¡Cita solicitada exitosamente con ${tutor?.nombre}!\nRadicado: ${nueva.radicado}\nFecha: ${this.fechaCita}\nFranja: ${this.franjaCita}`);

    this.cerrarModalCita();
    this.router.navigate(['/estudiante/mis-solicitudes']);
  }
}

