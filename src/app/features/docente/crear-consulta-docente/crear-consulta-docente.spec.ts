import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrearConsultaDocente } from './crear-consulta-docente';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('CrearConsultaDocente', () => {
  let component: CrearConsultaDocente;
  let fixture: ComponentFixture<CrearConsultaDocente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrearConsultaDocente],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(CrearConsultaDocente);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

