import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class VoiceRecognitionService {
  private recognition: any;
  private isListening = false;
  private recognitionResult = new Subject<string>();
  private recognitionError = new Subject<string>();
  private isSupported = false;

  constructor(private ngZone: NgZone) {
    this.checkBrowserSupport();
    this.initRecognition();
  }

  private checkBrowserSupport(): void {
    const w: any = window;
    this.isSupported = !!(w.webkitSpeechRecognition || w.SpeechRecognition);
    console.log('Support reconnaissance vocale:', this.isSupported);
  }

  private initRecognition(): void {
    if (!this.isSupported) return;

    try {
      const w: any = window;
      const SpeechRecognition = w.webkitSpeechRecognition || w.SpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'fr-FR';
      this.recognition.maxAlternatives = 1;

      this.recognition.onresult = (event: any) => {
        this.ngZone.run(() => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join('');
          
          if (event.results[0].isFinal) {
            this.recognitionResult.next(transcript);
          }
        });
      };

      this.recognition.onerror = (event: any) => {
        this.ngZone.run(() => {
          this.recognitionError.next('Erreur: ' + event.error);
          this.isListening = false;
        });
      };

      this.recognition.onend = () => {
        this.ngZone.run(() => {
          this.isListening = false;
        });
      };

    } catch (error) {
      console.error('Erreur initialisation reconnaissance vocale:', error);
    }
  }

  startListening(): void {
    if (!this.isSupported) {
      this.recognitionError.next('Non supporté');
      return;
    }
    if (this.isListening) return;

    try {
      this.recognition.start();
      this.isListening = true;
    } catch (error) {
      console.error('Erreur démarrage:', error);
    }
  }

  stopListening(): void {
    if (!this.isSupported || !this.isListening) return;

    try {
      this.recognition.stop();
      this.isListening = false;
    } catch (error) {
      console.error('Erreur arrêt:', error);
    }
  }

  getVoiceResult(): Observable<string> {
    return this.recognitionResult.asObservable();
  }

  getVoiceError(): Observable<string> {
    return this.recognitionError.asObservable();
  }

  isSupportedBrowser(): boolean {
    return this.isSupported;
  }

  isCurrentlyListening(): boolean {
    return this.isListening;
  }
}