import { Component, EventEmitter, Output, OnInit, OnDestroy } from '@angular/core';
import { VoiceRecognitionService } from '../../../forum/services/voice-recognition.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-voice-search',
  templateUrl: './voice-search.component.html',
  styleUrls: ['./voice-search.component.css'],
  standalone: false
})
export class VoiceSearchComponent implements OnInit, OnDestroy {
  @Output() voiceQuery = new EventEmitter<string>();

  isListening = false;
  isSupported = true;
  error: string | null = null;

  private resultSubscription!: Subscription;
  private errorSubscription!: Subscription;

  constructor(private voiceRecognition: VoiceRecognitionService) {}

  ngOnInit(): void {
    this.isSupported = this.voiceRecognition.isSupportedBrowser();
    
    this.resultSubscription = this.voiceRecognition.getVoiceResult().subscribe({
      next: (text) => {
        this.voiceQuery.emit(text);
        this.isListening = false;
        this.error = null;
      }
    });

    this.errorSubscription = this.voiceRecognition.getVoiceError().subscribe({
      next: (error) => {
        this.error = error;
        this.isListening = false;
        
        setTimeout(() => {
          this.error = null;
        }, 3000);
      }
    });
  }

  ngOnDestroy(): void {
    this.resultSubscription?.unsubscribe();
    this.errorSubscription?.unsubscribe();
    this.stopListening();
  }

  startListening(): void {
    if (!this.isSupported) return;
    this.error = null;
    this.isListening = true;
    this.voiceRecognition.startListening();
  }

  stopListening(): void {
    if (!this.isSupported || !this.isListening) return;
    this.voiceRecognition.stopListening();
    this.isListening = false;
  }
}
