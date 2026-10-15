import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardReportes } from './dashboard-reportes';

describe('DashboardReportes', () => {
  let component: DashboardReportes;
  let fixture: ComponentFixture<DashboardReportes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardReportes],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardReportes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
