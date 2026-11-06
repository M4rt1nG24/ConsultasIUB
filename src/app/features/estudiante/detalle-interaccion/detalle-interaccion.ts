import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Data } from '../../../core/services/data';
import { PriorityBadge } from '../../../shared/components/priority-badge/priority-badge';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { TicketTimeline } from '../../../shared/components/ticket-timeline/ticket-timeline';

@Component({
  imports: [CommonModule, FormsModule, PriorityBadge, StatusBadge, TicketTimeline],
  selector: 'app-detalle-interaccion',
  styleUrl: './detalle-interaccion.css',
  templateUrl: './detalle-interaccion.html',
})
export class DetalleInteraccion {
  private router = inject(Router);
  private dataService = inject(Data);

  consulta = this.dataService.consultaActiva;
  nuevoComentario = '';
  modalConstanciaAbierto = signal<boolean>(false);

  enviarComentario(): void {
    const actual = this.consulta();
    if (!actual || !this.nuevoComentario.trim()) {
      alert('Por favor escribe un comentario o pregunta antes de enviar.');
      return;
    }

    this.dataService.agregarComentario(
      actual.id,
      actual.estudiante,
      'ESTUDIANTE',
      this.nuevoComentario
    );
    this.nuevoComentario = '';
  }

  volver(): void {
    this.router.navigate(['/estudiante/mis-solicitudes']);
  }

  descargarConstancia(): void {
    this.modalConstanciaAbierto.set(true);
  }

  cerrarConstancia(): void {
    this.modalConstanciaAbierto.set(false);
  }
}
