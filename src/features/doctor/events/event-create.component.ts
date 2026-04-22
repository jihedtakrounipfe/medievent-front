import { Component, inject, signal, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EventService } from '../../../core/services/event.service';
import { UploadService } from '../../../core/services/upload.service';
import { Router } from '@angular/router';
import { Specialization } from '../../../core/user/enums/specialization.enum';
import { AuthFacade } from '../../../core/services/auth.facade';

@Component({
  selector: 'app-event-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>

    <div class="min-h-screen bg-slate-50 font-sans text-slate-900 pb-32 animate-fade-in relative overflow-hidden">
      
      <!-- Studio Header -->
      <div class="bg-white border-b border-slate-200 py-10 sticky top-0 z-40 bg-white/80 backdrop-blur-md">
        <div class="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h1 class="text-3xl font-black text-slate-900 tracking-tightest">Studio de Création</h1>
            <p class="text-slate-500 font-medium text-sm mt-1">Configurez votre événement professionnel</p>
          </div>
          <div class="flex items-center gap-4">
             <div class="px-4 py-2 bg-slate-100 rounded-xl flex items-center gap-2">
                <span class="w-2 h-2 rounded-full" [ngClass]="getScore() === 100 ? 'bg-emerald-500' : 'bg-amber-400'"></span>
                <span class="text-xs font-bold text-slate-600">Complétude: {{ getScore() }}%</span>
             </div>
             <button (click)="onSubmit()" [disabled]="eventForm.invalid || loading()"
                     class="px-8 py-3 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center gap-2">
                <span *ngIf="loading()" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Publier la Session
             </button>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-6 lg:px-12 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        <!-- Left Column: Studio Form (70%) -->
        <div class="lg:col-span-7 space-y-10">
          <form [formGroup]="eventForm" class="space-y-10">
            
            <!-- Informations Essentielles -->
            <div class="bg-white p-8 lg:p-10 rounded-[2rem] border border-slate-200 shadow-sm relative">
              <div class="absolute top-0 left-0 w-2 h-full bg-blue-500 rounded-l-[2rem]"></div>
              <h3 class="text-lg font-black text-slate-900 mb-8 uppercase tracking-widest flex items-center gap-3">
                 <span class="text-blue-500 text-2xl">01</span> Informations Essentielles
              </h3>
              
              <div class="space-y-8">
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Titre de l'événement</label>
                  <input type="text" formControlName="title" placeholder="Titre accrocheur..."
                         class="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl text-base font-bold focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none" />
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Spécialité</label>
                    <select formControlName="specialization" class="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-100 transition-all outline-none appearance-none">
                      <option value="" disabled>Choisir la spécialité</option>
                      <option *ngFor="let s of specializations" [value]="s">{{ formatLabel(s) }}</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Image (URL ou Fichier)</label>
                    <div class="flex items-center gap-2">
                       <input type="text" formControlName="bannerUrl" placeholder="https://" class="flex-1 px-4 py-4 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 outline-none" />
                       <input type="file" #fileInput (change)="onFileSelected($event)" accept="image/*" class="hidden" />
                       <button type="button" (click)="fileInput.click()" [disabled]="uploading()" class="w-14 h-12 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl flex items-center justify-center transition-colors">
                          <span *ngIf="uploading()" class="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                          <svg *ngIf="!uploading()" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                       </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Résumé / Description</label>
                  <textarea formControlName="description" placeholder="Présentez le sujet et les objectifs..."
                            class="w-full h-32 px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 outline-none resize-none"></textarea>
                </div>
              </div>
            </div>

            <!-- Configuration Modale -->
            <div class="bg-white p-8 lg:p-10 rounded-[2rem] border border-slate-200 shadow-sm relative">
              <div class="absolute top-0 left-0 w-2 h-full bg-indigo-500 rounded-l-[2rem]"></div>
              <h3 class="text-lg font-black text-slate-900 mb-8 uppercase tracking-widest flex items-center gap-3">
                 <span class="text-indigo-500 text-2xl">02</span> Déroulement & Accès
              </h3>
              
              <div class="space-y-8">
                 <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Date & Heure</label>
                      <input type="datetime-local" formControlName="eventDate" class="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-100" />
                    </div>
                    <div>
                      <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Capacité Max</label>
                      <input type="number" formControlName="maxParticipants" class="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-100" />
                    </div>
                 </div>

                 <!-- Localisation -->
                 <div>
                    <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Format Spatial</label>
                    <div class="flex bg-slate-50 p-1.5 rounded-2xl mb-4">
                       <button type="button" (click)="setLocationType('online')" [class]="locationType() === 'online' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:bg-slate-100'" class="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all">Digital 🌐</button>
                       <button type="button" (click)="setLocationType('physical')" [class]="locationType() === 'physical' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:bg-slate-100'" class="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all">Présentiel 📍</button>
                    </div>

                    <div *ngIf="locationType() === 'physical'" class="animate-fade-in border border-slate-100 rounded-3xl overflow-hidden relative">
                       <div *ngIf="selectedAddress()" class="absolute top-4 left-4 right-4 bg-white/90 backdrop-blur pb-1 px-4 py-3 border border-slate-200 rounded-xl z-[1000] shadow-sm flex items-center gap-2">
                          <span>📍</span> <span class="text-xs font-bold text-slate-800 line-clamp-1">{{ selectedAddress() }}</span>
                       </div>
                       <div id="event-map" class="h-64 w-full bg-slate-100"></div>
                    </div>
                 </div>

                 <!-- Audience -->
                 <div class="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <p class="text-xs font-black text-slate-900 uppercase tracking-widest">Audience Publique</p>
                      <p class="text-[10px] text-slate-500 mt-1">Visible par les patients et les médecins</p>
                    </div>
                    <button type="button" (click)="toggleAudience()" [class.bg-indigo-500]="eventForm.value.targetAudience === 'PUBLIC'" class="w-14 h-7 bg-slate-200 rounded-full relative transition-colors duration-300">
                       <div [class.translate-x-7]="eventForm.value.targetAudience === 'PUBLIC'" class="absolute left-1 top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300"></div>
                    </button>
                 </div>
              </div>
            </div>

            <!-- Intervenant & Programme -->
            <div class="bg-white p-8 lg:p-10 rounded-[2rem] border border-slate-200 shadow-sm relative">
              <div class="absolute top-0 left-0 w-2 h-full bg-emerald-500 rounded-l-[2rem]"></div>
              <h3 class="text-lg font-black text-slate-900 mb-8 uppercase tracking-widest flex items-center gap-3">
                 <span class="text-emerald-500 text-2xl">03</span> Intervenant & Programme
              </h3>
              
              <div class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
                   <div class="md:col-span-4">
                     <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Intervenant</label>
                     <input type="text" formControlName="speakerName" placeholder="Pr. Nom" class="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-100" />
                   </div>
                   <div class="md:col-span-8">
                     <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Biographie</label>
                     <input type="text" formControlName="speakerBio" placeholder="Expertise, Titres..." class="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-100" />
                   </div>
                </div>

                <div>
                  <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Agenda Détaillé</label>
                  <textarea formControlName="agenda" placeholder="Chronologie de l'intervention..."
                            class="w-full h-32 px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-100 outline-none resize-none"></textarea>
                </div>
              </div>
            </div>

          </form>
        </div>

        <!-- Right Column: Live Preview & Checklist (30%) -->
        <div class="lg:col-span-5 relative">
          <div class="sticky top-32 space-y-8">
            
            <!-- Live Preview Card -->
            <div>
               <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Aperçu en direct</h4>
               <div class="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl shadow-slate-200/50 flex flex-col pointer-events-none transform scale-[0.95] origin-top">
                  <div class="relative h-48 w-full bg-slate-100">
                    <img *ngIf="eventForm.value.bannerUrl" [src]="eventForm.value.bannerUrl" class="w-full h-full object-cover" alt="Preview Thumbnail"/>
                    <div *ngIf="!eventForm.value.bannerUrl" class="w-full h-full flex items-center justify-center text-5xl opacity-20 filter grayscale">📸</div>
                    
                    <div class="absolute top-4 left-4 flex flex-col gap-2 z-[50]">
                       <span *ngIf="eventForm.value.specialization" class="w-fit px-3 py-1 bg-white/90 backdrop-blur-md rounded-lg text-[9px] font-bold text-slate-900 border border-slate-200 uppercase tracking-widest shadow-sm">
                          {{ formatLabel(eventForm.value.specialization) }}
                       </span>
                    </div>

                    <div class="absolute top-4 right-4 z-[50]">
                       <span [class]="locationType() === 'online' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-900 text-white border-slate-800'" 
                             class="px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest border shadow-xl flex items-center gap-1.5">
                          <span class="w-1 h-1 rounded-full bg-white animate-pulse"></span>
                          {{ locationType() === 'online' ? 'En ligne' : 'Présentiel' }}
                       </span>
                    </div>
                  </div>

                  <div class="p-6 flex-1 flex flex-col">
                    <div class="flex items-center gap-2 mb-4 text-slate-400 text-[9px] font-bold uppercase tracking-widest leading-none">
                      <span>{{ (eventForm.value.eventDate | date:'dd MMM') || 'Date' }}</span>
                      <span class="w-1 h-1 rounded-full bg-slate-200"></span>
                      <span>{{ (eventForm.value.eventDate | date:'HH:mm') || 'Heure' }}</span>
                    </div>

                    <h3 class="text-lg font-bold text-slate-900 mb-6 leading-tight line-clamp-2 tracking-tightest">
                      {{ eventForm.value.title || 'Titre de votre événement' }}
                    </h3>

                    <div class="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-base grayscale shadow-inner">👨‍⚕️</div>
                        <div class="flex flex-col">
                          <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Conférencier</span>
                          <span class="text-[10px] font-bold text-slate-700">Dr. {{ eventForm.value.speakerName || 'Nom' }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
               </div>
            </div>

            <!-- Dynamic Checklist Assistant -->
            <div class="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm">
               <h4 class="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-6">Assistant de Qualité</h4>
               <ul class="space-y-4">
                  <li class="flex items-center gap-3 text-sm font-semibold transition-colors duration-300" [ngClass]="isFieldValid('title') ? 'text-emerald-600' : 'text-slate-400'">
                     <div class="w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors duration-300" [ngClass]="isFieldValid('title') ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'">
                        <svg *ngIf="isFieldValid('title')" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                     </div>
                     Titre percutant (min 5 car.)
                  </li>
                  <li class="flex items-center gap-3 text-sm font-semibold transition-colors duration-300" [ngClass]="isFieldValid('specialization') && isFieldValid('bannerUrl') ? 'text-emerald-600' : 'text-slate-400'">
                     <div class="w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors duration-300" [ngClass]="isFieldValid('specialization') && isFieldValid('bannerUrl') ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'">
                        <svg *ngIf="isFieldValid('specialization') && isFieldValid('bannerUrl')" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                     </div>
                     Identité visuelle & Spécialité
                  </li>
                  <li class="flex items-center gap-3 text-sm font-semibold transition-colors duration-300" [ngClass]="isFieldValid('eventDate') && isFieldValid('location') ? 'text-emerald-600' : 'text-slate-400'">
                     <div class="w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors duration-300" [ngClass]="isFieldValid('eventDate') && isFieldValid('location') ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'">
                        <svg *ngIf="isFieldValid('eventDate') && isFieldValid('location')" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                     </div>
                     Logistique (Date & Lieu)
                  </li>
                  <li class="flex items-center gap-3 text-sm font-semibold transition-colors duration-300" [ngClass]="isFieldValid('speakerName') && isFieldValid('agenda') ? 'text-emerald-600' : 'text-slate-400'">
                     <div class="w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors duration-300" [ngClass]="isFieldValid('speakerName') && isFieldValid('agenda') ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'">
                        <svg *ngIf="isFieldValid('speakerName') && isFieldValid('agenda')" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                     </div>
                     Programme et Intervenant
                  </li>
               </ul>
            </div>

          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tracking-tightest { letter-spacing: -0.06em; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fade-in { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  `]
})
export class EventCreateComponent implements AfterViewInit, OnDestroy {
  private fb           = inject(FormBuilder);
  private eventService = inject(EventService);
  private uploadService = inject(UploadService);
  private router       = inject(Router);
  public authFacade   = inject(AuthFacade);

  loading         = signal(false);
  uploading       = signal(false);
  locationType    = signal<'online' | 'physical'>('online');
  selectedAddress = signal<string>('');

  specializations = Object.values(Specialization);

  formatLabel(s: string): string {
    if (!s) return '';
    return s.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  private map:    any = null;
  private marker: any = null;

  eventForm = this.fb.group({
    title:          ['', [Validators.required, Validators.minLength(5)]],
    description:    ['', [Validators.required]],
    eventDate:      ['', [Validators.required]],
    location:       ['SALLE_VIRTUELLE_INTERNE', [Validators.required]],
    targetAudience: ['DOCTORS_ONLY', [Validators.required]],
    maxParticipants:[50, [Validators.min(1)]],
    specialization: ['', [Validators.required]],
    speakerName:    ['', [Validators.required]],
    speakerBio:     ['', [Validators.required]],
    agenda:         ['', [Validators.required]],
    bannerUrl:      ['', [Validators.pattern('https?://.*')]]
  });

  // Checklist helper
  isFieldValid(field: string): boolean {
    const ctrl = this.eventForm.get(field);
    return !!(ctrl && ctrl.valid && (ctrl.dirty || ctrl.touched || ctrl.value));
  }

  getScore(): number {
    const fields = ['title', 'specialization', 'bannerUrl', 'description', 'eventDate', 'location', 'speakerName', 'speakerBio', 'agenda'];
    const valid = fields.filter(f => this.isFieldValid(f)).length;
    return Math.round((valid / fields.length) * 100);
  }

  toggleAudience(): void {
    const current = this.eventForm.value.targetAudience;
    this.eventForm.patchValue({ targetAudience: current === 'PUBLIC' ? 'DOCTORS_ONLY' : 'PUBLIC' });
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.uploading.set(true);
      this.uploadService.uploadImage(file).subscribe({
        next: (res) => {
          this.eventForm.patchValue({ bannerUrl: res.url });
          this.uploading.set(false);
        },
        error: () => {
          this.uploading.set(false);
          alert("Erreur lors de l'upload de l'image.");
        }
      });
    }
  }

  ngAfterViewInit(): void {}

  setLocationType(type: 'online' | 'physical'): void {
    this.locationType.set(type);
    if (type === 'online') {
      this.eventForm.patchValue({ location: 'SALLE_VIRTUELLE_INTERNE' });
    } else {
      this.eventForm.patchValue({ location: '' });
    }
    this.selectedAddress.set('');
    if (type === 'physical') {
      setTimeout(() => this.initMap(), 150);
    } else {
      this.destroyMap();
    }
  }

  private initMap(): void {
    if (this.map) return;
    const L = (window as any).L;
    if (!L) {
      const script  = document.createElement('script');
      script.src    = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => this.buildMap();
      document.head.appendChild(script);
    } else {
      this.buildMap();
    }
  }

  private buildMap(): void {
    const L     = (window as any).L;
    const mapEl = document.getElementById('event-map');
    if (!mapEl || this.map) return;

    // Use default coordinates or current location if possible. Defaulting to Paris for now.
    this.map = L.map('event-map').setView([48.8566, 2.3522], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    this.map.on('click', (e: any) => {
      const { lat, lng } = e.latlng;
      if (this.marker) this.marker.remove();
      this.marker = L.marker([lat, lng]).addTo(this.map);

      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
        .then(r => r.json())
        .then(data => {
          const address = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          this.selectedAddress.set(address);
          this.eventForm.patchValue({ location: address });
          this.marker.bindPopup(`<b>📍 ${address}</b>`).openPopup();
        })
    });
  }

  private destroyMap(): void {
    if (this.map) { this.map.remove(); this.map = null; this.marker = null; }
  }

  ngOnDestroy(): void { this.destroyMap(); }

  onSubmit(): void {
    if (this.eventForm.invalid) {
      // Mark all fields as touched to trigger validation visuals
      this.eventForm.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.eventService.createEvent(this.eventForm.value as any).subscribe({
      next:  () => this.router.navigate(['/doctor/events/my']),
      error: () => {
        this.loading.set(false);
        alert("Erreur lors de la création de l'événement.");
      }
    });
  }
}
