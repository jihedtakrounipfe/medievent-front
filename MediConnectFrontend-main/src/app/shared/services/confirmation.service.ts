import { Injectable } from '@angular/core';

export interface ConfirmationOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConfirmationService {
  private confirmed = false;
  private promise: Promise<boolean> | null = null;

  /**
   * Shows a confirmation dialog and returns a Promise
   * @param options Configuration for the confirmation dialog
   * @returns Promise<boolean> - true if confirmed, false if cancelled
   */
  confirm(options: ConfirmationOptions): Promise<boolean> {
    return new Promise((resolve) => {
      const confirmed = window.confirm(
        `${options.title}\n\n${options.message}`
      );
      resolve(confirmed);
    });
  }
}
