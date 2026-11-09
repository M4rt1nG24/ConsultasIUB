import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiPrincipal } from '../../../core/services/api-principal';
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
  private apiPrincipal = inject(ApiPrincipal, { optional: true });

  sedes = this.espaciosService.sedes;

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
    ciudad: 'Barranquilla',
    direccion: '',
    telefono: '',
    coordinador: 'Ing. Roberto Pineda',
    capacidadAulas: 20,
    estado: 'Activa'
  };

  abrirModalCrear(): void {
    this.modoModal.set('crear');
    const consecutivo = String(this.sedes().length + 1).padStart(2, '0');
    this.formData = {
      id: Date.now(),
      codigo: `SED-IUB-${consecutivo}`,
      nombre: '',
      ciudad: 'Barranquilla',
      direccion: '',
      telefono: '(605) 385 5050',
      coordinador: 'Ing. Roberto Pineda',
      capacidadAulas: 20,
      estado: 'Activa'
    };
    this.modalAbierto.set(true);
  }

  abrirModalEditar(sede: SedeItem): void {
    this.modoModal.set('editar');
    this.formData = { ...sede };
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
  }

  guardarSede(): void {
    if (!this.formData.codigo.trim() || !this.formData.nombre.trim() || !this.formData.direccion.trim()) {
      alert('Por favor completa los campos obligatorios (Código, Nombre de la Sede y Dirección).');
      return;
    }

    if (this.modoModal() === 'crear') {
      const idTemp = Date.now();
      const nuevaSede: SedeItem = {
        ...this.formData,
        id: idTemp,
        codigo: this.formData.codigo.trim().toUpperCase(),
        nombre: this.formData.nombre.trim()
      };
      this.sedes.update(lista => [...lista, nuevaSede]);
      this.mostrarNotificacion('¡Sede institucional registrada exitosamente!');

      if (this.apiPrincipal && typeof localStorage !== 'undefined' && localStorage.getItem('iub_jwt_token')) {
        this.apiPrincipal
          .crearSede({
            nombre: nuevaSede.nombre,
            tipoEstructura: 'BLOQUES'
          })
          .subscribe({
            next: (sRemota) => {
              this.sedes.update(lista =>
                lista.map(s => (s.id === idTemp ? { ...s, id: sRemota.id } : s))
              );
            },
            error: () => {}
          });
      }
    } else {
      this.sedes.update(lista =>
        lista.map(s => (s.id === this.formData.id ? { ...this.formData } : s))
      );
      this.mostrarNotificacion(`¡Sede ${this.formData.nombre} actualizada correctamente!`);

      if (this.apiPrincipal && typeof localStorage !== 'undefined' && localStorage.getItem('iub_jwt_token')) {
        this.apiPrincipal
          .actualizarSede(this.formData.id, {
            nombre: this.formData.nombre,
            tipoEstructura: 'BLOQUES'
          })
          .subscribe({ error: () => {} });
      }
    }

    this.cerrarModal();
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
    this.cerrarModalEliminar();
    this.mostrarNotificacion(
      `Estado de la sede "${sede.nombre}" actualizado a "${nuevoEstado}".`
    );

    if (this.apiPrincipal && typeof localStorage !== 'undefined' && localStorage.getItem('iub_jwt_token')) {
      if (nuevoEstado === 'Activa') {
        this.apiPrincipal.activarSede(sede.id).subscribe({ error: () => {} });
      } else {
        this.apiPrincipal.desactivarSede(sede.id).subscribe({ error: () => {} });
      }
    }
  }

  mostrarNotificacion(msg: string): void {
    this.mensajeFeedback.set(msg);
    setTimeout(() => {
      this.mensajeFeedback.set(null);
    }, 4000);
  }
}

