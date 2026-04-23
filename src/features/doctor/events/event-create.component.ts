import { Component, inject, signal, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { EventService } from '../../../core/services/event.service';
import { UploadService } from '../../../core/services/upload.service';
import { Router } from '@angular/router';
import { Specialization } from '../../../core/user/enums/specialization.enum';
import { AuthFacade } from '../../../core/services/auth.facade';

export function futureDateValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }
    const selectedDate = new Date(control.value).getTime();
    const now = new Date().getTime();
    return selectedDate <= now ? { pastDate: true } : null;
  };
}
@Component({
  selector: 'app-event-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>

    <div class="min-h-screen bg-gray-50 font-sans text-gray-900 pb-32 animate-fade-in relative overflow-hidden">
      
      <!-- Studio Header -->
      <div class="bg-white border-b border-gray-200 py-6 sticky top-0 z-40 bg-white/90 backdrop-blur-md shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-extrabold text-gray-900 tracking-tight">Studio de Création</h1>
            <p class="text-gray-500 font-medium text-sm mt-1">Configurez votre événement professionnel</p>
          </div>
          <div class="flex items-center gap-4">
             <div class="px-4 py-2 bg-gray-50 rounded-lg flex items-center gap-2 border border-gray-200">
                <span class="w-2.5 h-2.5 rounded-full" [ngClass]="getScore() === 100 ? 'bg-teal-500' : 'bg-amber-400 animate-pulse'"></span>
                <span class="text-xs font-bold text-gray-600">Complétude: {{ getScore() }}%</span>
             </div>
             <button (click)="onSubmit()" [disabled]="eventForm.invalid || loading()"
                     class="px-6 py-2.5 bg-teal-600 text-white font-bold text-sm rounded-xl hover:bg-teal-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                <span *ngIf="loading()" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Publier la Session
             </button>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <!-- Left Column: Studio Form (70%) -->
        <div class="lg:col-span-8 space-y-8">
          <form [formGroup]="eventForm" class="space-y-8">
            
            <!-- Informations Essentielles -->
            <div class="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm">
              <h3 class="text-lg font-bold text-gray-900 mb-6 flex items-center gap-3">
                 <span class="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-50 text-teal-600 text-sm">1</span> 
                 Informations Essentielles
              </h3>
              
              <div class="space-y-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Titre de l'événement <span class="text-red-500">*</span></label>
                  <input type="text" formControlName="title" placeholder="Ex: Congrès Annuel de Cardiologie"
                         [ngClass]="{'border-red-500 focus:ring-red-500 focus:border-red-500': isFieldInvalid('title'), 'border-gray-300 focus:ring-teal-500 focus:border-teal-500': !isFieldInvalid('title')}"
                         class="w-full px-4 py-3 bg-white border rounded-xl text-gray-900 focus:ring-2 transition-colors outline-none" />
                  <p *ngIf="isFieldInvalid('title')" class="mt-1 text-xs text-red-500">Le titre est requis (min 5 caractères).</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Spécialité <span class="text-red-500">*</span></label>
                    <select formControlName="specialization" 
                            [ngClass]="{'border-red-500 focus:ring-red-500 focus:border-red-500': isFieldInvalid('specialization'), 'border-gray-300 focus:ring-teal-500 focus:border-teal-500': !isFieldInvalid('specialization')}"
                            class="w-full px-4 py-3 bg-white border rounded-xl text-gray-900 focus:ring-2 transition-colors outline-none appearance-none">
                      <option value="" disabled>Choisir la spécialité</option>
                      <option *ngFor="let s of specializations" [value]="s">{{ formatLabel(s) }}</option>
                    </select>
                    <p *ngIf="isFieldInvalid('specialization')" class="mt-1 text-xs text-red-500">Veuillez sélectionner une spécialité.</p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Image de couverture</label>
                    <div class="flex items-center gap-2">
                       <input type="text" formControlName="bannerUrl" placeholder="https://" 
                              [ngClass]="{'border-red-500 focus:ring-red-500 focus:border-red-500': isFieldInvalid('bannerUrl'), 'border-gray-300 focus:ring-teal-500 focus:border-teal-500': !isFieldInvalid('bannerUrl')}"
                              class="flex-1 px-4 py-3 bg-white border rounded-xl text-gray-900 focus:ring-2 transition-colors outline-none" />
                       <input type="file" #fileInput (change)="onFileSelected($event)" accept="image/*" class="hidden" />
                       <button type="button" (click)="fileInput.click()" [disabled]="uploading()" class="w-12 h-12 bg-gray-50 border border-gray-300 hover:bg-gray-100 text-gray-600 rounded-xl flex items-center justify-center transition-colors">
                          <span *ngIf="uploading()" class="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                          <svg *ngIf="!uploading()" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                       </button>
                    </div>
                    <p *ngIf="isFieldInvalid('bannerUrl')" class="mt-1 text-xs text-red-500">Format d'URL invalide.</p>
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Résumé / Description <span class="text-red-500">*</span></label>
                  <textarea formControlName="description" placeholder="Présentez le sujet et les objectifs..."
                            [ngClass]="{'border-red-500 focus:ring-red-500 focus:border-red-500': isFieldInvalid('description'), 'border-gray-300 focus:ring-teal-500 focus:border-teal-500': !isFieldInvalid('description')}"
                            class="w-full h-32 px-4 py-3 bg-white border rounded-xl text-gray-900 focus:ring-2 transition-colors outline-none resize-y"></textarea>
                  <p *ngIf="isFieldInvalid('description')" class="mt-1 text-xs text-red-500">La description est requise.</p>
                </div>
              </div>
            </div>

            <!-- Configuration Modale -->
            <div class="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm">
              <h3 class="text-lg font-bold text-gray-900 mb-6 flex items-center gap-3">
                 <span class="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 text-sm">2</span> 
                 Déroulement & Accès
              </h3>
              
              <div class="space-y-6">
                 <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Date & Heure <span class="text-red-500">*</span></label>
                      <input type="datetime-local" formControlName="eventDate" 
                             [ngClass]="{'border-red-500 focus:ring-red-500 focus:border-red-500': isFieldInvalid('eventDate'), 'border-gray-300 focus:ring-teal-500 focus:border-teal-500': !isFieldInvalid('eventDate')}"
                             class="w-full px-4 py-3 bg-white border rounded-xl text-gray-900 focus:ring-2 transition-colors outline-none" />
                      <div *ngIf="isFieldInvalid('eventDate')" class="mt-1 text-xs text-red-500">
                         <p *ngIf="eventForm.get('eventDate')?.hasError('required')">La date est requise.</p>
                         <p *ngIf="eventForm.get('eventDate')?.hasError('pastDate')">La date doit être ultérieure à aujourd'hui.</p>
                      </div>
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Capacité Max</label>
                      <input type="number" formControlName="maxParticipants" 
                             [ngClass]="{'border-red-500 focus:ring-red-500 focus:border-red-500': isFieldInvalid('maxParticipants'), 'border-gray-300 focus:ring-teal-500 focus:border-teal-500': !isFieldInvalid('maxParticipants')}"
                             class="w-full px-4 py-3 bg-white border rounded-xl text-gray-900 focus:ring-2 transition-colors outline-none" />
                      <p *ngIf="isFieldInvalid('maxParticipants')" class="mt-1 text-xs text-red-500">La capacité doit être au moins 1.</p>
                    </div>
                 </div>

                 <!-- Localisation -->
                 <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Format Spatial <span class="text-red-500">*</span></label>
                    <div class="flex bg-gray-100 p-1 rounded-xl mb-4">
                       <button type="button" (click)="setLocationType('online')" [class]="locationType() === 'online' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'" class="flex-1 py-2 rounded-lg text-sm font-medium transition-all">Digital (Visio)</button>
                       <button type="button" (click)="setLocationType('physical')" [class]="locationType() === 'physical' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'" class="flex-1 py-2 rounded-lg text-sm font-medium transition-all">Présentiel</button>
                    </div>

                    <div *ngIf="locationType() === 'physical'" class="animate-fade-in">
                       <p class="text-xs text-gray-500 mb-2">Cliquez sur la carte pour définir l'adresse exacte.</p>
                       <div class="border border-gray-300 rounded-xl overflow-hidden relative shadow-inner">
                         <div *ngIf="selectedAddress()" class="absolute top-4 left-4 right-4 bg-white/95 backdrop-blur px-4 py-2 border border-gray-200 rounded-lg z-[1000] shadow-sm flex items-center gap-2">
                            <span>📍</span> <span class="text-xs font-medium text-gray-800 truncate">{{ selectedAddress() }}</span>
                         </div>
                         <div id="event-map" class="h-64 w-full bg-gray-200"></div>
                       </div>
                       <p *ngIf="isFieldInvalid('location')" class="mt-1 text-xs text-red-500">Veuillez sélectionner une adresse sur la carte.</p>
                    </div>
                 </div>

                 <!-- Audience -->
                 <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div>
                      <p class="text-sm font-bold text-gray-900">Audience Publique</p>
                      <p class="text-xs text-gray-500 mt-0.5">Rendre visible par les patients et les médecins</p>
                    </div>
                    <button type="button" (click)="toggleAudience()" [class.bg-teal-500]="eventForm.value.targetAudience === 'PUBLIC'" [class.bg-gray-300]="eventForm.value.targetAudience !== 'PUBLIC'" class="w-12 h-6 rounded-full relative transition-colors duration-300">
                       <div [class.translate-x-6]="eventForm.value.targetAudience === 'PUBLIC'" class="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300"></div>
                    </button>
                 </div>
              </div>
            </div>

            <!-- Intervenant & Programme -->
            <div class="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm">
              <h3 class="text-lg font-bold text-gray-900 mb-6 flex items-center gap-3">
                 <span class="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 text-sm">3</span> 
                 Intervenant & Programme
              </h3>
              
              <div class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
                   <div class="md:col-span-4">
                     <label class="block text-sm font-medium text-gray-700 mb-1">Intervenant <span class="text-red-500">*</span></label>
                     <input type="text" formControlName="speakerName" placeholder="Dr. Dupont" 
                            [ngClass]="{'border-red-500 focus:ring-red-500 focus:border-red-500': isFieldInvalid('speakerName'), 'border-gray-300 focus:ring-teal-500 focus:border-teal-500': !isFieldInvalid('speakerName')}"
                            class="w-full px-4 py-3 bg-white border rounded-xl text-gray-900 focus:ring-2 transition-colors outline-none" />
                     <p *ngIf="isFieldInvalid('speakerName')" class="mt-1 text-xs text-red-500">Requis.</p>
                   </div>
                   <div class="md:col-span-8">
                     <label class="block text-sm font-medium text-gray-700 mb-1">Biographie brève <span class="text-red-500">*</span></label>
                     <input type="text" formControlName="speakerBio" placeholder="Expertise, Titres..." 
                            [ngClass]="{'border-red-500 focus:ring-red-500 focus:border-red-500': isFieldInvalid('speakerBio'), 'border-gray-300 focus:ring-teal-500 focus:border-teal-500': !isFieldInvalid('speakerBio')}"
                            class="w-full px-4 py-3 bg-white border rounded-xl text-gray-900 focus:ring-2 transition-colors outline-none" />
                     <p *ngIf="isFieldInvalid('speakerBio')" class="mt-1 text-xs text-red-500">Requis.</p>
                   </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Agenda Détaillé <span class="text-red-500">*</span></label>
                  <textarea formControlName="agenda" placeholder="Chronologie de l'intervention..."
                            [ngClass]="{'border-red-500 focus:ring-red-500 focus:border-red-500': isFieldInvalid('agenda'), 'border-gray-300 focus:ring-teal-500 focus:border-teal-500': !isFieldInvalid('agenda')}"
                            class="w-full h-32 px-4 py-3 bg-white border rounded-xl text-gray-900 focus:ring-2 transition-colors outline-none resize-y"></textarea>
                  <p *ngIf="isFieldInvalid('agenda')" class="mt-1 text-xs text-red-500">L'agenda est requis.</p>
                </div>
              </div>
            </div>

          </form>
        </div>

        <!-- Right Column: Live Preview & Checklist (30%) -->
        <div class="lg:col-span-4 relative">
          <div class="sticky top-28 space-y-6">
            
            <!-- Live Preview Card -->
            <div>
               <h4 class="text-sm font-bold text-gray-900 mb-3 px-1">Aperçu</h4>
               <div class="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm flex flex-col pointer-events-none transition-all">
                  <div class="relative h-40 w-full bg-gray-100">
                    <img *ngIf="eventForm.value.bannerUrl" [src]="eventForm.value.bannerUrl" class="w-full h-full object-cover" alt="Preview Thumbnail"/>
                    <div *ngIf="!eventForm.value.bannerUrl" class="w-full h-full flex items-center justify-center text-gray-300">
                      <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    </div>
                    
                    <div class="absolute top-3 left-3 z-[50]">
                       <span *ngIf="eventForm.value.specialization" class="px-2 py-1 bg-white/90 backdrop-blur text-xs font-bold text-teal-800 rounded-md border border-teal-100 shadow-sm">
                          {{ formatLabel(eventForm.value.specialization) }}
                       </span>
                    </div>

                    <div class="absolute top-3 right-3 z-[50]">
                       <span [class]="locationType() === 'online' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'" 
                             class="px-2 py-1 rounded-md text-[10px] font-bold border shadow-sm flex items-center gap-1.5">
                          <span class="w-1.5 h-1.5 rounded-full" [ngClass]="locationType() === 'online' ? 'bg-blue-600 animate-pulse' : 'bg-gray-500'"></span>
                          {{ locationType() === 'online' ? 'En ligne' : 'Présentiel' }}
                       </span>
                    </div>
                  </div>

                  <div class="p-5 flex-1 flex flex-col">
                    <div class="flex items-center text-xs text-gray-500 font-medium mb-3">
                       <svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                       {{ (eventForm.value.eventDate | date:'dd MMM à HH:mm') || 'Date' }}
                    </div>

                    <h3 class="text-base font-bold text-gray-900 mb-4 line-clamp-2 leading-tight">
                      {{ eventForm.value.title || 'Titre de votre événement' }}
                    </h3>

                    <div class="mt-auto pt-3 border-t border-gray-100 flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center text-sm font-bold border border-teal-100">Dr</div>
                      <div class="flex flex-col">
                        <span class="text-[10px] text-gray-500 font-medium leading-none mb-1">Conférencier</span>
                        <span class="text-xs font-bold text-gray-900">Dr. {{ eventForm.value.speakerName || 'Nom' }}</span>
                      </div>
                    </div>
                  </div>
               </div>
            </div>

            <!-- Dynamic Checklist Assistant -->
            <div class="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
               <h4 class="text-sm font-bold text-gray-900 mb-4">Assistant de Qualité</h4>
               <ul class="space-y-3">
                  <li class="flex items-center gap-3 text-sm transition-colors duration-300" [ngClass]="isFieldValid('title') ? 'text-teal-700 font-medium' : 'text-gray-500'">
                     <div class="w-5 h-5 rounded-full flex items-center justify-center border transition-colors duration-300" [ngClass]="isFieldValid('title') ? 'border-teal-500 bg-teal-50 text-teal-600' : 'border-gray-300'">
                        <svg *ngIf="isFieldValid('title')" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                     </div>
                     Titre percutant (min 5 car.)
                  </li>
                  <li class="flex items-center gap-3 text-sm transition-colors duration-300" [ngClass]="isFieldValid('specialization') && isFieldValid('description') ? 'text-teal-700 font-medium' : 'text-gray-500'">
                     <div class="w-5 h-5 rounded-full flex items-center justify-center border transition-colors duration-300" [ngClass]="isFieldValid('specialization') && isFieldValid('description') ? 'border-teal-500 bg-teal-50 text-teal-600' : 'border-gray-300'">
                        <svg *ngIf="isFieldValid('specialization') && isFieldValid('description')" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                     </div>
                     Spécialité & Description
                  </li>
                  <li class="flex items-center gap-3 text-sm transition-colors duration-300" [ngClass]="isFieldValid('eventDate') && isFieldValid('location') ? 'text-teal-700 font-medium' : 'text-gray-500'">
                     <div class="w-5 h-5 rounded-full flex items-center justify-center border transition-colors duration-300" [ngClass]="isFieldValid('eventDate') && isFieldValid('location') ? 'border-teal-500 bg-teal-50 text-teal-600' : 'border-gray-300'">
                        <svg *ngIf="isFieldValid('eventDate') && isFieldValid('location')" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                     </div>
                     Logistique (Date & Lieu)
                  </li>
                  <li class="flex items-center gap-3 text-sm transition-colors duration-300" [ngClass]="isFieldValid('speakerName') && isFieldValid('agenda') ? 'text-teal-700 font-medium' : 'text-gray-500'">
                     <div class="w-5 h-5 rounded-full flex items-center justify-center border transition-colors duration-300" [ngClass]="isFieldValid('speakerName') && isFieldValid('agenda') ? 'border-teal-500 bg-teal-50 text-teal-600' : 'border-gray-300'">
                        <svg *ngIf="isFieldValid('speakerName') && isFieldValid('agenda')" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
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
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
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
    eventDate:      ['', [Validators.required, futureDateValidator()]],
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

  isFieldInvalid(field: string): boolean {
    const ctrl = this.eventForm.get(field);
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
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
