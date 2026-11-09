import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { ApiPrincipal, TipoRecursoFisicoApi } from '../../../core/services/api-principal';
import { EspaciosAux, SalonSedeItem } from '../../../core/services/espacios-aux';
import { ConfirmModal, DataTableDirective, FilterBar, PageHeader, StatusBadge } from '../../../shared';

/**
 * Gestión de Espacios Físicos (Salones/Laboratorios) sincronizada 1:1 con la tabla 'recursos_fisicos' de PostgreSQL.
 * Columnas BD:
 *  - id, sede_id, zona_id, nombre, tipo (SALON, LABORATORIO, AUDITORIO, SALA, OFICINA), estado
 */
@Component({
  selector: 'app-gestion-salones',
  standalone: true,
  imports: [CommonModule, FormsModule, DataTableDirective, ConfirmModal, FilterBar, PageHeader, StatusBadge],
  templateUrl: './gestion-salones.html',
  styleUrl: './gestion-salones.css'
})
export class GestionSalones {
  private espaciosService = inject(EspaciosAux);
  private api = inject(ApiPrincipal, { optional: true });

  salones = this.espaciosService.salones;
  sedes = this.espaciosService.sedes;
  zonas = this.espaciosService.zonas;

  readonly tiposRecurso: TipoRecursoFisicoApi[] = [
    'SALON',
    'LABORATORIO',
    'AUDITORIO',
    'SALA',
    'OFICINA'
  ];

  filtroTexto = signal<string>('');
  filtroSede = signal<string>('');
  filtroTipo = signal<string>('');

  salonesFiltrados = computed(() => {
    const q = this.filtroTexto().toLowerCase().trim();
    const sFiltro = this.filtroSede();
    const tFiltro = this.filtroTipo();

    return this.salones().filter(item => {
      const coincideTexto =
        !q ||
        item.nombre.toLowerCase().includes(q) ||
        item.sedeNombre.toLowerCase().includes(q) ||
        (item.zonaNombre || '').toLowerCase().includes(q) ||
        item.tipo.toLowerCase().includes(q);

      const coincideSede = !sFiltro || item.sedeNombre === sFiltro;
      const coincideTipo = !tFiltro || item.tipo === tFiltro;

      return coincideTexto && coincideSede && coincideTipo;
    });
  });

  totalDisponibles = computed(() => this.salones().filter(s => s.estado === 'Disponible').length);
  sedesConEspacios = computed(() => new Set(this.salones().map(s => s.sedeId)).size);

  modalAbierto = signal<boolean>(false);
  modoModal = signal<'crear' | 'editar'>('crear');
  modalEliminarAbierto = signal<boolean>(false);
  salonAEliminar = signal<SalonSedeItem | null>(null);
  mensajeFeedback = signal<string | null>(null);

  formData = {
    id: 0,
    sedeId: 0,
    zonaId: null as number | null,
    nombre: '',
    tipo: 'SALON' as TipoRecursoFisicoApi,
    estado: 'Disponible' as 'Disponible' | 'Inactivo'
  };

  zonasDeSedeSeleccionada = computed(() => {
    const sId = Number(this.formData.sedeId);
    if (!sId) return [];
    return this.zonas().filter(z => z.sedeId === sId && z.estado);
  });

  constructor() {
    this.espaciosService.sincronizarDesdeBackend();
  }

  abrirModalCrear(): void {
    this.modoModal.set('crear');
    const primeraSede = this.sedes()[0]?.id || 0;
    this.formData = {
      id: Date.now(),
      sedeId: primeraSede,
      zonaId: null,
      nombre: '',
      tipo: 'SALON',
      estado: 'Disponible'
    };
    this.modalAbierto.set(true);
  }

  abrirModalEditar(item: SalonSedeItem): void {
    this.modoModal.set('editar');
    this.formData = {
      id: item.id,
      sedeId: item.sedeId,
      zonaId: item.zonaId ?? null,
      nombre: item.nombre,
      tipo: item.tipo,
      estado: item.estado
    };
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
  }

  guardarSalon(): void {
    const nombreLimpio = this.formData.nombre.trim();
    if (!nombreLimpio) {
      alert('Por favor escribe el nombre del espacio o salón.');
      return;
    }

    const sedeId = Number(this.formData.sedeId);
    if (!sedeId) {
      alert('Por favor selecciona una sede institucional.');
      return;
    }

    const zonaId = this.formData.zonaId ? Number(this.formData.zonaId) : null;
    const tipo: TipoRecursoFisicoApi = this.formData.tipo || 'SALON';

    if (this.modoModal() === 'crear') {
      if (this.api && this.api.baseUrl) {
        this.api
          .crearRecursoFisico({
            sedeId,
            zonaId,
            nombre: nombreLimpio,
            tipo
          })
          .subscribe({
            next: () => {
              this.espaciosService.sincronizarDesdeBackend();
              this.cerrarModal();
              this.mostrarNotificacion('¡Espacio físico registrado exitosamente en la base de datos!');
            },
            error: (err) => {
              alert(this.api!.extraerMensajeError(err, 'No se pudo registrar el espacio físico.'));
            }
          });
      } else {
        const sedeObj = this.sedes().find(s => s.id === sedeId);
        const zonaObj = this.zonas().find(z => z.id === zonaId);
        this.salones.update(lista => [
          ...lista,
          {
            id: Date.now(),
            sedeId,
            sedeNombre: sedeObj ? sedeObj.nombre : 'Sede Institucional',
            zonaId,
            zonaNombre: zonaObj ? zonaObj.nombre : 'Sin zona',
            nombre: nombreLimpio,
            tipo,
            ubicacion: `${sedeObj?.nombre || 'Sede'} - ${nombreLimpio}`,
            estado: 'Disponible'
          }
        ]);
        this.cerrarModal();
        this.mostrarNotificacion('¡Espacio físico registrado exitosamente!');
      }
    } else {
      if (this.api && this.api.baseUrl) {
        this.api
          .actualizarRecursoFisico(this.formData.id, {
            sedeId,
            zonaId,
            nombre: nombreLimpio,
            tipo
          })
          .subscribe({
            next: () => {
              this.espaciosService.sincronizarDesdeBackend();
              this.cerrarModal();
              this.mostrarNotificacion('¡Espacio físico actualizado correctamente!');
            },
            error: (err) => {
              alert(this.api!.extraerMensajeError(err, 'No se pudo actualizar el espacio físico.'));
            }
          });
      } else {
        const sedeObj = this.sedes().find(s => s.id === sedeId);
        const zonaObj = this.zonas().find(z => z.id === zonaId);
        this.salones.update(lista =>
          lista.map(item =>
            item.id === this.formData.id
              ? {
                  ...item,
                  sedeId,
                  sedeNombre: sedeObj ? sedeObj.nombre : item.sedeNombre,
                  zonaId,
                  zonaNombre: zonaObj ? zonaObj.nombre : 'Sin zona',
                  nombre: nombreLimpio,
                  tipo
                }
              : item
          )
        );
        this.cerrarModal();
        this.mostrarNotificacion('¡Espacio físico actualizado correctamente!');
      }
    }
  }

  confirmarEliminar(item: SalonSedeItem): void {
    this.salonAEliminar.set(item);
    this.modalEliminarAbierto.set(true);
  }

  cerrarModalEliminar(): void {
    this.modalEliminarAbierto.set(false);
    this.salonAEliminar.set(null);
  }

  eliminarSalon(): void {
    const salon = this.salonAEliminar();
    if (!salon) return;

    if (this.api && this.api.baseUrl) {
      const nuevoEstadoActivo = salon.estado === 'Inactivo';
      const operacion$: Observable<unknown> = nuevoEstadoActivo
        ? this.api.activarRecursoFisico(salon.id)
        : this.api.desactivarRecursoFisico(salon.id);

      operacion$.subscribe({
        next: () => {
          this.espaciosService.sincronizarDesdeBackend();
          this.cerrarModalEliminar();
          this.mostrarNotificacion(
            `Espacio "${salon.nombre}" ${nuevoEstadoActivo ? 'activado' : 'inactivado'} correctamente.`
          );
        },
        error: (err: any) => {
          alert(this.api!.extraerMensajeError(err, 'No se pudo actualizar el estado del espacio.'));
        }
      });
    } else {
      this.salones.update(lista =>
        lista.map(item =>
          item.id === salon.id
            ? { ...item, estado: item.estado === 'Disponible' ? 'Inactivo' : 'Disponible' }
            : item
        )
      );
      this.cerrarModalEliminar();
      this.mostrarNotificacion(
        `Estado del espacio "${salon.nombre}" actualizado correctamente.`
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
