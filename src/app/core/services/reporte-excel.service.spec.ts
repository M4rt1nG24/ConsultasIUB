import { TestBed } from '@angular/core/testing';
import { ReporteExcelService, DocenteReporteData, ConfiguracionReporteConsultas } from './reporte-excel.service';
import { ConsultaUnificada } from '../models/consulta.models';

describe('ReporteExcelService', () => {
  let service: ReporteExcelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReporteExcelService);
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('debe retornar 3 periodos académicos de 4 meses por año', () => {
    const periodos = service.obtenerPeriodosCuatrimestre(2026);
    expect(periodos.length).toBe(3);
    expect(periodos[0].fechaInicio).toBe('2026-01-01');
    expect(periodos[0].fechaFin).toBe('2026-04-30');
    expect(periodos[1].fechaInicio).toBe('2026-05-01');
    expect(periodos[1].fechaFin).toBe('2026-08-31');
    expect(periodos[2].fechaInicio).toBe('2026-09-01');
    expect(periodos[2].fechaFin).toBe('2026-12-31');
  });

  it('debe calcular el rango de fechas por mes', () => {
    const config: ConfiguracionReporteConsultas = {
      tipoLapso: 'MES',
      anio: 2026,
      mes: 11,
      periodoCuatrimestre: 3,
      soloCompletadas: false,
      todosDocentes: true,
      docentesSeleccionadosIds: []
    };

    const rango = service.obtenerRangoFechas(config);
    expect(rango.inicio).toBe('2026-11-01');
    expect(rango.fin).toBe('2026-11-30');
    expect(rango.descripcion).toContain('Noviembre');
  });

  it('debe filtrar consultas dentro del rango del periodo académico', () => {
    const mockConsultas: Partial<ConsultaUnificada>[] = [
      { id: 1, fechaConsulta: '2026-02-15', estado: 'Completada' },
      { id: 2, fechaConsulta: '2026-06-20', estado: 'Pendiente' },
      { id: 3, fechaConsulta: '2026-11-13', estado: 'Completada' }
    ];

    const configPeriodo3: ConfiguracionReporteConsultas = {
      tipoLapso: 'PERIODO',
      anio: 2026,
      mes: 11,
      periodoCuatrimestre: 3,
      soloCompletadas: false,
      todosDocentes: true,
      docentesSeleccionadosIds: []
    };

    const filtradas = service.filtrarConsultas(mockConsultas as ConsultaUnificada[], configPeriodo3);
    expect(filtradas.length).toBe(1);
    expect(filtradas[0].id).toBe(3);
  });

  it('debe generar XML Excel válido con el código FR-GPA-16-V8 y datos correspondientes', () => {
    const mockDocentes: DocenteReporteData[] = [
      {
        docenteNombre: 'Daniel Ruiz',
        programaNombre: 'Ingeniería de Sistemas',
        consultas: [
          {
            id: 101,
            radicado: 'SC-2026-001',
            estudiante: 'Carlos Pérez',
            documento: '1042123456',
            tema: 'Consultas sobre árboles AVL',
            nombrePrograma: 'Ingeniería de Sistemas',
            asignatura: 'Algoritmos y Programación',
            ubicacion: 'Sede Granadillo - Salón 1',
            fechaConsulta: '2026-11-13',
            horaConsulta: '14:00',
            estado: 'Completada',
            asistencia: 1
          } as ConsultaUnificada
        ]
      }
    ];

    const xml = service.generarXmlExcel(mockDocentes, 'Periodo 2026-3');
    expect(xml).toContain('FR-GPA-16-V8');
    expect(xml).toContain('CONSULTA ESTUDIANTES');
    expect(xml).toContain('NOMBRE DEL DOCENTE:');
    expect(xml).toContain('Daniel Ruiz');
    expect(xml).toContain('Carlos Pérez');
    expect(xml).toContain('1042123456');
    expect(xml).toContain('Algoritmos y Programación');
    expect(xml).toContain('FIRMA DOCENTE:');
  });

  it('debe generar CSV válido con las columnas oficiales', () => {
    const mockDocentes: DocenteReporteData[] = [
      {
        docenteNombre: 'Daniel Ruiz',
        programaNombre: 'Ingeniería de Sistemas',
        consultas: [
          {
            id: 101,
            radicado: 'SC-2026-001',
            estudiante: 'Carlos Pérez',
            documento: '1042123456',
            tema: 'Consultas sobre árboles AVL',
            nombrePrograma: 'Ingeniería de Sistemas',
            asignatura: 'Algoritmos y Programación',
            ubicacion: 'Sede Granadillo - Salón 1',
            fechaConsulta: '2026-11-13',
            horaConsulta: '14:00',
            estado: 'Completada',
            asistencia: 1
          } as ConsultaUnificada
        ]
      }
    ];

    const csv = service.generarCsv(mockDocentes);
    expect(csv).toContain('CONSULTA ESTUDIANTES');
    expect(csv).toContain('FR-GPA-16-V8');
    expect(csv).toContain('NOMBRE DEL DOCENTE:');
    expect(csv).toContain('Daniel Ruiz');
    expect(csv).toContain('PROGRAMA:');
    expect(csv).toContain('Ingeniería de Sistemas');
    expect(csv).toContain('No.,Nombre completo del Estudiante');
    expect(csv).toContain('"Carlos Pérez"');
    expect(csv).toContain('FIRMA DOCENTE:');
  });

  it('debe generar archivo XLSX binario con la estructura OpenXML oficial ZIP', () => {
    const mockDocentes: DocenteReporteData[] = [
      {
        docenteNombre: 'Daniel Ruiz',
        programaNombre: 'Ingeniería de Sistemas',
        consultas: [
          {
            id: 101,
            radicado: 'SC-2026-001',
            estudiante: 'Martin Clavijo',
            documento: '1045000002',
            tema: 'Matrices y determinantes',
            nombrePrograma: 'Ingeniería de Sistemas',
            asignatura: 'Álgebra Lineal',
            ubicacion: 'Granadillo - Salón 1',
            fechaConsulta: '2026-11-13',
            horaConsulta: '10:00',
            estado: 'Completada',
            asistencia: 1
          } as ConsultaUnificada
        ]
      },
      {
        docenteNombre: 'Carlos Gómez',
        programaNombre: 'Ingeniería Industrial',
        consultas: []
      }
    ];

    const xlsxBytes = service.generarXlsxOficial(mockDocentes);
    expect(xlsxBytes).toBeTruthy();
    expect(xlsxBytes.length).toBeGreaterThan(10000);
    // Firma mágica de ZIP (PK\x03\x04 = 0x50, 0x4B, 0x03, 0x04)
    expect(xlsxBytes[0]).toBe(0x50);
    expect(xlsxBytes[1]).toBe(0x4b);
    expect(xlsxBytes[2]).toBe(0x03);
    expect(xlsxBytes[3]).toBe(0x04);
  });
});

