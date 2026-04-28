import { Component, Input, inject } from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';
import { AudioTourService } from '../../subscription/services/audio-tour.service';

@Component({
  selector: 'app-audio-tour-controls',
  standalone: true,
  imports: [AsyncPipe, CommonModule],
  template: `
    <div class="fixed bottom-6 left-6 z-40 flex flex-col items-start gap-3">
      <!-- Subtitle Floating Card -->
      @if (subtitle$ | async as subtitle) {
        @if (subtitle && subtitle.length > 0) {
          <div class="animate-fade-in rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-xl max-w-xs">
            <p class="text-xs leading-relaxed text-gray-700">{{ subtitle }}</p>
          </div>
        }
      }

      <!-- Main Toolbar Pill -->
      <div class="rounded-full border border-gray-100 bg-white px-3 py-2 shadow-2xl min-w-max flex items-center justify-center gap-2">
        
        <!-- Idle State: Describe + Tour buttons -->
        @if (!((isPlaying$ | async) || (isPaused$ | async))) {
          <button
            type="button"
            (click)="onDescribe?.()"
            [disabled]="!onDescribe"
            class="flex items-center gap-1.5 px-3 py-1 rounded-full border border-gray-300 bg-white text-xs font-bold text-gray-600 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            🎧 Describe
          </button>
          
          <div class="h-4 w-px bg-gray-200"></div>
          
          <button
            type="button"
            (click)="onStartTour?.()"
            [disabled]="!onStartTour"
            class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-teal-500 to-teal-600 text-xs font-bold text-white hover:from-teal-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            🚀 Tour
          </button>
        }

        <!-- Active State: Progress + Pause/Resume + Stop -->
        @if ((isPlaying$ | async) || (isPaused$ | async)) {
          <span class="text-xs font-bold text-gray-500 px-2 whitespace-nowrap">
            {{ (tourProgress$ | async)?.currentPageName || 'Playing...' }}
          </span>
          
          <div class="h-4 w-px bg-gray-200"></div>
          
          <button
            type="button"
            (click)="onPauseOrResume()"
            class="flex items-center gap-1.5 px-3 py-1 rounded-full border border-gray-300 bg-white text-xs font-bold text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-all whitespace-nowrap">
            @if (isPaused$ | async) {
              ▶ Resume
            } @else {
              ⏸ Pause
            }
          </button>
          
          <button
            type="button"
            (click)="onStop()"
            class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600 text-xs font-bold text-white hover:bg-rose-700 transition-all">
            ⏹ Stop
          </button>
        }
      </div>
    </div>

    <style>
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      :host ::ng-deep .animate-fade-in {
        animation: fadeIn 0.3s ease-out;
      }
    </style>
  `,
  styles: []
})
export class AudioTourControlsComponent {
  @Input() onDescribe?: () => void;
  @Input() onStartTour?: () => void;

  private audioTourService = inject(AudioTourService);
  
  readonly isPlaying$ = this.audioTourService.isPlaying$;
  readonly isPaused$ = this.audioTourService.isPaused$;
  readonly subtitle$ = this.audioTourService.subtitle$;
  readonly tourProgress$ = this.audioTourService.tourProgress$;

  onPauseOrResume(): void {
    this.audioTourService.pauseOrResume();
  }

  onStop(): void {
    this.audioTourService.stopTour();
  }
}

