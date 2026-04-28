import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild, signal } from '@angular/core';

@Component({
  selector: 'app-face-verification',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-5">
      <div>
        @if (showBack) {
          <button type="button" (click)="back.emit()"
                  class="mb-4 flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-600 py-2 transition-colors cursor-pointer">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
            Retour
          </button>
        }
        <h2 class="text-2xl font-bold text-stone-900">Vérification par reconnaissance faciale</h2>
        <p class="mt-1 text-sm text-stone-500">
          Placez votre visage dans le cadre puis capturez une photo pour finaliser la connexion.
        </p>
      </div>

      <!-- Camera box — video always in DOM so @ViewChild resolves immediately -->
      <div class="relative overflow-hidden rounded-3xl border border-stone-200 bg-stone-950 aspect-[4/3]">
        <video #video autoplay playsinline muted
               class="h-full w-full object-cover"
               [class.invisible]="cameraError()"></video>

        <!-- Face oval guide — shown only when stream is live -->
        @if (!cameraError()) {
          <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div class="h-56 w-44 rounded-[45%] border-4 border-white/70 shadow-[0_0_0_999px_rgba(0,0,0,0.18)]"></div>
          </div>
        }

        <!-- No-camera placeholder overlay -->
        @if (cameraError()) {
          <div class="absolute inset-0 flex items-center justify-center p-6 text-center">
            <div class="space-y-2">
              <svg class="w-12 h-12 text-stone-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"/>
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"/>
              </svg>
              <p class="text-sm text-stone-400">Caméra non disponible</p>
            </div>
          </div>
        }
      </div>

      <!-- Camera error banner -->
      @if (cameraError()) {
        <div class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 space-y-2">
          <p class="text-sm font-semibold text-amber-800">Accès caméra impossible</p>
          <p class="text-xs text-amber-700">{{ cameraError() }}</p>
          <button type="button" (click)="retryCamera()"
                  class="mt-1 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-50">
            Réessayer la caméra
          </button>
        </div>
      }

      <!-- Attempt counter -->
      @if (!cameraError()) {
        <div class="rounded-2xl bg-stone-50 px-4 py-3 text-sm text-stone-600">
          @if (attempts < 3) {
            Tentative {{ attempts + 1 }} sur 3
          } @else {
            Tentatives épuisées — utilisez le code par e-mail
          }
        </div>
      }

      <!-- Match / server error -->
      @if (errorMessage) {
        <div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {{ errorMessage }}
        </div>
      }

      <div class="space-y-3">
        @if (!cameraError() && attempts < 3) {
          <button type="button" (click)="captureAndSubmit()" [disabled]="loading"
                  class="w-full rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
            @if (loading) { Vérification en cours... } @else { Capturer et vérifier }
          </button>
        }

        <button type="button" (click)="useEmailFallback.emit()"
                class="w-full rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-700 hover:bg-teal-100">
          Utiliser un code par e-mail à la place
        </button>
      </div>
    </div>
  `,
})
export class FaceVerificationComponent implements AfterViewInit, OnDestroy {
  @Input() loading = false;
  @Input() errorMessage: string | null = null;
  @Input() attempts = 0;
  @Input() showBack = true;

  @Output() verify = new EventEmitter<string>();
  @Output() useEmailFallback = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();

  @ViewChild('video', { static: true }) videoRef!: ElementRef<HTMLVideoElement>;

  cameraError = signal<string | null>(null);
  private stream: MediaStream | null = null;

  async ngAfterViewInit(): Promise<void> {
    await this.startCamera();
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  async retryCamera(): Promise<void> {
    this.cameraError.set(null);
    await this.startCamera();
  }

  captureAndSubmit(): void {
    const video = this.videoRef?.nativeElement;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    this.verify.emit(canvas.toDataURL('image/jpeg', 0.92));
  }

  private async startCamera(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      // Video element is always in the DOM — assign directly, no timing tricks needed
      this.videoRef.nativeElement.srcObject = this.stream;
      this.cameraError.set(null);
    } catch (err: unknown) {
      this.cameraError.set(this.describeCameraError(err));
    }
  }

  private stopCamera(): void {
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
  }

  private describeCameraError(err: unknown): string {
    const name = (err as DOMException)?.name ?? '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return "Permission refusée. Cliquez sur l'icône 🔒 dans la barre d'adresse, autorisez la caméra, puis cliquez « Réessayer la caméra ».";
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return "Aucune caméra détectée sur cet appareil.";
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return "La caméra est utilisée par une autre application. Fermez-la et réessayez.";
    }
    if (name === 'OverconstrainedError') {
      return "Résolution non supportée. Réessayez.";
    }
    if (name === 'SecurityError') {
      return "Accès bloqué. Utilisez localhost ou HTTPS.";
    }
    return `Erreur caméra : ${name || 'inconnue'}.`;
  }
}
