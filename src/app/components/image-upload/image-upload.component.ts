import { CommonModule } from '@angular/common';
import { HttpEventType } from '@angular/common/http';
import { Component, EventEmitter, Output, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { FileUploadService } from '../../services/file-upload.service';

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rounded-2xl border border-stone-200 bg-white p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-semibold text-stone-900">Photo de profil</p>
          <p class="text-xs text-stone-500 mt-0.5">PNG, JPG, JPEG, GIF, WEBP • 5MB max</p>
        </div>
        <button type="button" (click)="fileInput.click()"
                class="px-3 py-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-sm font-semibold">
          Choisir
        </button>
      </div>

      <input #fileInput type="file" class="hidden"
             accept="image/png,image/jpeg,image/gif,image/webp"
             (change)="onPick($event)"/>

      <div class="mt-4 flex items-center gap-4">
        <div class="w-16 h-16 rounded-full bg-teal-600 flex items-center justify-center overflow-hidden">
          <ng-container *ngIf="previewUrl(); else placeholder">
            <img [src]="previewUrl()!" class="w-16 h-16 object-cover" alt="Preview"/>
          </ng-container>
          <ng-template #placeholder>
            <span class="text-white font-bold text-lg">MC</span>
          </ng-template>
        </div>

        <div class="flex-1 min-w-0">
          <p class="text-sm text-stone-700 truncate">{{ fileName() || 'Aucun fichier sélectionné' }}</p>
          <p *ngIf="error()" class="text-xs text-rose-600 mt-1">{{ error() }}</p>
          <div *ngIf="uploading()" class="mt-2">
            <div class="h-2 rounded-full bg-stone-100 overflow-hidden">
              <div class="h-2 bg-teal-500" [style.width.%]="progress()"></div>
            </div>
            <p class="text-xs text-stone-500 mt-1">{{ progress() }}%</p>
          </div>
        </div>

        <button type="button" (click)="upload()" [disabled]="!file() || uploading()"
                class="px-3 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 text-sm font-semibold disabled:opacity-60">
          Upload
        </button>
      </div>
    </div>
  `,
})
export class ImageUploadComponent {
  @Output() uploaded = new EventEmitter<string>();
  @Output() selected = new EventEmitter<File | null>();

  file = signal<File | null>(null);
  fileName = signal<string | null>(null);
  previewUrl = signal<string | null>(null);
  uploading = signal(false);
  progress = signal(0);
  error = signal<string | null>(null);

  constructor(private uploadService: FileUploadService) {}

  onPick(evt: Event): void {
    this.error.set(null);
    this.progress.set(0);

    const input = evt.target as HTMLInputElement;
    const f = input.files?.[0] ?? null;
    if (!f) return;

    const allowed = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);
    if (!allowed.has(f.type)) {
      this.error.set('Type de fichier invalide.');
      this.reset();
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      this.error.set('Fichier trop volumineux (max 5MB).');
      this.reset();
      return;
    }

    this.file.set(f);
    this.fileName.set(f.name);
    this.previewUrl.set(URL.createObjectURL(f));
    this.selected.emit(f);
  }

  upload(): void {
    const f = this.file();
    if (!f) return;

    this.uploading.set(true);
    this.progress.set(0);
    this.error.set(null);

    this.uploadService.uploadImageEvents(f).pipe(
      finalize(() => this.uploading.set(false)),
    ).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.progress.set(Math.round((event.loaded / event.total) * 100));
        }
        if (event.type === HttpEventType.Response) {
          const url = event.body?.url;
          if (url) this.uploaded.emit(url);
        }
      },
      error: () => this.error.set('Échec de l’upload.'),
    });
  }

  private reset(): void {
    this.file.set(null);
    this.fileName.set(null);
    this.previewUrl.set(null);
    this.selected.emit(null);
  }
}
