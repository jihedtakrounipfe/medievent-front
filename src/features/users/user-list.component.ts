import {
  Component, OnInit, OnDestroy, HostListener,
  inject, signal, computed, Input, Output, EventEmitter
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';

// ─── Models ──────────────────────────────────────────────────────────────────
export type UserType = 'PATIENT' | 'DOCTOR' | 'ADMINISTRATOR' | 'INSTITUTION';

export interface AppUserResponse {
  id:                 number;
  firstName:          string;
  lastName:           string;
  email:              string;
  phone?:             string;
  userType:           UserType;
  isActive:           boolean;
  profilePicture?:    string;
  createdAt:          string;
  // Doctor fields
  specialization?:    string;
  officeAddress?:     string;
  isVerified?:        boolean;
  rppsNumber?:        string;
  consultationDuration?: number;
  // Patient fields
  bloodType?:         string;
  biometricEnrolled?: boolean;
  dateOfBirth?:       string;
  gender?:            string;
  allergies?:         string;
}

export interface PageResponse<T> {
  content:       T[];
  totalElements: number;
  totalPages:    number;
  number:        number;
  size:          number;
}

// ─── User Detail Modal ────────────────────────────────────────────────────────
@Component({
  selector: 'app-user-detail-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Backdrop -->
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4
             bg-black/40 backdrop-blur-sm"
      style="animation: fadeIn 0.18s ease forwards"
      (click)="onBackdropClick($event)">

      <!-- Panel -->
      <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
           style="animation: modalIn 0.26s cubic-bezier(0.16,1,0.3,1) forwards">

        <!-- Gradient top bar -->
        <div class="h-1 w-full"
             style="background: linear-gradient(90deg, #2dd4bf, #0d9488, #0f766e)"></div>

        <!-- Hero banner with avatar -->
        <div class="relative px-6 pt-6 pb-5"
             style="background: linear-gradient(160deg, #f0fdfa 0%, #ffffff 100%)">

          <div class="flex items-start gap-4">
            <!-- Avatar -->
            <div class="relative flex-shrink-0">
              @if (user.profilePicture) {
                <img [src]="user.profilePicture" [alt]="fullName()"
                     class="w-16 h-16 rounded-2xl object-cover ring-2 ring-white shadow-md"/>
              } @else {
                <div class="w-16 h-16 rounded-2xl flex items-center justify-center
                            text-lg font-bold text-white shadow-md"
                     [style.background]="avatarGradient()">
                  {{ initials() }}
                </div>
              }
              <!-- Online dot -->
              <div class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full
                          border-2 border-white shadow-sm"
                   [class.bg-emerald-400]="user.isActive"
                   [class.bg-gray-300]="!user.isActive">
              </div>
            </div>

            <!-- Name + badges -->
            <div class="flex-1 min-w-0 pt-1">
              <h2 class="text-lg font-bold text-gray-900 leading-tight truncate">
                {{ user.userType === 'DOCTOR' ? 'Dr. ' : '' }}{{ fullName() }}
              </h2>
              <div class="flex flex-wrap gap-1.5 mt-2">
                <!-- Role badge -->
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full
                             text-xs font-semibold"
                      [class]="roleBadge()">
                  <span>{{ roleEmoji() }}</span>
                  {{ roleLabel() }}
                </span>
                <!-- Status -->
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full
                             text-xs font-medium"
                      [class.bg-emerald-50]="user.isActive"
                      [class.text-emerald-700]="user.isActive"
                      [class.bg-gray-100]="!user.isActive"
                      [class.text-gray-500]="!user.isActive">
                  <span class="w-1.5 h-1.5 rounded-full"
                        [class.bg-emerald-400]="user.isActive"
                        [class.bg-gray-400]="!user.isActive"></span>
                  {{ user.isActive ? 'Active' : 'Inactive' }}
                </span>
                <!-- Doctor verification -->
                @if (user.userType === 'DOCTOR') {
                  <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
                        [class.bg-teal-50]="user.isVerified"
                        [class.text-teal-700]="user.isVerified"
                        [class.bg-amber-50]="!user.isVerified"
                        [class.text-amber-700]="!user.isVerified">
                    {{ user.isVerified ? '✓ Verified' : '⏳ Pending' }}
                  </span>
                }
              </div>
            </div>

            <!-- Close button -->
            <button (click)="close.emit()"
                    class="p-1.5 rounded-xl text-gray-400 hover:text-gray-600
                           hover:bg-white/80 transition-all cursor-pointer flex-shrink-0">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Scrollable body -->
        <div class="px-6 pb-6 space-y-5 max-h-96 overflow-y-auto">

          <!-- Contact -->
          <section>
            <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
              Contact
            </p>
            <div class="space-y-2">
              <div class="info-row">
                <div class="info-icon bg-gray-50">
                  <svg class="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24"
                       stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </div>
                <div class="min-w-0">
                  <p class="text-[10px] text-gray-400 uppercase tracking-wide">Email</p>
                  <p class="text-sm font-medium text-gray-800 truncate">{{ user.email }}</p>
                </div>
              </div>

              @if (user.phone) {
                <div class="info-row">
                  <div class="info-icon bg-gray-50">
                    <svg class="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24"
                         stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round"
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13
                           a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0
                           01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                    </svg>
                  </div>
                  <div>
                    <p class="text-[10px] text-gray-400 uppercase tracking-wide">Phone</p>
                    <p class="text-sm font-medium text-gray-800">{{ user.phone }}</p>
                  </div>
                </div>
              }

              <div class="info-row">
                <div class="info-icon bg-gray-50">
                  <svg class="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24"
                       stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                </div>
                <div>
                  <p class="text-[10px] text-gray-400 uppercase tracking-wide">Member since</p>
                  <p class="text-sm font-medium text-gray-800">{{ formatDate(user.createdAt) }}</p>
                </div>
              </div>
            </div>
          </section>

          <!-- Doctor professional info -->
          @if (user.userType === 'DOCTOR') {
            <section class="border-t border-gray-100 pt-4">
              <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                Professional
              </p>
              <div class="space-y-2">
                @if (user.specialization) {
                  <div class="info-row">
                    <div class="info-icon" style="background:#f0fdfa">
                      <svg class="w-3.5 h-3.5" style="color:#0d9488" fill="none" viewBox="0 0 24 24"
                           stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0
                             01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                    </div>
                    <div>
                      <p class="text-[10px] text-gray-400 uppercase tracking-wide">Specialization</p>
                      <p class="text-sm font-medium text-gray-800">{{ formatSpec(user.specialization) }}</p>
                    </div>
                  </div>
                }
                @if (user.rppsNumber) {
                  <div class="info-row">
                    <div class="info-icon" style="background:#f0fdfa">
                      <svg class="w-3.5 h-3.5" style="color:#0d9488" fill="none" viewBox="0 0 24 24"
                           stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round"
                          d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2"/>
                      </svg>
                    </div>
                    <div>
                      <p class="text-[10px] text-gray-400 uppercase tracking-wide">RPPS Number</p>
                      <p class="text-sm font-medium text-gray-800 font-mono">{{ user.rppsNumber }}</p>
                    </div>
                  </div>
                }
                @if (user.officeAddress) {
                  <div class="info-row">
                    <div class="info-icon" style="background:#f0fdfa">
                      <svg class="w-3.5 h-3.5" style="color:#0d9488" fill="none" viewBox="0 0 24 24"
                           stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round"
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                      </svg>
                    </div>
                    <div class="min-w-0">
                      <p class="text-[10px] text-gray-400 uppercase tracking-wide">Office</p>
                      <p class="text-sm font-medium text-gray-800 truncate">{{ user.officeAddress }}</p>
                    </div>
                  </div>
                }
                @if (user.consultationDuration) {
                  <div class="info-row">
                    <div class="info-icon" style="background:#f0fdfa">
                      <svg class="w-3.5 h-3.5" style="color:#0d9488" fill="none" viewBox="0 0 24 24"
                           stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                    <div>
                      <p class="text-[10px] text-gray-400 uppercase tracking-wide">Consultation duration</p>
                      <p class="text-sm font-medium text-gray-800">{{ user.consultationDuration }} minutes</p>
                    </div>
                  </div>
                }
              </div>
            </section>
          }

          <!-- Patient health info -->
          @if (user.userType === 'PATIENT') {
            <section class="border-t border-gray-100 pt-4">
              <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                Health Profile
              </p>
              <div class="flex flex-wrap gap-2 mb-3">
                @if (user.bloodType) {
                  <div class="flex items-center gap-2 px-3 py-2 rounded-xl
                              border border-red-100 bg-red-50">
                    <span class="text-sm">🩸</span>
                    <div>
                      <p class="text-[10px] text-gray-400">Blood type</p>
                      <p class="text-sm font-bold text-red-600">{{ user.bloodType }}</p>
                    </div>
                  </div>
                }
                @if (user.gender) {
                  <div class="flex items-center gap-2 px-3 py-2 rounded-xl
                              border border-gray-100 bg-gray-50">
                    <span class="text-sm">{{ user.gender === 'MALE' ? '♂️' : user.gender === 'FEMALE' ? '♀️' : '⚧️' }}</span>
                    <div>
                      <p class="text-[10px] text-gray-400">Gender</p>
                      <p class="text-sm font-medium text-gray-700 capitalize">
                        {{ user.gender.toLowerCase() }}
                      </p>
                    </div>
                  </div>
                }
                <div class="flex items-center gap-2 px-3 py-2 rounded-xl
                            border border-gray-100 bg-gray-50">
                  <span class="text-sm">{{ user.biometricEnrolled ? '🔐' : '🔓' }}</span>
                  <div>
                    <p class="text-[10px] text-gray-400">Biometric</p>
                    <p class="text-sm font-medium text-gray-700">
                      {{ user.biometricEnrolled ? 'Enrolled' : 'Not set' }}
                    </p>
                  </div>
                </div>
              </div>
              @if (user.dateOfBirth) {
                <div class="info-row">
                  <div class="info-icon bg-gray-50">
                    <svg class="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24"
                         stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round"
                        d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0
                           2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0
                           00-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2
                           M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5
                           a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z"/>
                    </svg>
                  </div>
                  <div>
                    <p class="text-[10px] text-gray-400 uppercase tracking-wide">Date of birth</p>
                    <p class="text-sm font-medium text-gray-800">{{ formatDate(user.dateOfBirth) }}</p>
                  </div>
                </div>
              }
              @if (user.allergies) {
                <div class="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <p class="text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-1">
                    ⚠️ Known allergies
                  </p>
                  <p class="text-sm text-amber-800">{{ user.allergies }}</p>
                </div>
              }
            </section>
          }

        </div>

        <!-- Footer -->
        <div class="px-6 pb-6 pt-2 flex gap-2 border-t border-gray-100">
          <button (click)="close.emit()"
                  class="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm
                         font-medium text-gray-600 hover:bg-gray-50
                         transition-all cursor-pointer">
            Close
          </button>
          <button class="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white
                         transition-all cursor-pointer shadow-sm"
                  style="background: linear-gradient(135deg,#14b8a6,#0d9488)">
            View Full Profile →
          </button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
    @keyframes modalIn { from{opacity:0;transform:scale(0.95) translateY(16px)}
                         to  {opacity:1;transform:scale(1)   translateY(0)} }
    .info-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .info-icon {
      width: 30px; height: 30px;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
  `],
})
export class UserDetailModalComponent {
  @Input({ required: true }) user!: AppUserResponse;
  @Output() close = new EventEmitter<void>();

  @HostListener('document:keydown.escape') onEsc() { this.close.emit(); }

  onBackdropClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('fixed')) this.close.emit();
  }

  fullName()   { return `${this.user.firstName} ${this.user.lastName}`; }
  initials()   { return `${this.user.firstName[0]}${this.user.lastName[0]}`.toUpperCase(); }

  avatarGradient(): string {
    const map: Record<string, string> = {
      PATIENT:       'linear-gradient(135deg,#14b8a6,#0d9488)',
      DOCTOR:        'linear-gradient(135deg,#60a5fa,#2563eb)',
      ADMINISTRATOR: 'linear-gradient(135deg,#c084fc,#9333ea)',
      INSTITUTION:   'linear-gradient(135deg,#fbbf24,#d97706)',
    };
    return map[this.user.userType] ?? 'linear-gradient(135deg,#94a3b8,#64748b)';
  }

  roleLabel(): string {
    return { PATIENT:'Patient', DOCTOR:'Doctor',
             ADMINISTRATOR:'Admin', INSTITUTION:'Institution' }[this.user.userType] ?? this.user.userType;
  }

  roleEmoji(): string {
    return { PATIENT:'👤', DOCTOR:'🩺', ADMINISTRATOR:'⚙️', INSTITUTION:'🏥' }[this.user.userType] ?? '';
  }

  roleBadge(): string {
    const m: Record<string,string> = {
      PATIENT:'bg-teal-50 text-teal-700',
      DOCTOR:'bg-blue-50 text-blue-700',
      ADMINISTRATOR:'bg-purple-50 text-purple-700',
      INSTITUTION:'bg-amber-50 text-amber-700',
    };
    return m[this.user.userType] ?? 'bg-gray-100 text-gray-600';
  }

  formatSpec(s: string): string {
    return s.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', {
      day:'numeric', month:'long', year:'numeric'
    });
  }
}

// ─── User List Component ──────────────────────────────────────────────────────
@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, UserDetailModalComponent],
  template: `
    <div class="min-h-screen p-6 lg:p-8"
         style="background: linear-gradient(160deg,#f0fdfa 0%,#ffffff 50%,#f0fdfa 100%)">

      <!-- Page header -->
      <div class="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 tracking-tight">User Management</h1>
          <p class="text-sm text-gray-500 mt-1">
            <span class="font-semibold" style="color:#0d9488">{{ totalElements() }}</span>
            registered user{{ totalElements() !== 1 ? 's' : '' }} across all roles
          </p>
        </div>

        <!-- Role summary pills -->
        <div class="flex gap-2 flex-wrap">
          @for (stat of roleStats(); track stat.label) {
            <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white
                        border border-gray-100 shadow-sm text-xs font-medium text-gray-600">
              <span>{{ stat.emoji }}</span>
              <span class="font-bold" style="color:#0d9488">{{ stat.count }}</span>
              {{ stat.label }}
            </div>
          }
        </div>
      </div>

      <!-- Search & filter bar -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5
                  flex flex-wrap gap-3 items-center">

        <!-- Search -->
        <div class="relative flex-1 min-w-52">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
          <input type="text" [formControl]="searchCtrl"
                 placeholder="Search by name or email…"
                 class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50
                        text-sm placeholder-gray-400 outline-none transition-all
                        focus:bg-white focus:ring-2 focus:border-teal-400"
                 style="--tw-ring-color:#99f6e4"/>
        </div>

        <!-- Role filter -->
        <div class="relative">
          <select [formControl]="roleFilter"
                  class="appearance-none pl-3.5 pr-8 py-2.5 rounded-xl border border-gray-200
                         bg-gray-50 text-sm text-gray-700 outline-none transition-all
                         focus:ring-2 focus:border-teal-400 cursor-pointer">
            <option value="">All roles</option>
            <option value="PATIENT">👤 Patient</option>
            <option value="DOCTOR">🩺 Doctor</option>
            <option value="ADMINISTRATOR">⚙️ Admin</option>
            <option value="INSTITUTION">🏥 Institution</option>
          </select>
          <div class="absolute inset-y-0 right-2 flex items-center pointer-events-none">
            <svg class="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </div>
        </div>

        <!-- Status filter -->
        <div class="relative">
          <select [formControl]="statusFilter"
                  class="appearance-none pl-3.5 pr-8 py-2.5 rounded-xl border border-gray-200
                         bg-gray-50 text-sm text-gray-700 outline-none transition-all
                         focus:ring-2 focus:border-teal-400 cursor-pointer">
            <option value="">All status</option>
            <option value="true">● Active</option>
            <option value="false">○ Inactive</option>
          </select>
          <div class="absolute inset-y-0 right-2 flex items-center pointer-events-none">
            <svg class="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </div>
        </div>

        <!-- Clear -->
        @if (hasFilters()) {
          <button (click)="clearFilters()"
                  class="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm
                         text-gray-500 hover:text-red-500 hover:bg-red-50
                         transition-all cursor-pointer">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
            Clear
          </button>
        }

        <p class="ml-auto text-xs text-gray-400 whitespace-nowrap">
          {{ totalElements() }} result{{ totalElements() !== 1 ? 's' : '' }}
        </p>
      </div>

      <!-- ── Loading skeleton ── -->
      @if (loading()) {
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          @for (i of [1,2,3,4,5,6,7,8]; track i) {
            <div class="flex items-center gap-4 px-5 py-4 border-b border-gray-50 animate-pulse">
              <div class="w-10 h-10 bg-gray-200 rounded-xl flex-shrink-0"></div>
              <div class="flex-1 space-y-2">
                <div class="h-3.5 bg-gray-200 rounded-full w-36"></div>
                <div class="h-3 bg-gray-100 rounded-full w-52"></div>
              </div>
              <div class="h-5 bg-gray-100 rounded-full w-20 hidden sm:block"></div>
              <div class="h-5 bg-gray-100 rounded-full w-16"></div>
            </div>
          }
        </div>
      }

      <!-- ── Error state ── -->
      @if (error() && !loading()) {
        <div class="flex flex-col items-center justify-center py-24 text-center">
          <div class="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
            <svg class="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3
                   L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          </div>
          <p class="font-semibold text-gray-700">Failed to load users</p>
          <p class="text-sm text-gray-400 mt-1 max-w-xs">{{ error() }}</p>
          <button (click)="loadUsers()"
                  class="mt-4 px-4 py-2 text-sm font-semibold text-white rounded-xl
                         cursor-pointer transition-all"
                  style="background:#0d9488">
            Try again
          </button>
        </div>
      }

      <!-- ── Empty state ── -->
      @if (!loading() && !error() && users().length === 0) {
        <div class="flex flex-col items-center justify-center py-24 text-center">
          <div class="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
               style="background:#f0fdfa">
            <svg class="w-7 h-7" style="color:#0d9488" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857
                   M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857
                   m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <p class="font-semibold text-gray-700">No users found</p>
          <p class="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
        </div>
      }

      <!-- ── User table ── -->
      @if (!loading() && !error() && users().length > 0) {
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5">

          <!-- Table header -->
          <div class="grid gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50/70
                      text-[10px] font-bold text-gray-400 uppercase tracking-widest"
               style="grid-template-columns: 2.5rem 1fr 1fr 7rem 6rem 1.5rem">
            <div></div>
            <div>Name</div>
            <div>Email</div>
            <div>Role</div>
            <div>Status</div>
            <div></div>
          </div>

          <!-- Rows -->
          @for (user of users(); track user.id; let odd = $odd) {
            <div
              (click)="select(user)"
              class="grid gap-4 px-5 py-3.5 border-b border-gray-50 last:border-0
                     transition-all cursor-pointer group"
              [ngClass]="{ 'bg-gray-50/30': odd }"
              style="grid-template-columns: 2.5rem 1fr 1fr 7rem 6rem 1.5rem"
              onmouseover="this.style.background='#f0fdfa'"
              onmouseout="this.style.background=''">

              <!-- Avatar -->
              <div class="flex-shrink-0 self-center">
                @if (user.profilePicture) {
                  <img [src]="user.profilePicture" [alt]="user.firstName"
                       class="w-9 h-9 rounded-xl object-cover"/>
                } @else {
                  <div class="w-9 h-9 rounded-xl flex items-center justify-center
                              text-xs font-bold text-white"
                       [style.background]="avatarGradient(user.userType)">
                    {{ user.firstName[0] }}{{ user.lastName[0] }}
                  </div>
                }
              </div>

              <!-- Name -->
              <div class="min-w-0 self-center">
                <p class="text-sm font-semibold text-gray-900 truncate
                          group-hover:text-teal-700 transition-colors">
                  {{ user.userType === 'DOCTOR' ? 'Dr. ' : '' }}{{ user.firstName }} {{ user.lastName }}
                </p>
                @if (user.userType === 'DOCTOR' && user.specialization) {
                  <p class="text-xs text-gray-400 truncate">
                    {{ formatSpec(user.specialization) }}
                  </p>
                }
              </div>

              <!-- Email -->
              <p class="text-sm text-gray-500 truncate self-center">{{ user.email }}</p>

              <!-- Role badge -->
              <div class="self-center">
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                             text-xs font-semibold"
                      [class]="roleBadge(user.userType)">
                  {{ roleEmoji(user.userType) }} {{ roleLabel(user.userType) }}
                </span>
              </div>

              <!-- Status -->
              <div class="self-center">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                      [class.bg-emerald-50]="user.isActive" [class.text-emerald-700]="user.isActive"
                      [class.bg-gray-100]="!user.isActive" [class.text-gray-500]="!user.isActive">
                  <span class="w-1.5 h-1.5 rounded-full"
                        [class.bg-emerald-400]="user.isActive"
                        [class.bg-gray-400]="!user.isActive"></span>
                  {{ user.isActive ? 'Active' : 'Inactive' }}
                </span>
              </div>

              <!-- Chevron -->
              <div class="self-center">
                <svg class="w-4 h-4 text-gray-300 group-hover:text-teal-400 transition-colors"
                     fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
              </div>

            </div>
          }
        </div>

        <!-- Pagination -->
        @if (totalPages() > 1) {
          <div class="flex items-center justify-between">
            <p class="text-sm text-gray-500">
              Page <span class="font-semibold text-gray-700">{{ currentPage() + 1 }}</span>
              of <span class="font-semibold text-gray-700">{{ totalPages() }}</span>
            </p>
            <div class="flex gap-1.5">
              <button (click)="goTo(currentPage() - 1)" [disabled]="currentPage() === 0"
                      class="px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600
                             hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed
                             transition-all cursor-pointer">
                ←
              </button>
              @for (p of pageNumbers(); track p) {
                <button (click)="goTo(p)"
                        class="px-3.5 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer"
                        [class.text-white]="p === currentPage()"
                        [class.border]="p !== currentPage()"
                        [class.border-gray-200]="p !== currentPage()"
                        [class.text-gray-600]="p !== currentPage()"
                        [class.hover:bg-gray-50]="p !== currentPage()"
                        [style.background]="p === currentPage() ? '#0d9488' : ''">
                  {{ p + 1 }}
                </button>
              }
              <button (click)="goTo(currentPage() + 1)" [disabled]="currentPage() >= totalPages() - 1"
                      class="px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600
                             hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed
                             transition-all cursor-pointer">
                →
              </button>
            </div>
          </div>
        }
      }

    </div>

    <!-- Detail modal -->
    @if (selectedUser()) {
      <app-user-detail-modal
        [user]="selectedUser()!"
        (close)="selectedUser.set(null)"/>
    }
  `,
})
export class UserListComponent implements OnInit, OnDestroy {

  private http     = inject(HttpClient);
  private fb       = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  readonly API = '/api/v1/users'; // uses proxy — no host needed

  // ── State ────────────────────────────────────────────────────────────────
  users         = signal<AppUserResponse[]>([]);
  loading       = signal(true);
  error         = signal<string | null>(null);
  selectedUser  = signal<AppUserResponse | null>(null);
  currentPage   = signal(0);
  totalElements = signal(0);
  totalPages    = signal(0);
  readonly pageSize = 20;

  searchCtrl   = this.fb.control('');
  roleFilter   = this.fb.control('');
  statusFilter = this.fb.control('');

  hasFilters = computed(() =>
    !!(this.searchCtrl.value || this.roleFilter.value || this.statusFilter.value)
  );

  pageNumbers = computed(() => {
    const total = this.totalPages(), cur = this.currentPage();
    const start = Math.max(0, cur - 2), end = Math.min(total - 1, cur + 2);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  roleStats = computed(() => {
    const users = this.users();
    return [
      { label: 'Patients',      emoji: '👤', count: users.filter(u => u.userType === 'PATIENT').length },
      { label: 'Doctors',       emoji: '🩺', count: users.filter(u => u.userType === 'DOCTOR').length },
      { label: 'Admins',        emoji: '⚙️', count: users.filter(u => u.userType === 'ADMINISTRATOR').length },
      { label: 'Institutions',  emoji: '🏥', count: users.filter(u => u.userType === 'INSTITUTION').length },
    ].filter(s => s.count > 0);
  });

  // ── Lifecycle ───────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadUsers();

    this.searchCtrl.valueChanges.pipe(
      debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$)
    ).subscribe(() => this.loadUsers(0));

    this.roleFilter.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadUsers(0));

    this.statusFilter.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadUsers(0));
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  // ── Data ────────────────────────────────────────────────────────────────
  loadUsers(page = this.currentPage()): void {
    this.loading.set(true);
    this.error.set(null);

    let params = new HttpParams().set('page', page).set('size', this.pageSize);
    if (this.searchCtrl.value)  params = params.set('name',     this.searchCtrl.value);
    if (this.roleFilter.value)  params = params.set('userType', this.roleFilter.value);
    if (this.statusFilter.value !== '')
      params = params.set('isActive', this.statusFilter.value!);

    this.http.get<PageResponse<AppUserResponse>>(`${this.API}/search`, { params })
      .subscribe({
        next: res => {
          this.users.set(res.content);
          this.totalElements.set(res.totalElements);
          this.totalPages.set(res.totalPages);
          this.currentPage.set(res.number);
          this.loading.set(false);
        },
        error: err => {
          this.error.set(err.message ?? 'Could not reach the server.');
          this.loading.set(false);
        },
      });
  }

  goTo(page: number): void {
    if (page < 0 || page >= this.totalPages()) return;
    this.loadUsers(page);
  }

  clearFilters(): void {
    this.searchCtrl.setValue('');
    this.roleFilter.setValue('');
    this.statusFilter.setValue('');
  }

  select(user: AppUserResponse): void { this.selectedUser.set(user); }

  // ── Helpers ─────────────────────────────────────────────────────────────
  avatarGradient(type: string): string {
    const m: Record<string,string> = {
      PATIENT:       'linear-gradient(135deg,#14b8a6,#0d9488)',
      DOCTOR:        'linear-gradient(135deg,#60a5fa,#2563eb)',
      ADMINISTRATOR: 'linear-gradient(135deg,#c084fc,#9333ea)',
      INSTITUTION:   'linear-gradient(135deg,#fbbf24,#d97706)',
    };
    return m[type] ?? 'linear-gradient(135deg,#94a3b8,#64748b)';
  }

  roleLabel(type: string): string {
    return { PATIENT:'Patient', DOCTOR:'Doctor',
             ADMINISTRATOR:'Admin', INSTITUTION:'Institution' }[type] ?? type;
  }

  roleEmoji(type: string): string {
    return { PATIENT:'👤', DOCTOR:'🩺', ADMINISTRATOR:'⚙️', INSTITUTION:'🏥' }[type] ?? '';
  }

  roleBadge(type: string): string {
    const m: Record<string,string> = {
      PATIENT:'bg-teal-50 text-teal-700',
      DOCTOR:'bg-blue-50 text-blue-700',
      ADMINISTRATOR:'bg-purple-50 text-purple-700',
      INSTITUTION:'bg-amber-50 text-amber-700',
    };
    return m[type] ?? 'bg-gray-100 text-gray-600';
  }

  formatSpec(s: string): string {
    return s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  }
}
