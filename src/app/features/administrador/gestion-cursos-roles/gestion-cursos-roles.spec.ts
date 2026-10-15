import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GestionCursosRoles } from './gestion-cursos-roles';

describe('GestionCursosRoles', () => {
  let component: GestionCursosRoles;
  let fixture: ComponentFixture<GestionCursosRoles>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionCursosRoles],
    }).compileComponents();

    fixture = TestBed.createComponent(GestionCursosRoles);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
