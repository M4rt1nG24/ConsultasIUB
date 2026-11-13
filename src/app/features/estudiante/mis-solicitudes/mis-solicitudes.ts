import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Data, ConsultaUnificada } from '../../../core/services/data';
import { EspaciosAux, SalonSedeItem } from '../../../core/services/espacios-aux';
import { DataTableDirective } from '../../../shared/directives/datatable.directive';
import { FilterBar } from '../../../shared/components/filter-bar/filter-bar';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { HORARIOS_CONSULTA, fechaMananaIso, leerStorage } from '../../../core/utils/comun';

export interface EspacioDisponibleItem extends SalonSedeItem {
  disponibleEnHorario: boolean;
}

interface DocenteOpcion {
  id: number;
  nombre: string;
  correo: string;
}

const nombreCompleto = (nombre: string, apellido?: string | null): string =>
  `${nombre} ${apellido || ''}`.trim();

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

    const idActivo = Number(leerStorage('idUsuarioActivo')) || 0;
    const correoActivo = leerStorage('correoActivo').toLowerCase().trim();
    const identificacionActiva = leerStorage('identificacionUsuarioActivo').trim();
    const nombreActivo = leerStorage('nombreUsuarioActivo').toLowerCase().trim();
    const soloPropias =
      leerStorage('rolActivo').toUpperCase().trim() === 'ESTUDIANTE' &&
      !!(idActivo || correoActivo || identificacionActiva || nombreActivo);

    return this.solicitudes().filter(item => {
      // Si el rol es ESTUDIANTE, mostrar solo las consultas del estudiante actual
      if (soloPropias) {
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
        [item.radicado, item.asignatura, item.tema, item.tutor, item.ubicacion].some(v =>
          v.toLowerCase().includes(q)
        );
      return coincideTexto && (!est || item.estado === est);
    });
  });

  modalDetalleAbierto = signal<boolean>(false);
  solicitudSeleccionada = this.dataService.consultaActiva;
  docentesDisponibles = this.dataService.docentesDisponibles;

  // Modal de edición de una solicitud existente
  modalRapidoAbierto = signal<boolean>(false);
  idEditando = signal<number | null>(null);
  nuevaAsignatura = '';
  nuevoDocenteId = signal<number>(0);
  nuevoDocente = '';

  docentesDisponiblesModal = computed<DocenteOpcion[]>(() => {
    const asig = (this.nuevaAsignatura || '').toLowerCase().trim();
    const curso = this.cursosDisponibles().find(c => c.asignatura.toLowerCase().trim() === asig);
    const usuarios = this.dataService.usuarios();
    const mapa = new Map<number, DocenteOpcion>();
    const agregar = (d: DocenteOpcion) => {
      if (d.id && !mapa.has(d.id)) mapa.set(d.id, d);
    };

    for (const d of curso?.docentesAsignados ?? []) {
      agregar({
        id: d.id,
        nombre: nombreCompleto(d.nombre, d.apellido),
        correo: usuarios.find(u => u.id === d.id)?.email || d.correo || ''
      });
    }

    const docenteCurso = curso?.docenteId ? usuarios.find(u => u.id === curso.docenteId) : undefined;
    const restoDocentes = usuarios.filter(u => u.rol === 'DOCENTE');
    for (const u of docenteCurso ? [docenteCurso, ...restoDocentes] : restoDocentes) {
      agregar({ id: u.id, nombre: nombreCompleto(u.nombre, u.apellido), correo: u.email || '' });
    }

    return Array.from(mapa.values());
  });

  nuevaPrioridad: 'Alta' | 'Media' | 'Baja' = 'Media';
  nuevoTema = '';
  nuevaDescripcion = '';
  nuevaModalidad = signal<string>('Presencial');
  nuevaSede = signal<string>('');
  nuevoEspacioId = signal<number>(0);
  nuevaFecha = signal<string>(fechaMananaIso());
  nuevaHora = signal<string>('09:00');

  horariosDisponibles = HORARIOS_CONSULTA;

  espaciosDeSede = computed<EspacioDisponibleItem[]>(() => {
    const sede = this.nuevaSede();
    const fecha = this.nuevaFecha();
    const hora = this.nuevaHora();
    const editId = this.idEditando() || undefined;

    return this.espaciosService.obtenerEspaciosPorSede(sede).map(esp => ({
      ...esp,
      disponibleEnHorario:
        esp.estado === 'Disponible' &&
        this.dataService.verificarDisponibilidadEspacio(sede, esp.nombre, fecha, hora, esp.id, editId).disponible
    }));
  });

  espacioActualObj = computed(() => {
    const id = Number(this.nuevoEspacioId());
    return this.espaciosDeSede().find(e => e.id === id) || null;
  });

  verificacionDisponibilidad = computed(() => {
    if (this.nuevaModalidad() === 'Virtual') {
      return { disponible: true, mensaje: 'Modalidad Virtual: No requiere salón físico.' };
    }

    const esp = this.espacioActualObj();
    if (!esp) {
      return { disponible: false, mensaje: 'Selecciona una sede y un espacio disponible para verificar.' };
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

  cambiarSedeModal(sede: string): void {
    this.nuevaSede.set(sede);
    this.nuevoEspacioId.set(this.espaciosService.obtenerEspaciosPorSede(sede)[0]?.id || 0);
  }

  abrirDetalle(item: ConsultaUnificada): void {
    this.dataService.seleccionarConsulta(item.id);
    this.modalDetalleAbierto.set(true);
  }

  cerrarDetalle(): void {
    this.modalDetalleAbierto.set(false);
  }

  /** Botón "+ Nueva Consulta": lleva al formulario completo de creación. */
  irACrearConsulta(): void {
    this.router.navigate(['/estudiante/crear']);
  }

  abrirModalEditar(item: ConsultaUnificada): void {
    this.idEditando.set(item.id);
    this.nuevaAsignatura = item.asignatura;
    this.nuevoDocenteId.set(item.docenteId || 0);
    this.nuevoDocente = item.tutor || '';
    this.nuevaPrioridad = item.prioridad || 'Media';
    this.nuevoTema = item.tema;
    this.nuevaDescripcion = item.descripcion || '';
    this.nuevaModalidad.set(item.modalidad === 'Virtual' ? 'Virtual' : 'Presencial');
    if (item.fechaConsulta) this.nuevaFecha.set(item.fechaConsulta.substring(0, 10));
    if (item.horaConsulta) this.nuevaHora.set(item.horaConsulta.substring(0, 5));
    this.modalRapidoAbierto.set(true);
  }

  cambiarEstadoSolicitud(item: ConsultaUnificada): void {
    const cancelar = item.estado !== 'Cancelada';
    this.dataService.cambiarEstadoConsulta(
      item.id,
      cancelar ? 'Cancelada' : 'Pendiente',
      cancelar
        ? 'Solicitud cancelada (inactivada) por el estudiante.'
        : 'Solicitud reactivada por el estudiante.'
    );
  }

  cerrarModalRapido(): void {
    this.modalRapidoAbierto.set(false);
  }

  guardarSolicitudRapida(): void {
    const id = this.idEditando();
    if (id === null) return;

    const tema = this.nuevoTema.trim();
    if (!tema) {
      alert('Por favor especifica el tema o duda académica.');
      return;
    }

    const presencial = this.nuevaModalidad() === 'Presencial';
    const itemActual = this.solicitudes().find(c => c.id === id);
    const fecha = this.nuevaFecha();
    const hora = this.nuevaHora();
    const docObj = this.docentesDisponiblesModal().find(d => d.id === Number(this.nuevoDocenteId()));

    this.dataService.actualizarConsulta(id, {
      asignatura: this.nuevaAsignatura,
      tutor: docObj?.nombre || this.nuevoDocente || 'Docente Tutor',
      prioridad: this.nuevaPrioridad,
      tema,
      descripcion: this.nuevaDescripcion.trim() || tema,
      modalidad: this.nuevaModalidad(),
      ubicacion: presencial
        ? (itemActual?.ubicacion && !itemActual.ubicacion.includes('asignar')
            ? itemActual.ubicacion
            : 'Pendiente de asignación por el docente')
        : 'Campus Virtual Institucional',
      recursoFisicoId: presencial ? (itemActual?.recursoFisicoId || null) : null,
      fechaConsulta: fecha,
      horaConsulta: `${hora}:00`,
      fecha: `${fecha} • ${hora}`,
      franja: this.horariosDisponibles.find(h => h.valor === hora)?.etiqueta || hora
    });
    this.modalRapidoAbierto.set(false);
    alert('¡Solicitud actualizada correctamente!');
  }

  verFichaCompleta(item: ConsultaUnificada): void {
    this.dataService.seleccionarConsulta(item.id);
    this.cerrarDetalle();
    this.router.navigate(['/estudiante/detalle']);
  }
}
