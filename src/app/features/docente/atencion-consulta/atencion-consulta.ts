import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Data } from '../../../core/services/data';
import { EspaciosAux } from '../../../core/services/espacios-aux';

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
  private espaciosService = inject(EspaciosAux);

  consultaActiva = this.dataService.consultaActiva;

  tipoAtencion = 'Tutoría Individual';
  temaTratado = '';
  observaciones = '';
  asistenciaConfirmada = true;

  sedesDisponibles = computed(() => this.espaciosService.obtenerSedesActivas());
  sedeSeleccionada = signal<string>('');
  espacioSeleccionadoId = signal<number>(0);

  espaciosDeSede = computed(() => {
    const sede = this.sedeSeleccionada();
    return this.espaciosService.obtenerEspaciosPorSede(sede);
  });

  modalExitoAbierto = signal<boolean>(false);

  constructor() {
    effect(() => {
      const actual = this.consultaActiva();
      if (actual) {
        this.tipoAtencion = actual.tipoAtencion || 'Tutoría Individual';
        this.temaTratado = actual.tema;
        this.observaciones = actual.observaciones;
        this.asistenciaConfirmada = actual.asistencia === 1;

        if (actual.modalidad === 'Presencial') {
          const sedes = this.sedesDisponibles();
          if (sedes.length > 0 && !this.sedeSeleccionada()) {
            this.sedeSeleccionada.set(sedes[0].nombre);
            const esp = this.espaciosService.obtenerEspaciosPorSede(sedes[0].nombre);
            this.espacioSeleccionadoId.set(actual.recursoFisicoId || (esp[0]?.id || 0));
          }
        }
      }
    });
  }

  cambiarSede(nuevaSede: string): void {
    this.sedeSeleccionada.set(nuevaSede);
    const esp = this.espaciosService.obtenerEspaciosPorSede(nuevaSede);
    this.espacioSeleccionadoId.set(esp[0]?.id || 0);
  }

  finalizarRegistro(): void {
    if (!this.temaTratado.trim()) {
      alert('Por favor describe la temática tratada en la sesión.');
      return;
    }

    const actual = this.consultaActiva();
    if (actual) {
      if (actual.modalidad === 'Presencial' && this.espacioSeleccionadoId()) {
        const esp = this.espaciosDeSede().find(e => e.id === Number(this.espacioSeleccionadoId()));
        if (esp) {
          const ubicacionFinal = `${this.sedeSeleccionada()} - ${esp.nombre} (${esp.bloquePiso || 'Espacio Físico'})`;
          this.dataService.asignarEspacioConsulta(actual.id, esp.id, ubicacionFinal);
        }
      }

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
