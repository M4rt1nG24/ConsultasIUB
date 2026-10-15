import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MetricasCurso } from './metricas-curso';

describe('MetricasCurso', () => {
  let component: MetricasCurso;
  let fixture: ComponentFixture<MetricasCurso>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MetricasCurso],
    }).compileComponents();

    fixture = TestBed.createComponent(MetricasCurso);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
