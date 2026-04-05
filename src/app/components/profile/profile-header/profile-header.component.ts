import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageUploadComponent } from '../../image-upload/image-upload.component';

@Component({
  selector: 'app-profile-header',
  standalone: true,
  imports: [CommonModule, ImageUploadComponent],
  template: `
    <div class="rounded-3xl border border-stone-200 bg-white shadow-sm p-5">
      <h2 class="text-base font-bold text-stone-900">Photo de profil</h2>
      <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 rounded-2xl border border-stone-200 bg-stone-50 overflow-hidden flex items-center justify-center">
            <img *ngIf="photoUrl" [src]="photoUrl" alt="" class="w-full h-full object-cover">
            <span *ngIf="!photoUrl" class="text-sm font-bold text-stone-600">{{ initials }}</span>
          </div>
          <div class="text-sm text-stone-700">
            <div class="font-semibold">Photo actuelle</div>
            <div class="text-xs text-stone-500">JPG/PNG, max 5MB</div>
          </div>
        </div>
        <app-image-upload (uploaded)="photoUploaded.emit($event)" />
      </div>
    </div>
  `,
})
export class ProfileHeaderComponent {
  @Input() photoUrl: string | null | undefined;
  @Input() initials = 'MC';
  @Output() photoUploaded = new EventEmitter<string>();
}
