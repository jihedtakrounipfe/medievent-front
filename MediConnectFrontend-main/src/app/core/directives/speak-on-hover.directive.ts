import { Directive, ElementRef, HostListener, Input, OnDestroy } from '@angular/core';
import { TextToSpeechService } from '../../forum/services/text-to-speech.service';

@Directive({
  selector: '[appSpeakOnHover]',
  standalone: false
})
export class SpeakOnHoverDirective implements OnDestroy {
  @Input() speakText: string = '';
  @Input() speakRate: number = 1;
  @Input() speakPitch: number = 1;
  @Input() speakVolume: number = 1;
  @Input() speakEnabled: boolean = true;
  @Input() speakDelay: number = 300;

  private hoverTimer: any;
  private isHovering = false;

  constructor(
    private el: ElementRef,
    private ttsService: TextToSpeechService
  ) {}

  @HostListener('mouseenter')
  onMouseEnter(): void {
    if (!this.speakEnabled) return;
    
    this.isHovering = true;
    this.hoverTimer = setTimeout(() => {
      if (this.isHovering) {
        const textToSpeak = this.speakText || this.el.nativeElement.innerText || this.el.nativeElement.value;
        if (textToSpeak) {
          this.ttsService.speak(textToSpeak, this.speakRate, this.speakPitch, this.speakVolume);
        }
      }
    }, this.speakDelay);
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.isHovering = false;
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
    }
    this.ttsService.stop();
  }

  ngOnDestroy(): void {
    this.ttsService.stop();
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
    }
  }
}
