import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, of, switchMap } from 'rxjs';
import { ApiPrincipal, TipoEstructuraApi } from '../../../core/services/api-principal';
import { EspaciosAux, SedeItem } from '../../../core/services/espacios-aux';
import { ConfirmModal, DataTableDirective, FilterBar, PageHeader, StatusBadge } from '../../../shared';

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
        s.codigo.toLowerCase().includes(q) ||
        s.nombre.toLowerCase().includes(q) ||
        s.ciudad.toLowerCase().includes(q) ||
        s.direccion.toLowerCase().includes(q) ||
        s.coordinador.toLowerCase().includes(q);

      const coincideEstado = !est || s.estado === est;
      return coincideTexto && coincideEstado;
    });
  });

  totalActivas = computed(() => this.sedes().filter(s => s.estado === 'Activa').length);
  totalAulas = computed(() => this.sedes().reduce((acc, s) => acc + Number(s.capacidadAulas || 0), 0));

  modalAbierto = signal<boolean>(false);
  modoModal = signal<'crear' | 'editar'>('crear');
  modalEliminarAbierto = signal<boolean>(false);
  sedeAEliminar = signal<SedeItem | null>(null);
  mensajeFeedback = signal<string | null>(null);

  formData: SedeItem = {
    id: 0,
    codigo: '',
    nombre: '',
    tipoEstructura: 'BLOQUES',
    ciudad: 'Barranquilla',
    direccion: '',
    telefono: '',
    coordinador: '',
    capacidadAulas: 0,
    estado: 'Activa'
  };

  abrirModalCrear(): void {
    this.modoModal.set('crear');
    const consecutivo = String(this.sedes().length + 1).padStart(2, '0');
    this.formData = {
      id: Date.now(),
      codigo: `SED-IUB-${consecutivo}`,
      nombre: '',
      tipoEstructura: 'BLOQUES',
      ciudad: 'Barranquilla',
      direccion: 'Bloque Principal',
      telefono: '',
      coordinador: '',
      capacidadAulas: 0,
      estado: 'Activa'
    };
    this.modalAbierto.set(true);
  }

  abrirModalEditar(sede: SedeItem): void {
    this.modoModal.set('editar');
    this.formData = {
      ...sede,
      tipoEstructura: sede.tipoEstructura || 'BLOQUES'
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
    const zonaInicial = this.formData.direccion.trim() || 'Bloque Principal';

    if (this.modoModal() === 'crear') {
      if (this.api && this.api.baseUrl) {
        this.api
          .crearSede({
            nombre: nombreLimpio,
            tipoEstructura
          })
          .pipe(
            switchMap((sedeCreada) => {
              this.espaciosService.guardarMetaSede(sedeCreada.id, {
                codigo: this.formData.codigo.trim().toUpperCase(),
                ciudad: this.formData.ciudad,
                direccion: this.formData.direccion.trim(),
                telefono: this.formData.telefono.trim(),
                coordinador: this.formData.coordinador.trim(),
                capacidadAulas: Number(this.formData.capacidadAulas || 0)
              });
              if (sedeCreada.tipoEstructura !== 'SALONES' && zonaInicial.length >= 2) {
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
              alert(this.api!.extraerMensajeError(err, 'No se pudo registrar la sede en el servidor.'));
            }
          });
      } else {
        this.sedes.update(lista => [
          ...lista,
          {
            ...this.formData,
            id: Date.now(),
            codigo: this.formData.codigo.trim().toUpperCase(),
            nombre: nombreLimpio,
            tipoEstructura
          }
        ]);
        this.cerrarModal();
        this.mostrarNotificacion('¡Sede institucional registrada exitosamente!');
      }
    } else {
      if (this.api && this.api.baseUrl) {
        this.api
          .actualizarSede(this.formData.id, {
            nombre: nombreLimpio,
            tipoEstructura
          })
          .subscribe({
            next: (sedeAct) => {
              this.espaciosService.guardarMetaSede(sedeAct?.id || this.formData.id, {
                codigo: this.formData.codigo.trim().toUpperCase(),
                ciudad: this.formData.ciudad,
                direccion: this.formData.direccion.trim(),
                telefono: this.formData.telefono.trim(),
                coordinador: this.formData.coordinador.trim(),
                capacidadAulas: Number(this.formData.capacidadAulas || 0)
              });
              this.espaciosService.sincronizarDesdeBackend();
              this.cerrarModal();
              this.mostrarNotificacion(`¡Sede ${nombreLimpio} actualizada correctamente!`);
            },
            error: (err) => {
              alert(this.api!.extraerMensajeError(err, 'No se pudo actualizar la sede en el servidor.'));
            }
          });
      } else {
        this.sedes.update(lista =>
          lista.map(s => (s.id === this.formData.id ? { ...this.formData } : s))
        );
        this.cerrarModal();
        this.mostrarNotificacion(`¡Sede ${nombreLimpio} actualizada correctamente!`);
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

    const nuevoEstado = sede.estado === 'Inactiva' ? 'Activa' : 'Inactiva';
    this.sedes.update(lista =>
      lista.map(s => (s.id === sede.id ? { ...s, estado: nuevoEstado } : s))
    );

    if (this.api && this.api.baseUrl) {
      if (nuevoEstado === 'Activa') {
        this.api.activarSede(sede.id).subscribe({
          next: () => this.espaciosService.sincronizarDesdeBackend(),
          error: () => {}
        });
      } else {
        this.api.desactivarSede(sede.id).subscribe({
          next: () => this.espaciosService.sincronizarDesdeBackend(),
          error: () => {}
        });
      }
    }

    this.cerrarModalEliminar();
    this.mostrarNotificacion(
      `Estado de la sede "${sede.nombre}" actualizado a "${nuevoEstado}".`
    );
  }

  mostrarNotificacion(msg: string): void {
    this.mensajeFeedback.set(msg);
    setTimeout(() => {
      this.mensajeFeedback.set(null);
    }, 4000);
  }
}

