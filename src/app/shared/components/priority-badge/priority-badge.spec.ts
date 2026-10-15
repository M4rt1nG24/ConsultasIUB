import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PriorityBadge } from './priority-badge';

describe('PriorityBadge', () => {
  let component: PriorityBadge;
  let fixture: ComponentFixture<PriorityBadge>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PriorityBadge],
    }).compileComponents();

    fixture = TestBed.createComponent(PriorityBadge);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
