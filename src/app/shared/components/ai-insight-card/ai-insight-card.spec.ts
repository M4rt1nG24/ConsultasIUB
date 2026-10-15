import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AiInsightCard } from './ai-insight-card';

describe('AiInsightCard', () => {
  let component: AiInsightCard;
  let fixture: ComponentFixture<AiInsightCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiInsightCard],
    }).compileComponents();

    fixture = TestBed.createComponent(AiInsightCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
