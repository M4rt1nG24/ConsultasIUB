import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Data } from '../../../core/services/data';
import { ApiPrincipal } from '../../../core/services/api-principal';
import { EspaciosAux, SalonSedeItem } from '../../../core/services/espacios-aux';
import { Auth } from '../../../core/services/auth';
import { UsuarioSistema } from '../../../core/models/consulta.models';
import { mapearUsuarioApiAFront } from '../../../core/services/data-helpers';
import {
  PrioridadSolicitudApi,
  RegistroSolicitudConsultaRequestApi
} from '../../../core/models/api-principal.models';
import { fechaMananaIso } from '../../../core/utils/comun';

export interface EspacioConDisponibilidad extends SalonSedeItem {
  disponibleEnHorario: boolean;
  detalleConflicto?: string;
}

@Component({
  selector: 'app-crear-consulta-docente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crear-consulta-docente.html',
  styleUrl: './crear-consulta-docente.css'
})
export class CrearConsultaDocente {
  private router = inject(Router);
  private dataService = inject(Data);
  private apiPrincipal = inject(ApiPrincipal);
  private espaciosService = inject(EspaciosAux);
  private authService = inject(Auth);

  // 1. Datos del Estudiante (el docente solo ingresa el documento)
  documentoEstudiante = signal<string>('');
  nombreEstudiante = signal<string>('');
  correoEstudiante = signal<string>('');
  programaEstudiante = signal<string>('');
  estudianteId = signal<number | undefined>(undefined);
  tipoDocumentoEstudiante = signal<string>('CC');

  // Estudiantes cargados directamente de la API si están disponibles
  estudiantesApi = signal<UsuarioSistema[]>([]);

  // Estudiantes consolidados del sistema (API + DataService + Consultas existentes)
  estudiantesDisponibles = computed<UsuarioSistema[]>(() => {
    const mapa = new Map<string, UsuarioSistema>();

    // 1. Estudiantes obtenidos de la API
    for (const u of this.estudiantesApi()) {
      const doc = (u.identificacion || '').trim();
      if (doc) mapa.set(doc.toLowerCase(), u);
    }

    // 2. Estudiantes en el servicio reactivo Data
    for (const u of this.dataService.usuarios()) {
      if (u.rol === 'ESTUDIANTE') {
        const doc = (u.identificacion || '').trim();
        if (doc && !mapa.has(doc.toLowerCase())) {
          mapa.set(doc.toLowerCase(), u);
        }
      }
    }

    // 3. Estudiantes recolectados de consultas históricas
    //    Solo se usan si traen id real: sin id no se puede cumplir la FK estudiante_id.
    for (const c of this.dataService.consultas()) {
      const doc = (c.documento || '').trim();
      if (doc && c.estudianteId && !mapa.has(doc.toLowerCase()) && c.estudiante) {
        mapa.set(doc.toLowerCase(), {
          id: c.estudianteId,
          tipoIdentificacion: 'CC',
          identificacion: doc,
          tipoDocumentoSigla: 'CC',
          nombre: c.estudiante,
          nombreSolo: c.estudiante.split(' ')[0],
          apellido: c.estudiante.split(' ').slice(1).join(' '),
          email: c.correoEstudiante || '',
          rol: 'ESTUDIANTE',
          estado: 'Activo',
          programa: c.nombrePrograma || 'Estudiante IUB',
          fechaCreacion: ''
        });
      }
    }

    return Array.from(mapa.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  // Búsqueda reactiva del estudiante por número de documento
  estudianteAutocompletado = computed<UsuarioSistema | null>(() => {
    const doc = this.documentoEstudiante().trim();
    if (!doc) return null;
    const docLimpio = doc.replace(/\D/g, '');

    const lista = this.estudiantesDisponibles();

    // Coincidencia exacta de documento
    const exacto = lista.find(
      e => (e.identificacion || '').trim().toLowerCase() === doc.toLowerCase()
    );
    if (exacto) return exacto;

    // Coincidencia solo con dígitos numéricos
    if (docLimpio.length >= 4) {
      const numerico = lista.find(
        e => (e.identificacion || '').trim().replace(/\D/g, '') === docLimpio
      );
      if (numerico) return numerico;
    }

    // Coincidencia por ID numérico si comienza con #
    if (doc.startsWith('#') || !isNaN(Number(doc))) {
      const idNum = Number(doc.replace('#', ''));
      const porId = lista.find(e => e.id === idNum);
      if (porId) return porId;
    }

    return null;
  });

  // 2. Asignatura / Módulo
  cursosDisponibles = this.dataService.cursos;
  moduloId = signal<number>(0);
  asignatura = signal<string>('');

  // 3. Prioridad y Asunto / Descripción
  prioridad: 'Alta' | 'Media' | 'Baja' = 'Media';
  tema = '';
  descripcion = '';

  // 4. Modalidad y Agendamiento
  modalidad = signal<string>('Presencial');
  fechaConsulta = signal<string>(fechaMananaIso());
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

  // Estado de guardado (evita doble envío)
  guardando = signal<boolean>(false);

  // Docente en sesión
  nombreDocenteSesion = signal<string>('');

  constructor() {
    this.dataService.sincronizarDesdeBackend();

    // Cargar nombre del docente activo
    const nom = localStorage.getItem('nombreUsuarioActivo') || 'Docente Tutor';
    this.nombreDocenteSesion.set(nom);

    // Intentar cargar usuarios de la API para obtener estudiantes actualizados
    this.apiPrincipal.listarUsuarios(true).subscribe({
      next: (remotos) => {
        if (Array.isArray(remotos)) {
          const mapeados = remotos.map(mapearUsuarioApiAFront);
          this.estudiantesApi.set(mapeados.filter(u => u.rol === 'ESTUDIANTE'));
        }
      },
      error: () => {
        // Fallback transparente al servicio Data
      }
    });

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

    // Sincronizar automáticamente todos los datos del estudiante a partir del documento
    effect(() => {
      const encontrado = this.estudianteAutocompletado();
      if (encontrado) {
        this.nombreEstudiante.set(encontrado.nombre);
        this.correoEstudiante.set(encontrado.email || '');
        this.programaEstudiante.set(encontrado.programa || 'Estudiante IUB');
        this.estudianteId.set(encontrado.id || undefined);
        this.tipoDocumentoEstudiante.set(encontrado.tipoDocumentoSigla || 'CC');
      } else {
        this.nombreEstudiante.set('');
        this.correoEstudiante.set('');
        this.programaEstudiante.set('');
        this.estudianteId.set(undefined);
      }
    });
  }

  /** Id del docente en sesión; undefined si no hay un id válido guardado. */
  private obtenerDocenteId(): number | undefined {
    const id = Number(localStorage.getItem('idUsuarioActivo'));
    return Number.isFinite(id) && id > 0 ? id : undefined;
  }

  onSeleccionarEstudianteDropdown(event: Event): void {
    const select = event.target as HTMLSelectElement;
    if (select && select.value) {
      this.documentoEstudiante.set(select.value);
    }
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
    if (this.guardando()) return;

    const doc = this.documentoEstudiante().trim();
    if (!doc) {
      alert('Por favor digita el número de documento de identificación del estudiante.');
      return;
    }

    const estudiante = this.estudianteAutocompletado();
    if (!estudiante) {
      alert(`No se encontró ningún estudiante con el documento "${doc}". Por favor selecciona un estudiante registrado de la lista.`);
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

    // IDs obligatorios: solicitudes_consultas los exige NOT NULL con FK a usuarios / modulos
    const docenteId = this.obtenerDocenteId();
    if (!docenteId) {
      alert('No se pudo identificar al docente en sesión. Vuelve a iniciar sesión.');
      return;
    }

    const estudianteId = this.estudianteId();
    if (!estudianteId) {
      alert('Este estudiante no tiene un id válido en la base de datos. Debe estar registrado en el sistema.');
      return;
    }

    const moduloId = this.moduloId();
    if (!moduloId) {
      alert('Selecciona un módulo válido.');
      return;
    }

    const esp = this.espacioActualObj();
    const ubicacionFinal =
      this.modalidad() === 'Virtual'
        ? 'Campus Virtual Institucional (Microsoft Teams / Google Meet)'
        : `${this.sedeSeleccionada()} - ${esp?.nombre || ''}`;

    // Payload exacto del contrato RegistroSolicitudConsultaRequestApi
    const payload: RegistroSolicitudConsultaRequestApi = {
      prioridad: this.prioridad.toUpperCase() as PrioridadSolicitudApi,
      asunto: this.tema.trim(),
      descripcion: this.descripcion.trim() || this.tema.trim(),
      fechaConsulta: this.fechaConsulta(),
      horaConsulta: this.horaConsulta(),
      docenteId,
      moduloId,
      estudianteId
    };

    this.guardando.set(true);

    this.apiPrincipal.registrarSolicitudConsulta(payload).subscribe({
      next: (creada: { id: number; numeroConsulta: string }) => {
        const finalizar = () => {
          this.guardando.set(false);
          this.dataService.sincronizarDesdeBackend();
          this.ubicacionConfirmada.set(ubicacionFinal);
          this.radicadoGenerado.set(creada.numeroConsulta);
          this.modalConfirmacionAbierto.set(true);
        };

        // El espacio físico se asigna en una llamada aparte (no va en el POST de creación)
        if (this.modalidad() === 'Presencial' && esp) {
          this.apiPrincipal.asignarRecursoFisicoSolicitud(creada.id, esp.id).subscribe({
            next: () => finalizar(),
            error: () => {
              finalizar();
              alert('La consulta se creó, pero no se pudo asignar el espacio físico.');
            }
          });
        } else {
          finalizar();
        }
      },
      error: (err: any) => {
        this.guardando.set(false);
        const detalle = err?.error?.detail;
        alert(
          detalle
            ? `No se pudo registrar la consulta: ${typeof detalle === 'string' ? detalle : JSON.stringify(detalle)}`
            : 'No se pudo registrar la consulta.'
        );
      }
    });
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