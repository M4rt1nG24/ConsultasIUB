import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DirectorioTutorias } from './directorio-tutorias';

describe('DirectorioTutorias', () => {
  let component: DirectorioTutorias;
  let fixture: ComponentFixture<DirectorioTutorias>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DirectorioTutorias],
    }).compileComponents();

    fixture = TestBed.createComponent(DirectorioTutorias);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
