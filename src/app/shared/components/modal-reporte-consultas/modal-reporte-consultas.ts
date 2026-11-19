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

  // Filtros adicionales por Categoría, Dependencia y Estado
  filtroDependencia = signal<string>('TODAS');
  filtroCategoria = signal<string>('TODAS');
  filtroEstado = signal<string>('TODOS');

  // Filtro de docentes para Administrador
  seleccionDocentesModo = signal<'TODOS' | 'ESPECIFICOS'>('TODOS');
  busquedaDocente = signal<string>('');
  docentesSeleccionados = signal<number[]>([]);

  readonly aniosDisponibles = [2025, 2026, 2027];
  readonly meses = this.reporteService.MESES;

  dependenciasDisponibles = computed(() => {
    const set = new Set<string>();
    for (const c of this.dataService.consultas()) {
      if (c.nombrePrograma) set.add(c.nombrePrograma);
    }
    for (const u of this.dataService.usuarios()) {
      if (u.programa) set.add(u.programa);
    }
    return ['TODAS', ...Array.from(set).sort()];
  });

  categoriasDisponibles = computed(() => {
    const set = new Set<string>();
    for (const c of this.dataService.cursos()) {
      if (c.asignatura) set.add(c.asignatura);
    }
    for (const q of this.dataService.consultas()) {
      if (q.asignatura) set.add(q.asignatura);
    }
    return ['TODAS', ...Array.from(set).sort()];
  });

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
    let todas = this.reporteService.filtrarConsultas(this.dataService.consultas(), this.configuracionActual());

    // Filtro por Dependencia / Programa
    const dep = this.filtroDependencia();
    if (dep && dep !== 'TODAS') {
      todas = todas.filter(c => (c.nombrePrograma || '').toLowerCase() === dep.toLowerCase());
    }

    // Filtro por Categoría / Asignatura
    const cat = this.filtroCategoria();
    if (cat && cat !== 'TODAS') {
      todas = todas.filter(c => (c.asignatura || '').toLowerCase() === cat.toLowerCase());
    }

    // Filtro por Estado de Consulta
    const est = this.filtroEstado();
    if (est && est !== 'TODOS') {
      if (est === 'COMPLETADAS') {
        todas = todas.filter(c => c.estado === 'Completada' || c.estado === 'Resuelta' || c.asistencia === 1);
      } else if (est === 'PENDIENTES') {
        todas = todas.filter(c => c.estado === 'Pendiente' || c.estado === 'Programada' || c.estado === 'En proceso');
      }
    }

    return todas;
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
