import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ServiciosExternos } from './servicios-externos';

describe('ServiciosExternos', () => {
  let service: ServiciosExternos;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ServiciosExternos);
  });

  it('should be created with initial external providers (Nager.Date & Brevo)', () => {
    expect(service).toBeTruthy();
    expect(service.servicios().length).toBeGreaterThanOrEqual(2);
  });
});

