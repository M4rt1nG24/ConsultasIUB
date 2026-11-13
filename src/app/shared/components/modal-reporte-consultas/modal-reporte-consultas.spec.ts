import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalReporteConsultas } from './modal-reporte-consultas';

describe('ModalReporteConsultas', () => {
  let component: ModalReporteConsultas;
  let fixture: ComponentFixture<ModalReporteConsultas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalReporteConsultas]
    }).compileComponents();

    fixture = TestBed.createComponent(ModalReporteConsultas);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe alternar la selección de un docente', () => {
    expect(component.isDocenteSeleccionado(10)).toBe(false);
    component.toggleDocente(10);
    expect(component.isDocenteSeleccionado(10)).toBe(true);
    component.toggleDocente(10);
    expect(component.isDocenteSeleccionado(10)).toBe(false);
  });

  it('debe emitir cerrar cuando se llama a cerrarModal()', () => {
    let emitido = false;
    component.cerrar.subscribe(() => {
      emitido = true;
    });
    component.cerrarModal();
    expect(emitido).toBe(true);
  });
});
