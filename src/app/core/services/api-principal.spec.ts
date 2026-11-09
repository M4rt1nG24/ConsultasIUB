import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiPrincipal } from './api-principal';

describe('ApiPrincipal', () => {
  let service: ApiPrincipal;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ApiPrincipal);
  });

  it('should be created with remote URL and safe browser baseUrl', () => {
    expect(service).toBeTruthy();
    expect(service.urlRemotaDirecta).toBe('https://sistemaconsultas-api.onrender.com');
    expect(service.baseUrl).toBe('/api-proxy');
  });
});

