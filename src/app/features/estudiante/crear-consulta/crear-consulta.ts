import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Data } from '../../../core/services/data';
import { EspaciosAux, SalonSedeItem } from '../../../core/services/espacios-aux';

export interface EspacioConDisponibilidad extends SalonSedeItem {
  disponibleEnHorario: boolean;
  detalleConflicto?: string;
}

@Component({
  imports: [CommonModule, FormsModule],
  selector: 'app-crear-consulta',
  styleUrl: './crear-consulta.css',
  templateUrl: './crear-consulta.html',
})
export class CrearConsulta {
  private router = inject(Router);
  private dataService = inject(Data);
  private espaciosService = inject(EspaciosAux);

  cursosDisponibles = this.dataService.cursos;
  asignatura = '';
  asignaturaSignal = signal<string>('');

  docentesDisponibles = computed(() => {
    const asig = (this.asignaturaSignal() || this.asignatura || '').toLowerCase().trim();
    const curso = this.cursosDisponibles().find(c => c.asignatura.toLowerCase().trim() === asig);
    const nombres = new Set<string>();

    if (curso?.docente && curso.docente !== 'Sin docente asignado') {
      nombres.add(curso.docente.trim());
    }
    if (curso?.docentesAsignados && curso.docentesAsignados.length > 0) {
      for (const d of curso.docentesAsignados) {
        const completo = `${d.nombre} ${d.apellido || ''}`.trim();
        if (completo) nombres.add(completo);
      }
    }
    for (const d of this.dataService.docentesDisponibles()) {
      if (d && d.trim()) nombres.add(d.trim());
    }
    return Array.from(nombres);
  });
  sedesDisponibles = computed(() => this.espaciosService.obtenerSedesActivas());
  docente = 'Asignación Automática (Recomendado)';
  prioridad: 'Alta' | 'Media' | 'Baja' = 'Media';
  modalidad = signal<string>('Presencial');
  sedeSeleccionada = signal<string>('');
  espacioSeleccionadoId = signal<number>(0);
  fechaConsulta = signal<string>(this.obtenerMananaIso());
  horaConsulta = signal<string>('09:00');
  tema = '';
  descripcion = '';

  horariosDisponibles = [
    { valor: '08:00', etiqueta: '08:00 AM - 09:00 AM (Mañana)' },
    { valor: '09:00', etiqueta: '09:00 AM - 10:00 AM (Mañana)' },
    { valor: '10:00', etiqueta: '10:00 AM - 11:00 AM (Mañana)' },
    { valor: '11:00', etiqueta: '11:00 AM - 12:00 PM (Mañana)' },
    { valor: '14:00', etiqueta: '02:00 PM - 03:00 PM (Tarde)' },
    { valor: '15:00', etiqueta: '03:00 PM - 04:00 PM (Tarde)' },
    { valor: '16:00', etiqueta: '04:00 PM - 05:00 PM (Tarde)' },
    { valor: '17:00', etiqueta: '05:00 PM - 06:00 PM (Tarde)' },
    { valor: '18:00', etiqueta: '06:00 PM - 07:00 PM (Noche)' },
    { valor: '19:00', etiqueta: '07:00 PM - 08:00 PM (Noche)' }
  ];

  // Espacios filtrados por la sede seleccionada con verificación de horario en tiempo real
  espaciosDeSede = computed<EspacioConDisponibilidad[]>(() => {
    const sede = this.sedeSeleccionada();
    const fecha = this.fechaConsulta();
    const hora = this.horaConsulta();
    const lista = this.espaciosService.obtenerEspaciosPorSede(sede);

    return lista.map(esp => {
      const check = this.dataService.verificarDisponibilidadEspacio(
        sede,
        esp.nombre,
        fecha,
        hora,
        esp.id
      );
      return {
        ...esp,
        disponibleEnHorario: esp.estado === 'Disponible' && check.disponible,
        detalleConflicto: check.disponible ? undefined : check.mensaje
      };
    });
  });

  espacioActualObj = computed(() => {
    const id = Number(this.espacioSeleccionadoId());
    return this.espaciosDeSede().find(e => e.id === id) || null;
  });

  verificacionDisponibilidad = computed(() => {
    if (this.modalidad() === 'Virtual') {
      return {
        disponible: true,
        mensaje: 'Modalidad Virtual: Se generará sala de reunión institucional sin requerir salón físico.'
      };
    }

    const esp = this.espacioActualObj();
    if (!esp) {
      return {
        disponible: false,
        mensaje: 'Selecciona una sede y un espacio disponible para verificar el horario.'
      };
    }

    if (esp.estado !== 'Disponible') {
      return {
        disponible: false,
        mensaje: `El espacio "${esp.nombre}" se encuentra en estado "${esp.estado}".`
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

  modalConfirmacionAbierto = signal<boolean>(false);
  radicadoGenerado = signal<string>('');
  ubicacionConfirmada = signal<string>('');

  constructor() {
    if (this.espaciosService.sedes().length === 0) {
      this.espaciosService.sincronizarDesdeBackend();
    }

    effect(() => {
      const cursos = this.cursosDisponibles();
      if (cursos.length > 0 && !this.asignatura) {
        this.asignatura = cursos[0].asignatura;
        this.asignaturaSignal.set(cursos[0].asignatura);
      }
    });

    effect(() => {
      const sedes = this.sedesDisponibles();
      if (sedes.length > 0 && !this.sedeSeleccionada()) {
        this.sedeSeleccionada.set(sedes[0].nombre);
      }
    });

    effect(() => {
      const espacios = this.espaciosDeSede();
      const actualId = Number(this.espacioSeleccionadoId());
      if (espacios.length > 0 && !espacios.some(e => e.id === actualId)) {
        const primeroDisponible = espacios.find(e => e.disponibleEnHorario) || espacios[0];
        this.espacioSeleccionadoId.set(primeroDisponible.id);
      }
    });
  }

  private obtenerMananaIso(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  cambiarSede(nuevaSede: string): void {
    this.sedeSeleccionada.set(nuevaSede);
    const espacios = this.espaciosService.obtenerEspaciosPorSede(nuevaSede);
    this.espacioSeleccionadoId.set(espacios[0]?.id || 0);
  }

  enviarSolicitud(): void {
    if (!this.tema.trim()) {
      alert('Por favor describe el tema puntual o duda que requieres consultar.');
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

    const creada = this.dataService.crearConsulta({
      asignatura: this.asignatura,
      tutor: this.docente,
      modalidad: this.modalidad(),
      franja: horarioObj?.etiqueta || this.horaConsulta(),
      fecha: this.fechaConsulta(),
      hora: this.horaConsulta(),
      ubicacion: ubicacionFinal,
      recursoFisicoId: this.modalidad() === 'Presencial' ? esp?.id || null : null,
      prioridad: this.prioridad,
      tema: this.tema.trim(),
      descripcion: this.descripcion.trim()
    });

    this.ubicacionConfirmada.set(ubicacionFinal);
    this.radicadoGenerado.set(creada.radicado);
    this.modalConfirmacionAbierto.set(true);
  }

  cerrarModalYVolver(): void {
    this.modalConfirmacionAbierto.set(false);
    this.router.navigate(['/estudiante/mis-solicitudes']);
  }

  crearOtra(): void {
    this.modalConfirmacionAbierto.set(false);
    this.tema = '';
    this.descripcion = '';
  }

  cancelar(): void {
    if (this.tema.trim()) {
      if (confirm('Tienes datos ingresados en el formulario. ¿Deseas descartar y salir?')) {
        this.router.navigate(['/estudiante/mis-solicitudes']);
      }
    } else {
      this.router.navigate(['/estudiante/mis-solicitudes']);
    }
  }
}
