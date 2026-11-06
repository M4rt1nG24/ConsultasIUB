import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Data } from '../../../core/services/data';
import { AiInsightCard } from '../../../shared/components/ai-insight-card/ai-insight-card';
import { DataTableDirective } from '../../../shared/directives/datatable.directive';
import { KpiCard } from '../../../shared/components/kpi-card/kpi-card';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { PriorityBadge } from '../../../shared/components/priority-badge/priority-badge';

export interface ReporteCursoItem {
  codigo: string;
  asignatura: string;
  docente: string;
  consultas: number;
  resueltas: number;
  pendientes: number;
  efectividad: string;
  demanda: 'Alta' | 'Media' | 'Baja';
}

@Component({
  selector: 'app-dashboard-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, DataTableDirective, AiInsightCard, KpiCard, PageHeader, PriorityBadge],
  styleUrl: './dashboard-reportes.css',
  templateUrl: './dashboard-reportes.html',
})
export class DashboardReportes {
  private dataService = inject(Data);

  modalExportarAbierto = signal<boolean>(false);
  mensajeToast = signal<string | null>(null);

  totalResueltas = computed(() =>
    String(
      140 +
        this.dataService
          .consultas()
          .filter(c => c.estado === 'Completada' || c.estado === 'Resuelta').length
    )
  );

  totalPendientes = computed(() =>
    String(
      17 +
        this.dataService
          .consultas()
          .filter(
            c =>
              c.estado === 'Pendiente' ||
              c.estado === 'Programada' ||
              c.estado === 'En proceso'
          ).length
    )
  );

  reportesConsolidados = computed<ReporteCursoItem[]>(() => {
    const consultas = this.dataService.consultas();
    const cursos = this.dataService.cursos();

    return cursos.map((c, idx) => {
      const delCurso = consultas.filter(
        q => q.asignatura.toLowerCase() === c.asignatura.toLowerCase()
      );
      const baseTotal = idx === 0 ? 32 : idx === 1 ? 45 : idx === 2 ? 68 : 16;
      const baseRes = idx === 0 ? 28 : idx === 1 ? 41 : idx === 2 ? 65 : 14;
      const resueltasReales = delCurso.filter(
        q => q.estado === 'Completada' || q.estado === 'Resuelta'
      ).length;
      const pendientesReales = delCurso.filter(
        q => q.estado !== 'Completada' && q.estado !== 'Resuelta'
      ).length;

      const total = baseTotal + delCurso.length;
      const resueltas = baseRes + resueltasReales;
      const pendientes = Math.max(0, total - resueltas + pendientesReales);
      const porcentaje =
        total > 0 ? Math.min(100, Math.round((resueltas / total) * 100)) : 90;

      return {
        codigo: c.codigo,
        asignatura: c.asignatura,
        docente: c.docente,
        consultas: total,
        resueltas,
        pendientes,
        efectividad: `${porcentaje}%`,
        demanda: total >= 50 ? 'Alta' : total >= 30 ? 'Media' : 'Baja'
      };
    });
  });

  // Opciones de exportación
  periodoSeleccionado = '2026-2';
  incluirGraficos = true;
  incluirDetalleDocente = true;

  abrirModalExportar(): void {
    this.modalExportarAbierto.set(true);
  }

  cerrarModalExportar(): void {
    this.modalExportarAbierto.set(false);
  }

  descargarReporte(): void {
    this.cerrarModalExportar();
    this.mensajeToast.set('📄 Generando y descargando informe PDF consolidado IUB...');
    setTimeout(() => {
      this.mensajeToast.set(null);
    }, 4500);
  }
}
