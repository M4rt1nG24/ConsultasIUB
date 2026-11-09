import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Data } from '../../../core/services/data';

@Component({
  selector: 'app-atencion-consulta',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrl: './atencion-consulta.css',
  templateUrl: './atencion-consulta.html',
})
export class AtencionConsulta {
  private router = inject(Router);
  private dataService = inject(Data);

  consultaActiva = this.dataService.consultaActiva;

  tipoAtencion = 'Tutoría Individual';
  temaTratado = '';
  observaciones = '';
  asistenciaConfirmada = true;

  modalExitoAbierto = signal<boolean>(false);

  constructor() {
    effect(() => {
      const actual = this.consultaActiva();
      if (actual) {
        this.tipoAtencion = actual.tipoAtencion || 'Tutoría Individual';
        this.temaTratado = actual.tema;
        this.observaciones = actual.observaciones;
        this.asistenciaConfirmada = actual.asistencia === 1;
      }
    });
  }

  finalizarRegistro(): void {
    if (!this.temaTratado.trim()) {
      alert('Por favor describe la temática tratada en la sesión.');
      return;
    }

    const actual = this.consultaActiva();
    if (actual) {
      this.dataService.atenderConsultaDocente(actual.id, {
        tipoAtencion: this.tipoAtencion,
        temaTratado: this.temaTratado.trim(),
        observaciones: this.observaciones.trim(),
        asistenciaConfirmada: this.asistenciaConfirmada
      });
    }

    // Abre modal de confirmación y radicación digital
    this.modalExitoAbierto.set(true);
  }

  confirmarSalida(): void {
    this.modalExitoAbierto.set(false);
    this.router.navigate(['/docente/asignadas']);
  }

  irAHistorial(): void {
    this.modalExitoAbierto.set(false);
    this.router.navigate(['/docente/historial']);
  }

  cancelar(): void {
    if (confirm('¿Deseas cancelar el diligenciamiento y volver a la bandeja de solicitudes?')) {
      this.router.navigate(['/docente/asignadas']);
    }
  }
}
