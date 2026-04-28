import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DoctorAppServiceService, Appointment, AppointmentStatus } from '../../services/doctor-app-service.service';
import { Router } from '@angular/router';
import { StorageService } from '../../../core/services/storage.service';

@Component({
  selector: 'app-doctorappointment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './doctorappointment.component.html',
  styleUrl: './doctorappointment.component.css',
})
export class DoctorappointmentComponent implements OnInit {

  appointments: Appointment[] = [];
  filteredAppointments: Appointment[] = [];
  activeFilter: string = 'all';
  showModal: boolean = false;
  modalAction: string = '';
  selectedAppointment: Appointment | null = null;
  medecinNom: string = '';
  medecinSpecialite: string = '';
  medecinId: number | null = null;

  constructor(
    private doctorService: DoctorAppServiceService,
    private router: Router,
    private storage: StorageService
  ) {}

  ngOnInit(): void {
    const user = this.storage.getUser<any>();
    this.medecinNom = `Dr. ${user?.firstName} ${user?.lastName}`;
    this.medecinSpecialite = user?.specialization || '';
    this.medecinId = user?.id || null;
    this.loadAppointments();
  }

  loadAppointments(): void {
    this.doctorService.getAppointmentsByDoctor(this.medecinNom).subscribe({
      next: (data) => {
        this.appointments = data;
        this.applyFilter(this.activeFilter);
      },
      error: (err) => console.error('Erreur chargement RDV :', err)
    });
  }

  applyFilter(filter: string): void {
    this.activeFilter = filter;
    if (filter === 'all') {
      this.filteredAppointments = this.appointments.filter(
        a => a.status?.toLowerCase() !== 'cancelled'
      );
    } else {
      this.filteredAppointments = this.appointments.filter(
        a => a.status?.toLowerCase() === filter
      );
    }
  }

  countByStatus(status: string): number {
    if (status === 'all') {
      return this.appointments.filter(
        a => a.status?.toLowerCase() !== 'cancelled'
      ).length;
    }
    return this.appointments.filter(
      a => a.status?.toLowerCase() === status
    ).length;
  }

  getDay(dateStr: string): string {
    return new Date(dateStr).getDate().toString().padStart(2, '0');
  }

  getMonth(dateStr: string): string {
    return new Date(dateStr).toLocaleString('fr-FR', { month: 'short' }).toUpperCase();
  }

  getInitials(nom: string): string {
    return nom.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  // ✅ Méthode utilitaire — utilisée dans le HTML à la place de rdv.urgent
  isUrgent(rdv: Appointment): boolean {
    return rdv.urgencyLevel === 'URGENT';
  }

  accept(rdv: Appointment): void {
    this.doctorService.acceptAppointment(rdv.idAppointment!).subscribe({
      next: () => this.loadAppointments(),
      error: (err) => console.error('Erreur acceptation :', err)
    });
  }

  markAsDone(rdv: Appointment): void {
    this.doctorService.doneAppointment(rdv.idAppointment!).subscribe({
      next: () => this.loadAppointments(),
      error: (err) => console.error('Erreur terminaison :', err)
    });
  }

  openConfirmModal(rdv: Appointment, action: string): void {
    this.selectedAppointment = rdv;
    this.modalAction = action;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedAppointment = null;
  }

  confirmAction(): void {
    if (!this.selectedAppointment?.idAppointment) return;
    const id = this.selectedAppointment.idAppointment;

    const action$ = this.modalAction === 'refuse'
      ? this.doctorService.refuseAppointment(id)
      : this.doctorService.cancelAppointment(id);

    action$.subscribe({
      next: () => {
        this.appointments = this.appointments.map(a =>
          a.idAppointment === id
            ? { ...a, status: 'CANCELLED' as AppointmentStatus }
            : a
        );
        this.applyFilter(this.activeFilter);
        this.closeModal();
      },
      error: (err) => {
        console.error('Erreur action :', err);
        this.closeModal();
      }
    });
  }

  toggleUrgent(rdv: Appointment, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.doctorService.setUrgent(rdv.idAppointment!, checked).subscribe({
      next: () => {
        // ✅ Met à jour urgencyLevel sur l'objet rdv directement
        rdv.urgencyLevel = checked ? 'URGENT' : 'NORMAL';
      },
      error: (err) => {
        console.error('Erreur mise à jour urgent :', err);
        // Rollback visuel
        (event.target as HTMLInputElement).checked = !checked;
      }
    });
  }

  goToCalendar(): void {
    this.router.navigate(['/medecin/calendrier']);
  }

  goToDashboard(): void {
    this.router.navigate(['/medecin/dashboard']);
  }
}