import {
  Component, OnInit, AfterViewInit,
  OnDestroy, ViewChild, ElementRef, ChangeDetectorRef
} from '@angular/core';
import { Router } from '@angular/router';
import { AppointmentService } from '../../services/appointment.service';
import { CommonModule } from '@angular/common';
import { NoshowAiService, NoshowPrediction } from '../../services/noshow-ai.service';
import { StorageService } from '../../../core/services/storage.service';

declare const Chart: any;

@Component({
  selector: 'app-dashboard',
  templateUrl: './doctor-dashboard.component.html',
  standalone: true,
  imports: [CommonModule],
  styleUrls: ['./doctor-dashboard.component.css']
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {

  // ── IA No Show ────────────────────────────────────────────────────────────
  aiPrediction: NoshowPrediction | null = null;
  aiLoading = false;
  aiError   = false;

  // ── Infos médecin ─────────────────────────────────────────────────────────
  medecinNom  = '';
  currentDate = '';

  // ── Stats ─────────────────────────────────────────────────────────────────
  stats = { pending: 0, confirmed: 0, done: 0, cancelled: 0, total: 0 };
  upcomingAppointments: any[] = [];

  // ── Données brutes ────────────────────────────────────────────────────────
  weeklyData:  number[] = [0, 0, 0, 0, 0, 0, 0];
  monthlyData: number[] = [0, 0, 0, 0];
  yearlyData:  number[] = new Array(12).fill(0);
  currentPeriod = 'week';

  // ── QuickChart (images via API) ───────────────────────────────────────────
  lineChartUrl      = '';
  barChartUrl       = '';
  trendChartUrl     = '';
  lineChartLoading  = true;
  barChartLoading   = true;
  trendChartLoading = true;

  // ── Flags *ngIf qui créent les canvas dans le DOM ────────────────────────
  gaugeReady   = false;
  radarReady   = false;
  heatmapReady = false;

  // ── ViewChild — canvas elements ───────────────────────────────────────────
  @ViewChild('gaugeCanvas')   gaugeCanvasRef!:   ElementRef<HTMLCanvasElement>;
  @ViewChild('radarCanvas')   radarCanvasRef!:   ElementRef<HTMLCanvasElement>;
  @ViewChild('heatmapCanvas') heatmapCanvasRef!: ElementRef<HTMLCanvasElement>;

  // ── Instances Chart.js ────────────────────────────────────────────────────
  private gaugeChart:   any = null;
  private radarChart:   any = null;
  private heatmapChart: any = null;

  // ── Données en attente si AfterViewInit pas encore passé ─────────────────
  private pendingHeatmapData: any[] | null = null;
  private viewInitDone = false;

  // ── Taux de remplissage ───────────────────────────────────────────────────
  private fillRate = 0;

  // ── No Show global ────────────────────────────────────────────────────────
  reliablePatients = 75;
  noShowRisk       = 25;

  // ── Disponibilités ────────────────────────────────────────────────────────
  weekAvailability: {
    label: string;
    isToday: boolean;
    free: number;
    slots: { time: string; status: 'free' | 'taken' | 'break'; patient?: string }[];
  }[] = [];

  get availableSlotsTotal(): number {
    return this.weekAvailability.reduce((acc, d) => acc + d.free, 0);
  }

  private readonly QC_BASE = 'https://quickchart.io/chart';
  private readonly TIME_SLOTS = [
    '09:00','09:30','10:00','10:30','11:00','11:30',
    '14:00','14:30','15:00','15:30','16:00','16:30'
  ];

  private readonly C = {
    teal:      '#1a9094',
    tealBg:    'rgba(26,144,148,0.12)',
    amber:     '#f59e0b',
    amberBg:   'rgba(245,158,11,0.12)',
    red:       '#ef4444',
    redBg:     'rgba(239,68,68,0.10)',
    green:     '#10b981',
    purple:    '#8b5cf6',
    blue:      '#3b82f6',
    pink:      '#ec4899',
    gray:      '#94a3b8',
    grayLight: '#f1f5f9',
    dark:      '#0f172a',
    muted:     '#94a3b8',
    grid:      '#f1f5f9',
  };

  constructor(
    private router: Router,
    private appointmentService: AppointmentService,
    private noshowAi: NoshowAiService,
    private storage: StorageService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const user = this.storage.getUser<any>();
    this.medecinNom = `Dr. ${user?.firstName} ${user?.lastName}`;
    this.currentDate = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    this.buildWeekAvailability([]);
    // Charger Chart.js dynamiquement puis lancer les données
    this.loadChartJs().then(() => this.loadData());
  }

  ngAfterViewInit(): void {
    this.viewInitDone = true;
    // Si les données sont arrivées avant la vue, on dessine maintenant
    if (this.gaugeReady)   this.drawGaugeChart();
    if (this.radarReady)   this.drawRadarChart();
    if (this.heatmapReady && this.pendingHeatmapData) {
      this.drawHeatmapChart(this.pendingHeatmapData);
    }
  }

  ngOnDestroy(): void {
    this.gaugeChart?.destroy();
    this.radarChart?.destroy();
    this.heatmapChart?.destroy();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CHARGEMENT DYNAMIQUE DE CHART.JS
  // ───────────────────────────────────────────────────────────────────────────

  private loadChartJs(): Promise<void> {
    return new Promise(resolve => {
      // Déjà disponible (chargé via index.html)
      if (typeof Chart !== 'undefined') { resolve(); return; }

      // Déjà injecté mais pas encore chargé
      const existing = document.querySelector('script[data-chartjs]') as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener('load', () => resolve());
        return;
      }

      // Injection dynamique
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
      script.setAttribute('data-chartjs', 'true');
      script.onload  = () => resolve();
      script.onerror = () => { console.warn('Chart.js CDN failed'); resolve(); };
      document.head.appendChild(script);
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CHARGEMENT DES DONNÉES
  // ───────────────────────────────────────────────────────────────────────────

  loadData(): void {
    this.appointmentService.getDashboard(this.medecinNom).subscribe({
      next: (data: any) => {

        if (data.stats) {
          this.stats = {
            pending:   data.stats.pending   ?? 0,
            confirmed: data.stats.confirmed ?? 0,
            done:      data.stats.done      ?? 0,
            cancelled: data.stats.cancelled ?? 0,
            total:     data.stats.total     ?? 0
          };
          this.noShowRisk       = Math.round(data.stats.noShowRate ?? 0);
          this.reliablePatients = 100 - this.noShowRisk;
        }

        if (data.weeklyData?.data) this.weeklyData = data.weeklyData.data;

        if (data.monthlyTrend?.length) {
          const yearly = new Array(12).fill(0);
          data.monthlyTrend.forEach((p: any) => {
            if (p.month >= 1 && p.month <= 12) yearly[p.month - 1] = p.total;
          });
          this.yearlyData = yearly;
          const cm  = new Date().getMonth() + 1;
          const cy  = new Date().getFullYear();
          const cur = data.monthlyTrend.find((p: any) => p.month === cm && p.year === cy);
          if (cur) {
            const pw = Math.round(cur.total / 4);
            this.monthlyData = [pw, pw, pw, cur.total - pw * 3];
          }
        }

        if (data.upcomingAppointments?.length) {
          this.upcomingAppointments = data.upcomingAppointments;
          this.callAi(data.upcomingAppointments[0]);
        } else {
          this.callAiWithDefaults();
        }

        if (data.weekAvailability?.length) {
          this.buildWeekAvailabilityFromBackend(data.weekAvailability, data.upcomingAppointments ?? []);
        } else {
          this.buildWeekAvailability([]);
        }

        // QuickChart (images API)
        this.renderLineChart();
        if (data.specialiteBreakdown?.length) {
          this.renderBarChart(data.specialiteBreakdown.map((s: any) => ({ name: s.specialite, count: s.count })));
        }
        if (data.monthlyTrend?.length) {
          this.renderTrendChart(data.monthlyTrend);
        }

        // Chart.js canvas
        this.computeFillRate();
        this.triggerCanvasCharts(data.noShowByHour?.length ? data.noShowByHour : this.demoHeatmap());
      },

      error: () => {
        this.weeklyData  = [3, 7, 5, 9, 6, 4, 8];
        this.monthlyData = [24, 31, 28, 35];
        this.yearlyData  = [18, 22, 25, 28, 30, 35, 32, 27, 24, 29, 26, 20];
        this.buildWeekAvailability([]);
        this.callAiWithDefaults();
        this.renderLineChart();
        this.computeFillRate();
        this.triggerCanvasCharts(this.demoHeatmap());
      }
    });
  }

  private demoHeatmap() {
    return [
      { label:'9h',  total:5, noshow:1 },
      { label:'10h', total:8, noshow:2 },
      { label:'11h', total:6, noshow:3 },
      { label:'14h', total:9, noshow:1 },
      { label:'15h', total:7, noshow:4 },
      { label:'16h', total:4, noshow:2 },
    ];
  }

  /**
   * Met les flags à true → Angular crée les canvas dans le DOM,
   * puis on dessine dedans après détection + setTimeout(0)
   */
  private triggerCanvasCharts(heatmapData: any[]): void {
    this.gaugeReady         = true;
    this.radarReady         = true;
    this.heatmapReady       = true;
    this.pendingHeatmapData = heatmapData;

    // Forcer la détection pour insérer les canvas dans le DOM
    this.cdr.detectChanges();

    // Laisser un tick au navigateur pour finaliser le rendu
    setTimeout(() => {
      if (this.viewInitDone) {
        this.drawGaugeChart();
        this.drawRadarChart();
        this.drawHeatmapChart(heatmapData);
      }
    }, 0);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // DISPONIBILITÉS
  // ───────────────────────────────────────────────────────────────────────────

  buildWeekAvailabilityFromBackend(avail: any[], appointments: any[]): void {
    const todayStr = new Date().toISOString().split('T')[0];
    this.weekAvailability = avail.map((d: any) => {
      const dateStr  = d.date;
      const takenMap = new Map<string, string>();
      appointments.forEach((apt: any) => {
        const aptDate = apt?.date?.toString().substring(0, 10);
        if (aptDate === dateStr && apt?.heure)
          takenMap.set(apt.heure.toString().substring(0, 5), 'Patient');
      });
      const takenCount = Math.max(takenMap.size, d.takenSlots ?? 0);
      const slots = this.TIME_SLOTS.map((time, idx) => ({
        time,
        status: (takenMap.has(time)
          ? 'taken'
          : idx < takenCount && takenMap.size === 0 ? 'taken' : 'free'
        ) as 'free' | 'taken' | 'break',
        patient: takenMap.has(time) ? 'Patient' : undefined
      }));
      return { label: d.dayLabel, isToday: dateStr === todayStr, free: slots.filter(s => s.status === 'free').length, slots };
    });
  }

  buildWeekAvailability(appointments: any[]): void {
    const dayNames = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
    const today    = new Date();
    const dow      = today.getDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    this.weekAvailability = dayNames.map((label, i) => {
      const date    = new Date(today);
      date.setDate(today.getDate() + mondayOffset + i);
      const dateStr = date.toISOString().split('T')[0];
      const isToday = i === (dow === 0 ? 6 : dow - 1);
      const takenMap = new Map<string, string>();
      appointments.forEach(apt => {
        if (apt?.date?.startsWith(dateStr) && apt?.heure && apt?.status === 'CONFIRMED')
          takenMap.set(apt.heure.substring(0, 5), apt.patientNom ?? 'Patient');
      });
      const slots = this.TIME_SLOTS.map(time => ({
        time,
        status: (takenMap.has(time) ? 'taken' : 'free') as 'free' | 'taken' | 'break',
        patient: takenMap.get(time)
      }));
      return { label, isToday, free: slots.filter(s => s.status === 'free').length, slots };
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // QUICKCHART
  // ───────────────────────────────────────────────────────────────────────────

  private buildQcUrl(config: object, w = 700, h = 260): string {
    const p = new URLSearchParams({
      c: JSON.stringify(config), w: String(w), h: String(h),
      bkg: 'white', f: 'png', devicePixelRatio: '2'
    });
    return `${this.QC_BASE}?${p.toString()}`;
  }

  renderLineChart(): void {
    this.lineChartLoading = true;
    const { data, labels } = this.getPeriodData();
    const c = this.C;
    const config = {
      type: 'line',
      data: { labels, datasets: [{ label: 'Consultations', data,
        borderColor: c.teal, backgroundColor: c.tealBg, borderWidth: 3,
        tension: 0.45, fill: true, pointBackgroundColor: c.teal,
        pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 5, pointHoverRadius: 8 }] },
      options: { responsive: true,
        plugins: { legend: { display: false },
          tooltip: { backgroundColor: c.dark, titleColor: '#fff', bodyColor: c.muted,
            padding: 12, cornerRadius: 10,
            callbacks: { label: (ctx: any) => ` ${ctx.raw} consultation${ctx.raw > 1 ? 's' : ''}` } } },
        scales: {
          y: { beginAtZero: true, grid: { color: c.grid }, ticks: { color: c.muted, stepSize: 2, font: { size: 11 } } },
          x: { grid: { display: false }, ticks: { color: c.muted, font: { size: 11 } } }
        }
      }
    };
    this.lineChartUrl     = this.buildQcUrl(config, 720, 250);
    this.lineChartLoading = false;
  }

  renderBarChart(specialites: { name: string; count: number }[]): void {
    this.barChartLoading = true;
    if (!specialites.length) { this.barChartLoading = false; return; }
    const c = this.C;
    const palette = [c.teal, c.amber, c.purple, c.green, c.red, c.blue, c.pink];
    const config = {
      type: 'bar',
      data: { labels: specialites.map(s => s.name),
        datasets: [{ label: 'RDV', data: specialites.map(s => s.count),
          backgroundColor: specialites.map((_, i) => palette[i % palette.length]),
          borderRadius: 8, borderWidth: 0 }] },
      options: { responsive: true,
        plugins: { legend: { display: false },
          tooltip: { backgroundColor: c.dark, titleColor: '#fff', bodyColor: c.muted,
            padding: 12, cornerRadius: 10,
            callbacks: { label: (ctx: any) => ` ${ctx.raw} rendez-vous` } } },
        scales: {
          y: { beginAtZero: true, grid: { color: c.grid }, ticks: { color: c.muted, font: { size: 11 } } },
          x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } }
        }
      }
    };
    this.barChartUrl     = this.buildQcUrl(config, 720, 280);
    this.barChartLoading = false;
  }

  renderTrendChart(monthlyTrend: any[]): void {
    this.trendChartLoading = true;
    const c = this.C;
    const config = {
      type: 'line',
      data: { labels: monthlyTrend.map(p => p.label),
        datasets: [
          { label: 'Total RDV', data: monthlyTrend.map(p => p.total),
            borderColor: c.teal, backgroundColor: c.tealBg, borderWidth: 3, tension: 0.45, fill: true,
            pointBackgroundColor: c.teal, pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 5 },
          { label: 'No Show', data: monthlyTrend.map(p => p.noshow),
            borderColor: c.red, backgroundColor: c.redBg, borderWidth: 2.5, tension: 0.45, fill: true,
            pointBackgroundColor: c.red, pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 4,
            borderDash: [6, 4] }
        ] },
      options: { responsive: true,
        plugins: {
          legend: { display: true, position: 'top', labels: { color: '#64748b', font: { size: 11 }, boxWidth: 14 } },
          tooltip: { backgroundColor: c.dark, titleColor: '#fff', bodyColor: c.muted, padding: 12, cornerRadius: 10 }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: c.grid }, ticks: { color: c.muted, font: { size: 11 } } },
          x: { grid: { display: false }, ticks: { color: c.muted, font: { size: 10 } } }
        }
      }
    };
    this.trendChartUrl     = this.buildQcUrl(config, 720, 280);
    this.trendChartLoading = false;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CHART.JS — canvas interactifs
  // ───────────────────────────────────────────────────────────────────────────

  private computeFillRate(): void {
    const taken = this.weekAvailability.reduce((acc, d) => acc + d.slots.filter(s => s.status === 'taken').length, 0);
    const total = this.weekAvailability.reduce((acc, d) => acc + d.slots.length, 0);
    this.fillRate = total > 0 ? Math.round((taken / total) * 100) : 42; // 42% démo si pas de données
  }

  drawGaugeChart(): void {
    const canvas = this.gaugeCanvasRef?.nativeElement;
    if (!canvas || typeof Chart === 'undefined') return;

    this.gaugeChart?.destroy();
    const c     = this.C;
    const rate  = this.fillRate;
    const color = rate > 75 ? c.green : rate > 40 ? c.amber : c.red;

    this.gaugeChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Occupés', 'Libres'],
        datasets: [{
          data: [rate, 100 - rate],
          backgroundColor: [color, c.grayLight],
          borderWidth: 0,
          circumference: 270,
          rotation: -135,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '78%',
        animation: { duration: 1200, easing: 'easeInOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: c.dark, titleColor: '#fff', bodyColor: c.muted,
            padding: 10, cornerRadius: 8,
            callbacks: { label: (ctx: any) => ` ${ctx.label} : ${Math.round(ctx.raw)}%` }
          }
        }
      },
      plugins: [{
        id: 'centerText',
        afterDraw(chart: any) {
          const { ctx, chartArea: { left, top, right, bottom } } = chart;
          const cx = (left + right) / 2;
          const cy = (top + bottom) / 2 + 20;
          ctx.save();
          ctx.textAlign    = 'center';
          ctx.textBaseline = 'middle';
          ctx.font         = 'bold 26px system-ui, sans-serif';
          ctx.fillStyle    = color;
          ctx.fillText(`${rate}%`, cx, cy - 10);
          ctx.font      = '12px system-ui, sans-serif';
          ctx.fillStyle = '#94a3b8';
          ctx.fillText('remplissage', cx, cy + 14);
          ctx.restore();
        }
      }]
    });
  }

  drawRadarChart(): void {
    const canvas = this.radarCanvasRef?.nativeElement;
    if (!canvas || typeof Chart === 'undefined') return;

    this.radarChart?.destroy();
    const c = this.C;

    this.radarChart = new Chart(canvas, {
      type: 'radar',
      data: {
        labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
        datasets: [{
          label: 'Consultations',
          data: this.weeklyData,
          borderColor: c.teal,
          backgroundColor: 'rgba(26,144,148,0.18)',
          pointBackgroundColor: c.teal,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverRadius: 7,
          borderWidth: 2.5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 900, easing: 'easeInOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: c.dark, titleColor: '#fff', bodyColor: c.muted,
            padding: 10, cornerRadius: 8,
            callbacks: { label: (ctx: any) => ` ${ctx.raw} consultation${ctx.raw > 1 ? 's' : ''}` }
          }
        },
        scales: {
          r: {
            beginAtZero: true,
            grid: { color: c.grid },
            ticks: { color: c.muted, font: { size: 10 }, stepSize: 2, backdropColor: 'transparent' },
            pointLabels: { color: '#64748b', font: { size: 11 } }
          }
        }
      }
    });
  }

  drawHeatmapChart(noShowByHour: any[]): void {
    const canvas = this.heatmapCanvasRef?.nativeElement;
    if (!canvas || typeof Chart === 'undefined') return;

    this.heatmapChart?.destroy();
    const c = this.C;

    this.heatmapChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: noShowByHour.map(h => h.label),
        datasets: [
          {
            label: 'Total RDV',
            data:  noShowByHour.map(h => h.total),
            backgroundColor: noShowByHour.map(h => {
              const r = h.total > 0 ? h.noshow / h.total : 0;
              return r > 0.4 ? 'rgba(239,68,68,0.22)' : r > 0.2 ? 'rgba(245,158,11,0.22)' : 'rgba(26,144,148,0.22)';
            }),
            borderColor: noShowByHour.map(h => {
              const r = h.total > 0 ? h.noshow / h.total : 0;
              return r > 0.4 ? c.red : r > 0.2 ? c.amber : c.teal;
            }),
            borderWidth: 1.5,
            borderRadius: 6,
            borderSkipped: false
          },
          {
            label: 'No Show',
            data:  noShowByHour.map(h => h.noshow),
            backgroundColor: noShowByHour.map(h => {
              const r = h.total > 0 ? h.noshow / h.total : 0;
              return r > 0.4 ? 'rgba(239,68,68,0.9)' : r > 0.2 ? 'rgba(245,158,11,0.9)' : 'rgba(239,68,68,0.6)';
            }),
            borderWidth: 0,
            borderRadius: 6,
            borderSkipped: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1000, easing: 'easeInOutQuart' },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: c.dark, titleColor: '#fff', bodyColor: c.muted,
            padding: 12, cornerRadius: 10,
            callbacks: {
              title:     (items: any[]) => `Créneau ${items[0].label}`,
              afterBody: (items: any[]) => {
                const total  = items[0]?.raw ?? 0;
                const noshow = items[1]?.raw ?? 0;
                const rate   = total > 0 ? Math.round((noshow / total) * 100) : 0;
                const risk   = rate > 40 ? '🔴 Risque élevé' : rate > 20 ? '🟡 Risque modéré' : '🟢 Risque faible';
                return ['', `Taux NS : ${rate}%  ${risk}`];
              },
              label: (ctx: any) => {
                return `${ctx.datasetIndex === 0 ? '  Présents' : '  Absents '} : ${ctx.raw}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: c.grid },
            ticks: { color: c.muted, font: { size: 11 } },
            title: { display: true, text: 'Nombre de RDV', color: c.muted, font: { size: 11 } }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#64748b', font: { size: 11 } },
            title: { display: true, text: 'Heure du rendez-vous', color: c.muted, font: { size: 11 } }
          }
        }
      }
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // IA NO-SHOW (inchangé)
  // ───────────────────────────────────────────────────────────────────────────

  private callAi(appointment: any): void {
    this.aiLoading = true; this.aiError = false;
    const date = appointment.date ? new Date(appointment.date) : new Date();
    const hour = appointment.heure ? parseInt(appointment.heure.toString().split(':')[0], 10) : 9;
    this.noshowAi.predict({
      day_of_week:     date.getDay() === 0 ? 6 : date.getDay() - 1,
      hour, specialite: appointment.specialite ?? 'Generale',
      days_until_appt: Math.max(0, Math.floor((date.getTime() - Date.now()) / 86400000)),
      previous_noshow: 0,
    }).subscribe({
      next:  r => { this.aiPrediction = r; this.aiLoading = false; },
      error: () => { this.aiError = true;  this.aiLoading = false; },
    });
  }

  private callAiWithDefaults(): void {
    this.callAi({ date: new Date(), heure: '09:00', specialite: 'Generale' });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ───────────────────────────────────────────────────────────────────────────

  changePeriod(p: string): void { this.currentPeriod = p; this.renderLineChart(); }

  private getPeriodData(): { data: number[]; labels: string[] } {
    if (this.currentPeriod === 'month') return { data: this.monthlyData, labels: ['Sem 1','Sem 2','Sem 3','Sem 4'] };
    if (this.currentPeriod === 'year')  return { data: this.yearlyData,  labels: ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'] };
    return { data: this.weeklyData, labels: ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'] };
  }

  getDay(d: string): string   { try { return new Date(d).getDate().toString(); } catch { return ''; } }
  getMonth(d: string): string {
    const m = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    try { return m[new Date(d).getMonth()]; } catch { return ''; }
  }
  getStatusText(s: string): string {
    return ({ PENDING:'En attente', CONFIRMED:'Confirmé', CANCELLED:'Annulé', DONE:'Terminé' } as any)[s] ?? s ?? '';
  }

  goToAppointments(): void { this.router.navigate(['/medecin/rendez-vous']); }
  goBack():           void { this.router.navigate(['/medecin/rendez-vous']); }
}