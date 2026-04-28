import { Component, OnInit, Output, EventEmitter,ChangeDetectorRef  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppointmentService } from '../../../services/appointment.service';
 

@Component({
  selector: 'app-appointment-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="upcoming-appointments">
      <div class="section-title-small">
        <i class="fas fa-clock"></i>
        <h4>Rendez-vous à Venir</h4>
        <span class="appointment-badge" *ngIf="appointments.length > 0">
          {{appointments.length}} à venir
        </span>
      </div>

      <!-- Affichage des rendez-vous -->
      <div class="appointment-list">
        <div *ngFor="let app of appointments" class="appointment-item">
          <div class="appointment-date">
            <div class="date-number">{{formatDate(app.date, 'dd')}}</div>
            <div class="date-month">{{formatDate(app.date, 'MMM') | uppercase}}</div>
          </div>
          
          <div class="appointment-details">
            <h5>{{app.medecin || app.laboratoire || 'Non spécifié'}}</h5>
            <p><i class="fas fa-stethoscope"></i> {{app.specialite || 'Non spécifiée'}}</p>
            <p><i class="fas fa-clock"></i> {{app.heure}}</p>
           
          </div>

          <div class="appointment-actions">
           <!-- Dans votre bouton, appelez la méthode renommée -->
<button class="btn-action edit" (click)="onEditClick(app)" title="Modifier">
  <i class="fas fa-edit"></i>
</button>
            <button class="btn-action delete" (click)="deleteAppointment(app)" title="Annuler ce rendez-vous">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>

        <!-- Message si aucun rendez-vous -->
        <div *ngIf="appointments.length === 0" class="empty-state">
          <i class="fas fa-calendar-check"></i>
          <p>Aucun rendez-vous à venir</p>
         
        </div>
      </div>
    </div>

    <!-- Modal de confirmation de suppression -->
<div class="modal" *ngIf="showDeleteModal" (click)="onBackdropClick($event)">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Confirmer l'annulation</h3>
          <button class="close-btn" (click)="closeModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <p *ngIf="selectedAppointment">
            Êtes-vous sûr de vouloir annuler le rendez-vous avec 
            <strong>{{selectedAppointment.medecin || selectedAppointment.laboratoire}}</strong> 
            le {{formatDateForDisplay(selectedAppointment.date)}} à {{selectedAppointment.heure}} ?
          </p>
          <p class="warning">Cette action est irréversible.</p>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" (click)="closeModal()">Retour</button>
<button class="btn-danger"(click)="confirmDelete()">        
    <i class="fas fa-check"></i>
            Confirmer l'annulation
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .upcoming-appointments {
      background: white;
      border-radius: 24px;
      padding: 24px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.08);
      transition: all 0.3s ease;
    }

    .upcoming-appointments:hover {
      box-shadow: 0 20px 60px rgba(0,0,0,0.12);
    }

    .section-title-small {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #f3f4f6;
    }

    .section-title-small i {
      color: #279096;
      font-size: 24px;
      background: linear-gradient(135deg, #279096 0%, #279096 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .section-title-small h4 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0;
      flex: 1;
    }

    .appointment-badge {
      background: linear-gradient(135deg, #279096 0%, #279096 100%);
      color: white;
      padding: 4px 12px;
      border-radius: 30px;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .appointment-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .appointment-item {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 20px;
      background: #f9fafb;
      border-radius: 20px;
      transition: all 0.3s ease;
      border: 1px solid transparent;
      position: relative;
      overflow: hidden;
    }

    .appointment-item::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 4px;
      height: 100%;
      background: linear-gradient(135deg,#279096, #279096);
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .appointment-item:hover {
      background: white;
      border-color: #e5e7eb;
      box-shadow: 0 8px 20px rgba(99, 102, 241, 0.1);
      transform: translateX(4px);
    }

    .appointment-item:hover::before {
      opacity: 1;
    }

    .appointment-date {
      text-align: center;
      min-width: 70px;
      background: #279096;
      padding: 10px;
      border-radius: 16px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.02);
    }

    .date-number {
      font-size: 28px;
      font-weight: 800;
      color: #efeff7;
      line-height: 1;
      background: linear-gradient(135deg, #ffffff 0%, #edebf3 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .date-month {
      font-size: 14px;
      font-weight: 600;
      color: #f8fafc;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .appointment-details {
      flex: 1;
    }

    .appointment-details h5 {
      font-size: 1.1rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 8px 0;
    }

    .appointment-details p {
      font-size: 0.9rem;
      color: #4b5563;
      margin: 4px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .appointment-details i {
      width: 16px;
      color: #9ca3af;
    }

    .appointment-motif {
      font-size: 0.85rem;
      color: #6b7280;
      background: white;
      padding: 4px 10px;
      border-radius: 20px;
      display: inline-flex;
      margin-top: 6px;
    }

    .appointment-actions {
      display: flex;
      gap: 8px;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .appointment-item:hover .appointment-actions {
      opacity: 1;
    }

    .btn-action {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s ease;
      background: white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }

    .btn-action i {
      font-size: 18px;
    }

    .btn-action:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.15);
    }

    .btn-action.edit {
      color: #279096;
    }

    .btn-action.edit:hover {
      background: #279096;
      color: white;
    }

    .btn-action.delete {
      color: #ef4444;
    }

    .btn-action.delete:hover {
      background: #ef4444;
      color: white;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      background: #f9fafb;
      border-radius: 16px;
    }

    .empty-state i {
      font-size: 48px;
      color: #d1d5db;
      margin-bottom: 16px;
    }

    .empty-state p {
      color: #6b7280;
      margin-bottom: 20px;
    }

    .btn-book {
      background: linear-gradient(135deg, #279096 0%,#279096 100%);
      color: white;
      border: none;
      padding: 12px 30px;
      border-radius: 30px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-book:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(99, 102, 241, 0.3);
    }

    /* Modal styles */
    .modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      backdrop-filter: blur(5px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.3s ease;
    }

    .modal-content {
      background: white;
      border-radius: 24px;
      width: 90%;
      max-width: 450px;
      animation: slideUp 0.3s ease;
      overflow: hidden;
    }

    .modal-header {
      padding: 20px;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      align-items: center;
      gap: 12px;
      background: #f9fafb;
    }

    .modal-header i {
      font-size: 24px;
      color: #ef4444;
    }

    .modal-header h3 {
      flex: 1;
      font-size: 1.2rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0;
    }

    .close-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: none;
      background: white;
      color: #6b7280;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .close-btn:hover {
      background: #e5e7eb;
      transform: rotate(90deg);
    }

    .modal-body {
      padding: 24px 20px;
      text-align: center;
    }

    .modal-body p {
      color: #4b5563;
      line-height: 1.6;
      margin: 0 0 12px;
    }

    .modal-body strong {
      color: #1f2937;
      font-weight: 600;
    }

    .warning {
      color: #ef4444 !important;
      font-size: 0.95rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    .modal-footer {
      padding: 20px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 12px;
      background: #f9fafb;
    }

    .btn-secondary, .btn-danger {
      flex: 1;
      padding: 14px;
      border-radius: 14px;
      border: none;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 1rem;
    }

    .btn-secondary {
      background: #e5e7eb;
      color: #4b5563;
    }

    .btn-secondary:hover {
      background: #d1d5db;
      transform: translateY(-2px);
    }

    .btn-danger {
      background: #ef4444;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .btn-danger:hover {
      background: #dc2626;
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(239, 68, 68, 0.3);
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .appointment-item {
        flex-wrap: wrap;
        gap: 15px;
      }

      .appointment-details {
        width: calc(100% - 90px);
      }

      .appointment-actions {
        opacity: 1;
        margin-left: auto;
      }

      .modal-content {
        width: 95%;
        margin: 20px;
      }
    }
  `]
})
export class ReminderAppointmentComponent implements OnInit {
  appointments: any[] = [];
  showDeleteModal: boolean = false;
  selectedAppointment: any = null;
  @Output() editRequested = new EventEmitter<any>();  // ← RENOMMÉ

  constructor(private appointmentService: AppointmentService, private cdr: ChangeDetectorRef) {
    
  }

  ngOnInit() {
    this.loadAppointments();
  }
  

loadAppointments() {
  this.appointmentService.getAppointments().subscribe({
    next: (data) => {
      this.appointments = data.filter(a => a.status !== 'CANCELLED' && a.status !== 'DONE');
    },
    error: (err) => console.error('Erreur chargement:', err)
  });
}

  formatDate(dateString: string, format: 'dd' | 'MMM'): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (format === 'dd') return date.getDate().toString().padStart(2, '0');
    return date.toLocaleString('fr-FR', { month: 'short' });
  }

  formatDateForDisplay(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });
  }

  editAppointment(app: any) {
    console.log('Modifier rendez-vous:', app);
    
    
  }
  onBackdropClick(event: MouseEvent) {
  if ((event.target as HTMLElement).classList.contains('modal')) {
    this.closeModal();
  }
}
   onEditClick(app: any) {  
    console.log('Édition du rendez-vous:', app);
    this.editRequested.emit(app);   
  }

  deleteAppointment(app: any) {
    this.selectedAppointment = app;
    this.showDeleteModal = true;
  }

  closeModal() {
    this.showDeleteModal = false;
    this.selectedAppointment = null;
  }


confirmDelete() {
  if (!this.selectedAppointment) return;

  const id = this.selectedAppointment.idAppointment;

  // ❌ Retirez closeModal() d'ici

  this.appointmentService.deleteAppointment(id).subscribe({
    next: () => {
      console.log("Annulé côté backend");

      // ✅ Filtre direct (vos 3 étapes actuelles sont correctes)
      this.appointments = this.appointments
        .map(a => a.idAppointment === id ? { ...a, status: 'CANCELLED' } : a)
        .filter(a => a.status !== 'CANCELLED');

      // ✅ Force la détection de changement Angular
      this.appointments = [...this.appointments];

      // ✅ Fermez le modal ICI, après la mise à jour
      this.closeModal();

      console.log("Liste après suppression :", this.appointments);
    },
    error: (err) => {
      console.error(err);
      // Optionnel : fermez quand même le modal en cas d'erreur
      this.closeModal();
    }
  });
}

// Ajoute cette méthode publique
updateAppointmentLocally(updatedAppointment: any) {
  const index = this.appointments.findIndex(
    a => a.idAppointment === updatedAppointment.idAppointment
  );
  if (index !== -1) {
    this.appointments[index] = updatedAppointment;
    // Force la détection de changement
    this.appointments = [...this.appointments];
  }
  this.appointments.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

// Modifie aussi onAppointmentAdded si tu l'as
addAppointmentLocally(newAppointment: any) {
  this.appointments = [newAppointment, ...this.appointments];
  this.appointments.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}


}