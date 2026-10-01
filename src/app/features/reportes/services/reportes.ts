import { Injectable, signal } from '@angular/core';
import { Reporte } from '../model/reportes.model';

@Injectable({
  providedIn: 'root'
})
export class ReportesService {
  private reportesSignal = signal<Reporte[]>([
    {
      id: 101,
      titulo: 'Reporte de Asistencias - Septiembre',
      tipo: 'Académico',
      fecha: '2026-09-28',
      estado: 'Completado'
    },
    {
      id: 102,
      titulo: 'Solicitudes PQRS Trimestrales',
      tipo: 'Atención',
      fecha: '2026-09-30',
      estado: 'Pendiente'
    },
    {
      id: 103,
      titulo: 'Evaluación de Desempeño Docente',
      tipo: 'Auditoría',
      fecha: '2026-10-01',
      estado: 'Completado'
    }
  ]);

  // Señal pública de solo lectura
  public reportes = this.reportesSignal.asReadonly();
}