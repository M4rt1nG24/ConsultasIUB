import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  imports: [CommonModule],
  selector: 'app-detalle-interaccion',
  styleUrl: './detalle-interaccion.css',
  templateUrl: './detalle-interaccion.html',
})
export class DetalleInteraccion {
  private router = inject(Router);

  modalConstanciaAbierto = signal<boolean>(false);

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

