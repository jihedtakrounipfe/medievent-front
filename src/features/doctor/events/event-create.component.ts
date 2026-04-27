import { Component, inject, signal, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { EventService } from '../../../core/services/event.service';
import { UploadService } from '../../../core/services/upload.service';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Specialization } from '../../../core/user/enums/specialization.enum';
import { AuthFacade } from '../../../core/services/auth.facade';
import { UserService } from '../../../core/services/user.service';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { Doctor } from '../../../core/user';

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
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>

    <div class="min-h-screen bg-gray-50 font-sans text-gray-900 pb-32 animate-fade-in relative overflow-hidden">
      
      <!-- Studio Header -->
      <div class="bg-white border-b border-gray-200 py-6 sticky top-0 z-40 bg-white/90 backdrop-blur-md shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-3">
              <a routerLink="/doctor/events/my" class="text-gray-400 hover:text-gray-600 transition-colors">
                 <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </a>
              <h1 class="text-2xl font-extrabold text-gray-900 tracking-tight">{{ isEditMode() ? 'Modifier la Session' : 'Studio de Création' }}</h1>
            </div>
            <p class="text-gray-500 font-medium text-sm mt-1 ml-8">Configurez votre événement professionnel</p>
          </div>
          <div class="flex items-center gap-4">
             <div class="px-4 py-2 bg-gray-50 rounded-lg flex items-center gap-2 border border-gray-200">
                <span class="w-2.5 h-2.5 rounded-full" [ngClass]="getScore() === 100 ? 'bg-teal-500' : 'bg-amber-400 animate-pulse'"></span>
                <span class="text-xs font-bold text-gray-600">Complétude: {{ getScore() }}%</span>
             </div>
             <button (click)="onSubmit()" [disabled]="eventForm.invalid || loading()"
                     class="px-6 py-2.5 bg-teal-600 text-white font-bold text-sm rounded-xl hover:bg-teal-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                <span *ngIf="loading()" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                {{ isEditMode() ? 'Enregistrer les modifications' : 'Publier la Session' }}
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
                    <label class="block text-sm font-medium text-gray-700 mb-1">Spécialité</label>
                    <select formControlName="specialization" 
                            class="w-full px-4 py-3 bg-white border border-gray-300 focus:ring-teal-500 focus:border-teal-500 rounded-xl text-gray-900 focus:ring-2 transition-colors outline-none appearance-none">
                      <option value="" disabled>Choisir la spécialité</option>
                      <option *ngFor="let s of specializations" [value]="s">{{ formatLabel(s) }}</option>
                    </select>
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

                 <!-- Tags -->
                 <div class="pt-6 border-t border-gray-100">
                   <label class="block text-sm font-medium text-gray-700 mb-3">Tags & Catégories <span class="text-xs text-gray-400 font-normal ml-2">(Pour les recommandations)</span></label>
                   <div class="flex flex-wrap gap-2">
                     <button *ngFor="let tag of availableTags" type="button"
                             (click)="toggleTag(tag)"
                             [class]="selectedTags().includes(tag) ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300 hover:bg-teal-50'"
                             class="px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-200">
                       {{ tag }}
                     </button>
                   </div>
                 </div>
              </div>
            </div>

            <!-- Intervenant & Programme -->
            <div class="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm">
              <h3 class="text-lg font-bold text-gray-900 mb-6 flex items-center gap-3">
                 <span class="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 text-sm">3</span> 
                 Intervenant & Programme
              </h3>
              
                <div class="space-y-4">
                  <label class="block text-sm font-medium text-gray-700">Invitations : Co-présentateurs</label>
                  
                  <!-- Search Doctors -->
                  <div class="relative">
                    <div class="flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-teal-500 transition-all">
                      <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                      <input type="text" (input)="onDoctorSearch($event)" placeholder="Rechercher un docteur par nom ou spécialité..." class="bg-transparent border-none outline-none flex-1 text-sm text-gray-900 placeholder-gray-500" />
                    </div>

                    <!-- Search Results Dropdown -->
                    <div *ngIf="doctorResults().length > 0" class="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                      <div *ngFor="let doc of doctorResults()" class="p-3 hover:bg-teal-50 cursor-pointer flex items-center justify-between border-b border-gray-100 last:border-none transition-colors">
                        <div class="flex items-center gap-3">
                          <div class="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm">
                            {{ doc.firstName[0] }}{{ doc.lastName[0] }}
                          </div>
                          <div>
                            <p class="text-sm font-bold text-gray-900">{{ doc.firstName }} {{ doc.lastName }}</p>
                            <p class="text-[10px] text-gray-500 uppercase tracking-wide">{{ formatLabel(doc.specialization) }}</p>
                          </div>
                        </div>
                        <div class="flex gap-2">
                           <button (click)="addStaff(doc, 'SPEAKER')" type="button" class="text-[10px] font-bold text-teal-600 bg-teal-50 px-3 py-1.5 rounded-lg hover:bg-teal-100 transition-colors flex items-center gap-1.5">
                              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                              Présentateur
                           </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Selected Staff List -->
                  <div class="space-y-4">
                    <!-- Speakers -->
                    <div *ngIf="selectedSpeakers().length > 0">
                       <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Présentateurs / Intervenants</p>
                       <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div *ngFor="let s of selectedSpeakers()" class="bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between shadow-sm group hover:border-teal-200 transition-all">
                            <div class="flex items-center gap-3">
                              <div class="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
                                {{ s.fullName[0] }}
                              </div>
                              <div>
                                <p class="text-xs font-bold text-gray-900">{{ s.fullName }}</p>
                                <p class="text-[9px] text-gray-500">{{ s.specialization || 'Médecin' }}</p>
                              </div>
                            </div>
                            <button (click)="removeStaff(s.id, 'SPEAKER')" type="button" class="text-gray-400 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100">
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                          </div>
                       </div>
                    </div>
                  </div>

                  <div *ngIf="selectedSpeakers().length === 0" class="py-10 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center text-gray-400 bg-gray-50/30">
                    <svg class="w-10 h-10 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                    <p class="text-xs font-bold uppercase tracking-widest opacity-60">Aucun co-présentateur ajouté</p>
                  </div>

                <!-- External Speaker (Guest) -->
                <div class="pt-6 border-t border-gray-100">
                   <div class="flex items-center gap-2 mb-4">
                      <input type="checkbox" #hasExternal (change)="0" class="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500">
                      <label class="text-sm font-bold text-gray-700">Ajouter un intervenant externe (Guest)</label>
                   </div>
                   
                   <div *ngIf="hasExternal.checked" class="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                      <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Nom Complet</label>
                        <input type="text" formControlName="speakerName" placeholder="Ex: Pr. Sarah Miller" class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                      </div>
                      <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Expertise / Bio</label>
                        <input type="text" formControlName="speakerBio" placeholder="Université de Stanford..." class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                      </div>
                   </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Agenda Détaillé</label>
                  <textarea formControlName="agenda" placeholder="Chronologie de l'intervention (Optionnel)..."
                            class="w-full h-32 px-4 py-3 bg-white border border-gray-300 focus:ring-teal-500 focus:border-teal-500 rounded-xl text-gray-900 focus:ring-2 transition-colors outline-none resize-y"></textarea>
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

                    <div class="mt-auto pt-3 border-t border-gray-100 flex flex-col gap-2">
                      <span class="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none mb-1">Présentateurs ({{ selectedSpeakers().length }})</span>
                      <div class="flex -space-x-2 overflow-hidden">
                        <div *ngFor="let s of selectedSpeakers().slice(0, 4)" class="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-teal-600 text-white flex items-center justify-center text-[10px] font-bold uppercase">
                          {{ s.fullName[0] }}
                        </div>
                        <div *ngIf="selectedSpeakers().length > 4" class="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-200 text-gray-600 flex items-center justify-center text-[10px] font-bold">
                          +{{ selectedSpeakers().length - 4 }}
                        </div>
                        <div *ngIf="selectedSpeakers().length === 0" class="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-teal-50 text-teal-600 flex items-center justify-center text-[10px] font-bold border border-teal-100">
                          DR
                        </div>
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
export class EventCreateComponent implements OnInit, AfterViewInit, OnDestroy {
  private fb           = inject(FormBuilder);
  private eventService = inject(EventService);
  private uploadService = inject(UploadService);
  private userService   = inject(UserService);
  private router        = inject(Router);
  private route         = inject(ActivatedRoute);
  public authFacade     = inject(AuthFacade);

  loading         = signal(false);
  uploading       = signal(false);
  locationType    = signal<'online' | 'physical'>('online');
  selectedAddress = signal<string>('');
  
  isEditMode      = signal(false);
  eventId         = signal<number | null>(null);

  // Speaker selection state
  doctorResults = signal<Doctor[]>([]);
  selectedSpeakers = signal<{id: number, fullName: string, email: string, specialization: string}[]>([]);
  selectedModerators = signal<{id: number, fullName: string, email: string, specialization: string}[]>([]);
  private searchSubject = new Subject<string>();

  specializations = Object.values(Specialization);
  
  availableTags = [
    'Cardiologie', 'Neurologie', 'Pédiatrie', 'Oncologie', 
    'Médecine d\'urgence', 'Télémédecine', 'Santé publique', 
    'Nutrition', 'Santé mentale', 'Chirurgie', 'Dermatologie',
    'Recherche médicale', 'Gynécologie', 'Médecine interne'
  ];
  selectedTags = signal<string[]>([]);

  formatLabel(s: string | undefined | null): string {
    if (!s) return '';
    return s.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  toggleTag(tag: string) {
    const current = this.selectedTags();
    if (current.includes(tag)) {
      this.selectedTags.set(current.filter(t => t !== tag));
    } else {
      this.selectedTags.set([...current, tag]);
    }
    this.eventForm.patchValue({ tags: this.selectedTags() as any });
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
    specialization: [''],
    speakers:       [[]], // List of SpeakerDTO objects
    moderators:     [[]], // List of SpeakerDTO objects
    speakerName:    [''], // External Guest Name
    speakerBio:     [''], // External Guest Bio
    agenda:         [''],
    bannerUrl:      ['', [Validators.pattern('https?://.*')]],
    tags:           [[]]
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.eventId.set(+id);
      
      // Since edit mode implies the event is already created,
      // we remove the futureDateValidator so they can update an ongoing/past event if needed,
      // or at least not fail validation if the event just started.
      this.eventForm.controls.eventDate.setValidators([Validators.required]);
      this.eventForm.controls.eventDate.updateValueAndValidity();

      this.eventService.getEventById(+id).subscribe({
        next: (ev) => {
          // Guard: COMPLETED events cannot be edited — redirect back
          if (ev.status === 'COMPLETED') {
            alert('Cet événement est terminé et ne peut plus être modifié.');
            this.router.navigate(['/doctor/events/my']);
            return;
          }
          let formattedDate = '';
          if (ev.eventDate) {
            const d = new Date(ev.eventDate);
            const tzoffset = d.getTimezoneOffset() * 60000; // offset in milliseconds
            formattedDate = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
          }

          this.eventForm.patchValue({
            title: ev.title,
            description: ev.description,
            eventDate: formattedDate,
            location: ev.location,
            targetAudience: ev.targetAudience,
            maxParticipants: ev.maxParticipants,
            specialization: ev.specialization,
            speakerName: ev.speakerName,
            speakerBio: ev.speakerBio,
            agenda: ev.agenda,
            bannerUrl: ev.bannerUrl,
            tags: ev.tags || []
          });

          if (ev.tags && ev.tags.length > 0) {
            this.selectedTags.set(ev.tags);
          }

          // Restore speakers
          if (ev.speakers && ev.speakers.length > 0) {
            const mappedSpeakers = ev.speakers.map(s => ({
              id: s.id as number,
              fullName: s.fullName,
              email: s.email as string,
              specialization: this.formatLabel(s.specialization)
            }));
            this.selectedSpeakers.set(mappedSpeakers);
            this.eventForm.patchValue({ speakers: mappedSpeakers as any });
          }

          // Restore Location Type
          if (ev.location === 'SALLE_VIRTUELLE_INTERNE' || ev.location?.toLowerCase().includes('virtuel') || ev.location?.toLowerCase().includes('online')) {
            this.setLocationType('online');
          } else {
            this.setLocationType('physical');
            this.selectedAddress.set(ev.location || '');
          }
        },
        error: () => {
          alert('Erreur: Impossible de charger l\'événement.');
          this.router.navigate(['/doctor/events/my']);
        }
      });
    }
  }

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
    const fields = ['title', 'specialization', 'bannerUrl', 'description', 'eventDate', 'location', 'agenda'];
    const valid = fields.filter(f => this.isFieldValid(f)).length;
    const speakersValid = this.selectedSpeakers().length > 0 ? 1 : 0;
    return Math.round(((valid + speakersValid) / (fields.length + 1)) * 100);
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
  
  onDoctorSearch(event: any): void {
    const query = event.target.value;
    if (query.length < 2) {
      this.doctorResults.set([]);
      return;
    }
    this.searchSubject.next(query);
  }

  addStaff(doc: Doctor, role: 'SPEAKER' | 'MODERATOR'): void {
    const list = role === 'SPEAKER' ? this.selectedSpeakers : this.selectedModerators;
    if (list().some(s => s.id === doc.id)) {
      this.doctorResults.set([]);
      return;
    }
    const staff = {
      id: doc.id,
      fullName: `${doc.firstName} ${doc.lastName}`,
      email: doc.email,
      specialization: this.formatLabel(doc.specialization)
    };
    list.update(old => [...old, staff]);
    this.eventForm.patchValue({ 
      speakers: this.selectedSpeakers() as any,
      moderators: this.selectedModerators() as any
    });
    this.doctorResults.set([]);
  }

  removeStaff(id: number, role: 'SPEAKER' | 'MODERATOR'): void {
    const list = role === 'SPEAKER' ? this.selectedSpeakers : this.selectedModerators;
    list.update(old => old.filter(s => s.id !== id));
    this.eventForm.patchValue({ 
      speakers: this.selectedSpeakers() as any,
      moderators: this.selectedModerators() as any
    });
  }

  ngAfterViewInit(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(q => this.userService.searchUsers({ name: q, userType: 'DOCTOR' as any }))
    ).subscribe(res => {
      this.doctorResults.set(res.content as Doctor[]);
    });
  }

  setLocationType(type: 'online' | 'physical'): void {
    this.locationType.set(type);
    if (type === 'online') {
      this.eventForm.patchValue({ location: 'SALLE_VIRTUELLE_INTERNE' });
    } else {
      this.eventForm.patchValue({ location: this.selectedAddress() || '' });
    }
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

    this.map = L.map('event-map').setView([36.8065, 10.1815], 12); // Default to Tunis
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
      this.eventForm.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    
    const rawData = { ...this.eventForm.value };
    // Cleanup: Backend Enum doesn't like empty strings, map to null
    if (!rawData.specialization) rawData.specialization = null as any;

    const obs$ = this.isEditMode() && this.eventId()
      ? this.eventService.updateEvent(this.eventId()!, rawData as any)
      : this.eventService.createEvent(rawData as any);

    obs$.subscribe({
      next:  () => this.router.navigate(['/doctor/events/my']),
      error: (err) => {
        this.loading.set(false);
        const msg = err.error?.message || (this.isEditMode() ? "Erreur lors de la modification." : "Erreur lors de la création.");
        alert("🔥 BACKEND ERROR: " + msg);
      }
    });
  }
}
