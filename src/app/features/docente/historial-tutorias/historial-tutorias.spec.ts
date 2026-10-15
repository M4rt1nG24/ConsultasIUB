import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HistorialTutorias } from './historial-tutorias';

describe('HistorialTutorias', () => {
  let component: HistorialTutorias;
  let fixture: ComponentFixture<HistorialTutorias>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistorialTutorias],
    }).compileComponents();

    fixture = TestBed.createComponent(HistorialTutorias);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
