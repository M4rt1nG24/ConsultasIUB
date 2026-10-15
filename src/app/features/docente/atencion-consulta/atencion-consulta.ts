import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-atencion-consulta',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrl: './atencion-consulta.css',
  templateUrl: './atencion-consulta.html',
})
export class AtencionConsulta {
  private router = inject(Router);

  tipoAtencion = 'Tutoría Individual';
  temaTratado = 'Árboles binarios y balanceo AVL';
  observaciones = '';
  asistenciaConfirmada = true;

  modalExitoAbierto = signal<boolean>(false);

  finalizarRegistro() {
    if (!this.temaTratado.trim()) {
      alert('Por favor describe la temática tratada en la sesión.');
      return;
    }
    // Abre modal de confirmación y radicación digital
    this.modalExitoAbierto.set(true);
  }

  confirmarSalida() {
    this.modalExitoAbierto.set(false);
    this.router.navigate(['/docente/asignadas']);
  }

  cancelar() {
    if (confirm('¿Deseas cancelar el diligenciamiento y volver a la bandeja de solicitudes?')) {
      this.router.navigate(['/docente/asignadas']);
    }
  }
}
