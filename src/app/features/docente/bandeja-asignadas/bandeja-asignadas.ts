import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Data, ConsultaUnificada } from '../../../core/services/data';
import { EspaciosAux, SalonSedeItem } from '../../../core/services/espacios-aux';
import { DataTableDirective } from '../../../shared/directives/datatable.directive';
import { FilterBar } from '../../../shared/components/filter-bar/filter-bar';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { PriorityBadge } from '../../../shared/components/priority-badge/priority-badge';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { ModalReporteConsultas } from '../../../shared/components/modal-reporte-consultas/modal-reporte-consultas';
import { Auth } from '../../../core/services/auth';

export interface EspacioConDisponibilidadItem extends SalonSedeItem {
  disponibleEnHorario: boolean;
  detalleConflicto?: string;
}

@Component({
  selector: 'app-bandeja-asignadas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DataTableDirective,
    FilterBar,
    PageHeader,
    PriorityBadge,
    StatusBadge,
    ModalReporteConsultas
  ],
  styleUrl: './bandeja-asignadas.css',
  templateUrl: './bandeja-asignadas.html',
})
export class BandejaAsignadas implements OnInit {
  private router = inject(Router);
  private dataService = inject(Data);
  private authService = inject(Auth);
  private espaciosService = inject(EspaciosAux);

  busqueda = signal<string>('');
  filtroEstado = signal<string>('');
  filtroPrioridad = signal<string>('');

  modalReporteExcelAbierto = signal<boolean>(false);
  modalDetalleAbierto = signal<boolean>(false);
  consultaDetalle = signal<ConsultaUnificada | null>(null);

  docenteIdActual = computed(() => this.authService.usuarioIdActivo());
  nombreDocenteActual = computed(() => this.authService.nombreActivo());

  solicitudes = this.dataService.consultas;

  // Estado para modal de asignación de espacio físico por parte del docente
  modalAsignarEspacioAbierto = signal<boolean>(false);
  solicitudParaAsignar = signal<ConsultaUnificada | null>(null);
  sedeSeleccionada = signal<string>('');
  espacioSeleccionadoId = signal<number>(0);

  sedesDisponibles = computed(() => this.espaciosService.obtenerSedesActivas());

  espaciosDeSede = computed<EspacioConDisponibilidadItem[]>(() => {
    const sede = this.sedeSeleccionada();
    const sol = this.solicitudParaAsignar();
    if (!sol) return [];

    const fecha = sol.fechaConsulta || sol.fecha?.split(' ')[0] || '';
    const hora = sol.horaConsulta?.substring(0, 5) || '09:00';
    const lista = this.espaciosService.obtenerEspaciosPorSede(sede);

    return lista.map(esp => {
      const check = this.dataService.verificarDisponibilidadEspacio(
        sede,
        esp.nombre,
        fecha,
        hora,
        esp.id
      );
      return {
        ...esp,
        disponibleEnHorario: esp.estado === 'Disponible' && check.disponible,
        detalleConflicto: check.disponible ? undefined : check.mensaje
      };
    });
  });

  espacioActualObj = computed(() => {
    const id = Number(this.espacioSeleccionadoId());
    return this.espaciosDeSede().find(e => e.id === id) || null;
  });

  verificacionDisponibilidad = computed(() => {
    const sol = this.solicitudParaAsignar();
    if (!sol) return { disponible: false, mensaje: 'No hay consulta seleccionada.' };

    const esp = this.espacioActualObj();
    if (!esp) {
      return { disponible: false, mensaje: 'Selecciona una sede y un salón disponible.' };
    }

    if (esp.estado !== 'Disponible') {
      return { disponible: false, mensaje: `El espacio "${esp.nombre}" se encuentra en estado "${esp.estado}".` };
    }

    const fecha = sol.fechaConsulta || sol.fecha?.split(' ')[0] || '';
    const hora = sol.horaConsulta?.substring(0, 5) || '09:00';

    return this.dataService.verificarDisponibilidadEspacio(
      this.sedeSeleccionada(),
      esp.nombre,
      fecha,
      hora,
      esp.id
    );
  });

  ngOnInit(): void {
    this.dataService.sincronizarDesdeBackend();
  }

  solicitudesFiltradas = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    const est = this.filtroEstado();
    const prio = this.filtroPrioridad();

    return this.solicitudes().filter(item => {
      const coincideTexto =
        !q ||
        item.estudiante.toLowerCase().includes(q) ||
        item.documento.includes(q) ||
        item.asignatura.toLowerCase().includes(q) ||
        item.tema.toLowerCase().includes(q) ||
        item.radicado.toLowerCase().includes(q);

      const coincideEstado = !est || item.estado === est;
      const coincidePrio = !prio || item.prioridad === prio;

      return coincideTexto && coincideEstado && coincidePrio;
    });
  });

  irACrearConsulta(): void {
    this.router.navigate(['/docente/crear-consulta']);
  }

  atender(solicitud: ConsultaUnificada): void {
    this.dataService.seleccionarConsulta(solicitud.id);
    this.router.navigate(['/docente/atencion']);
  }

  abrirModalAsignarEspacio(solicitud: ConsultaUnificada): void {
    this.solicitudParaAsignar.set(solicitud);
    const sedes = this.sedesDisponibles();
    const sedeDefault = sedes.length > 0 ? sedes[0].nombre : '';
    this.sedeSeleccionada.set(sedeDefault);

    const espacios = this.espaciosService.obtenerEspaciosPorSede(sedeDefault);
    const primeroDisponible = espacios.find(e => e.estado === 'Disponible') || espacios[0];
    this.espacioSeleccionadoId.set(solicitud.recursoFisicoId || (primeroDisponible?.id || 0));
    this.modalAsignarEspacioAbierto.set(true);
  }

  cambiarSedeAsignacion(nuevaSede: string): void {
    this.sedeSeleccionada.set(nuevaSede);
    const espacios = this.espaciosService.obtenerEspaciosPorSede(nuevaSede);
    const primero = espacios.find(e => e.estado === 'Disponible') || espacios[0];
    this.espacioSeleccionadoId.set(primero?.id || 0);
  }

  guardarAsignacionEspacio(): void {
    const sol = this.solicitudParaAsignar();
    if (!sol) return;

    const esp = this.espacioActualObj();
    if (!esp) {
      alert('Por favor selecciona un salón físico para la consulta.');
      return;
    }

    const verif = this.verificacionDisponibilidad();
    if (!verif.disponible) {
      if (!confirm(`Advertencia de horario: ${verif.mensaje}\n\n¿Deseas asignar el espacio de todos modos?`)) {
        return;
      }
    }

    const ubicacionFinal = `${this.sedeSeleccionada()} - ${esp.nombre} (${esp.bloquePiso || 'Espacio Físico'})`;
    this.dataService.asignarEspacioConsulta(sol.id, esp.id, ubicacionFinal);
    this.modalAsignarEspacioAbierto.set(false);
    this.solicitudParaAsignar.set(null);
    alert(`¡Espacio físico asignado exitosamente!\nSalón: ${esp.nombre} (${this.sedeSeleccionada()})`);
  }

  cerrarModalAsignarEspacio(): void {
    this.modalAsignarEspacioAbierto.set(false);
    this.solicitudParaAsignar.set(null);
  }

  cambiarEstado(solicitud: ConsultaUnificada): void {
    const nuevoEstado =
      solicitud.estado === 'Cancelada' || solicitud.estado === 'Inactiva'
        ? 'Pendiente'
        : 'Cancelada';
    this.dataService.cambiarEstadoConsulta(
      solicitud.id,
      nuevoEstado,
      nuevoEstado === 'Cancelada'
        ? 'Consulta inactivada / cancelada por el docente asignado.'
        : 'Consulta reactivada por el docente asignado.'
    );
  }

  abrirModalReporte(): void {
    this.modalReporteExcelAbierto.set(true);
  }

  cerrarModalReporte(): void {
    this.modalReporteExcelAbierto.set(false);
  }

  abrirDetalle(item: ConsultaUnificada): void {
    this.consultaDetalle.set(item);
    this.modalDetalleAbierto.set(true);
  }

  cerrarDetalle(): void {
    this.modalDetalleAbierto.set(false);
    this.consultaDetalle.set(null);
  }
}
