import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReasignacionConsultas } from './reasignacion-consultas';

describe('ReasignacionConsultas', () => {
  let component: ReasignacionConsultas;
  let fixture: ComponentFixture<ReasignacionConsultas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReasignacionConsultas],
    }).compileComponents();

    fixture = TestBed.createComponent(ReasignacionConsultas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
