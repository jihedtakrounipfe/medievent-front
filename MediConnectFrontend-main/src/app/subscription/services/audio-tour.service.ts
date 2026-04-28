import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthFacade } from '../../../core/services/auth.facade';
import { AnyUser, isPatient } from '../../../core/user';

@Injectable({ providedIn: 'root' })
export class AudioTourService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private authFacade = inject(AuthFacade);
  private readonly tours = new Map<string, string[]>();
  private readonly apiUrl = `${environment.apiUrl}/ai/audio-tour`;

  private baseTourPages = [
    { path: '/plans', name: 'plans' },
    { path: '/plans-guide', name: 'plans-guide' },
    { path: '/subscription', name: 'active-subscription' },
    { path: '/history', name: 'subscription-history' },
    { path: '/credit', name: 'credit' },
  ];

  private patientOnlyPages = [
    { path: '/subscription/student-verification', name: 'student-verification-status' },
  ];

  private tourPages: { path: string; name: string }[] = [];
  private currentTourIndex = 0;
  private tourActive = false;
  private pageContextMap = new Map<string, string>();
  private waitingForPage = '';
  private tourStartPath = '';

  // Fix 2: track in-flight HTTP call so we can cancel it
  private currentHttpSub: Subscription | null = null;
  // Fix 1: track the fallback timeout so we can cancel it
  private contextWaitTimer: ReturnType<typeof setTimeout> | null = null;

  private utterance: SpeechSynthesisUtterance | null = null;
  private lastNarration = '';

  private currentPageSubject = new BehaviorSubject<string>('');
  private subtitleSubject = new BehaviorSubject<string>('');
  private isPlayingSubject = new BehaviorSubject<boolean>(false);
  private isPausedSubject = new BehaviorSubject<boolean>(false);
  private textOnlySubject = new BehaviorSubject<boolean>(false);
  private tourProgressSubject = new BehaviorSubject<string>('');

  readonly currentPage$ = this.currentPageSubject.asObservable();
  readonly subtitle$ = this.subtitleSubject.asObservable();
  readonly isPlaying$ = this.isPlayingSubject.asObservable();
  readonly isPaused$ = this.isPausedSubject.asObservable();
  readonly textOnly$ = this.textOnlySubject.asObservable();
  readonly tourProgress$ = this.tourProgressSubject.asObservable();

  private get reducedMotionEnabled(): boolean {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  registerTour(pageName: string, script: string[]): void {
    if (!pageName || !script.length) return;
    this.tours.set(pageName, script);
  }

  setCurrentPage(pageName: string): void {
    this.currentPageSubject.next(pageName);
  }

  startTourForCurrentPage(): void {
    const pageName = this.currentPageSubject.value;
    if (!pageName) return;
    this.startTour(pageName);
  }

  startFullTour(): void {
    // Fix 2: if already active, stop cleanly first then restart
    if (this.tourActive) {
      this.stopTour();
      // Small delay to let stop settle before restarting
      setTimeout(() => this.launchFullTour(), 300);
      return;
    }
    this.launchFullTour();
  }

  private launchFullTour(): void {
    console.log('[AudioTour] TOUR STARTED');
    this.tourActive = true;
    this.currentTourIndex = 0;
    this.tourStartPath = this.router.url;
    this.pageContextMap.clear();
    this.buildTourPagesForUser();
    this.playSequentialTour();
  }

  private buildTourPagesForUser(): void {
    const tourPages = [...this.baseTourPages];
    this.authFacade.currentUser$.subscribe((user: AnyUser | null) => {
      if (user && isPatient(user)) {
        tourPages.push(...this.patientOnlyPages);
      }
    }).unsubscribe();
    this.tourPages = tourPages;
  }

  private playSequentialTour(): void {
    if (!this.tourActive || this.currentTourIndex >= this.tourPages.length) {
      this.endTour();
      return;
    }

    const page = this.tourPages[this.currentTourIndex];
    this.currentPageSubject.next(page.name);
    this.tourProgressSubject.next(
      `Page ${this.currentTourIndex + 1} of ${this.tourPages.length} — ${page.name}`
    );

    this.router.navigate([page.path]);

    const cachedContext = this.pageContextMap.get(page.name);
    if (cachedContext) {
      this.fetchAndSpeak(page.name, cachedContext);
    } else {
      this.waitingForPage = page.name;

      // Fix 1: store the timer so setPageContext can cancel it
      this.contextWaitTimer = setTimeout(() => {
        if (this.waitingForPage === page.name && this.tourActive) {
          console.log('[AudioTour] Timeout waiting for context from:', page.name, '— using fallback');
          this.waitingForPage = '';
          this.contextWaitTimer = null;
          this.fetchAndSpeak(
            page.name,
            `This is the ${page.name} page of the MediConnect subscription module.`
          );
        }
      }, 4000); // reduced from 5000 to feel snappier
    }
  }

  setPageContext(name: string, context: string): void {
    console.log('[AudioTour] setPageContext called:', name, 'tourActive:', this.tourActive);
    this.pageContextMap.set(name, context);

    if (this.tourActive && this.waitingForPage === name) {
      // Fix 1: cancel the fallback timeout — real context arrived in time
      if (this.contextWaitTimer !== null) {
        clearTimeout(this.contextWaitTimer);
        this.contextWaitTimer = null;
      }
      this.waitingForPage = '';
      this.fetchAndSpeak(name, context);
    }
  }

  private fetchAndSpeak(pageName: string, context: string): void {
    // Fix 2: cancel any in-flight HTTP call from previous tour/page
    if (this.currentHttpSub) {
      this.currentHttpSub.unsubscribe();
      this.currentHttpSub = null;
    }

    console.log('[AudioTour] fetchAndSpeak called for:', pageName);
    this.subtitleSubject.next('Loading...');
    this.isPlayingSubject.next(true);

    this.currentHttpSub = this.http
      .post<{ description: string }>(this.apiUrl, { pageName, pageContext: context })
      .subscribe({
        next: (res) => {
          this.currentHttpSub = null;
          // Fix 2: check tour still active after HTTP response
          if (!this.tourActive) return;
          this.speakThenAdvanceWithNavigation(pageName, res.description);
        },
        error: () => {
          this.currentHttpSub = null;
          if (!this.tourActive) return;
          this.speakThenAdvanceWithNavigation(pageName, context);
        }
      });
  }

  private speakThenAdvanceWithNavigation(pageName: string, text: string): void {
    if (!this.tourActive) return; // Fix 2: guard
    console.log('[AudioTour] Speaking for:', pageName);

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.lang = 'en-US';
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      if (!this.tourActive) {
        window.speechSynthesis.cancel();
        return;
      }
      console.log('[AudioTour] Speech started for:', pageName);
      this.subtitleSubject.next(text);
      this.isPlayingSubject.next(true);
      this.isPausedSubject.next(false);
    };

    utterance.onend = () => {
      console.log('[AudioTour] Speech ended for:', pageName, 'advancing to next');
      if (!this.tourActive) return;
      this.currentTourIndex++;
      this.playSequentialTour();
    };

    utterance.onerror = (e) => {
      console.log('[AudioTour] Speech error for:', pageName, e);
      if (!this.tourActive) return;
      this.currentTourIndex++;
      setTimeout(() => {
        if (this.tourActive) this.playSequentialTour();
      }, 500);
    };

    this.utterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  // Fix 3: pause/resume works for both full tour and single page
  pauseOrResume(): void {
    if (!('speechSynthesis' in window)) return;

    if (this.isPausedSubject.value) {
      window.speechSynthesis.resume();
      this.isPausedSubject.next(false);
      this.isPlayingSubject.next(true);
    } else if (this.isPlayingSubject.value) {
      window.speechSynthesis.pause();
      this.isPausedSubject.next(true);
      this.isPlayingSubject.next(false);
    }
  }

  stopTour(): void {
    this.tourActive = false;
    this.waitingForPage = '';

    // Fix 1: cancel pending context wait timer
    if (this.contextWaitTimer !== null) {
      clearTimeout(this.contextWaitTimer);
      this.contextWaitTimer = null;
    }

    // Fix 2: cancel in-flight HTTP call
    if (this.currentHttpSub) {
      this.currentHttpSub.unsubscribe();
      this.currentHttpSub = null;
    }

    window.speechSynthesis.cancel();
    this.utterance = null;
    this.isPlayingSubject.next(false);
    this.isPausedSubject.next(false);
    this.subtitleSubject.next('');
    this.tourProgressSubject.next('');
  }

  private endTour(): void {
    this.tourActive = false;
    this.isPlayingSubject.next(false);
    this.isPausedSubject.next(false);
    this.tourProgressSubject.next('');
    this.subtitleSubject.next('✅ Tour complete');
    setTimeout(() => this.subtitleSubject.next(''), 3000);
  }

  replay(): void {
    if (!this.lastNarration) return;
    if (this.reducedMotionEnabled) {
      this.subtitleSubject.next(this.lastNarration);
      return;
    }
    this.playNarration(this.lastNarration);
  }

  get tourProgress(): string {
    if (!this.tourActive) return '';
    return `Page ${this.currentTourIndex + 1} of ${this.tourPages.length} — ${this.tourPages[this.currentTourIndex]?.name}`;
  }

  // Single page tour
  startTour(pageName: string): void {
    // Fix 2: cancel any running full tour first
    if (this.tourActive) {
      this.stopTour();
    }

    const script = this.tours.get(pageName);
    if (!script || script.length === 0) return;

    const fallbackText = script.join(' ');

    // Fix 2: cancel previous single page HTTP call
    if (this.currentHttpSub) {
      this.currentHttpSub.unsubscribe();
      this.currentHttpSub = null;
    }

    window.speechSynthesis.cancel();
    this.subtitleSubject.next('Loading audio tour...');
    this.textOnlySubject.next(this.reducedMotionEnabled);

    this.currentHttpSub = this.http
      .post<{ text?: string; content?: string; tour?: string }>(this.apiUrl, {
        pageName,
        context: script
      })
      .subscribe({
        next: (res) => {
          this.currentHttpSub = null;
          const narration = (res?.text || res?.content || res?.tour || fallbackText).trim();
          this.lastNarration = narration;
          if (this.reducedMotionEnabled) {
            this.subtitleSubject.next(narration);
            this.isPlayingSubject.next(false);
            return;
          }
          this.playNarration(narration);
        },
        error: () => {
          this.currentHttpSub = null;
          this.lastNarration = fallbackText;
          if (this.reducedMotionEnabled) {
            this.subtitleSubject.next(fallbackText);
            this.isPlayingSubject.next(false);
            return;
          }
          this.playNarration(fallbackText);
        }
      });
  }

  private playNarration(text: string): void {
    if (!('speechSynthesis' in window)) {
      this.subtitleSubject.next(text);
      this.isPlayingSubject.next(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.lang = 'en-US';

    utterance.onstart = () => {
      this.subtitleSubject.next(text);
      this.isPlayingSubject.next(true);
      this.isPausedSubject.next(false);
    };
    utterance.onend = () => {
      this.isPlayingSubject.next(false);
      this.isPausedSubject.next(false);
    };
    utterance.onerror = () => {
      this.isPlayingSubject.next(false);
      this.isPausedSubject.next(false);
    };

    this.utterance = utterance;
    window.speechSynthesis.speak(utterance);
  }
}