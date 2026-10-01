import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContactoPage } from './contacto-page';

describe('ContactoPage', () => {
  let component: ContactoPage;
  let fixture: ComponentFixture<ContactoPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactoPage],
    }).compileComponents();

    fixture = TestBed.createComponent(ContactoPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
