import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserCredit } from '../../subscription/models/subscription.models';

@Component({
  selector: 'app-credit-details-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen && credit) {
      <div class="credit-modal-overlay" (click)="onClose()">
        <div class="credit-modal" (click)="$event.stopPropagation()">
          <!-- Header -->
          <div class="modal-header">
            <div class="header-content">
              <h3>💰 Credit Details</h3>
              <p class="subtitle">Your available credit balance and expiry information</p>
            </div>
            <button class="close-btn" (click)="onClose()" title="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="modal-body">
            <!-- Balance Section -->
            <div class="credit-section">
              <div class="section-label">Available Balance</div>
              <div class="balance-display">
                <span class="balance-amount">{{ credit.balance | number: '1.2-2' }}</span>
                <span class="currency">DO</span>
              </div>
              <p class="balance-description">You can apply this credit to your next subscription or upgrade.</p>
            </div>

            <!-- Details Grid -->
            <div class="details-grid">
              <!-- Expiry Date -->
              <div class="detail-item">
                <span class="detail-icon">📅</span>
                <div class="detail-content">
                  <span class="detail-label">Expires On</span>
                  <span class="detail-value">{{ formatDate(credit.expiresAt) }}</span>
                </div>
              </div>

              <!-- Earned Date -->
              @if (credit.createdAt) {
                <div class="detail-item">
                  <span class="detail-icon">🎁</span>
                  <div class="detail-content">
                    <span class="detail-label">Earned On</span>
                    <span class="detail-value">{{ formatDate(credit.createdAt) }}</span>
                  </div>
                </div>
              }

              <!-- Time Remaining -->
              <div class="detail-item">
                <span class="detail-icon">⏳</span>
                <div class="detail-content">
                  <span class="detail-label">Time Remaining</span>
                  <span class="detail-value">{{ daysUntilExpiry }} days</span>
                </div>
              </div>

              <!-- Applied Amount -->
              @if (credit.appliedToCheckout && credit.appliedToCheckout > 0) {
                <div class="detail-item">
                  <span class="detail-icon">✅</span>
                  <div class="detail-content">
                    <span class="detail-label">Applied to Checkout</span>
                    <span class="detail-value">{{ credit.appliedToCheckout | number: '1.2-2' }} DO</span>
                  </div>
                </div>
              }
            </div>

            <!-- Info Box -->
            <div class="info-box">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <div>
                <p class="info-title">How Credit Works</p>
                <p class="info-text">Credit is automatically applied when you subscribe or upgrade. Any unused credit from plan changes is credited back to your account.</p>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button class="btn btn-primary" (click)="onClose()">
              Close
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .credit-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9998;
      backdrop-filter: blur(2px);
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .credit-modal {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(15, 23, 42, 0.25);
      max-width: 500px;
      width: 90%;
      animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      overflow: hidden;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Header */
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 24px;
      border-bottom: 1px solid #e5e7eb;
      background: linear-gradient(135deg, #f0f9ff 0%, #f3e8ff 100%);
    }

    .header-content {
      flex: 1;
    }

    .modal-header h3 {
      margin: 0 0 4px 0;
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
    }

    .subtitle {
      margin: 0;
      font-size: 13px;
      color: #64748b;
      font-weight: 500;
    }

    .close-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: #94a3b8;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: all 0.2s;
      flex-shrink: 0;
      margin-left: 12px;
    }

    .close-btn:hover {
      background: rgba(59, 130, 246, 0.1);
      color: #3b82f6;
    }

    /* Body */
    .modal-body {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* Balance Section */
    .credit-section {
      text-align: center;
      padding: 20px;
      background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%);
      border-radius: 10px;
      border: 1px solid #93c5fd;
    }

    .section-label {
      font-size: 12px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }

    .balance-display {
      display: flex;
      align-items: baseline;
      justify-content: center;
      gap: 6px;
      margin-bottom: 12px;
    }

    .balance-amount {
      font-size: 36px;
      font-weight: 800;
      color: #1e40af;
    }

    .currency {
      font-size: 16px;
      font-weight: 700;
      color: #3b82f6;
    }

    .balance-description {
      margin: 0;
      font-size: 13px;
      color: #475569;
      line-height: 1.5;
    }

    /* Details Grid */
    .details-grid {
      display: grid;
      gap: 12px;
    }

    .detail-item {
      display: flex;
      gap: 12px;
      padding: 12px;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }

    .detail-icon {
      font-size: 18px;
      flex-shrink: 0;
    }

    .detail-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }

    .detail-label {
      font-size: 12px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .detail-value {
      font-size: 14px;
      font-weight: 600;
      color: #0f172a;
    }

    /* Info Box */
    .info-box {
      display: flex;
      gap: 12px;
      padding: 12px;
      background: #fef3c7;
      border-radius: 8px;
      border-left: 4px solid #f59e0b;
    }

    .info-box svg {
      color: #d97706;
      flex-shrink: 0;
    }

    .info-title {
      margin: 0 0 4px 0;
      font-size: 13px;
      font-weight: 700;
      color: #92400e;
    }

    .info-text {
      margin: 0;
      font-size: 12px;
      color: #78350f;
      line-height: 1.5;
    }

    /* Footer */
    .modal-footer {
      padding: 16px 24px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      background: #f8fafc;
    }

    /* Button */
    .btn {
      padding: 10px 20px;
      border-radius: 8px;
      border: none;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
    }

    .btn-primary {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }

    .btn-primary:hover {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
      transform: translateY(-2px);
    }

    .btn-primary:active {
      transform: translateY(0);
    }
  `]
})
export class CreditDetailsModalComponent {
  @Input() isOpen = false;
  @Input() credit: UserCredit | null = null;
  @Output() closed = new EventEmitter<void>();

  onClose(): void {
    this.closed.emit();
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  }

  get daysUntilExpiry(): number {
    if (!this.credit?.expiresAt) return 0;
    try {
      const expiryDate = new Date(this.credit.expiresAt);
      const today = new Date();
      const diffTime = expiryDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays);
    } catch {
      return 0;
    }
  }
}
