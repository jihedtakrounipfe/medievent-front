import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AccessibilityService {
  highContrast = false;
  fontSize = 16; // en pixels
  fontSizeLevel = 1; // 1 = 100%, 2 = 125%, 3 = 150%
  reduceMotion = false;

  toggleHighContrast() {
    this.highContrast = !this.highContrast;
    document.body.classList.toggle('high-contrast', this.highContrast);
    this.announce(`Mode contraste ${this.highContrast ? 'activé' : 'désactivé'}`);
  }

  setFontSize(level: number) {
    this.fontSizeLevel = level;
    switch(level) {
      case 1:
        this.fontSize = 16;
        break;
      case 2:
        this.fontSize = 20;
        break;
      case 3:
        this.fontSize = 24;
        break;
    }
    document.documentElement.style.fontSize = this.fontSize + 'px';
    this.announce(`Taille de police modifiée à ${this.fontSizeLevel * 100}%`);
  }

  increaseFontSize() {
    if (this.fontSizeLevel < 3) {
      this.setFontSize(this.fontSizeLevel + 1);
    }
  }

  decreaseFontSize() {
    if (this.fontSizeLevel > 1) {
      this.setFontSize(this.fontSizeLevel - 1);
    }
  }

  toggleReduceMotion() {
    this.reduceMotion = !this.reduceMotion;
    document.body.classList.toggle('reduce-motion', this.reduceMotion);
    this.announce(`Animations ${this.reduceMotion ? 'réduites' : 'normales'}`);
  }

  announce(message: string) {
    // Créer ou réutiliser un élément pour les lecteurs d'écran
    let announcer = document.getElementById('accessibility-announcer');
    if (!announcer) {
      announcer = document.createElement('div');
      announcer.id = 'accessibility-announcer';
      announcer.setAttribute('aria-live', 'polite');
      announcer.classList.add('sr-only');
      document.body.appendChild(announcer);
    }
    
    announcer.textContent = message;
  }
}