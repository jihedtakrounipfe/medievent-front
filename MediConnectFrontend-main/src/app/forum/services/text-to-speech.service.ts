import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TextToSpeechService {
  private synthesis: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private isSupported = false;
  private isAvailable = false; // Statut réel d'utilisation
  private currentUtterances: SpeechSynthesisUtterance[] = [];
  private isSpeaking = new BehaviorSubject<boolean>(false);
  public isSpeaking$ = this.isSpeaking.asObservable();
  private MAX_UTTERANCE_LENGTH = 200;
  private userHasInteracted = false;
  private errorCount = 0;
  private MAX_ERRORS_BEFORE_DISABLE = 3; // Désactiver après 3 erreurs

  constructor(private ngZone: NgZone) {
    this.checkBrowserSupport();
    this.loadVoices();
    this.setupUserInteractionListener();
  }

  private setupUserInteractionListener(): void {
    if (typeof window !== 'undefined') {
      const markInteraction = () => {
        this.userHasInteracted = true;
        document.removeEventListener('click', markInteraction);
        document.removeEventListener('keydown', markInteraction);
      };
      document.addEventListener('click', markInteraction);
      document.addEventListener('keydown', markInteraction);
    }
  }

  private checkBrowserSupport(): void {
    try {
      this.isSupported = 'speechSynthesis' in window && window.speechSynthesis !== null;
      if (this.isSupported) {
        this.synthesis = window.speechSynthesis;
        this.isAvailable = true;
      }
    } catch (e) {
      console.warn('TTS: Non supporté');
      this.isSupported = false;
      this.isAvailable = false;
    }
  }

  private loadVoices(): void {
    if (!this.isSupported) return;
    try {
      this.voices = this.synthesis!.getVoices();
      if (this.synthesis) {
        this.synthesis.onvoiceschanged = () => {
          this.voices = this.synthesis!.getVoices();
        };
      }
    } catch (e) {
      console.warn('TTS: Erreur lors du chargement des voix');
    }
  }

  getFrenchVoice(): SpeechSynthesisVoice | null {
    try {
      const frenchVoices = this.voices.filter(voice => 
        voice.lang.includes('fr') || voice.lang.includes('fr-FR')
      );
      return frenchVoices[0] || null;
    } catch {
      return null;
    }
  }

  private splitIntoUtterances(text: string): string[] {
    const sentences = text.match(/[^.!?\n]+[.!?\n]+/g) || [text];
    const utterances: string[] = [];
    
    for (const sentence of sentences) {
      if (sentence.length > this.MAX_UTTERANCE_LENGTH) {
        const parts = sentence.match(/.{1,200}(?:\s|$)/g) || [sentence];
        utterances.push(...parts.map(p => p.trim()).filter(p => p));
      } else {
        utterances.push(sentence.trim());
      }
    }
    
    return utterances.filter(u => u.length > 0);
  }

  speak(text: string, rate: number = 1, pitch: number = 1, volume: number = 1): void {
    // Retourner silencieusement si le service n'est pas disponible
    if (!this.isSupported || !this.isAvailable || !text.trim()) {
      return;
    }

    // Trop d'erreurs - désactiver silencieusement
    if (this.errorCount >= this.MAX_ERRORS_BEFORE_DISABLE) {
      this.isAvailable = false;
      return;
    }

    this.stop();

    const utterances = this.splitIntoUtterances(text);
    if (utterances.length === 0) return;

    this.currentUtterances = [];
    this.isSpeaking.next(true);

    utterances.forEach((utteranceText, index) => {
      const utterance = new SpeechSynthesisUtterance(utteranceText);
      const frenchVoice = this.getFrenchVoice();
      if (frenchVoice) utterance.voice = frenchVoice;
      utterance.lang = 'fr-FR';
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;

      utterance.onend = () => {
        this.ngZone.run(() => {
          this.currentUtterances = this.currentUtterances.filter(u => u !== utterance);
          if (this.currentUtterances.length === 0) {
            this.isSpeaking.next(false);
          }
        });
      };

      utterance.onerror = (event: Event) => {
        this.ngZone.run(() => {
          const errorEvent = event as SpeechSynthesisErrorEvent;
          const errorMsg = errorEvent.error || 'Erreur inconnue';
          
          // Ignorer les erreurs "interrupted" - c'est normal
          if (errorMsg === 'interrupted') {
            return;
          }
          
          // Compter les erreurs
          this.errorCount++;
          
          // Gérer les erreurs spécifiques
          if (errorMsg === 'not-allowed') {
            // Silencieux - les permissions du navigateur ont refusé
          } else if (errorMsg === 'network') {
            console.warn('TTS: Erreur réseau');
          }
          
          // Si trop d'erreurs, désactiver
          if (this.errorCount >= this.MAX_ERRORS_BEFORE_DISABLE) {
            this.isAvailable = false;
          }
          
          this.isSpeaking.next(false);
          this.currentUtterances = [];
        });
      };

      this.currentUtterances.push(utterance);
      
      try {
        this.synthesis!.speak(utterance);
      } catch (error) {
        this.errorCount++;
        if (this.errorCount >= this.MAX_ERRORS_BEFORE_DISABLE) {
          this.isAvailable = false;
        }
        this.ngZone.run(() => {
          this.isSpeaking.next(false);
          this.currentUtterances = [];
        });
      }
    });
  }

  stop(): void {
    if (!this.isSupported) return;
    try {
      this.synthesis!.cancel();
    } catch (e) {
      // Ignorer les erreurs d'arrêt
    }
    this.currentUtterances = [];
    this.isSpeaking.next(false);
  }

  isPeaking(): boolean {
    return this.isSpeaking.value;
  }

  markUserInteraction(): void {
    this.userHasInteracted = true;
  }

  isAvailableForUse(): boolean {
    return this.isAvailable;
  }
}

