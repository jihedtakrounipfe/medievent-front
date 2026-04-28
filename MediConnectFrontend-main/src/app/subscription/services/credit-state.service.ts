import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { SubscriptionService } from './subscription.service';
import { AuthFacade } from '../../../core/services/auth.facade';
import { UserCredit } from '../models/subscription.models';

@Injectable({ providedIn: 'root' })
export class CreditStateService {
  private subscriptionService = inject(SubscriptionService);
  private authFacade = inject(AuthFacade);

  private readonly creditSubject = new BehaviorSubject<UserCredit | null>(null);
  readonly credit$ = this.creditSubject.asObservable();

  initializeForCurrentUser(): void {
  const user = this.authFacade.currentUser;
  if (!user) {
    this.clear();
    return;
  }
  this.refresh(user.id);
}

  refresh(userId: number): void {
    this.subscriptionService.getCredit(userId).subscribe({
      next: (credit) => {
        this.creditSubject.next(credit);
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 404) {
          this.creditSubject.next(null);
        }
      }
    });
  }

  setCredit(credit: UserCredit | null): void {
    this.creditSubject.next(credit);
  }

  clear(): void {
    this.creditSubject.next(null);
  }
}

