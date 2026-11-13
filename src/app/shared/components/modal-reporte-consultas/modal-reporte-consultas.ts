import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Data } from '../../../core/services/data';
import { Auth } from '../../../core/services/auth';
import {
  ReporteExcelService,
  TipoLapsoReporte,
  ConfiguracionReporteConsultas,
  DocenteReporteData
} from '../../../core/services/reporte-excel.service';

@Component({
  selector: 'app-modal-reporte-consultas',
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-reporte-consultas.html',
  styleUrl: './modal-reporte-consultas.css'
})
export class ModalReporteConsultas {
  private dataService = inject(Data);
  private authService = inject(Auth);
  private reporteService = inject(ReporteExcelService);

  @Input() visible = false;
  @Input() rol: 'ADMIN' | 'DOCENTE' = 'DOCENTE';
  @Input() docenteIdActual?: number;
  @Input() docenteNombreActual?: string;

  @Output() cerrar = new EventEmitter<void>();

  tipoLapso = signal<TipoLapsoReporte>('PERIODO');
  anio = signal<number>(new Date().getFullYear());
  mes = signal<number>(new Date().getMonth() + 1);
  periodoCuatrimestre = signal<number>(3); // 1: Ene-Abr, 2: May-Ago, 3: Sep-Dic (Noviembre está en periodo 3)
  soloCompletadas = signal<boolean>(false);
  formatoExportacion = signal<'xlsx' | 'csv'>('xlsx');

  // Filtro de docentes para Administrador
  seleccionDocentesModo = signal<'TODOS' | 'ESPECIFICOS'>('TODOS');
  busquedaDocente = signal<string>('');
  docentesSeleccionados = signal<number[]>([]);

  readonly aniosDisponibles = [2025, 2026, 2027];
  readonly meses = this.reporteService.MESES;

  docentesLista = computed(() => {
    return this.dataService
      .usuarios()
      .filter((u) => u.rol === 'DOCENTE' && u.estado === 'Activo')
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  docentesFiltrados = computed(() => {
    const q = this.busquedaDocente().toLowerCase().trim();
    const lista = this.docentesLista();
    if (!q) return lista;
    return lista.filter(
      (d) =>
        d.nombre.toLowerCase().includes(q) ||
        (d.email && d.email.toLowerCase().includes(q)) ||
        (d.programa && d.programa.toLowerCase().includes(q))
    );
  });

  periodosOpciones = computed(() => {
    return this.reporteService.obtenerPeriodosCuatrimestre(this.anio());
  });

  configuracionActual = computed<ConfiguracionReporteConsultas>(() => {
    return {
      tipoLapso: this.tipoLapso(),
      anio: this.anio(),
      mes: this.mes(),
      periodoCuatrimestre: this.periodoCuatrimestre(),
      soloCompletadas: this.soloCompletadas(),
      todosDocentes: this.rol === 'DOCENTE' ? false : this.seleccionDocentesModo() === 'TODOS',
      docentesSeleccionadosIds: this.docentesSeleccionados()
    };
  });

  rangoDescripcion = computed(() => {
    return this.reporteService.obtenerRangoFechas(this.configuracionActual()).descripcion;
  });

  consultasEnLapso = computed(() => {
    const todas = this.dataService.consultas();
    return this.reporteService.filtrarConsultas(todas, this.configuracionActual());
  });

  docentesReporte = computed<DocenteReporteData[]>(() => {
    const consultas = this.consultasEnLapso();
    const usuarios = this.dataService.usuarios();

    if (this.rol === 'DOCENTE') {
      const docenteId = this.docenteIdActual || this.authService.usuarioIdActivo() || 0;
      return this.reporteService.prepararDatosDocentes(consultas, usuarios, {
        todosDocentes: false,
        docenteUnicoId: docenteId
      });
    }

    // Administrador
    const todos = this.seleccionDocentesModo() === 'TODOS';
    const seleccionados = this.docentesSeleccionados();
    return this.reporteService.prepararDatosDocentes(consultas, usuarios, {
      todosDocentes: todos,
      docentesIds: seleccionados
    });
  });

  totalConsultas = computed(() => {
    return this.docentesReporte().reduce((acc, d) => acc + d.consultas.length, 0);
  });

  totalDocentes = computed(() => {
    return this.docentesReporte().length;
  });

  toggleDocente(id: number): void {
    const actuales = [...this.docentesSeleccionados()];
    const idx = actuales.indexOf(id);
    if (idx >= 0) {
      actuales.splice(idx, 1);
    } else {
      actuales.push(id);
    }
    this.docentesSeleccionados.set(actuales);
  }

  isDocenteSeleccionado(id: number): boolean {
    return this.docentesSeleccionados().includes(id);
  }

  seleccionarTodosDocentes(): void {
    const todosIds = this.docentesLista().map((d) => d.id);
    this.docentesSeleccionados.set(todosIds);
  }

  deseleccionarTodosDocentes(): void {
    this.docentesSeleccionados.set([]);
  }

  descargarReporte(): void {
    const reporte = this.docentesReporte();
    if (reporte.length === 0 || this.totalConsultas() === 0) {
      if (
        !confirm(
          'No se encontraron consultas registradas en el lapso seleccionado. ¿Deseas descargar el formato oficial con las casillas en blanco para diligenciamiento?'
        )
      ) {
        return;
      }
    }

    this.reporteService.descargarReporte(reporte, this.configuracionActual(), this.formatoExportacion());
    this.cerrarModal();
  }

  cerrarModal(): void {
    this.cerrar.emit();
  }
}
