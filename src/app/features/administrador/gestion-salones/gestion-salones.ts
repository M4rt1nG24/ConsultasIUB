import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, map, of, switchMap } from 'rxjs';
import { ApiPrincipal, TipoRecursoFisicoApi } from '../../../core/services/api-principal';
import { EspaciosAux, SalonSedeItem, SedeItem, TipoSalon } from '../../../core/services/espacios-aux';
import { ConfirmModal, DataTableDirective, FilterBar, PageHeader, StatusBadge } from '../../../shared';

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

  tiposSalon: TipoSalon[] = [
    'Sala de Informática',
    'Laboratorio',
    'Salón de Clase',
    'Aula de Tutoría',
    'Auditorio',
    'Sala Virtual'
  ];

  constructor() {
    this.espaciosService.sincronizarDesdeBackend();
  }

  filtroTexto = signal<string>('');
  filtroSede = signal<string>('');
  filtroTipo = signal<string>('');

  salonesFiltrados = computed(() => {
    const q = this.filtroTexto().toLowerCase().trim();
    const sede = this.filtroSede();
    const tipo = this.filtroTipo();

    return this.salones().filter(item => {
      const coincideTexto =
        !q ||
        item.codigo.toLowerCase().includes(q) ||
        item.nombre.toLowerCase().includes(q) ||
        item.bloquePiso.toLowerCase().includes(q) ||
        item.equipamiento.toLowerCase().includes(q);

      const coincideSede = !sede || item.sedeNombre === sede;
      const coincideTipo = !tipo || item.tipo === tipo;

      return coincideTexto && coincideSede && coincideTipo;
    });
  });

  totalSalasInformatica = computed(() =>
    this.salones().filter(s => s.tipo === 'Sala de Informática').length
  );
  totalLaboratorios = computed(() =>
    this.salones().filter(s => s.tipo === 'Laboratorio').length
  );
  totalSalonesClase = computed(() =>
    this.salones().filter(s => s.tipo === 'Salón de Clase' || s.tipo === 'Aula de Tutoría').length
  );

  modalAbierto = signal<boolean>(false);
  modoModal = signal<'crear' | 'editar'>('crear');
  modalEliminarAbierto = signal<boolean>(false);
  salonAEliminar = signal<SalonSedeItem | null>(null);
  mensajeFeedback = signal<string | null>(null);

  formData: SalonSedeItem = {
    id: 0,
    codigo: '',
    nombre: '',
    tipo: 'Sala de Informática',
    sedeNombre: '',
    bloquePiso: '',
    capacidad: 0,
    equipamiento: '',
    estado: 'Disponible'
  };

  abrirModalCrear(): void {
    this.modoModal.set('crear');
    const consecutivo = String(this.salones().length + 101);
    const primeraSede = this.sedes()[0]?.nombre || '';
    this.formData = {
      id: Date.now(),
      codigo: `SAL-${consecutivo}`,
      nombre: '',
      tipo: 'Sala de Informática',
      sedeNombre: primeraSede,
      bloquePiso: '',
      capacidad: 0,
      equipamiento: '',
      estado: 'Disponible'
    };
    this.modalAbierto.set(true);
  }

  abrirModalEditar(salon: SalonSedeItem): void {
    this.modoModal.set('editar');
    this.formData = { ...salon };
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
  }

  /**
   * Resuelve el zonaId requerido por el backend FastAPI según el tipoEstructura de la sede:
   * - Si tipoEstructura === 'SALONES', el backend exige zonaId: null.
   * - Si tipoEstructura === 'BLOQUES' o 'PISOS', el backend exige un zonaId activo perteneciente a la sede.
   *   Si no existe una zona coincidente con bloquePiso, la crea automáticamente en /zonas.
   */
  private resolverZonaParaSede(sedeObj: SedeItem, bloquePisoTexto: string): Observable<number | null> {
    if (sedeObj.tipoEstructura === 'SALONES') {
      return of(null);
    }

    const nombreZonaDeseado = (bloquePisoTexto || '').trim() || 'Bloque Principal';
    const zonasDeSede = this.zonas().filter((z) => z.sedeId === sedeObj.id && z.estado);

    const coincidente = zonasDeSede.find(
      (z) => z.nombre.toLowerCase().trim() === nombreZonaDeseado.toLowerCase()
    );
    if (coincidente) {
      return of(coincidente.id);
    }

    if (!this.api || !this.api.baseUrl) {
      return of(zonasDeSede[0]?.id ?? null);
    }

    const nombreParaCrear =
      nombreZonaDeseado.length >= 2 ? nombreZonaDeseado.substring(0, 100) : 'Bloque Principal';

    return this.api
      .crearZona({
        sedeId: sedeObj.id,
        nombre: nombreParaCrear
      })
      .pipe(map((nuevaZona) => nuevaZona.id));
  }

  guardarSalon(): void {
    const nombreLimpio = this.formData.nombre.trim();
    if (nombreLimpio.length < 2) {
      alert('Por favor ingresa un nombre válido para el salón o espacio (mínimo 2 caracteres).');
      return;
    }

    const sedeObj =
      this.sedes().find((s) => s.nombre === this.formData.sedeNombre) ||
      this.sedes().find((s) => s.id === this.formData.sedeId) ||
      this.sedes()[0];

    if (!sedeObj) {
      alert('Primero debes registrar al menos una Sede Institucional activa antes de crear salones.');
      return;
    }

    let tipoApi: TipoRecursoFisicoApi = 'SALON';
    if (this.formData.tipo === 'Laboratorio') tipoApi = 'LABORATORIO';
    else if (this.formData.tipo === 'Sala de Informática') tipoApi = 'SALA';
    else if (this.formData.tipo === 'Aula de Tutoría') tipoApi = 'OFICINA';
    else if (this.formData.tipo === 'Auditorio') tipoApi = 'AUDITORIO';

    if (this.modoModal() === 'crear') {
      if (this.api && this.api.baseUrl) {
        this.resolverZonaParaSede(sedeObj, this.formData.bloquePiso)
          .pipe(
            switchMap((zonaIdResuelta) =>
              this.api!.crearRecursoFisico({
                sedeId: sedeObj.id,
                zonaId: zonaIdResuelta,
                nombre: nombreLimpio,
                tipo: tipoApi
              })
            )
          )
          .subscribe({
            next: (creado) => {
              if (creado?.id) {
                this.espaciosService.guardarMetaSalon(creado.id, {
                  codigo: this.formData.codigo.trim().toUpperCase(),
                  tipo: this.formData.tipo,
                  sedeNombre: sedeObj.nombre,
                  bloquePiso: this.formData.bloquePiso.trim(),
                  capacidad: Number(this.formData.capacidad || 30),
                  equipamiento: this.formData.equipamiento.trim()
                });
              }
              this.espaciosService.sincronizarDesdeBackend();
              this.cerrarModal();
              this.mostrarNotificacion('¡Salón / espacio académico registrado exitosamente en la base de datos!');
            },
            error: (err) => {
              alert(this.api!.extraerMensajeError(err, 'No se pudo registrar el salón en la base de datos.'));
            }
          });
      } else {
        this.salones.update(lista => [
          ...lista,
          {
            ...this.formData,
            id: Date.now(),
            codigo: this.formData.codigo.trim().toUpperCase(),
            nombre: nombreLimpio
          }
        ]);
        this.cerrarModal();
        this.mostrarNotificacion('¡Salón / espacio académico registrado exitosamente en la sede!');
      }
    } else {
      if (this.api && this.api.baseUrl) {
        this.resolverZonaParaSede(sedeObj, this.formData.bloquePiso)
          .pipe(
            switchMap((zonaIdResuelta) =>
              this.api!.actualizarRecursoFisico(this.formData.id, {
                sedeId: sedeObj.id,
                zonaId: zonaIdResuelta,
                nombre: nombreLimpio,
                tipo: tipoApi
              })
            )
          )
          .subscribe({
            next: (actualizado) => {
              this.espaciosService.guardarMetaSalon(actualizado?.id || this.formData.id, {
                codigo: this.formData.codigo.trim().toUpperCase(),
                tipo: this.formData.tipo,
                sedeNombre: sedeObj.nombre,
                bloquePiso: this.formData.bloquePiso.trim(),
                capacidad: Number(this.formData.capacidad || 30),
                equipamiento: this.formData.equipamiento.trim()
              });
              this.espaciosService.sincronizarDesdeBackend();
              this.cerrarModal();
              this.mostrarNotificacion(`¡Salón ${nombreLimpio} actualizado correctamente!`);
            },
            error: (err) => {
              alert(this.api!.extraerMensajeError(err, 'No se pudo actualizar el salón en la base de datos.'));
            }
          });
      } else {
        this.salones.update(lista =>
          lista.map(item => (item.id === this.formData.id ? { ...this.formData } : item))
        );
        this.cerrarModal();
        this.mostrarNotificacion(`¡Salón ${nombreLimpio} actualizado correctamente!`);
      }
    }
  }

  confirmarEliminar(salon: SalonSedeItem): void {
    this.salonAEliminar.set(salon);
    this.modalEliminarAbierto.set(true);
  }

  cerrarModalEliminar(): void {
    this.modalEliminarAbierto.set(false);
    this.salonAEliminar.set(null);
  }

  eliminarSalon(): void {
    const salon = this.salonAEliminar();
    if (!salon) return;

    const nuevoEstado = salon.estado === 'Inactivo' ? 'Disponible' : 'Inactivo';
    this.salones.update(lista =>
      lista.map(s => (s.id === salon.id ? { ...s, estado: nuevoEstado } : s))
    );

    if (this.api && this.api.baseUrl) {
      if (nuevoEstado === 'Disponible') {
        this.api.activarRecursoFisico(salon.id).subscribe({
          next: () => this.espaciosService.sincronizarDesdeBackend(),
          error: () => {}
        });
      } else {
        this.api.desactivarRecursoFisico(salon.id).subscribe({
          next: () => this.espaciosService.sincronizarDesdeBackend(),
          error: () => {}
        });
      }
    }

    this.cerrarModalEliminar();
    this.mostrarNotificacion(
      `Estado del espacio "${salon.nombre}" actualizado a "${nuevoEstado}".`
    );
  }

  mostrarNotificacion(msg: string): void {
    this.mensajeFeedback.set(msg);
    setTimeout(() => {
      this.mensajeFeedback.set(null);
    }, 4000);
  }
}

