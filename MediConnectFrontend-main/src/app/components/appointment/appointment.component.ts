import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookingAppointmentComponent } from './booking-appointment/booking-appointment.component';
import { FormAppointmentComponent } from './form-appointment/form-appointment.component';
import { InfoAppointmentComponent } from './info-appointment/info-appointment.component';
import { ReminderAppointmentComponent } from './reminder-appointment/reminder-appointment.component';
import { AppointmentService } from '../../services/appointment.service';

@Component({
  selector: 'app-appointment',
  standalone: true,
  imports: [CommonModule, BookingAppointmentComponent, FormAppointmentComponent,
            InfoAppointmentComponent, ReminderAppointmentComponent],
  templateUrl: './appointment.component.html',
  styleUrl: './appointment.component.css'
})
export class AppointmentComponent {
  @ViewChild(BookingAppointmentComponent) bookingForm!: BookingAppointmentComponent;
  @ViewChild(ReminderAppointmentComponent) reminder!: ReminderAppointmentComponent;

  showHistory = false;
  doneAppointments: any[] = [];

  constructor(private appointmentService: AppointmentService) {}

  openHistory() {
    this.appointmentService.getAppointments().subscribe({
      next: (data) => {
        this.doneAppointments = data.filter(a => a.status === 'DONE');
        this.showHistory = true;
      },
      error: (err) => console.error('Erreur historique:', err)
    });
  }

  closeHistory() {
    this.showHistory = false;
  }

  formatDate(dateString: string, format: 'dd' | 'MMM'): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (format === 'dd') return date.getDate().toString().padStart(2, '0');
    return date.toLocaleString('fr-FR', { month: 'short' });
  }

  onEditAppointment(appointment: any) {
    if (this.bookingForm) this.bookingForm.loadAppointmentForEdit(appointment);
  }

  onAppointmentAdded(newAppointment: any) {
    if (!this.reminder) return;
    this.reminder.loadAppointments();
  }

  onAppointmentUpdated(updatedAppointment: any) {
    if (!this.reminder) return;
    this.reminder.updateAppointmentLocally(updatedAppointment);
  }
}