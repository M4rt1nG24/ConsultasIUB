import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AtencionConsulta } from './atencion-consulta';

describe('AtencionConsulta', () => {
  let component: AtencionConsulta;
  let fixture: ComponentFixture<AtencionConsulta>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AtencionConsulta],
    }).compileComponents();

    fixture = TestBed.createComponent(AtencionConsulta);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
