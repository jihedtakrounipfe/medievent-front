import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AppointmentService, Appointment, DoctorResponse } from '../../../services/appointment.service';
 
import { PatientQueueStatusComponent } from '../../../patient-queue-status/patient-queue-status.component';
import { QueueService } from '../../../services/queue.service';



@Component({
  selector: 'app-booking-appointment',
  standalone: true,
  imports: [FormsModule, CommonModule,PatientQueueStatusComponent],
  templateUrl: './booking-appointment.component.html',
  styleUrls: ['./booking-appointment.component.css']
})
export class BookingAppointmentComponent {
  @Output() appointmentUpdated = new EventEmitter<any>();
  @Output() appointmentAdded = new EventEmitter<any>();

  typeRdv: string = 'medecin';
  specialite: string = '';
  medecin: string = '';
  laboratoire: string = '';
  date: string = '';
  heure: string = '';
  motif: string = '';
   confirmedAppointment: any = null;
  showQueue: boolean = false;
  currentPatientId: number = 0; 

  specialites: string[] = ['Cardiologie','Dermatologie','Pédiatrie','Gynécologie','Médecine Générale','Ophtalmologie'];
   laboratoires: string[] = ['Lab 1','Lab 2','Lab 3'];
medecins: DoctorResponse[] = [];
medecinLoading = false;
onSpecialiteChange() {
  this.medecin = '';
  this.date = '';
  this.heure = '';
  this.medecins = [];

  if (this.specialite) {
    this.medecinLoading = true;
    this.appointmentService.getDoctorsBySpecialization(this.specialite)
      .subscribe({
        next: (data) => {
          // Filtre seulement les médecins APPROVED et actifs
          this.medecins = data.filter(
            d => d.verificationStatus === 'APPROVED'
          );
          this.medecinLoading = false;
        },
        error: () => this.medecinLoading = false
      });
  }
}

   
  // Propriétés pour les disponibilités
  allAppointments: any[] = [];
  availableTimeSlots: string[] = [];
  bookedTimeSlots: string[] = [];

  // Créneaux horaires médecin (9h-17h)
  timeSlots: string[] = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
  ];

  // ===== LABORATOIRE : créneaux 09:00 à 17:00 par pas de 30 min =====
  get tousLesCreneauxLabo(): string[] {
    const creneaux: string[] = [];
    for (let h = 9; h <= 17; h++) {
      for (let m of [0, 30]) {
        if (h === 17 && m === 30) break;
        const hh = h.toString().padStart(2, '0');
        const mm = m.toString().padStart(2, '0');
        creneaux.push(`${hh}:${mm}`);
      }
    }
    return creneaux;
  }

  // Créneaux labo filtrés (disponibles uniquement)
  get creneauxDisponiblesLabo(): string[] {
    if (!this.date || !this.laboratoire) return this.tousLesCreneauxLabo;
    const prisPourCeJour = this.allAppointments
      .filter(c => c.laboratoire === this.laboratoire && c.date === this.date)
      .map(c => c.heure);
    return this.tousLesCreneauxLabo.filter(c => !prisPourCeJour.includes(c));
  }

  // Vérifie si un créneau labo est déjà pris
  isHeurePriseLabo(heure: string): boolean {
    if (!this.date || !this.laboratoire) return false;
    return this.allAppointments.some(
      c => c.laboratoire === this.laboratoire && c.date === this.date && c.heure === heure
    );
  }
  // ===== FIN LABORATOIRE =====

  // Jours de la semaine
  weekDays: string[] = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  // Navigation
  currentWeekOffset: number = 0;
  nextDays: Date[] = [];

  // Date min pour input date
  todayDate: string = new Date().toISOString().split('T')[0];

  // Jours fériés tunisiens (format MM-DD)
 joursFeries: string[] = []; 

  isDateIndisponible(dateStr: string): boolean {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const jour = date.getDay();
    if (jour === 0) return true;
    const mmdd = dateStr.substring(5);
    if (this.joursFeries.includes(mmdd)) return true;
    return false;
  }

  getMotifFermeture(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (date.getDay() === 0) return 'Le laboratoire est fermé le dimanche.';
    const mmdd = dateStr.substring(5);
    if (this.joursFeries.includes(mmdd)) return 'Le laboratoire est fermé ce jour férié.';
    return '';
  }

  // Mode édition
  isEditMode: boolean = false;
  currentAppointmentId: number | null = null;

  constructor(private appointmentService: AppointmentService,  private queueService: QueueService) {

  }

  ngOnInit() {
  this.generateNextDays();
  this.loadAllAppointments();

  // 👇 Charger les jours fériés tunisiens depuis l'API
  const year = new Date().getFullYear();
  this.appointmentService.getHolidaysTN(year).subscribe({
    next: (dates) => {
      // L'API retourne YYYY-MM-DD, on garde MM-DD pour matcher ton isDateIndisponible()
      this.joursFeries = dates.map(d => d.substring(5));
    },
    error: () => {
      // Fallback si l'API est down
      this.joursFeries = ['01-01','01-14','03-20','04-09','05-01','07-25','08-13','10-15'];
    }
  });
}

  generateNextDays() {
    this.nextDays = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + this.currentWeekOffset + i);
      this.nextDays.push(date);
    }
  }

  isSunday(date: Date): boolean {
    return date.getDay() === 0;
  }

  isWorkingDay(date: Date): boolean {
    return date.getDay() !== 0;
  }

  getDayName(date: Date): string {
    return this.weekDays[date.getDay()];
  }

  isToday(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate.getTime() === today.getTime();
  }

  isDatePassed(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate < today;
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  }

  formatDateForCompare(date: Date): string {
    if (!date) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

 loadAllAppointments() {
  this.appointmentService.getAppointments().subscribe({
    next: (data) => {
      this.allAppointments = data
        .filter(app => app.status !== 'CANCELLED') // ✅ ajoute ça
        .map((app: any) => ({
          ...app,
          heure: app.heure ? app.heure.substring(0, 5) : app.heure
        }));
      if (this.medecin) {
        this.updateAvailability();
      }
    },
    error: (err) => console.error('Erreur chargement:', err)
  });
}

  onDoctorChange() {
    this.date = '';
    this.heure = '';
    if (this.medecin) {
      this.updateAvailability();
    }
  }

  updateAvailability() {
    if (!this.medecin) return;
    this.nextDays.forEach(day => {
      this.updateAvailabilityForDate(day);
    });
  }

  updateAvailabilityForDate(date: Date) {
    if (!this.medecin) return;
    const dateStr = this.formatDateForCompare(date);
    if (this.isSunday(date)) {
      (date as any).availableSlots = [];
      return;
    }
    const bookedAppointments = this.allAppointments.filter(app =>
      app.medecin === this.medecin && app.date === dateStr
    );
    this.bookedTimeSlots = bookedAppointments.map(app => app.heure);
    (date as any).availableSlots = this.timeSlots.filter(
      slot => !this.bookedTimeSlots.includes(slot)
    );
  }

 isTimeSlotAvailable(date: Date, slot: string): boolean {
    if (!this.medecin || !date || !slot) return false;
    if (this.isSunday(date)) return false;
    if (this.isDatePassed(date)) return false;
    if (this.isDateIndisponible(this.formatDateForCompare(date))) return false; // 👈 ajouter ça
    const dateStr = this.formatDateForCompare(date);
    const isBooked = this.allAppointments.some(app =>
      app.medecin === this.medecin &&
      app.date === dateStr &&
      app.heure === slot
    );
    return !isBooked;
  }

  selectSlot(date: Date, slot: string) {
    if (!this.isSunday(date) && this.isTimeSlotAvailable(date, slot)) {
      this.date = this.formatDateForCompare(date);
      this.heure = slot;
    }
  }

  hasAvailableSlots(): boolean {
    for (let day of this.nextDays) {
      if (!this.isSunday(day) && !this.isDatePassed(day)) {
        const available = this.timeSlots.filter(slot =>
          this.isTimeSlotAvailable(day, slot)
        );
        if (available.length > 0) return true;
      }
    }
    return false;
  }

  getAvailableSlotsForDate(date: Date): string[] {
    if (!this.medecin || this.isSunday(date) || this.isDatePassed(date)) return [];
    const dateStr = this.formatDateForCompare(date);
    const bookedForDate = this.allAppointments
      .filter(app => app.medecin === this.medecin && app.date === dateStr)
      .map(app => app.heure);
    return this.timeSlots.filter(slot => !bookedForDate.includes(slot));
  }

  resetForm() {
    this.typeRdv = 'medecin';
    this.specialite = '';
    this.medecin = '';
    this.laboratoire = '';
    this.date = '';
    this.heure = '';
    this.motif = '';
    this.isEditMode = false;
    this.currentAppointmentId = null;
    this.touched = {
      typeRdv: false,
      specialite: false,
      medecin: false,
      laboratoire: false,
      date: false,
      heure: false,
        typeAnalyse: false  // 👈 ajouter ici aussi

    };
    this.symptome = '';
    this.typeAnalyse = '';


  }

  loadAppointmentForEdit(app: any) {
    this.isEditMode = true;
    this.currentAppointmentId = app.idAppointment;
    this.typeRdv = app.typeRdv === 'DOCTOR' ? 'medecin' : 'laboratoire';
    this.specialite = app.specialite || '';
    this.medecin = app.medecin || '';
    this.laboratoire = app.laboratoire || '';
    this.date = app.date || '';
    this.heure = app.heure?.substring(0, 5) || '';
    this.motif = app.motif || '';
    this.symptome = app.symptome || '';
    this.typeAnalyse = app.typeAnalyse || '';

  }

  showSuccessMessage = false;
  showErrorMessage = false;
  messageText = '';

  submit() {
  const appointmentData: Appointment = {
    typeRdv: this.typeRdv,
    specialite: this.specialite,
    medecin: this.medecin,
    laboratoire: this.laboratoire,
    date: this.date,
    heure: this.heure,
    motif: this.motif,
    symptome: this.symptome,
    typeAnalyse: this.typeAnalyse,
  };

  if (this.isEditMode && this.currentAppointmentId) {
    const appointmentWithId = { ...appointmentData, idAppointment: this.currentAppointmentId };
    this.appointmentService.updateAppointment(appointmentWithId).subscribe({
      next: (updated) => {
        this.loadAllAppointments();
        this.appointmentUpdated.emit(updated);
        this.resetForm();
      },
      error: (err) => console.error(err)
    });
  } else {
    this.appointmentService.addRdv(appointmentData).subscribe({
      next: (response) => {
        this.showToast('success', 'Attendez la confirmation du médecin !');
        this.loadAllAppointments();
        this.appointmentAdded.emit(response);

        // ✅ 1. Sauvegarder AVANT resetForm()
        const medecinName = this.medecin;

        // ✅ 2. Reset le formulaire
        this.resetForm();

        // ✅ 3. Réaffecter après reset
        this.confirmedAppointment = {
          idAppointment: response.idAppointment,
          medecin: response.medecin || medecinName,
        };

        // ✅ 4. Partager via QueueService
        this.queueService.setConfirmedAppointment(this.confirmedAppointment);
      },
      error: () => {
        this.showToast('error', 'Erreur lors de l\'enregistrement du rendez-vous.');
      }
    });
  }}


  showToast(type: 'success' | 'error', message: string) {
    this.messageText = message;
    if (type === 'success') {
      this.showSuccessMessage = true;
      setTimeout(() => this.showSuccessMessage = false, 4000);
    } else {
      this.showErrorMessage = true;
      setTimeout(() => this.showErrorMessage = false, 4000);
    }
  }

  clearSelection() {
    this.date = '';
    this.heure = '';
  }

  getWeekRange(): string {
    if (this.nextDays.length === 0) return '';
    const first = this.formatDate(this.nextDays[0]);
    const last = this.formatDate(this.nextDays[6]);
    return `${first} - ${last}`;
  }

  previousWeek() {
    this.currentWeekOffset -= 7;
    this.generateNextDays();
    this.updateAvailability();
    this.clearSelection();
  }

  nextWeek() {
    this.currentWeekOffset += 7;
    this.generateNextDays();
    this.updateAvailability();
    this.clearSelection();
  }

  touched = {
    typeRdv: false,
    specialite: false,
    medecin: false,
    laboratoire: false,
    date: false,
    heure: false,
    typeAnalyse: false  // 👈 ajouter ici aussi

  };

  isFormValid(): boolean {
    if (!this.typeRdv) return false;
    if (this.typeRdv === 'medecin') {
      if (!this.specialite || !this.medecin || !this.date || !this.heure) return false;
    }
    if (this.typeRdv === 'laboratoire') {
      if (!this.laboratoire || !this.date || !this.heure) return false;
      if (this.isDateIndisponible(this.date)) return false;
      if (this.isHeurePriseLabo(this.heure)) return false;
    }
    return true;
  }



// Symptômes par spécialité
symptomesParSpecialite: { [key: string]: string[] } = {
  'Cardiologie': [
    'Douleurs thoraciques',
    'Essoufflement',
    'Palpitations',
    'Fatigue inhabituelle',
    'Vertiges / Évanouissements',
    'Hypertension',
    'Œdèmes (jambes gonflées)'
  ],
  'Dermatologie': [
    'Éruption cutanée / Boutons',
    'Démangeaisons',
    'Taches suspectes',
    'Chute de cheveux',
    'Ongles abîmés',
    'Plaie qui ne cicatrise pas',
    'Sécheresse cutanée'
  ],
  'Pédiatrie': [
    'Fièvre',
    'Toux / Rhume',
    'Diarrhée / Vomissements',
    'Pleurs inexpliqués',
    'Retard de croissance',
    'Éruption cutanée',
    'Difficultés respiratoires'
  ],
  'Gynécologie': [
    'Douleurs pelviennes',
    'Règles irrégulières',
    'Saignements anormaux',
    'Pertes vaginales anormales',
    'Douleurs lors des rapports',
    'Grossesse / Suivi prénatal',
    'Ménopause / Symptômes hormonaux'
  ],
  'Médecine Générale': [
    'Fièvre / Frissons',
    'Fatigue persistante',
    'Maux de tête',
    'Douleurs musculaires',
    'Toux / Mal de gorge',
    'Troubles du sommeil',
    'Perte / Prise de poids inexpliquée'
  ],
  'Ophtalmologie': [
    'Baisse de la vision',
    'Douleurs oculaires',
    'Yeux rouges / Irrités',
    'Vision floue',
    'Sensibilité à la lumière',
    'Corps flottants (mouches)',
    'Larmoiements excessifs'
  ]
};

// Symptôme sélectionné
symptome: string = '';

// Getter : retourne les symptômes selon la spécialité choisie
get symptomesDuMedecin(): string[] {
  return this.symptomesParSpecialite[this.specialite] || [];
}

// Types d'analyses laboratoire
analysesLabo: string[] = [
  // Analyses sanguines
  'Numération Formule Sanguine (NFS)',
  'Glycémie',
  'Cholestérol total / HDL / LDL',
  'Triglycérides',
  'Créatinine / Urée (fonction rénale)',
  'Bilan hépatique (ASAT, ALAT)',
  'Thyroïde (TSH, T3, T4)',
  'Fer / Ferritine',
  'Vitamines (B12, D)',
  'CRP (Protéine C-Réactive)',
  'Groupe sanguin / Rhésus',
  // Analyses urinaires
  'Analyse d\'urine (ECBU)',
  'Protéinurie',
  'Créatinine urinaire',
  // Bactériologie
  'Hémoculture',
  'Coproculture',
  'Prélèvement gorge / nez',
  // Sérologies
  'Sérologie HIV',
  'Sérologie Hépatite B / C',
  'Sérologie Covid-19',
  'Bilan prénuptial',
  // Hormones
  'Bilan hormonal (FSH, LH, Estradiol)',
  'Test de grossesse (Beta HCG)',
  // Imagerie
  'Radiographie',
  'Échographie',
  'Scanner (TDM)',
  'IRM',
];

typeAnalyse: string = '';


}