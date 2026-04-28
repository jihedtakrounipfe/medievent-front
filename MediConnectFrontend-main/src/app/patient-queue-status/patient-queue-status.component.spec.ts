import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientQueueStatusComponent } from './patient-queue-status.component';

describe('PatientQueueStatusComponent', () => {
  let component: PatientQueueStatusComponent;
  let fixture: ComponentFixture<PatientQueueStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientQueueStatusComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PatientQueueStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
