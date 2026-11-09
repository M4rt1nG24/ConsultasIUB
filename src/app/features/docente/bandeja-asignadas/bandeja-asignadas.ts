import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Data, ConsultaUnificada } from '../../../core/services/data';
import { DataTableDirective } from '../../../shared/directives/datatable.directive';
import { FilterBar } from '../../../shared/components/filter-bar/filter-bar';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { PriorityBadge } from '../../../shared/components/priority-badge/priority-badge';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';

@Component({
  selector: 'app-bandeja-asignadas',
  standalone: true,
  imports: [CommonModule, FormsModule, DataTableDirective, FilterBar, PageHeader, PriorityBadge, StatusBadge],
  styleUrl: './bandeja-asignadas.css',
  templateUrl: './bandeja-asignadas.html',
})
export class BandejaAsignadas implements OnInit {
  private router = inject(Router);
  private dataService = inject(Data);

  busqueda = signal<string>('');
  filtroEstado = signal<string>('');
  filtroPrioridad = signal<string>('');

  solicitudes = this.dataService.consultas;

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
}
