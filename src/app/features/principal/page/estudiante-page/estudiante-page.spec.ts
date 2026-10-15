import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EstudiantePage } from './estudiante-page';

describe('EstudiantePage', () => {
  let component: EstudiantePage;
  let fixture: ComponentFixture<EstudiantePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EstudiantePage],
    }).compileComponents();

    fixture = TestBed.createComponent(EstudiantePage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
