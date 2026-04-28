import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageUploadComponent } from '../../image-upload/image-upload.component';

@Component({
  selector: 'app-profile-header',
  standalone: true,
  imports: [CommonModule, ImageUploadComponent],
  template: `
    <div>
      <div class="flex items-center gap-5 mb-6">
        <div class="w-20 h-20 rounded-2xl border border-stone-200 bg-stone-50 overflow-hidden flex items-center justify-center flex-shrink-0">
          <img *ngIf="photoUrl" [src]="photoUrl" alt="" class="w-full h-full object-cover">
          <span *ngIf="!photoUrl" class="text-base font-bold text-stone-600">{{ initials }}</span>
        </div>
        <div>
          <p class="text-sm font-medium text-stone-900">Photo actuelle</p>
          <p class="text-xs text-stone-500 mt-0.5">JPG ou PNG, max 5MB</p>
        </div>
      </div>
      <app-image-upload (uploaded)="photoUploaded.emit($event)" />
    </div>
  `,
})
export class ProfileHeaderComponent {
  @Input() photoUrl: string | null | undefined;
  @Input() initials = 'MC';
  @Output() photoUploaded = new EventEmitter<string>();
}
