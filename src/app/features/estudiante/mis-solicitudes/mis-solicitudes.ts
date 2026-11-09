import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Data, ConsultaUnificada } from '../../../core/services/data';
import { EspaciosAux, SalonSedeItem } from '../../../core/services/espacios-aux';
import { DataTableDirective } from '../../../shared/directives/datatable.directive';
import { FilterBar } from '../../../shared/components/filter-bar/filter-bar';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';

export interface EspacioDisponibleItem extends SalonSedeItem {
  disponibleEnHorario: boolean;
}

@Component({
  imports: [CommonModule, FormsModule, DataTableDirective, FilterBar, StatusBadge],
  selector: 'app-mis-solicitudes',
  styleUrl: './mis-solicitudes.css',
  templateUrl: './mis-solicitudes.html',
})
export class MisSolicitudes implements OnInit {
  private router = inject(Router);
  private dataService = inject(Data);
  private espaciosService = inject(EspaciosAux);

  busqueda = signal<string>('');
  filtroEstado = signal<string>('');

  // Lista reactiva compartida con Docente y Administrador
  solicitudes = this.dataService.consultas;
  cursosDisponibles = this.dataService.cursos;
  sedesDisponibles = computed(() => this.espaciosService.obtenerSedesActivas());

  ngOnInit(): void {
    this.dataService.sincronizarDesdeBackend();
  }

  solicitudesFiltradas = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    const est = this.filtroEstado();

    const idActivo = typeof localStorage !== 'undefined'
      ? Number(localStorage.getItem('idUsuarioActivo')) || 0
      : 0;
    const correoActivo = typeof localStorage !== 'undefined'
      ? (localStorage.getItem('correoActivo') || '').toLowerCase().trim()
      : '';
    const identificacionActiva = typeof localStorage !== 'undefined'
      ? (localStorage.getItem('identificacionUsuarioActivo') || '').trim()
      : '';
    const nombreActivo = typeof localStorage !== 'undefined'
      ? (localStorage.getItem('nombreUsuarioActivo') || '').toLowerCase().trim()
      : '';
    const rolActivo = typeof localStorage !== 'undefined'
      ? (localStorage.getItem('rolActivo') || '').toUpperCase().trim()
      : '';

    return this.solicitudes().filter(item => {
      // Si el rol es ESTUDIANTE, mostrar solo las consultas del estudiante actual
      if (rolActivo === 'ESTUDIANTE' && (idActivo || correoActivo || identificacionActiva || nombreActivo)) {
        const esPropia =
          (idActivo > 0 && item.estudianteId === idActivo) ||
          (correoActivo && item.correoEstudiante?.toLowerCase() === correoActivo) ||
          (identificacionActiva && item.documento === identificacionActiva) ||
          (nombreActivo && item.estudiante?.toLowerCase() === nombreActivo) ||
          (!item.estudianteId && !item.documento);

        if (!esPropia) return false;
      }

      const coincideTexto =
        !q ||
        item.radicado.toLowerCase().includes(q) ||
        item.asignatura.toLowerCase().includes(q) ||
        item.tema.toLowerCase().includes(q) ||
        item.tutor.toLowerCase().includes(q) ||
        item.ubicacion.toLowerCase().includes(q);
      const coincideEstado = !est || item.estado === est;
      return coincideTexto && coincideEstado;
    });
  });

  modalDetalleAbierto = signal<boolean>(false);
  solicitudSeleccionada = this.dataService.consultaActiva;
  docentesDisponibles = this.dataService.docentesDisponibles;

  modalRapidoAbierto = signal<boolean>(false);
  modoModalRapido = signal<'crear' | 'editar'>('crear');
  idEditando = signal<number | null>(null);
  nuevaAsignatura = '';
  nuevoDocenteId = signal<number>(0);
  nuevoDocente = '';

  docentesDisponiblesModal = computed(() => {
    const asig = (this.nuevaAsignatura || '').toLowerCase().trim();
    const curso = this.cursosDisponibles().find(c => c.asignatura.toLowerCase().trim() === asig);
    const mapa = new Map<number, { id: number; nombre: string; correo: string }>();

    if (curso?.docentesAsignados && curso.docentesAsignados.length > 0) {
      for (const d of curso.docentesAsignados) {
        if (d.id) {
          const uDoc = this.dataService.usuarios().find(u => u.id === d.id);
          mapa.set(d.id, {
            id: d.id,
            nombre: `${d.nombre} ${d.apellido || ''}`.trim(),
            correo: uDoc?.email || d.correo || ''
          });
        }
      }
    }

    if (curso?.docenteId && !mapa.has(curso.docenteId)) {
      const uDoc = this.dataService.usuarios().find(u => u.id === curso.docenteId);
      if (uDoc) {
        mapa.set(uDoc.id, {
          id: uDoc.id,
          nombre: `${uDoc.nombre} ${uDoc.apellido || ''}`.trim(),
          correo: uDoc.email || ''
        });
      }
    }

    const docentesUsuarios = this.dataService.usuarios().filter(u => u.rol === 'DOCENTE');
    for (const u of docentesUsuarios) {
      if (u.id && !mapa.has(u.id)) {
        mapa.set(u.id, {
          id: u.id,
          nombre: `${u.nombre} ${u.apellido || ''}`.trim(),
          correo: u.email || ''
        });
      }
    }

    return Array.from(mapa.values());
  });

  nuevaPrioridad: 'Alta' | 'Media' | 'Baja' = 'Media';
  nuevoTema = '';
  nuevaDescripcion = '';
  nuevaModalidad = signal<string>('Presencial');
  nuevaSede = signal<string>('');
  nuevoEspacioId = signal<number>(0);
  nuevaFecha = signal<string>(this.obtenerMananaIso());
  nuevaHora = signal<string>('09:00');

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

  espaciosDeSede = computed<EspacioDisponibleItem[]>(() => {
    const sede = this.nuevaSede();
    const fecha = this.nuevaFecha();
    const hora = this.nuevaHora();
    const editId = this.idEditando() || undefined;
    const lista = this.espaciosService.obtenerEspaciosPorSede(sede);

    return lista.map(esp => {
      const check = this.dataService.verificarDisponibilidadEspacio(
        sede,
        esp.nombre,
        fecha,
        hora,
        esp.id,
        editId
      );
      return {
        ...esp,
        disponibleEnHorario: esp.estado === 'Disponible' && check.disponible
      };
    });
  });

  espacioActualObj = computed(() => {
    const id = Number(this.nuevoEspacioId());
    return this.espaciosDeSede().find(e => e.id === id) || null;
  });

  verificacionDisponibilidad = computed(() => {
    if (this.nuevaModalidad() === 'Virtual') {
      return {
        disponible: true,
        mensaje: 'Modalidad Virtual: No requiere salón físico.'
      };
    }

    const esp = this.espacioActualObj();
    if (!esp) {
      return {
        disponible: false,
        mensaje: 'Selecciona una sede y un espacio disponible para verificar.'
      };
    }

    return this.dataService.verificarDisponibilidadEspacio(
      this.nuevaSede(),
      esp.nombre,
      this.nuevaFecha(),
      this.nuevaHora(),
      esp.id,
      this.idEditando() || undefined
    );
  });

  constructor() {
    if (this.espaciosService.sedes().length === 0) {
      this.espaciosService.sincronizarDesdeBackend();
    }

    effect(() => {
      const cursos = this.cursosDisponibles();
      if (cursos.length > 0 && !this.nuevaAsignatura) {
        this.nuevaAsignatura = cursos[0].asignatura;
      }
    });

    effect(() => {
      const sedes = this.sedesDisponibles();
      if (sedes.length > 0 && !this.nuevaSede()) {
        this.nuevaSede.set(sedes[0].nombre);
      }
    });

    effect(() => {
      const espacios = this.espaciosDeSede();
      const actualId = Number(this.nuevoEspacioId());
      if (espacios.length > 0 && !espacios.some(e => e.id === actualId)) {
        const primeroLibre = espacios.find(e => e.disponibleEnHorario) || espacios[0];
        this.nuevoEspacioId.set(primeroLibre.id);
      }
    });
  }

  private obtenerMananaIso(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  cambiarSedeModal(sede: string): void {
    this.nuevaSede.set(sede);
    const espacios = this.espaciosService.obtenerEspaciosPorSede(sede);
    this.nuevoEspacioId.set(espacios[0]?.id || 0);
  }

  abrirDetalle(item: ConsultaUnificada): void {
    this.dataService.seleccionarConsulta(item.id);
    this.modalDetalleAbierto.set(true);
  }

  cerrarDetalle(): void {
    this.modalDetalleAbierto.set(false);
  }

  abrirModalRapido(): void {
    this.modoModalRapido.set('crear');
    this.idEditando.set(null);
    const primerCurso = this.cursosDisponibles()[0]?.asignatura || '';
    this.nuevaAsignatura = primerCurso;
    const primerDoc = this.docentesDisponiblesModal()[0];
    this.nuevoDocenteId.set(primerDoc?.id || 0);
    this.nuevoDocente = primerDoc?.nombre || '';
    this.nuevaPrioridad = 'Media';
    this.nuevoTema = '';
    this.nuevaDescripcion = '';
    this.nuevaModalidad.set('Presencial');
    this.nuevaFecha.set(this.obtenerMananaIso());
    this.nuevaHora.set('09:00');
    const primeraSede = this.sedesDisponibles()[0]?.nombre || '';
    if (primeraSede) {
      this.cambiarSedeModal(primeraSede);
    }
    this.modalRapidoAbierto.set(true);
  }

  abrirModalEditar(item: ConsultaUnificada): void {
    this.modoModalRapido.set('editar');
    this.idEditando.set(item.id);
    this.nuevaAsignatura = item.asignatura;
    this.nuevoDocenteId.set(item.docenteId || 0);
    this.nuevoDocente = item.tutor || '';
    this.nuevaPrioridad = item.prioridad || 'Media';
    this.nuevoTema = item.tema;
    this.nuevaDescripcion = item.descripcion || '';
    this.nuevaModalidad.set(item.modalidad === 'Virtual' ? 'Virtual' : 'Presencial');
    if (item.fechaConsulta) {
      this.nuevaFecha.set(item.fechaConsulta.substring(0, 10));
    }
    if (item.horaConsulta) {
      this.nuevaHora.set(item.horaConsulta.substring(0, 5));
    }
    this.modalRapidoAbierto.set(true);
  }

  cambiarEstadoSolicitud(item: ConsultaUnificada): void {
    const nuevoEstado = item.estado === 'Cancelada' ? 'Pendiente' : 'Cancelada';
    this.dataService.cambiarEstadoConsulta(
      item.id,
      nuevoEstado,
      nuevoEstado === 'Cancelada'
        ? 'Solicitud cancelada (inactivada) por el estudiante.'
        : 'Solicitud reactivada por el estudiante.'
    );
  }

  cerrarModalRapido(): void {
    this.modalRapidoAbierto.set(false);
  }

  guardarSolicitudRapida(): void {
    if (!this.nuevoTema.trim()) {
      alert('Por favor especifica el tema o duda académica.');
      return;
    }

    const estadoEspacio = this.verificacionDisponibilidad();
    if (this.nuevaModalidad() === 'Presencial' && !estadoEspacio.disponible) {
      alert(estadoEspacio.mensaje);
      return;
    }

    const esp = this.espacioActualObj();
    const ubicacionFinal =
      this.nuevaModalidad() === 'Virtual'
        ? 'Campus Virtual Institucional'
        : `${this.nuevaSede()} - ${esp?.nombre || ''}`;
    const horarioObj = this.horariosDisponibles.find(h => h.valor === this.nuevaHora());

    const idDoc = Number(this.nuevoDocenteId());
    const docObj = this.docentesDisponiblesModal().find(d => d.id === idDoc);
    const tutorFinal = docObj?.nombre || this.nuevoDocente || 'Docente Tutor';
    const cursoMatch = this.cursosDisponibles().find(
      c => c.asignatura.toLowerCase().trim() === this.nuevaAsignatura.toLowerCase().trim()
    );

    if (this.modoModalRapido() === 'editar' && this.idEditando() !== null) {
      this.dataService.actualizarConsulta(this.idEditando()!, {
        asignatura: this.nuevaAsignatura,
        tutor: tutorFinal,
        prioridad: this.nuevaPrioridad,
        tema: this.nuevoTema.trim(),
        descripcion: this.nuevaDescripcion.trim() || this.nuevoTema.trim(),
        modalidad: this.nuevaModalidad(),
        ubicacion: ubicacionFinal,
        recursoFisicoId: this.nuevaModalidad() === 'Presencial' ? esp?.id || null : null,
        fechaConsulta: this.nuevaFecha(),
        horaConsulta: `${this.nuevaHora()}:00`,
        fecha: `${this.nuevaFecha()} • ${this.nuevaHora()}`,
        franja: horarioObj?.etiqueta || this.nuevaHora()
      });
      this.modalRapidoAbierto.set(false);
      alert('¡Solicitud actualizada correctamente!');
      return;
    }

    if (!idDoc || idDoc <= 0) {
      alert('Por favor selecciona el docente tutor destinatario.');
      return;
    }

    const nuevoItem = this.dataService.crearConsulta({
      asignatura: this.nuevaAsignatura,
      tutor: tutorFinal,
      docenteId: idDoc,
      moduloId: cursoMatch?.id,
      prioridad: this.nuevaPrioridad,
      tema: this.nuevoTema.trim(),
      descripcion: this.nuevaDescripcion.trim() || this.nuevoTema.trim(),
      modalidad: this.nuevaModalidad(),
      franja: horarioObj?.etiqueta || this.nuevaHora(),
      fecha: this.nuevaFecha(),
      hora: this.nuevaHora(),
      ubicacion: ubicacionFinal,
      recursoFisicoId: this.nuevaModalidad() === 'Presencial' ? esp?.id || null : null
    });

    this.nuevoTema = '';
    this.nuevaDescripcion = '';
    this.modalRapidoAbierto.set(false);
    alert(`¡Solicitud radicada con éxito!\nRadicado: ${nuevoItem.radicado}\nLugar: ${ubicacionFinal}`);
  }

  irAFormularioCompleto(): void {
    this.modalRapidoAbierto.set(false);
    this.router.navigate(['/estudiante/crear']);
  }

  verFichaCompleta(item: ConsultaUnificada): void {
    this.dataService.seleccionarConsulta(item.id);
    this.cerrarDetalle();
    this.router.navigate(['/estudiante/detalle']);
  }
}
