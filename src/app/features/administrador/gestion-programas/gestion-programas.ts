import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiPrincipal, ProgAcademicoResponseApi } from '../../../core/services/api-principal';
import { Data } from '../../../core/services/data';
import { ConfirmModal, DataTableDirective, FilterBar, PageHeader, StatusBadge } from '../../../shared';

/**
 * CRUD de Programas Académicos (/programas) para el rol ADMINISTRADOR.
 * - GET    /programas          → listar (solo activos, según el backend)
 * - POST   /programas          → crear  { nombre } (4..100 caracteres)
 * - PUT    /programas/{id}     → actualizar { nombre }
 * - DELETE /programas/{id}     → inactivar (borrado lógico estado = false)
 */
@Component({
  selector: 'app-gestion-programas',
  standalone: true,
  imports: [CommonModule, FormsModule, DataTableDirective, ConfirmModal, FilterBar, PageHeader, StatusBadge],
  templateUrl: './gestion-programas.html',
  styleUrl: './gestion-programas.css'
})
export class GestionProgramas {
  private api = inject(ApiPrincipal, { optional: true });
  private dataService = inject(Data);

  programas = this.dataService.programas;
  cargando = signal<boolean>(false);
  guardando = signal<boolean>(false);

  filtroTexto = signal<string>('');

  programasFiltrados = computed(() => {
    const q = this.filtroTexto().toLowerCase().trim();
    return this.programas().filter(
      (p) => !q || p.nombre.toLowerCase().includes(q)
    );
  });

  totalProgramas = computed(() => this.programas().length);
  totalEstudiantesConPrograma = computed(
    () => this.dataService.usuarios().filter((u) => u.rol === 'ESTUDIANTE' && !!u.programaId).length
  );

  modalAbierto = signal<boolean>(false);
  modoModal = signal<'crear' | 'editar'>('crear');
  idEditando = signal<number | null>(null);
  nombrePrograma = '';
  errorFormulario = signal<string>('');

  modalEliminarAbierto = signal<boolean>(false);
  programaAEliminar = signal<ProgAcademicoResponseApi | null>(null);

  mensajeFeedback = signal<string>('');

  constructor() {
    this.cargarProgramas();
  }

  cargarProgramas(): void {
    if (!this.api || !this.api.baseUrl) return;
    this.cargando.set(true);
    this.api.listarProgramas().subscribe({
      next: (lista) => {
        this.programas.set(lista || []);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.mostrarFeedback(this.api!.extraerMensajeError(err, 'No se pudieron cargar los programas.'));
      }
    });
  }

  contarUsuarios(programaId: number): number {
    return this.dataService.usuarios().filter((u) => u.programaId === programaId).length;
  }

  abrirModalCrear(): void {
    this.modoModal.set('crear');
    this.idEditando.set(null);
    this.nombrePrograma = '';
    this.errorFormulario.set('');
    this.modalAbierto.set(true);
  }

  abrirModalEditar(p: ProgAcademicoResponseApi): void {
    this.modoModal.set('editar');
    this.idEditando.set(p.id);
    this.nombrePrograma = p.nombre;
    this.errorFormulario.set('');
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
  }

  guardarPrograma(): void {
    const nombre = this.nombrePrograma.trim().replace(/\s+/g, ' ');
    if (nombre.length < 4 || nombre.length > 100) {
      this.errorFormulario.set('El nombre del programa debe tener entre 4 y 100 caracteres.');
      return;
    }
    const duplicado = this.programas().some(
      (p) => p.nombre.toLowerCase() === nombre.toLowerCase() && p.id !== this.idEditando()
    );
    if (duplicado) {
      this.errorFormulario.set('Ya existe un programa académico con ese nombre.');
      return;
    }
    if (!this.api || !this.api.baseUrl) return;

    this.guardando.set(true);
    const id = this.idEditando();
    const peticion$ =
      this.modoModal() === 'editar' && id !== null
        ? this.api.actualizarPrograma(id, nombre)
        : this.api.crearPrograma(nombre);

    peticion$.subscribe({
      next: (guardado) => {
        this.guardando.set(false);
        if (this.modoModal() === 'editar') {
          this.programas.update((lista) => lista.map((p) => (p.id === guardado.id ? guardado : p)));
          this.mostrarFeedback(`Programa "${guardado.nombre}" actualizado correctamente.`);
        } else {
          this.programas.update((lista) => [...lista, guardado]);
          this.mostrarFeedback(`Programa "${guardado.nombre}" registrado correctamente.`);
        }
        this.modalAbierto.set(false);
        this.cargarProgramas();
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorFormulario.set(
          this.api!.extraerMensajeError(err, 'No se pudo guardar el programa en la base de datos.')
        );
      }
    });
  }

  confirmarEliminar(p: ProgAcademicoResponseApi): void {
    this.programaAEliminar.set(p);
    this.modalEliminarAbierto.set(true);
  }

  cerrarModalEliminar(): void {
    this.modalEliminarAbierto.set(false);
    this.programaAEliminar.set(null);
  }

  eliminarPrograma(): void {
    const p = this.programaAEliminar();
    if (!p || !this.api || !this.api.baseUrl) return;

    this.api.eliminarPrograma(p.id).subscribe({
      next: () => {
        this.programas.update((lista) => lista.filter((x) => x.id !== p.id));
        this.mostrarFeedback(`Programa "${p.nombre}" inactivado correctamente.`);
        this.cerrarModalEliminar();
      },
      error: (err) => {
        this.cerrarModalEliminar();
        alert(this.api!.extraerMensajeError(err, 'No se pudo inactivar el programa.'));
      }
    });
  }

  private mostrarFeedback(msg: string): void {
    this.mensajeFeedback.set(msg);
    setTimeout(() => this.mensajeFeedback.set(''), 3500);
  }
}

