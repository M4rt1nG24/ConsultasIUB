import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, catchError, of, switchMap } from 'rxjs';
import { ApiPrincipal, TipoEstructuraApi } from '../../../core/services/api-principal';
import { EspaciosAux, SedeItem } from '../../../core/services/espacios-aux';
import { ConfirmModal, DataTableDirective, FilterBar, PageHeader, StatusBadge } from '../../../shared';

/**
 * Gestión de Sedes Institucionales conectada 1:1 con la tabla 'sedes' y 'zonas' de PostgreSQL.
 * Columnas BD:
 *  - sedes: id, nombre, tipo_estructura (BLOQUES, SALONES, PISOS), estado
 *  - zonas: id, sede_id, nombre, estado
 */
@Component({
  selector: 'app-gestion-sedes',
  standalone: true,
  imports: [CommonModule, FormsModule, DataTableDirective, ConfirmModal, FilterBar, PageHeader, StatusBadge],
  templateUrl: './gestion-sedes.html',
  styleUrl: './gestion-sedes.css'
})
export class GestionSedes {
  private espaciosService = inject(EspaciosAux);
  private api = inject(ApiPrincipal, { optional: true });

  sedes = this.espaciosService.sedes;

  constructor() {
    this.espaciosService.sincronizarDesdeBackend();
  }

  filtroTexto = signal<string>('');
  filtroEstado = signal<string>('');

  sedesFiltradas = computed(() => {
    const q = this.filtroTexto().toLowerCase().trim();
    const est = this.filtroEstado();

    return this.sedes().filter(s => {
      const coincideTexto =
        !q ||
        s.nombre.toLowerCase().includes(q) ||
        s.tipoEstructura.toLowerCase().includes(q);

      const coincideEstado = !est || s.estado === est;
      return coincideTexto && coincideEstado;
    });
  });

  totalActivas = computed(() => this.sedes().filter(s => s.estado === 'Activa').length);
  totalEspacios = computed(() => this.sedes().reduce((acc, s) => acc + Number(s.totalRecursos || 0), 0));

  modalAbierto = signal<boolean>(false);
  modoModal = signal<'crear' | 'editar'>('crear');
  modalEliminarAbierto = signal<boolean>(false);
  sedeAEliminar = signal<SedeItem | null>(null);
  mensajeFeedback = signal<string | null>(null);

  formData = {
    id: 0,
    nombre: '',
    tipoEstructura: 'BLOQUES' as TipoEstructuraApi,
    zonaInicial: '',
    estado: 'Activa' as 'Activa' | 'Inactiva'
  };

  abrirModalCrear(): void {
    this.modoModal.set('crear');
    this.formData = {
      id: Date.now(),
      nombre: '',
      tipoEstructura: 'BLOQUES',
      zonaInicial: '',
      estado: 'Activa'
    };
    this.modalAbierto.set(true);
  }

  abrirModalEditar(sede: SedeItem): void {
    this.modoModal.set('editar');
    this.formData = {
      id: sede.id,
      nombre: sede.nombre,
      tipoEstructura: sede.tipoEstructura || 'BLOQUES',
      zonaInicial: '',
      estado: sede.estado
    };
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
  }

  guardarSede(): void {
    const nombreLimpio = this.formData.nombre.trim();
    if (nombreLimpio.length < 3) {
      alert('El nombre de la sede debe tener al menos 3 caracteres.');
      return;
    }

    const tipoEstructura: TipoEstructuraApi = this.formData.tipoEstructura || 'BLOQUES';
    const zonaInicial = (this.formData.zonaInicial || '').trim();

    if (this.modoModal() === 'crear') {
      if (this.api && this.api.baseUrl) {
        this.api
          .crearSede({
            nombre: nombreLimpio,
            tipoEstructura
          })
          .pipe(
            switchMap((sedeCreada) => {
              if (sedeCreada?.id && zonaInicial.length >= 2) {
                return this.api!
                  .crearZona({
                    sedeId: sedeCreada.id,
                    nombre: zonaInicial.substring(0, 100)
                  })
                  .pipe(catchError(() => of(null)));
              }
              return of(null);
            })
          )
          .subscribe({
            next: () => {
              this.espaciosService.sincronizarDesdeBackend();
              this.cerrarModal();
              this.mostrarNotificacion('¡Sede institucional registrada exitosamente en la base de datos!');
            },
            error: (err) => {
              alert(this.api!.extraerMensajeError(err, 'No se pudo registrar la sede en la base de datos.'));
            }
          });
      } else {
        this.espaciosService.sedes.update(lista => [
          ...lista,
          {
            id: Date.now(),
            nombre: nombreLimpio,
            tipoEstructura,
            estado: 'Activa',
            totalZonas: zonaInicial ? 1 : 0,
            totalRecursos: 0
          }
        ]);
        this.cerrarModal();
        this.mostrarNotificacion('¡Sede registrada exitosamente!');
      }
    } else {
      if (this.api && this.api.baseUrl) {
        this.api
          .actualizarSede(this.formData.id, {
            nombre: nombreLimpio,
            tipoEstructura
          })
          .subscribe({
            next: () => {
              this.espaciosService.sincronizarDesdeBackend();
              this.cerrarModal();
              this.mostrarNotificacion('¡Información de la sede actualizada correctamente!');
            },
            error: (err) => {
              alert(this.api!.extraerMensajeError(err, 'No se pudo actualizar la sede en la base de datos.'));
            }
          });
      } else {
        this.espaciosService.sedes.update(lista =>
          lista.map(s =>
            s.id === this.formData.id
              ? { ...s, nombre: nombreLimpio, tipoEstructura }
              : s
          )
        );
        this.cerrarModal();
        this.mostrarNotificacion('¡Sede actualizada correctamente!');
      }
    }
  }

  confirmarEliminar(sede: SedeItem): void {
    this.sedeAEliminar.set(sede);
    this.modalEliminarAbierto.set(true);
  }

  cerrarModalEliminar(): void {
    this.modalEliminarAbierto.set(false);
    this.sedeAEliminar.set(null);
  }

  eliminarSede(): void {
    const sede = this.sedeAEliminar();
    if (!sede) return;

    if (this.api && this.api.baseUrl) {
      const nuevoEstadoActivo = sede.estado === 'Inactiva';
      const operacion$: Observable<unknown> = nuevoEstadoActivo
        ? this.api.activarSede(sede.id)
        : this.api.desactivarSede(sede.id);

      operacion$.subscribe({
        next: () => {
          this.espaciosService.sincronizarDesdeBackend();
          this.cerrarModalEliminar();
          this.mostrarNotificacion(
            `Sede "${sede.nombre}" ${nuevoEstadoActivo ? 'activada' : 'inactivada'} correctamente.`
          );
        },
        error: (err: any) => {
          alert(this.api!.extraerMensajeError(err, 'No se pudo actualizar el estado de la sede.'));
        }
      });
    } else {
      this.espaciosService.sedes.update(lista =>
        lista.map(s =>
          s.id === sede.id
            ? { ...s, estado: s.estado === 'Activa' ? 'Inactiva' : 'Activa' }
            : s
        )
      );
      this.cerrarModalEliminar();
      this.mostrarNotificacion(
        `Estado de la sede "${sede.nombre}" actualizado correctamente.`
      );
    }
  }

  private mostrarNotificacion(mensaje: string): void {
    this.mensajeFeedback.set(mensaje);
    setTimeout(() => {
      this.mensajeFeedback.set(null);
    }, 3500);
  }
}
