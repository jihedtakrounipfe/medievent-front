import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InfoAppointmentComponent } from './info-appointment.component';

describe('InfoAppointmentComponent', () => {
  let component: InfoAppointmentComponent;
  let fixture: ComponentFixture<InfoAppointmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfoAppointmentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InfoAppointmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
