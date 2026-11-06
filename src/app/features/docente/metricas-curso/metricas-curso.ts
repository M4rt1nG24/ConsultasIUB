import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataTableDirective } from '../../../shared/directives/datatable.directive';

export interface MetricaAsignatura {
  codigo: string;
  asignatura: string;
  recibidas: number;
  resueltas: number;
  pendientes: number;
  tiempoPromedio: string;
}

@Component({
  imports: [CommonModule, DataTableDirective],
  selector: 'app-metricas-curso',
  styleUrl: './metricas-curso.css',
  templateUrl: './metricas-curso.html',
})
export class MetricasCurso {
  metricas = signal<MetricaAsignatura[]>([
    { codigo: 'SIS-603', asignatura: 'Estructura de Datos', recibidas: 42, resueltas: 38, pendientes: 4, tiempoPromedio: '3.5 Horas' },
    { codigo: 'SIS-501', asignatura: 'Bases de Datos Relacionales', recibidas: 22, resueltas: 19, pendientes: 3, tiempoPromedio: '4.4 Horas' },
    { codigo: 'SIS-402', asignatura: 'Programación Web', recibidas: 8, resueltas: 7, pendientes: 1, tiempoPromedio: '4.8 Horas' },
  ]);
}
