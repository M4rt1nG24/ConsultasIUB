import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Data } from '../../../core/services/data';
import { EspaciosAux, SalonSedeItem } from '../../../core/services/espacios-aux';
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

const COLORES_AVATAR = ['#1e40af', '#047857', '#b45309', '#6d28d9'];

@Component({
  imports: [CommonModule, FormsModule, DataTableDirective],
  selector: 'app-directorio-tutorias',
  styleUrl: './directorio-tutorias.css',
  templateUrl: './directorio-tutorias.html',
})
export class DirectorioTutorias {
  private router = inject(Router);
  private dataService = inject(Data);
  private espaciosService = inject(EspaciosAux);

  busqueda = signal<string>('');

  readonly horasDisponibles: { valor: string; etiqueta: string; franja: string }[] = [
    { valor: '07:00', etiqueta: '07:00 AM - 08:00 AM (Mañana)', franja: 'Mañana (07:00 AM - 08:00 AM)' },
    { valor: '08:00', etiqueta: '08:00 AM - 09:00 AM (Mañana)', franja: 'Mañana (08:00 AM - 09:00 AM)' },
    { valor: '09:00', etiqueta: '09:00 AM - 10:00 AM (Mañana)', franja: 'Mañana (09:00 AM - 10:00 AM)' },
    { valor: '10:00', etiqueta: '10:00 AM - 11:00 AM (Mañana)', franja: 'Mañana (10:00 AM - 11:00 AM)' },
    { valor: '11:00', etiqueta: '11:00 AM - 12:00 PM (Mañana)', franja: 'Mañana (11:00 AM - 12:00 PM)' },
    { valor: '14:00', etiqueta: '02:00 PM - 03:00 PM (Tarde)', franja: 'Tarde (02:00 PM - 03:00 PM)' },
    { valor: '15:00', etiqueta: '03:00 PM - 04:00 PM (Tarde)', franja: 'Tarde (03:00 PM - 04:00 PM)' },
    { valor: '16:00', etiqueta: '04:00 PM - 05:00 PM (Tarde)', franja: 'Tarde (04:00 PM - 05:00 PM)' },
    { valor: '17:00', etiqueta: '05:00 PM - 06:00 PM (Tarde)', franja: 'Tarde (05:00 PM - 06:00 PM)' },
    { valor: '18:00', etiqueta: '06:00 PM - 07:00 PM (Noche)', franja: 'Noche (06:00 PM - 07:00 PM)' },
    { valor: '19:00', etiqueta: '07:00 PM - 08:00 PM (Noche)', franja: 'Noche (07:00 PM - 08:00 PM)' }
  ];

  sedesDisponibles = computed(() => this.espaciosService.obtenerSedesActivas());

  tutores = computed<TutorDocente[]>(() => {
    const docentes = this.dataService
      .usuarios()
      .filter(u => u.rol === 'DOCENTE' && u.estado === 'Activo');
    const cursos = this.dataService.cursos();

    return docentes.map((doc, idx) => {
      const cursosDocente = cursos
        .filter(c => c.docente.toLowerCase() === doc.nombre.toLowerCase())
        .map(c => c.asignatura);
      const partes = doc.nombre
        .replace(/^Ing\.\s*/i, '')
        .trim()
        .split(/\s+/);
      const iniciales =
        ((partes[0]?.[0] || '') + (partes[1]?.[0] || '')).toUpperCase() || 'DO';

      return {
        id: doc.id,
        nombre: doc.nombre,
        cargo: 'Docente Tutor',
        area: cursosDocente.join(', ') || doc.programa || '',
        horario: 'Según disponibilidad académica',
        ubicacion: 'Sedes Soledad / Barranquilla y Virtual',
        correo: doc.email,
        avatarBg: COLORES_AVATAR[idx % COLORES_AVATAR.length],
        iniciales
      };
    });
  });

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

  fechaCita = signal<string>(new Date().toISOString().split('T')[0]);
  horaCita = signal<string>('14:00');
  modalidadCita = signal<string>('Presencial');
  sedeCita = signal<string>('');
  espacioCitaId = signal<number | null>(null);
  temaCita = '';

  espaciosDeLaSedeCita = computed<SalonSedeItem[]>(() => {
    const sede = this.sedeCita();
    if (!sede) return [];
    return this.espaciosService.obtenerEspaciosPorSede(sede);
  });

  espacioCitaObj = computed<SalonSedeItem | null>(() => {
    const id = Number(this.espacioCitaId());
    if (!id) return null;
    return this.espaciosDeLaSedeCita().find(e => e.id === id) || null;
  });

  verificacionDisponibilidadCita = computed(() => {
    if (this.modalidadCita() === 'Virtual') {
      return {
        disponible: true,
        mensaje: 'Modalidad virtual: no requiere reserva de salón físico.'
      };
    }

    const sede = this.sedeCita();
    const espacio = this.espacioCitaObj();
    const fecha = this.fechaCita();
    const hora = this.horaCita();

    if (!sede || !espacio || !fecha || !hora) {
      return null;
    }

    return this.dataService.verificarDisponibilidadEspacio(
      sede,
      espacio.nombre,
      fecha,
      hora,
      espacio.id
    );
  });

  estaEspacioDisponibleEnHora(espacio: SalonSedeItem): boolean {
    const sede = this.sedeCita();
    const fecha = this.fechaCita();
    const hora = this.horaCita();
    if (!sede || !fecha || !hora) return true;
    return this.dataService.verificarDisponibilidadEspacio(
      sede,
      espacio.nombre,
      fecha,
      hora,
      espacio.id
    ).disponible;
  }

  alCambiarSedeCita(nuevaSede: string): void {
    this.sedeCita.set(nuevaSede);
    const espacios = this.espaciosService.obtenerEspaciosPorSede(nuevaSede);
    this.espacioCitaId.set(espacios.length > 0 ? espacios[0].id : null);
  }

  abrirSolicitudCita(tutor: TutorDocente): void {
    this.tutorSeleccionado.set(tutor);
    this.temaCita = '';
    this.fechaCita.set(new Date().toISOString().split('T')[0]);
    this.horaCita.set('14:00');
    this.modalidadCita.set('Presencial');
    const sedes = this.sedesDisponibles();
    const primeraSede = sedes[0]?.nombre || 'Sede Plaza de la Paz';
    this.alCambiarSedeCita(primeraSede);
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

    const esPresencial = this.modalidadCita() === 'Presencial';
    const sede = this.sedeCita();
    const espacio = this.espacioCitaObj();

    if (esPresencial && (!sede || !espacio)) {
      alert('Por favor selecciona la sede y el espacio disponible para tu cita presencial.');
      return;
    }

    const infoHora = this.horasDisponibles.find(h => h.valor === this.horaCita());
    const franjaEtiqueta = infoHora ? infoHora.franja : this.horaCita();
    const ubicacionFinal = esPresencial
      ? 'Pendiente de asignación por el docente'
      : 'Campus Virtual Institucional (Microsoft Teams / Google Meet)';

    const tutor = this.tutorSeleccionado();
    const asignaturaElegida = (tutor?.area || '').split(',')[0]?.trim() || tutor?.area || '';

    const nueva = this.dataService.crearConsulta({
      asignatura: asignaturaElegida,
      tutor: tutor?.nombre || '',
      docenteId: tutor?.id,
      modalidad: this.modalidadCita(),
      franja: franjaEtiqueta,
      hora: this.horaCita(),
      fecha: this.fechaCita(),
      ubicacion: ubicacionFinal,
      recursoFisicoId: null, // El docente asigna el espacio institucional
      tema: this.temaCita.trim(),
      descripcion: `Cita solicitada desde el Directorio de Tutorías con ${tutor?.nombre}.`
    });

    alert(
      `¡Cita solicitada exitosamente con ${tutor?.nombre}!\n` +
      `Radicado: ${nueva.radicado}\n` +
      `Fecha: ${this.fechaCita()} (${this.horaCita()})\n` +
      `Lugar / Espacio: ${ubicacionFinal}`
    );

    this.cerrarModalCita();
    this.router.navigate(['/estudiante/mis-solicitudes']);
  }
}
