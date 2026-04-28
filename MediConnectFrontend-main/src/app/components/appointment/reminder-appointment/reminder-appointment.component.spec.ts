import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReminderAppointmentComponent } from './reminder-appointment.component';

describe('ReminderAppointmentComponent', () => {
  let component: ReminderAppointmentComponent;
  let fixture: ComponentFixture<ReminderAppointmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReminderAppointmentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReminderAppointmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
