import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { MisSolicitudes } from './mis-solicitudes';

describe('MisSolicitudes', () => {
  let component: MisSolicitudes;
  let fixture: ComponentFixture<MisSolicitudes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MisSolicitudes],
    }).compileComponents();

    fixture = TestBed.createComponent(MisSolicitudes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('el botón "+ Nueva Consulta" redirige al formulario de crear consulta', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const boton: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-create');

    expect(boton.textContent).toContain('Nueva Consulta');
    boton.click();

    expect(navigate).toHaveBeenCalledWith(['/estudiante/crear']);
    expect(component.modalRapidoAbierto()).toBe(false);
  });
});
