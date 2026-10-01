import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConsultasPage } from './consultas-page';

describe('ConsultasPage', () => {
  let component: ConsultasPage;
  let fixture: ComponentFixture<ConsultasPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConsultasPage],
    }).compileComponents();

    fixture = TestBed.createComponent(ConsultasPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
