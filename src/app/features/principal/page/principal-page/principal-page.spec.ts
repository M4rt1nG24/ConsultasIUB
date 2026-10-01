import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrincipalPage } from './principal-page';

describe('PrincipalPage', () => {
  let component: PrincipalPage;
  let fixture: ComponentFixture<PrincipalPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrincipalPage],
    }).compileComponents();

    fixture = TestBed.createComponent(PrincipalPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
