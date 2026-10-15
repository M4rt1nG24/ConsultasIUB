import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TicketTimeline } from './ticket-timeline';

describe('TicketTimeline', () => {
  let component: TicketTimeline;
  let fixture: ComponentFixture<TicketTimeline>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TicketTimeline],
    }).compileComponents();

    fixture = TestBed.createComponent(TicketTimeline);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
