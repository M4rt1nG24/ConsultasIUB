import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Data } from '../../../core/services/data';
import { DataTableDirective } from '../../../shared/directives/datatable.directive';

export interface MetricaAsignatura {
  codigo: string;
  asignatura: string;
  recibidas: number;
  resueltas: number;
  pendientes: number;
  tiempoPromedio: string;
  porcentajeBarra: number;
}

@Component({
  imports: [CommonModule, DataTableDirective],
  selector: 'app-metricas-curso',
  styleUrl: './metricas-curso.css',
  templateUrl: './metricas-curso.html',
})
export class MetricasCurso {
  private dataService = inject(Data);

  totalResueltas = computed(() =>
    this.dataService
      .consultas()
      .filter(c => c.estado === 'Completada' || c.estado === 'Resuelta').length
  );

  totalPendientes = computed(() =>
    this.dataService
      .consultas()
      .filter(
        c =>
          c.estado === 'Pendiente' ||
          c.estado === 'Programada' ||
          c.estado === 'En proceso'
      ).length
  );

  metricas = computed<MetricaAsignatura[]>(() => {
    const consultas = this.dataService.consultas();
    const cursos = this.dataService.cursos();
    const totalGeneral = Math.max(consultas.length, 1);

    return cursos.map(c => {
      const delCurso = consultas.filter(
        q => q.asignatura.toLowerCase() === c.asignatura.toLowerCase()
      );
      const recibidas = delCurso.length;
      const resueltas = delCurso.filter(
        q => q.estado === 'Completada' || q.estado === 'Resuelta'
      ).length;
      const pendientes = delCurso.filter(
        q => q.estado !== 'Completada' && q.estado !== 'Resuelta'
      ).length;

      return {
        codigo: c.codigo,
        asignatura: c.asignatura,
        recibidas,
        resueltas,
        pendientes,
        tiempoPromedio: recibidas > 0 ? 'Calculado por API' : '0 Horas',
        porcentajeBarra: Math.round((recibidas / totalGeneral) * 100)
      };
    });
  });
}
