import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EspaciosAux, SalonSedeItem, TipoSalon } from '../../../core/services/espacios-aux';
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

  salones = this.espaciosService.salones;
  sedes = this.espaciosService.sedes;

  tiposSalon: TipoSalon[] = [
    'Sala de Informática',
    'Laboratorio',
    'Salón de Clase',
    'Aula de Tutoría',
    'Sala Virtual'
  ];

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
    sedeNombre: 'Sede Plaza de la Paz',
    bloquePiso: '',
    capacidad: 30,
    equipamiento: '',
    estado: 'Disponible'
  };

  abrirModalCrear(): void {
    this.modoModal.set('crear');
    const consecutivo = String(this.salones().length + 101);
    const primeraSede = this.sedes()[0]?.nombre || 'Sede Plaza de la Paz';
    this.formData = {
      id: Date.now(),
      codigo: `SAL-${consecutivo}`,
      nombre: '',
      tipo: 'Sala de Informática',
      sedeNombre: primeraSede,
      bloquePiso: 'Bloque B - Piso 2',
      capacidad: 30,
      equipamiento: 'PCs Institucionales, Proyector HD, Aire Acondicionado',
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

  guardarSalon(): void {
    if (!this.formData.codigo.trim() || !this.formData.nombre.trim()) {
      alert('Por favor completa el Código y el Nombre del salón/espacio.');
      return;
    }

    if (this.modoModal() === 'crear') {
      this.salones.update(lista => [
        ...lista,
        {
          ...this.formData,
          id: Date.now(),
          codigo: this.formData.codigo.trim().toUpperCase(),
          nombre: this.formData.nombre.trim()
        }
      ]);
      this.mostrarNotificacion('¡Salón / espacio académico registrado exitosamente en la sede!');
    } else {
      this.salones.update(lista =>
        lista.map(item => (item.id === this.formData.id ? { ...this.formData } : item))
      );
      this.mostrarNotificacion(`¡Salón ${this.formData.nombre} actualizado correctamente!`);
    }

    this.cerrarModal();
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

