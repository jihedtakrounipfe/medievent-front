import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DoctorQueueComponent } from './doctor-queue.component';

describe('DoctorQueueComponent', () => {
  let component: DoctorQueueComponent;
  let fixture: ComponentFixture<DoctorQueueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DoctorQueueComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DoctorQueueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
