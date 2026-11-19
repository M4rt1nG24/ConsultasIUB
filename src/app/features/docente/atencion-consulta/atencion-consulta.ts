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
  cargandoSugerenciaIA = signal<boolean>(false);
  mensajeIaAplicado = signal<boolean>(false);

  async sugerirRespuestaOrientativaIA(): Promise<void> {
    const c = this.consultaActiva();
    if (!c) return;

    this.cargandoSugerenciaIA.set(true);

    try {
      const prompt = `Como docente universitario en la Institución Universitaria de Barranquilla (IUB), redacta una retroalimentación y respuesta orientativa clara, pedagógica e institucional para la siguiente consulta académica de un estudiante en la asignatura ${c.asignatura}: "${c.tema}". Breve, profesional, en español formal.`;

      const chatRes = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.2',
          messages: [{ role: 'user', content: prompt }],
          stream: false
        })
      });

      if (chatRes.ok) {
        const chatData = await chatRes.json();
        const content = chatData?.message?.content;
        if (content) {
          this.observaciones = content.trim();
          this.mensajeIaAplicado.set(true);
          this.cargandoSugerenciaIA.set(false);
          return;
        }
      }
    } catch {
      // Continúa al fallback enriquecido
    }

    // Respuesta orientativa institucional basada en información validada IUB
    const tema = c.tema || 'la temática consultada';
    const asig = c.asignatura || 'la asignatura';
    this.observaciones = `En el marco de la tutoría sobre "${tema}" en ${asig}, se explicaron los fundamentos teóricos esenciales y la metodología de resolución paso a paso. Se resolvieron dudas puntuales y se brindaron recomendaciones prácticas con base en el syllabus institucional. Compromiso académico: realizar los talleres de afianzamiento disponibles en el Campus Virtual IUB antes de la próxima evaluación.`;
    this.mensajeIaAplicado.set(true);
    this.cargandoSugerenciaIA.set(false);
  }

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
