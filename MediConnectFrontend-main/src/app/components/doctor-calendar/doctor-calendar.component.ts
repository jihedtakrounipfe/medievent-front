import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DoctorAppServiceService } from '../../services/doctor-app-service.service';
import { StorageService } from '../../../core/services/storage.service';
import { Doctor } from '../../../core/user';
import { isDoctor } from '../../../core/user';

interface Reminder {
  id: number;
  title: string;
  date: string;
  time: string;
  color: string;
  note: string;
}

@Component({
  selector: 'app-doctor-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doctor-calendar.component.html',
  styleUrl: './doctor-calendar.component.css'
})
export class DoctorCalendarComponent implements OnInit {

  // ── Infos médecin connecté ────────────────────────────────────────────────
  medecinNom:   string = '';
  medecinId:    number | null = null;
  medecinEmail: string = '';

  appointments: any[] = [];

  currentMonth: Date = new Date();
  calendarDays: any[] = [];
  selectedDay: any = null;

  reminders: Reminder[] = [];
  showReminderModal = false;
  editingReminder: Reminder | null = null;
  newReminder: Partial<Reminder> = {};
  reminderColors = ['#2FA4A9','#F59E0B','#EF4444','#8B5CF6','#10B981'];

  showRdvModal = false;
  selectedRdv: any = null;

  notifications: string[] = [];

  weekDays = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
  months = ['Janvier','Février','Mars','Avril','Mai','Juin',
            'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

  constructor(
    private router:        Router,
    private doctorService: DoctorAppServiceService,
    private storage:       StorageService,          // ← ajouté
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    // ── 1. Récupérer le médecin connecté depuis localStorage ─────────────
    const user = this.storage.getUser<Doctor>();

    if (!user || !isDoctor(user)) {
      this.router.navigate(['/login']);
      return;
    }

    this.medecinNom   = `Dr. ${user.firstName} ${user.lastName}`;
    this.medecinId    = user.id;
    this.medecinEmail = user.email;

    // ── 2. Charger les RDV ────────────────────────────────────────────────
    this.doctorService.getAppointmentsByDoctor(this.medecinNom).subscribe({
      next: (data) => {
        this.appointments = data;
        this.loadReminders();
        this.generateCalendar();
        this.checkTodayReminders();
        this.requestNotificationPermission();
        this.startReminderWatcher();
      },
      error: () => {
        this.loadReminders();
        this.generateCalendar();
        this.checkTodayReminders();
        this.requestNotificationPermission();
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/doctorapp']);
  }

  // ══════════════════════════════
  // NOTIFICATIONS NAVIGATEUR
  // ══════════════════════════════

  requestNotificationPermission(): void {
    if (isPlatformBrowser(this.platformId) && 'Notification' in window) {
      Notification.requestPermission();
    }
  }

  sendBrowserNotification(title: string, body: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/assets/logo.png',
        tag: `mediconnect-${Date.now()}`,
      });
    }
  }

  scheduleNotification(reminder: Reminder): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const [hours, minutes] = reminder.time.split(':').map(Number);
    const reminderTime = new Date();
    reminderTime.setHours(hours, minutes, 0, 0);
    const delay = reminderTime.getTime() - new Date().getTime();

    if (delay > 0) {
      setTimeout(() => {
        this.sendBrowserNotification(`⏰ ${reminder.title}`, `C'est l'heure ! ${reminder.note || ''}`);
      }, delay);
    }
  }

  startReminderWatcher(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    setInterval(() => {
      const now = new Date();
      const currentDate = now.toISOString().split('T')[0];
      const currentTime = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;

      this.reminders.forEach(r => {
        if (r.date === currentDate && r.time === currentTime) {
          this.sendBrowserNotification(`⏰ ${r.title}`, `C'est l'heure ! ${r.note || ''}`);
          this.notifications.push(`⏰ ${r.title} — maintenant !`);
          setTimeout(() => this.notifications = [], 8000);
        }
      });
    }, 60000);
  }

  // ══════════════════════════════
  // CALENDRIER
  // ══════════════════════════════

  generateCalendar(): void {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date().toISOString().split('T')[0];

    this.calendarDays = [];
    for (let i = 0; i < firstDay; i++) this.calendarDays.push(null);

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${(month+1).toString().padStart(2,'0')}-${d.toString().padStart(2,'0')}`;
      const rdvs = this.appointments.filter(a => a.date === dateStr && a.status !== 'CANCELLED');
      const rems = this.reminders.filter(r => r.date === dateStr);
      this.calendarDays.push({
        day: d, dateStr, rdvs, reminders: rems,
        isToday: dateStr === today,
        isPast: dateStr < today
      });
    }
  }

  prevMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
    this.generateCalendar();
  }

  nextMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    this.generateCalendar();
  }

  goToToday(): void {
    this.currentMonth = new Date();
    this.generateCalendar();
  }

  selectDay(day: any): void {
    if (!day) return;
    this.selectedDay = day;
  }

  getMonthLabel(): string {
    return `${this.months[this.currentMonth.getMonth()]} ${this.currentMonth.getFullYear()}`;
  }

  getRdvColor(status: string): string {
    switch(status) {
      case 'CONFIRMED': return '#2FA4A9';
      case 'PENDING':   return '#F59E0B';
      case 'DONE':      return '#10B981';
      default:          return '#9ca3af';
    }
  }

  getRdvLabel(status: string): string {
    switch(status) {
      case 'CONFIRMED': return 'Confirmé';
      case 'PENDING':   return 'En attente';
      case 'DONE':      return 'Terminé';
      default:          return status;
    }
  }

  openRdv(rdv: any, event: Event): void {
    event.stopPropagation();
    this.selectedRdv = { ...rdv };
    this.showRdvModal = true;
  }

  closeRdvModal(): void {
    this.showRdvModal = false;
    this.selectedRdv = null;
  }

  // ══════════════════════════════
  // REMINDERS
  // ══════════════════════════════

  /** Clé unique par médecin via son ID (plus robuste que le nom) */
  private get reminderKey(): string {
    return `doctor_reminders_${this.medecinId}`;
  }

  loadReminders(): void {
    if (isPlatformBrowser(this.platformId)) {
      const stored = localStorage.getItem(this.reminderKey);
      this.reminders = stored ? JSON.parse(stored) : [];
    }
  }

  saveReminders(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.reminderKey, JSON.stringify(this.reminders));
    }
    this.generateCalendar();
  }

  openNewReminder(dateStr?: string): void {
    this.editingReminder = null;
    this.newReminder = {
      date: dateStr || new Date().toISOString().split('T')[0],
      time: '09:00',
      color: '#2FA4A9',
      title: '',
      note: ''
    };
    this.showReminderModal = true;
  }

  openEditReminder(rem: Reminder, event: Event): void {
    event.stopPropagation();
    this.editingReminder = rem;
    this.newReminder = { ...rem };
    this.showReminderModal = true;
  }

  saveReminder(): void {
    if (!this.newReminder.title || !this.newReminder.date) return;

    if (this.editingReminder) {
      const idx = this.reminders.findIndex(r => r.id === this.editingReminder!.id);
      if (idx !== -1) this.reminders[idx] = { ...this.editingReminder, ...this.newReminder } as Reminder;
    } else {
      const newRem: Reminder = {
        id: Date.now(),
        title: this.newReminder.title!,
        date: this.newReminder.date!,
        time: this.newReminder.time || '09:00',
        color: this.newReminder.color || '#2FA4A9',
        note: this.newReminder.note || ''
      };
      this.reminders.push(newRem);

      const today = new Date().toISOString().split('T')[0];
      if (newRem.date === today) {
        this.scheduleNotification(newRem);
        this.sendBrowserNotification(
          `✅ Rappel enregistré`,
          `"${newRem.title}" programmé à ${newRem.time}`
        );
      }
    }

    this.saveReminders();
    this.showReminderModal = false;
  }

  deleteReminder(id: number, event: Event): void {
    event.stopPropagation();
    this.reminders = this.reminders.filter(r => r.id !== id);
    this.saveReminders();
    if (this.selectedDay) {
      this.selectedDay.reminders = this.reminders.filter(r => r.date === this.selectedDay.dateStr);
    }
  }

  checkTodayReminders(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const today = new Date().toISOString().split('T')[0];
    const todayRems = this.reminders.filter(r => r.date === today);

    todayRems.forEach(r => {
      this.notifications.push(`🔔 Rappel aujourd'hui : ${r.title} à ${r.time}`);
      this.sendBrowserNotification(`🔔 ${r.title}`, `Rappel prévu à ${r.time}`);
      this.scheduleNotification(r);
    });

    if (this.notifications.length > 0) {
      setTimeout(() => this.notifications = [], 8000);
    }
  }

  dismissNotification(i: number): void {
    this.notifications.splice(i, 1);
  }

  // ══════════════════════════════
  // STATS
  // ══════════════════════════════

  getMonthRdvCount(): number {
    const m = this.currentMonth.getMonth();
    const y = this.currentMonth.getFullYear();
    return this.appointments.filter(a => {
      const d = new Date(a.date);
      return d.getMonth() === m && d.getFullYear() === y && a.status !== 'CANCELLED';
    }).length;
  }

  getTodayRdvCount(): number {
    const today = new Date().toISOString().split('T')[0];
    return this.appointments.filter(a => a.date === today && a.status !== 'CANCELLED').length;
  }

  getUpcomingRdvs(): any[] {
    const today = new Date().toISOString().split('T')[0];
    return this.appointments
      .filter(a => a.date >= today && a.status === 'CONFIRMED')
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);
  }

  // ══════════════════════════════
  // ASSISTANT IA
  // ══════════════════════════════

  showAiPanel = false;
  aiMessages: { role: 'user' | 'assistant', content: string }[] = [];
  aiInput = '';
  aiLoading = false;

  toggleAiPanel(): void {
    this.showAiPanel = !this.showAiPanel;
    if (this.showAiPanel && this.aiMessages.length === 0) {
      // Utilise firstName uniquement pour le message de bienvenue
      const prenom = this.medecinNom.replace('Dr. ', '').split(' ')[0];
      this.aiMessages.push({
        role: 'assistant',
        content: `Bonjour ${this.medecinNom} 👋\n\nJe suis votre assistant médical IA. Je peux vous aider à :\n\n• 📋 Résumer votre planning\n• ➕ Créer des rappels automatiquement\n• 📊 Analyser votre charge de travail\n• 💡 Vous donner des conseils d'organisation\n\nQue puis-je faire pour vous ?`
      });
    }
  }

  buildAiContext(): string {
    const today = new Date().toISOString().split('T')[0];
    const rdvResume = this.appointments
      .filter(a => a.status !== 'CANCELLED')
      .map(a => `- ${a.date} à ${a.heure?.substring(0,5)} : ${a.motif || 'Consultation'} (${a.status})`)
      .join('\n') || 'Aucun rendez-vous';

    const remindersResume = this.reminders
      .map(r => `- ${r.date} à ${r.time} : ${r.title} ${r.note ? '('+r.note+')' : ''}`)
      .join('\n') || 'Aucun rappel';

    return `Tu es l'assistant médical personnel de ${this.medecinNom}.
Email : ${this.medecinEmail}
ID médecin : ${this.medecinId}
Date du jour : ${today}
Mois affiché : ${this.getMonthLabel()}

RENDEZ-VOUS DU MÉDECIN :
${rdvResume}

RAPPELS PERSONNELS :
${remindersResume}

Tu peux créer des rappels en répondant avec ce format JSON dans ta réponse (en plus du texte) :
<CREATE_REMINDER>{"title":"...","date":"YYYY-MM-DD","time":"HH:MM","color":"#2FA4A9","note":"..."}</CREATE_REMINDER>

Réponds toujours en français, de façon concise et professionnelle.
Si tu crées un rappel, confirme-le clairement dans ta réponse.`;
  }

  async sendAiMessage(): Promise<void> {
    if (!this.aiInput.trim() || this.aiLoading) return;

    const userMsg = this.aiInput.trim();
    this.aiInput = '';
    this.aiMessages.push({ role: 'user', content: userMsg });
    this.aiLoading = true;

    try {
      const response = await fetch('http://localhost:8080/mediconnect2026/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: this.buildAiContext(),
          messages: this.aiMessages
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .map(m => ({ role: m.role, content: m.content }))
        })
      });

      const data = await response.json();
      const rawText = data.choices?.[0]?.message?.content || "Désolé, je n'ai pas pu répondre.";

      const reminderMatches = rawText.matchAll(/<CREATE_REMINDER>(.*?)<\/CREATE_REMINDER>/gs);
      const cleanText = rawText.replace(/<CREATE_REMINDER>.*?<\/CREATE_REMINDER>/gs, '').trim();

      for (const match of reminderMatches) {
        try {
          const reminderData = JSON.parse(match[1]);
          this.reminders.push({
            id: Date.now() + Math.random(),
            title: reminderData.title,
            date: reminderData.date,
            time: reminderData.time || '09:00',
            color: reminderData.color || '#2FA4A9',
            note: reminderData.note || ''
          });
          this.saveReminders();
          this.sendBrowserNotification(
            '✅ Rappel créé par l\'IA',
            `"${reminderData.title}" le ${reminderData.date} à ${reminderData.time}`
          );
        } catch(e) {
          console.error('Erreur parsing rappel IA:', e);
        }
      }

      this.aiMessages.push({ role: 'assistant', content: cleanText });

    } catch (error) {
      this.aiMessages.push({
        role: 'assistant',
        content: '❌ Erreur de connexion à l\'IA. Vérifiez votre connexion.'
      });
    }

    this.aiLoading = false;
    setTimeout(() => this.scrollAiToBottom(), 100);
  }

  scrollAiToBottom(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const el = document.querySelector('.ai-messages');
    if (el) el.scrollTop = el.scrollHeight;
  }

  onAiKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendAiMessage();
    }
  }
}