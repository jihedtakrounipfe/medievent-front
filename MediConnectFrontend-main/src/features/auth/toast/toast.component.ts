import { Component, inject } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { ToastService }      from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      @for (toast of toastSvc.toasts(); track toast.id) {
        <div
          class="pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-2xl
                 backdrop-blur-sm animate-slide-in"
          [ngClass]="{
            'bg-emerald-50  border-emerald-200 text-emerald-800': toast.type === 'success',
            'bg-red-50      border-red-200     text-red-800'    : toast.type === 'error',
            'bg-teal-50     border-teal-200    text-teal-800'   : toast.type === 'info',
            'bg-amber-50    border-amber-200   text-amber-800'  : toast.type === 'warning'
          }">

          <!-- Icon -->
          <div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
               [ngClass]="{
                 'bg-emerald-100': toast.type === 'success',
                 'bg-red-100'    : toast.type === 'error',
                 'bg-teal-100'   : toast.type === 'info',
                 'bg-amber-100'  : toast.type === 'warning'
               }">
            @if (toast.type === 'success') {
              <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            }
            @if (toast.type === 'error') {
              <svg class="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            }
            @if (toast.type === 'info') {
              <svg class="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            }
            @if (toast.type === 'warning') {
              <svg class="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            }
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-sm">{{ toast.title }}</p>
            <p class="text-sm opacity-80 mt-0.5 leading-snug">{{ toast.message }}</p>
          </div>

          <!-- Dismiss -->
          <button
            (click)="toastSvc.dismiss(toast.id)"
            class="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity cursor-pointer">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastComponent {
  toastSvc = inject(ToastService);
}