import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiPrincipal, DisponibilidadResponseApi } from '../../../core/services/api-principal';
import { Auth } from '../../../core/services/auth';
import { Data } from '../../../core/services/data';
import { ConfirmModal, DataTableDirective, FilterBar, PageHeader, StatusBadge } from '../../../shared';

const NOMBRES_DIAS: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo'
};

@Component({
  selector: 'app-disponibilidad-docente',
  standalone: true,
  imports: [CommonModule, FormsModule, DataTableDirective, ConfirmModal, FilterBar, PageHeader, StatusBadge],
  templateUrl: './disponibilidad-docente.html',
  styleUrl: './disponibilidad-docente.css'
})
export class DisponibilidadDocente {
  private api = inject(ApiPrincipal, { optional: true });
  private auth = inject(Auth);
  private dataService = inject(Data);

  franjas = signal<DisponibilidadResponseApi[]>([]);
  cargando = signal<boolean>(false);
  guardando = signal<boolean>(false);

  filtroTexto = signal<string>('');
  filtroEstado = signal<string>('');

  readonly diasSemana = [
    { valor: 1, etiqueta: 'Lunes' },
    { valor: 2, etiqueta: 'Martes' },
    { valor: 3, etiqueta: 'Miércoles' },
    { valor: 4, etiqueta: 'Jueves' },
    { valor: 5, etiqueta: 'Viernes' },
    { valor: 6, etiqueta: 'Sábado' },
    { valor: 7, etiqueta: 'Domingo' }
  ];

  franjasFiltradas = computed(() => {
    const q = this.filtroTexto().toLowerCase().trim();
    const est = this.filtroEstado();

    return this.franjas().filter((f) => {
      const nombreDia = this.obtenerNombreDia(f.diaSemana).toLowerCase();
      const coincideTexto =
        !q ||
        nombreDia.includes(q) ||
        (f.nombreDocente || '').toLowerCase().includes(q) ||
        (f.horaInicio || '').includes(q) ||
        (f.horaFin || '').includes(q);
      const estadoTexto = f.estado ? 'Activa' : 'Inactiva';
      const coincideEstado = !est || estadoTexto === est;
      return coincideTexto && coincideEstado;
    });
  });

  totalActivas = computed(() => this.franjas().filter((f) => f.estado).length);
  totalInactivas = computed(() => this.franjas().filter((f) => !f.estado).length);

  modalAbierto = signal<boolean>(false);
  modoModal = signal<'crear' | 'editar'>('crear');
  idEditando = signal<number | null>(null);
  diaSemanaForm = 1;
  horaInicioForm = '08:00';
  horaFinForm = '12:00';
  errorFormulario = signal<string>('');

  modalEliminarAbierto = signal<boolean>(false);
  franjaAEliminar = signal<DisponibilidadResponseApi | null>(null);
  mensajeFeedback = signal<string>('');

  constructor() {
    this.cargarDisponibilidad();
  }

  obtenerNombreDia(dia: number): string {
    return NOMBRES_DIAS[dia] || 'Lunes';
  }

  cargarDisponibilidad(): void {
    if (!this.api || !this.api.baseUrl) return;
    const idDocente = this.auth.usuarioIdActivo() || undefined;
    this.cargando.set(true);
    this.api.listarDisponibilidadDocente(idDocente, true).subscribe({
      next: (lista) => {
        this.franjas.set(lista || []);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
      }
    });
  }

  abrirModalCrear(): void {
    this.modoModal.set('crear');
    this.idEditando.set(null);
    this.diaSemanaForm = 1;
    this.horaInicioForm = '08:00';
    this.horaFinForm = '12:00';
    this.errorFormulario.set('');
    this.modalAbierto.set(true);
  }

  abrirModalEditar(f: DisponibilidadResponseApi): void {
    this.modoModal.set('editar');
    this.idEditando.set(f.id);
    this.diaSemanaForm = f.diaSemana;
    this.horaInicioForm = (f.horaInicio || '08:00').substring(0, 5);
    this.horaFinForm = (f.horaFin || '12:00').substring(0, 5);
    this.errorFormulario.set('');
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
  }

  guardarFranja(): void {
    const inicio = this.horaInicioForm.trim();
    const fin = this.horaFinForm.trim();
    if (!inicio || !fin || inicio >= fin) {
      this.errorFormulario.set('La hora de inicio debe ser menor que la hora de finalización.');
      return;
    }
    if (!this.api || !this.api.baseUrl) return;

    const horaInicioApi = inicio.length === 5 ? `${inicio}:00` : inicio;
    const horaFinApi = fin.length === 5 ? `${fin}:00` : fin;
    const idDocente = this.auth.usuarioIdActivo() || null;

    this.guardando.set(true);
    const idEdit = this.idEditando();

    const peticion$ =
      this.modoModal() === 'editar' && idEdit !== null
        ? this.api.actualizarDisponibilidadDocente(idEdit, {
            diaSemana: Number(this.diaSemanaForm),
            horaInicio: horaInicioApi,
            horaFin: horaFinApi
          })
        : this.api.crearDisponibilidadDocente({
            docenteId: idDocente,
            diaSemana: Number(this.diaSemanaForm),
            horaInicio: horaInicioApi,
            horaFin: horaFinApi
          });

    peticion$.subscribe({
      next: () => {
        this.guardando.set(false);
        this.modalAbierto.set(false);
        this.cargarDisponibilidad();
        this.dataService.sincronizarDesdeBackend();
        this.mostrarFeedback(
          this.modoModal() === 'editar'
            ? 'Franja de disponibilidad actualizada en la base de datos.'
            : 'Nueva franja de disponibilidad registrada en la base de datos.'
        );
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorFormulario.set(
          this.api!.extraerMensajeError(
            err,
            'No se pudo guardar la franja de disponibilidad.'
          )
        );
      }
    });
  }

  confirmarInactivar(f: DisponibilidadResponseApi): void {
    this.franjaAEliminar.set(f);
    this.modalEliminarAbierto.set(true);
  }

  cerrarModalEliminar(): void {
    this.modalEliminarAbierto.set(false);
    this.franjaAEliminar.set(null);
  }

  inactivarFranja(): void {
    const f = this.franjaAEliminar();
    if (!f || !this.api || !this.api.baseUrl) return;

    this.api.eliminarDisponibilidadDocente(f.id).subscribe({
      next: () => {
        this.cerrarModalEliminar();
        this.cargarDisponibilidad();
        this.dataService.sincronizarDesdeBackend();
        this.mostrarFeedback('Estado de la franja cambiado a Inactiva en la base de datos.');
      },
      error: (err) => {
        this.cerrarModalEliminar();
        alert(this.api!.extraerMensajeError(err, 'No se pudo cambiar el estado de la franja.'));
      }
    });
  }

  private mostrarFeedback(msg: string): void {
    this.mensajeFeedback.set(msg);
    setTimeout(() => this.mensajeFeedback.set(''), 3500);
  }
}

