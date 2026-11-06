import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Data, ConsultaUnificada } from '../../../core/services/data';
import { DataTableDirective } from '../../../shared/directives/datatable.directive';
import { FilterBar } from '../../../shared/components/filter-bar/filter-bar';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';

@Component({
  imports: [CommonModule, FormsModule, DataTableDirective, FilterBar, StatusBadge],
  selector: 'app-mis-solicitudes',
  styleUrl: './mis-solicitudes.css',
  templateUrl: './mis-solicitudes.html',
})
export class MisSolicitudes {
  private router = inject(Router);
  private dataService = inject(Data);

  busqueda = signal<string>('');
  filtroEstado = signal<string>('');

  // Lista reactiva compartida con Docente y Administrador
  solicitudes = this.dataService.consultas;
  cursosDisponibles = this.dataService.cursos;

  solicitudesFiltradas = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    const est = this.filtroEstado();

    return this.solicitudes().filter(item => {
      const coincideTexto =
        !q ||
        item.radicado.toLowerCase().includes(q) ||
        item.asignatura.toLowerCase().includes(q) ||
        item.tema.toLowerCase().includes(q) ||
        item.tutor.toLowerCase().includes(q);
      const coincideEstado = !est || item.estado === est;
      return coincideTexto && coincideEstado;
    });
  });

  modalDetalleAbierto = signal<boolean>(false);
  solicitudSeleccionada = signal<ConsultaUnificada | null>(null);

  modalRapidoAbierto = signal<boolean>(false);
  modoModalRapido = signal<'crear' | 'editar'>('crear');
  idEditando = signal<number | null>(null);
  nuevaAsignatura = 'Estructura de Datos';
  nuevoTema = '';
  nuevaModalidad = 'Presencial';
  nuevaFranja = 'Mañana (08:00 AM - 12:00 PM)';

  abrirDetalle(item: ConsultaUnificada): void {
    this.dataService.seleccionarConsulta(item.id);
    this.solicitudSeleccionada.set(item);
    this.modalDetalleAbierto.set(true);
  }

  cerrarDetalle(): void {
    this.modalDetalleAbierto.set(false);
    this.solicitudSeleccionada.set(null);
  }

  abrirModalRapido(): void {
    this.modoModalRapido.set('crear');
    this.idEditando.set(null);
    const primerCurso = this.cursosDisponibles()[0]?.asignatura || 'Estructura de Datos';
    this.nuevaAsignatura = primerCurso;
    this.nuevoTema = '';
    this.nuevaModalidad = 'Presencial';
    this.nuevaFranja = 'Mañana (08:00 AM - 12:00 PM)';
    this.modalRapidoAbierto.set(true);
  }

  abrirModalEditar(item: ConsultaUnificada): void {
    this.modoModalRapido.set('editar');
    this.idEditando.set(item.id);
    this.nuevaAsignatura = item.asignatura;
    this.nuevoTema = item.tema;
    this.nuevaModalidad = item.modalidad;
    this.nuevaFranja = item.franja || 'Mañana (08:00 AM - 12:00 PM)';
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

    if (this.modoModalRapido() === 'editar' && this.idEditando() !== null) {
      this.dataService.actualizarConsulta(this.idEditando()!, {
        asignatura: this.nuevaAsignatura,
        tema: this.nuevoTema.trim(),
        modalidad: this.nuevaModalidad,
        franja: this.nuevaFranja
      });
      this.modalRapidoAbierto.set(false);
      alert('¡Solicitud actualizada correctamente! Los cambios se reflejan en todos los roles.');
      return;
    }

    const nuevoItem = this.dataService.crearConsulta({
      asignatura: this.nuevaAsignatura,
      tema: this.nuevoTema.trim(),
      modalidad: this.nuevaModalidad,
      franja: this.nuevaFranja
    });

    this.nuevoTema = '';
    this.modalRapidoAbierto.set(false);
    alert(`¡Solicitud radicada con éxito! Número de radicado: ${nuevoItem.radicado}`);
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
