import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetalleInteraccion } from './detalle-interaccion';

describe('DetalleInteraccion', () => {
  let component: DetalleInteraccion;
  let fixture: ComponentFixture<DetalleInteraccion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetalleInteraccion],
    }).compileComponents();

    fixture = TestBed.createComponent(DetalleInteraccion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
