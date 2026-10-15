import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  imports: [CommonModule, FormsModule],
  selector: 'app-crear-consulta',
  styleUrl: './crear-consulta.css',
  templateUrl: './crear-consulta.html',
})
export class CrearConsulta {
  private router = inject(Router);

  asignatura = 'Estructura de Datos';
  docente = 'Asignación Automática (Recomendado)';
  modalidad = 'Presencial (Sede Plaza de la Paz)';
  franja = 'Mañana (08:00 AM - 12:00 PM)';
  tema = '';
  descripcion = '';

  modalConfirmacionAbierto = signal<boolean>(false);
  radicadoGenerado = signal<string>('');

  enviarSolicitud(): void {
    if (!this.tema.trim()) {
      alert('Por favor describe el tema puntual o duda que requieres consultar.');
      return;
    }

    const radicado = `TUT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    this.radicadoGenerado.set(radicado);
    this.modalConfirmacionAbierto.set(true);
  }

  cerrarModalYVolver(): void {
    this.modalConfirmacionAbierto.set(false);
    this.router.navigate(['/estudiante/mis-solicitudes']);
  }

  crearOtra(): void {
    this.modalConfirmacionAbierto.set(false);
    this.tema = '';
    this.descripcion = '';
  }

  cancelar(): void {
    if (this.tema.trim()) {
      if (confirm('Tienes datos ingresados en el formulario. ¿Deseas descartar y salir?')) {
        this.router.navigate(['/estudiante/mis-solicitudes']);
      }
    } else {
      this.router.navigate(['/estudiante/mis-solicitudes']);
    }
  }
}

