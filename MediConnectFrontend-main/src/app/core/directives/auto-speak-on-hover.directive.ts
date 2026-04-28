import { Directive, ElementRef, HostListener, Input, OnInit, OnDestroy } from '@angular/core';
import { TextToSpeechService } from '../../forum/services/text-to-speech.service';

@Directive({
  selector: 'p, span, h1, h2, h3, h4, h5, h6, a, li, td, th, label, input[type="text"], textarea',
  standalone: false
})
export class AutoSpeakOnHoverDirective implements OnInit, OnDestroy {
  @Input() speakOnHoverEnabled: boolean = true;
  
  private hoverTimer: any;
  private isHovering = false;

  constructor(
    private el: ElementRef,
    private ttsService: TextToSpeechService
  ) {}

  ngOnInit(): void {
    // Ne pas appliquer aux éléments déjà dotés de appSpeakOnHover
    if (this.el.nativeElement.hasAttribute('appSpeakOnHover')) {
      return;
    }
  }

  ngOnDestroy(): void {
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
    }
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    if (!this.speakOnHoverEnabled) return;
    
    // Vérifier que le TTS est disponible
    if (!this.ttsService.isAvailableForUse()) {
      return;
    }
    
    // Éviter les appels rapides - clear tout timer existant
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
    }
    
    this.isHovering = true;
    this.hoverTimer = setTimeout(() => {
      // Vérifier que le hover est toujours actif
      if (this.isHovering) {
        const textToSpeak = this.getTextToSpeak();
        if (textToSpeak && textToSpeak.trim().length > 0) {
          // Le hover est une interaction utilisateur
          this.ttsService.markUserInteraction();
          this.ttsService.speak(textToSpeak, 1, 1, 1);
        }
      }
    }, 300); // Délai augmenté pour éviter les changements rapides
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.isHovering = false;
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }
    // Arrêter la lecture si on quitte l'élément rapidement
    this.ttsService.stop();
  }

  private getTextToSpeak(): string {
    const el = this.el.nativeElement;
    
    // Pour les inputs et textareas
    if (el.value) {
      return el.value;
    }
    
    // Pour les autres éléments, récupérer le texte visible uniquement
    const text = el.innerText || el.textContent || '';
    
    // Nettoyer le texte
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .substring(0, 300); // Limiter à 300 caractères
  }
}
