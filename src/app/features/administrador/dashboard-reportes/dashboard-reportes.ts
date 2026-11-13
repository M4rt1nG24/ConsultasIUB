import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Data } from '../../../core/services/data';
import { AiInsightCard } from '../../../shared/components/ai-insight-card/ai-insight-card';
import { DataTableDirective } from '../../../shared/directives/datatable.directive';
import { KpiCard } from '../../../shared/components/kpi-card/kpi-card';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { PriorityBadge } from '../../../shared/components/priority-badge/priority-badge';
import { ModalReporteConsultas } from '../../../shared/components/modal-reporte-consultas/modal-reporte-consultas';

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

export interface ResumenBarraItem {
  etiqueta: string;
  valorTexto: string;
  porcentaje: number;
}

@Component({
  selector: 'app-dashboard-reportes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DataTableDirective,
    AiInsightCard,
    KpiCard,
    PageHeader,
    PriorityBadge,
    ModalReporteConsultas
  ],
  styleUrl: './dashboard-reportes.css',
  templateUrl: './dashboard-reportes.html',
})
export class DashboardReportes {
  private dataService = inject(Data);

  modalExportarAbierto = signal<boolean>(false);
  modalReporteExcelAbierto = signal<boolean>(false);
  mensajeToast = signal<string | null>(null);

  totalResueltas = computed(() =>
    String(
      this.dataService
        .consultas()
        .filter(c => c.estado === 'Completada' || c.estado === 'Resuelta').length
    )
  );

  totalPendientes = computed(() =>
    String(
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

  tiempoPromedio = computed(() => {
    const total = this.dataService.consultas().length;
    return total > 0 ? 'Calculado por API' : '0 Horas';
  });

  reportesConsolidados = computed<ReporteCursoItem[]>(() => {
    const consultas = this.dataService.consultas();
    const cursos = this.dataService.cursos();

    return cursos.map((c) => {
      const delCurso = consultas.filter(
        q => q.asignatura.toLowerCase() === c.asignatura.toLowerCase()
      );
      const total = delCurso.length;
      const resueltas = delCurso.filter(
        q => q.estado === 'Completada' || q.estado === 'Resuelta'
      ).length;
      const pendientes = delCurso.filter(
        q => q.estado !== 'Completada' && q.estado !== 'Resuelta'
      ).length;
      const porcentaje =
        total > 0 ? Math.min(100, Math.round((resueltas / total) * 100)) : 0;

      return {
        codigo: c.codigo,
        asignatura: c.asignatura,
        docente: c.docente,
        consultas: total,
        resueltas,
        pendientes,
        efectividad: `${porcentaje}%`,
        demanda: total >= 10 ? 'Alta' : total >= 5 ? 'Media' : 'Baja'
      };
    });
  });

  consultasPorCurso = computed<ResumenBarraItem[]>(() => {
    const consolidado = this.reportesConsolidados();
    const max = Math.max(...consolidado.map(c => c.consultas), 1);
    return consolidado.map(c => ({
      etiqueta: c.asignatura,
      valorTexto: `${c.consultas} consultas`,
      porcentaje: Math.round((c.consultas / max) * 100)
    }));
  });

  consultasPorDocente = computed<ResumenBarraItem[]>(() => {
    const consultas = this.dataService.consultas();
    const docentes = this.dataService.docentesDisponibles();
    return docentes.map(doc => {
      const delDocente = consultas.filter(
        c => c.tutor.toLowerCase() === doc.toLowerCase()
      );
      const total = delDocente.length;
      const atendidas = delDocente.filter(
        c => c.estado === 'Completada' || c.estado === 'Resuelta'
      ).length;
      const pct = total > 0 ? Math.round((atendidas / total) * 100) : 0;
      return {
        etiqueta: doc,
        valorTexto: `${atendidas} atendidas (${pct}%)`,
        porcentaje: pct
      };
    });
  });

  // Opciones de exportación
  periodoSeleccionado = '2026-2';
  incluirGraficos = true;
  incluirDetalleDocente = true;

  abrirModalExportar(): void {
    this.modalReporteExcelAbierto.set(true);
  }

  cerrarModalExportar(): void {
    this.modalExportarAbierto.set(false);
  }

  abrirModalReporteExcel(): void {
    this.modalReporteExcelAbierto.set(true);
  }

  cerrarModalReporteExcel(): void {
    this.modalReporteExcelAbierto.set(false);
  }

  descargarReporte(): void {
    this.cerrarModalExportar();
    this.mensajeToast.set('📄 Generando y descargando informe PDF consolidado IUB...');
    setTimeout(() => {
      this.mensajeToast.set(null);
    }, 4500);
  }
}
