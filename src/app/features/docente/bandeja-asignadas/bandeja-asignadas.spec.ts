import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BandejaAsignadas } from './bandeja-asignadas';

describe('BandejaAsignadas', () => {
  let component: BandejaAsignadas;
  let fixture: ComponentFixture<BandejaAsignadas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BandejaAsignadas],
    }).compileComponents();

    fixture = TestBed.createComponent(BandejaAsignadas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
