import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Data, ConsultaUnificada } from '../../../core/services/data';
import { DataTableDirective } from '../../../shared/directives/datatable.directive';

@Component({
  imports: [CommonModule, FormsModule, DataTableDirective],
  selector: 'app-historial-tutorias',
  styleUrl: './historial-tutorias.css',
  templateUrl: './historial-tutorias.html',
})
export class HistorialTutorias implements OnInit {
  private router = inject(Router);
  private dataService = inject(Data);

  busqueda = signal<string>('');
  filtroAsignatura = signal<string>('Todas las asignaturas');

  todasLasConsultas = this.dataService.consultas;
  cursosDisponibles = this.dataService.cursos;

  ngOnInit(): void {
    this.dataService.sincronizarDesdeBackend();
  }

  historialFiltrado = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    const asig = this.filtroAsignatura();

    return this.todasLasConsultas()
      .filter(
        item =>
          item.estado === 'Completada' ||
          item.estado === 'Resuelta' ||
          (item.asistencia === 1 && Boolean(item.retroalimentacionDocente || item.observaciones))
      )
      .filter(item => {
        const coincideTexto =
          !q ||
          item.estudiante.toLowerCase().includes(q) ||
          item.documento.includes(q) ||
          item.tema.toLowerCase().includes(q) ||
          item.radicado.toLowerCase().includes(q);

        const coincideAsignatura =
          asig === 'Todas las asignaturas' || item.asignatura === asig;

        return coincideTexto && coincideAsignatura;
      });
  });

  // Modal para ver formato oficial
  modalFormatoAbierto = signal<boolean>(false);
  registroSeleccionado = signal<ConsultaUnificada | null>(null);

  abrirFormato(item: ConsultaUnificada): void {
    this.registroSeleccionado.set(item);
    this.modalFormatoAbierto.set(true);
  }

  cerrarFormato(): void {
    this.modalFormatoAbierto.set(false);
    this.registroSeleccionado.set(null);
  }

  editarRegistro(item: ConsultaUnificada): void {
    this.dataService.seleccionarConsulta(item.id);
    this.router.navigate(['/docente/atencion']);
  }

  anularTutoria(item: ConsultaUnificada): void {
    this.dataService.cambiarEstadoConsulta(
      item.id,
      'Pendiente',
      'Tutoría reabierta a estado Pendiente para nueva revisión.'
    );
  }
}
