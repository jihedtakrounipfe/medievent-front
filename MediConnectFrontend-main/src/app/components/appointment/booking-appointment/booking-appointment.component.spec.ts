import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingAppointmentComponent } from './booking-appointment.component';

describe('BookingAppointmentComponent', () => {
  let component: BookingAppointmentComponent;
  let fixture: ComponentFixture<BookingAppointmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingAppointmentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingAppointmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
