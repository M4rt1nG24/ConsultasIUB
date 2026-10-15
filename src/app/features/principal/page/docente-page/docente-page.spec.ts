import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocentePage } from './docente-page';

describe('DocentePage', () => {
  let component: DocentePage;
  let fixture: ComponentFixture<DocentePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocentePage],
    }).compileComponents();

    fixture = TestBed.createComponent(DocentePage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
