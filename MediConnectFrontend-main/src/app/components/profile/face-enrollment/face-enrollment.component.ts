import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, OnDestroy, Output, ViewChild, inject, signal } from '@angular/core';
import { FaceRecognitionService } from '../../../../core/services/face-recognition.service';

@Component({
  selector: 'app-face-enrollment',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-4">
      <div class="relative overflow-hidden rounded-3xl border border-stone-200 bg-stone-950 aspect-[4/3]">
        <!-- Video always in DOM so @ViewChild resolves immediately -->
        <video #video autoplay playsinline muted
               class="h-full w-full object-cover"
               [class.hidden]="!!capturedImage()"></video>

        @if (!capturedImage()) {
          <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div class="h-56 w-44 rounded-[45%] border-4 border-white/70 shadow-[0_0_0_999px_rgba(0,0,0,0.18)]"></div>
          </div>
        } @else {
          <img [src]="capturedImage()!" alt="Capture faciale" class="absolute inset-0 h-full w-full object-cover" />
        }
      </div>

      <p class="text-sm text-stone-600">
        @if (!capturedImage()) { Placez votre visage dans le cadre puis capturez une photo nette. }
        @else { Est-ce une bonne photo ? Vous pouvez la confirmer ou reprendre une nouvelle capture. }
      </p>

      @if (errorMessage()) {
        <div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {{ errorMessage() }}
        </div>
      }

      <div class="flex gap-3">
        @if (!capturedImage()) {
          <button type="button" (click)="capture()" [disabled]="loading()"
                  class="flex-1 rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
            Capturer
          </button>
        } @else {
          <button type="button" (click)="retake()"
                  class="flex-1 rounded-2xl border border-stone-200 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50">
            Reprendre
          </button>
          <button type="button" (click)="confirm()" [disabled]="loading()"
                  class="flex-1 rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
            @if (loading()) { Enregistrement... } @else { Confirmer }
          </button>
        }
      </div>
    </div>
  `,
})
export class FaceEnrollmentComponent implements AfterViewInit, OnDestroy {
  @Output() completed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  @ViewChild('video', { static: true }) videoRef!: ElementRef<HTMLVideoElement>;

  private readonly faceService = inject(FaceRecognitionService);

  capturedImage = signal<string | null>(null);
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  private stream: MediaStream | null = null;

  async ngAfterViewInit(): Promise<void> {
    await this.startCamera();
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  async startCamera(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      // Video is always in DOM — assign directly
      this.videoRef.nativeElement.srcObject = this.stream;
      this.errorMessage.set(null);
    } catch (err: unknown) {
      const name = (err as DOMException)?.name ?? '';
      let msg = "Impossible d'accéder à la caméra.";
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        msg = "Permission refusée. Autorisez la caméra dans la barre d'adresse (🔒) puis réessayez.";
      } else if (name === 'NotFoundError') {
        msg = "Aucune caméra détectée sur cet appareil.";
      } else if (name === 'NotReadableError') {
        msg = "La caméra est utilisée par une autre application. Fermez-la et réessayez.";
      }
      this.errorMessage.set(msg);
    }
  }

  capture(): void {
    const video = this.videoRef?.nativeElement;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    this.capturedImage.set(canvas.toDataURL('image/jpeg', 0.92));
  }

  retake(): void {
    this.capturedImage.set(null);
    this.errorMessage.set(null);
  }

  confirm(): void {
    const dataUrl = this.capturedImage();
    if (!dataUrl) return;
    this.loading.set(true);
    this.errorMessage.set(null);
    this.faceService.enroll(this.dataUrlToBlob(dataUrl)).subscribe({
      next: () => {
        this.loading.set(false);
        this.completed.emit();
      },
      error: (err: any) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message ?? "Erreur de connexion. Veuillez reessayer.");
      },
    });
  }

  private dataUrlToBlob(dataUrl: string): Blob {
    const [meta, content] = dataUrl.split(',');
    const mime = /data:(.*);base64/.exec(meta)?.[1] ?? 'image/jpeg';
    const bytes = Uint8Array.from(atob(content), c => c.charCodeAt(0));
    return new Blob([bytes], { type: mime });
  }

  private stopCamera(): void {
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = null;
  }
}
