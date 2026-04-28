import { Injectable, signal, Signal } from '@angular/core';

export interface AudioTourControlsCallbacks {
  onDescribe?: () => void;
  onStartTour?: () => void;
}

@Injectable({ providedIn: 'root' })
export class AudioTourControlsService {
  private callbacksSignal = signal<AudioTourControlsCallbacks>({});
  readonly callbacks: Signal<AudioTourControlsCallbacks> = this.callbacksSignal.asReadonly();

  setCallbacks(callbacks: AudioTourControlsCallbacks): void {
    this.callbacksSignal.set(callbacks);
  }

  clearCallbacks(): void {
    this.callbacksSignal.set({});
  }
}
