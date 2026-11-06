import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Data, ConsultaUnificada } from '../../../core/services/data';
import { DataTableDirective } from '../../../shared/directives/datatable.directive';
import { FilterBar } from '../../../shared/components/filter-bar/filter-bar';
import { PageHeader } from '../../../shared/components/page-header/page-header';

@Component({
  selector: 'app-reasignacion-consultas',
  standalone: true,
  imports: [CommonModule, FormsModule, DataTableDirective, FilterBar, PageHeader],
  styleUrl: './reasignacion-consultas.css',
  templateUrl: './reasignacion-consultas.html',
})
export class ReasignacionConsultas {
  private dataService = inject(Data);

  busqueda = signal<string>('');
  filtroDocente = signal<string>('');

  solicitudes = this.dataService.consultas;
  docentesDisponibles = this.dataService.docentesDisponibles;

  mensajeToast = signal<string | null>(null);

  solicitudesFiltradas = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    const doc = this.filtroDocente();

    return this.solicitudes().filter(item => {
      const coincideTexto =
        !q ||
        item.radicado.toLowerCase().includes(q) ||
        item.estudiante.toLowerCase().includes(q) ||
        item.asignatura.toLowerCase().includes(q) ||
        item.tema.toLowerCase().includes(q) ||
        item.tutor.toLowerCase().includes(q);
      const coincideDoc = !doc || item.tutor === doc;
      return coincideTexto && coincideDoc;
    });
  });

  confirmar(item: ConsultaUnificada): void {
    const nuevoDocente = item.docenteSeleccionado;
    if (!nuevoDocente) {
      alert('Por favor selecciona un docente para reasignar la consulta.');
      return;
    }

    const anterior = item.tutor;
    this.dataService.reasignarTutor(item.id, nuevoDocente);
    this.mostrarToast(`¡Consulta ${item.radicado} reasignada de ${anterior} a ${nuevoDocente}!`);
  }

  mostrarToast(msg: string): void {
    this.mensajeToast.set(msg);
    setTimeout(() => {
      this.mensajeToast.set(null);
    }, 4500);
  }
}
