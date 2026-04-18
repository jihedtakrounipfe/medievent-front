import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';

declare global {
  interface Window {
    grecaptcha: {
      ready: (cb: () => void) => void;
      render: (container: HTMLElement, params: object) => number;
      reset: (widgetId: number) => void;
    };
  }
}

/**
 * Wraps Google reCAPTCHA v2 ("I'm not a robot" checkbox).
 * Loads the Google script lazily on first use — no npm dependency needed.
 *
 * Usage:
 *   <app-recaptcha [siteKey]="siteKey" (resolved)="onToken($event)" />
 *
 * The `resolved` event emits a string token when the user completes the challenge,
 * or null when the token expires. Block form submission when token is null.
 */
@Component({
  selector: 'app-recaptcha',
  standalone: true,
  template: `<div #container></div>`,
})
export class RecaptchaComponent implements AfterViewInit, OnDestroy {
  @Input() siteKey!: string;
  @Output() resolved = new EventEmitter<string | null>();
  @Output() error    = new EventEmitter<void>();

  @ViewChild('container') container!: ElementRef<HTMLDivElement>;

  private widgetId: number | null = null;
  private destroyed = false;

  ngAfterViewInit(): void {
    this.loadScript().then(() => {
      if (!this.destroyed) this.renderWidget();
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
  }

  /** Call from outside to reset the widget (e.g., after a failed API call). */
  reset(): void {
    if (window.grecaptcha && this.widgetId !== null) {
      window.grecaptcha.reset(this.widgetId);
    }
    this.resolved.emit(null);
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private loadScript(): Promise<void> {
    return new Promise((resolve) => {
      if (window.grecaptcha) {
        resolve();
        return;
      }
      const existing = document.getElementById('recaptcha-script');
      if (existing) {
        // Script tag already injected by a previous component — wait for load
        existing.addEventListener('load', () => resolve(), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.id  = 'recaptcha-script';
      script.src = 'https://www.google.com/recaptcha/api.js?render=explicit&hl=fr';
      script.async = true;
      script.defer = true;
      script.addEventListener('load', () => resolve(), { once: true });
      document.head.appendChild(script);
    });
  }

  private renderWidget(): void {
    window.grecaptcha.ready(() => {
      if (!this.container?.nativeElement || this.destroyed) return;
      this.widgetId = window.grecaptcha.render(this.container.nativeElement, {
        sitekey:            this.siteKey,
        callback:           (token: string) => this.resolved.emit(token),
        'expired-callback': () => this.resolved.emit(null),
        'error-callback':   () => { this.error.emit(); this.resolved.emit(null); },
      });
    });
  }
}
