import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Data } from '../../../core/services/data';
import { EspaciosAux, SalonSedeItem } from '../../../core/services/espacios-aux';
import { Auth } from '../../../core/services/auth';

export interface EspacioConDisponibilidad extends SalonSedeItem {
  disponibleEnHorario: boolean;
  detalleConflicto?: string;
}

@Component({
  selector: 'app-crear-consulta-docente',
  imports: [CommonModule, FormsModule],
  templateUrl: './crear-consulta-docente.html',
  styleUrl: './crear-consulta-docente.css'
})
export class CrearConsultaDocente {
  private router = inject(Router);
  private dataService = inject(Data);
  private espaciosService = inject(EspaciosAux);
  private authService = inject(Auth);

  // 1. Datos del Estudiante
  documentoEstudiante = signal<string>('');
  nombreEstudiante = signal<string>('');
  correoEstudiante = signal<string>('');
  programaEstudiante = signal<string>('');
  estudianteId = signal<number | undefined>(undefined);

  // Estudiantes del sistema para sugerencias / autocompletado
  estudiantesSistema = computed(() =>
    this.dataService.usuarios().filter(u => u.rol === 'ESTUDIANTE' && u.estado === 'Activo')
  );

  estudianteAutocompletado = computed(() => {
    const doc = this.documentoEstudiante().trim();
    if (!doc) return null;
    return (
      this.estudiantesSistema().find(
        u => (u.identificacion || '').trim() === doc
      ) || null
    );
  });

  // 2. Asignatura / Módulo
  cursosDisponibles = this.dataService.cursos;
  moduloId = signal<number>(0);
  asignatura = signal<string>('');

  // 3. Prioridad y Asunto / Descripción (tabla solicitudes_consultas)
  prioridad: 'Alta' | 'Media' | 'Baja' = 'Media';
  tema = '';
  descripcion = '';

  // 4. Modalidad y Agendamiento
  modalidad = signal<string>('Presencial');
  fechaConsulta = signal<string>(this.obtenerMananaIso());
  horaConsulta = signal<string>('09:00');
  sedeSeleccionada = signal<string>('');
  espacioSeleccionadoId = signal<number>(0);

  sedesDisponibles = computed(() => this.espaciosService.obtenerSedesActivas());

  horariosDisponibles = [
    { valor: '07:00', etiqueta: '07:00 AM - 08:00 AM (Mañana temprano)' },
    { valor: '08:00', etiqueta: '08:00 AM - 09:00 AM (Mañana)' },
    { valor: '09:00', etiqueta: '09:00 AM - 10:00 AM (Mañana)' },
    { valor: '10:00', etiqueta: '10:00 AM - 11:00 AM (Mañana)' },
    { valor: '11:00', etiqueta: '11:00 AM - 12:00 PM (Mañana)' },
    { valor: '13:00', etiqueta: '01:00 PM - 02:00 PM (Tarde)' },
    { valor: '14:00', etiqueta: '02:00 PM - 03:00 PM (Tarde)' },
    { valor: '15:00', etiqueta: '03:00 PM - 04:00 PM (Tarde)' },
    { valor: '16:00', etiqueta: '04:00 PM - 05:00 PM (Tarde)' },
    { valor: '17:00', etiqueta: '05:00 PM - 06:00 PM (Tarde)' },
    { valor: '18:00', etiqueta: '06:00 PM - 07:00 PM (Noche)' },
    { valor: '19:00', etiqueta: '07:00 PM - 08:00 PM (Noche)' },
    { valor: '20:00', etiqueta: '08:00 PM - 09:00 PM (Noche)' }
  ];

  // 5. Verificación de Espacios Físicos
  espaciosDeSede = computed<EspacioConDisponibilidad[]>(() => {
    const sede = this.sedeSeleccionada();
    if (!sede) return [];
    const espacios = this.espaciosService.obtenerEspaciosPorSede(sede);
    const fecha = this.fechaConsulta();
    const hora = this.horaConsulta();

    return espacios.map(esp => {
      const check = this.dataService.verificarDisponibilidadEspacio(
        sede,
        esp.nombre,
        fecha,
        hora,
        esp.id
      );
      return {
        ...esp,
        disponibleEnHorario: check.disponible,
        detalleConflicto: check.disponible ? undefined : check.mensaje
      };
    });
  });

  espacioActualObj = computed(() => {
    const espId = Number(this.espacioSeleccionadoId());
    return this.espaciosDeSede().find(e => e.id === espId) || this.espaciosDeSede()[0] || null;
  });

  verificacionDisponibilidad = computed(() => {
    if (this.modalidad() === 'Virtual') {
      return {
        disponible: true,
        mensaje: 'La modalidad Virtual no requiere validación de espacio físico institucional.'
      };
    }
    const esp = this.espacioActualObj();
    if (!esp) {
      return {
        disponible: false,
        mensaje: 'Debes seleccionar un espacio físico de la sede seleccionada.'
      };
    }
    return this.dataService.verificarDisponibilidadEspacio(
      this.sedeSeleccionada(),
      esp.nombre,
      this.fechaConsulta(),
      this.horaConsulta(),
      esp.id
    );
  });

  // Modal de confirmación
  modalConfirmacionAbierto = signal<boolean>(false);
  radicadoGenerado = signal<string>('');
  ubicacionConfirmada = signal<string>('');

  constructor() {
    // Sincronizar catálogos si no están cargados
    this.dataService.sincronizarDesdeBackend();

    // Precargar primera sede activa
    effect(() => {
      const sedes = this.sedesDisponibles();
      if (sedes.length > 0 && !this.sedeSeleccionada()) {
        this.sedeSeleccionada.set(sedes[0].nombre);
      }
    });

    // Precargar primer curso
    effect(() => {
      const cursos = this.cursosDisponibles();
      if (cursos.length > 0 && !this.moduloId()) {
        this.moduloId.set(cursos[0].id);
        this.asignatura.set(cursos[0].asignatura);
      }
    });

    // Auto-completar estudiante cuando se encuentra por cédula
    effect(() => {
      const encontrado = this.estudianteAutocompletado();
      if (encontrado) {
        this.nombreEstudiante.set(encontrado.nombre);
        this.correoEstudiante.set(encontrado.email);
        this.programaEstudiante.set(encontrado.programa || 'Sin programa asignado');
        this.estudianteId.set(encontrado.id);
      }
    });
  }

  private obtenerMananaIso(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  seleccionarEstudianteSugerido(est: any): void {
    this.documentoEstudiante.set(est.identificacion || '');
    this.nombreEstudiante.set(est.nombre);
    this.correoEstudiante.set(est.email);
    this.programaEstudiante.set(est.programa || '');
    this.estudianteId.set(est.id);
  }

  cambiarSede(nuevaSede: string): void {
    this.sedeSeleccionada.set(nuevaSede);
    const espacios = this.espaciosService.obtenerEspaciosPorSede(nuevaSede);
    this.espacioSeleccionadoId.set(espacios[0]?.id || 0);
  }

  cambiarCurso(modIdStr: string): void {
    const id = Number(modIdStr);
    this.moduloId.set(id);
    const c = this.cursosDisponibles().find(item => item.id === id);
    if (c) {
      this.asignatura.set(c.asignatura);
    }
  }

  registrarConsulta(): void {
    const doc = this.documentoEstudiante().trim();
    if (!doc) {
      alert('Por favor digita el número de documento de identificación del estudiante.');
      return;
    }

    const nom = this.nombreEstudiante().trim();
    if (!nom) {
      alert('Por favor ingresa el nombre completo del estudiante.');
      return;
    }

    if (!this.tema.trim() || this.tema.trim().length < 5) {
      alert('Por favor describe el asunto o tema de la consulta (mínimo 5 caracteres).');
      return;
    }

    const estadoEspacio = this.verificacionDisponibilidad();
    if (this.modalidad() === 'Presencial' && !estadoEspacio.disponible) {
      alert(estadoEspacio.mensaje);
      return;
    }

    const esp = this.espacioActualObj();
    const ubicacionFinal =
      this.modalidad() === 'Virtual'
        ? 'Campus Virtual Institucional (Microsoft Teams / Google Meet)'
        : `${this.sedeSeleccionada()} - ${esp?.nombre || ''}`;

    const horarioObj = this.horariosDisponibles.find(h => h.valor === this.horaConsulta());
    const idDocenteSesion = Number(localStorage.getItem('idUsuarioActivo')) || undefined;
    const nombreDocenteSesion = localStorage.getItem('nombreUsuarioActivo') || 'Docente Tutor';

    const curso = this.cursosDisponibles().find(c => c.id === this.moduloId()) || this.cursosDisponibles()[0];

    const creada = this.dataService.crearConsulta({
      estudiante: nom,
      documento: doc,
      correoEstudiante: this.correoEstudiante().trim(),
      estudianteId: this.estudianteId(),
      moduloId: curso?.id,
      asignatura: this.asignatura() || curso?.asignatura || 'Asignatura General',
      tema: this.tema.trim(),
      descripcion: (this.descripcion.trim() || this.tema.trim()),
      docenteId: idDocenteSesion,
      tutor: nombreDocenteSesion,
      modalidad: this.modalidad(),
      franja: horarioObj?.etiqueta || this.horaConsulta(),
      fecha: this.fechaConsulta(),
      hora: this.horaConsulta(),
      ubicacion: ubicacionFinal,
      recursoFisicoId: this.modalidad() === 'Presencial' ? esp?.id || null : null,
      prioridad: this.prioridad
    });

    this.ubicacionConfirmada.set(ubicacionFinal);
    this.radicadoGenerado.set(creada.radicado);
    this.modalConfirmacionAbierto.set(true);
  }

  cerrarModalYVolver(): void {
    this.modalConfirmacionAbierto.set(false);
    this.router.navigate(['/docente/asignadas']);
  }

  irAAtencionDirecta(): void {
    this.modalConfirmacionAbierto.set(false);
    this.router.navigate(['/docente/atencion']);
  }
}
