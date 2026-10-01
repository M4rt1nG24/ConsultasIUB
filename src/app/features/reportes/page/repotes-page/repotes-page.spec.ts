import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RepotesPage } from './repotes-page';

describe('RepotesPage', () => {
  let component: RepotesPage;
  let fixture: ComponentFixture<RepotesPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RepotesPage],
    }).compileComponents();

    fixture = TestBed.createComponent(RepotesPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
