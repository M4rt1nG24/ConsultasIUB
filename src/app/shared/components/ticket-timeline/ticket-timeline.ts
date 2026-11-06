import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TimelineStep {
  titulo: string;
  fecha: string;
  descripcion: string;
  completado: boolean;
}

@Component({
  selector: 'app-ticket-timeline',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ticket-timeline.html',
  styleUrl: './ticket-timeline.css',
})
export class TicketTimeline {
  @Input() pasos: TimelineStep[] = [
    {
      titulo: '1. Consulta Radicada',
      fecha: '14/10/2026 - 10:15 AM',
      descripcion: 'Solicitud registrada por el estudiante en el sistema MiTutoría IUB.',
      completado: true
    },
    {
      titulo: '2. Tutor Asignado',
      fecha: '14/10/2026 - 10:40 AM',
      descripcion: 'Caso asignado a Ing. Carlos Mendoza (Estructura de Datos).',
      completado: true
    },
    {
      titulo: '3. En Atención Académica',
      fecha: '14/10/2026 - 11:30 AM',
      descripcion: 'Revisión de código fuente y retroalimentación técnica enviada.',
      completado: true
    },
    {
      titulo: '4. Cierre y Auditoría Cero Papel',
      fecha: 'Pendiente firma final',
      descripcion: 'Generación de constancia F-IUB-04 con control de asistencia.',
      completado: false
    }
  ];
}
