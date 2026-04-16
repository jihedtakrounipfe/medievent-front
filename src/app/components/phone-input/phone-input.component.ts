import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALIDATORS, NG_VALUE_ACCESSOR, ValidationErrors, Validator, AbstractControl } from '@angular/forms';

@Component({
  selector: 'app-phone-input',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PhoneInputComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => PhoneInputComponent),
      multi: true,
    },
  ],
  template: `
    <div class="space-y-1.5">
      <div class="flex items-stretch rounded-xl border border-stone-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-teal-200 focus-within:border-teal-500"
           [class.border-rose-300]="showError()"
           [class.bg-rose-50]="showError()">
        <div class="px-3 flex items-center bg-stone-50 border-r border-stone-200 text-sm font-semibold text-stone-700 select-none">
          +216
        </div>
        <input
          type="tel"
          inputmode="numeric"
          autocomplete="tel"
          class="flex-1 px-3 py-2 text-sm text-stone-900 placeholder-stone-400 outline-none bg-transparent"
          [placeholder]="placeholder"
          [value]="display()"
          (input)="onInput($event)"
          (blur)="markTouched()"
          [disabled]="disabled()"
        />
      </div>

      <p *ngIf="showError()" class="text-xs text-rose-600">Le numéro doit contenir 8 chiffres</p>
    </div>
  `,
})
export class PhoneInputComponent implements ControlValueAccessor, Validator {
  @Input() placeholder = '98 765 432';

  @Input()
  set value(v: string) {
    this.writeValue(v);
  }

  @Output() valueChange = new EventEmitter<string>();

  private digits = signal('');
  private touched = signal(false);
  disabled = signal(false);

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  display(): string {
    const d = this.digits();
    if (!d) return '';
    const a = d.slice(0, 2);
    const b = d.slice(2, 5);
    const c = d.slice(5, 8);
    return [a, b, c].filter(Boolean).join(' ');
  }

  onInput(evt: Event): void {
    const raw = (evt.target as HTMLInputElement).value ?? '';
    const next = raw.replace(/\D/g, '').slice(0, 8);
    this.digits.set(next);
    const full = next ? `+216${next}` : '';
    this.onChange(full);
    this.valueChange.emit(full);
  }

  markTouched(): void {
    this.touched.set(true);
    this.onTouched();
  }

  validate(_: AbstractControl): ValidationErrors | null {
    const d = this.digits();
    if (!d) return null;
    return d.length === 8 ? null : { phoneDigits: true };
  }

  showError(): boolean {
    const d = this.digits();
    if (!this.touched()) return false;
    if (!d) return false;
    return d.length !== 8;
  }

  writeValue(value: string | null): void {
    const v = (value ?? '').toString().trim();
    const d = v.startsWith('+216') ? v.slice(4) : v;
    this.digits.set(d.replace(/\D/g, '').slice(0, 8));
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}

