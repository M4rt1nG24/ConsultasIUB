import { TestBed } from '@angular/core/testing';
import { Consultas } from './consultas';

describe('Consultas', () => {
  let service: Consultas;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Consultas);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
