import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminSubscriptionRecord } from '../../sub-admin/models/sub-admin.models';

@Component({
    selector: 'app-plan-deletion-warning-dialog',
    standalone: true,
    imports: [CommonModule],
    template: `
    @if (isVisible) {
      <div
        class="dialog-overlay"
        tabindex="0"
        (click)="onOverlayInteraction($event)"
        (keydown.enter)="onCancel()"
        (keydown.space)="onCancel()">
        <div class="dialog-box">
          <div class="dialog-header">
            <span class="warning-icon">⚠️</span>
            <h2>Cannot Delete Plan</h2>
          </div>

          <div class="dialog-content">
            <p class="main-message">
              This plan cannot be deleted because it has active subscriptions.
            </p>

            <div class="subscription-info">
              <h3>Active Subscriptions</h3>
              <p class="count">{{ subscriptions.length }} {{ subscriptions.length === 1 ? 'user' : 'users' }} 
                {{ subscriptions.length === 1 ? 'is' : 'are' }} currently subscribed to this plan</p>

              <div class="subscription-list">
                @for (sub of subscriptions.slice(0, 5); track sub.id) {
                  <div class="subscription-item">
                    <span class="user-name">{{ sub.userId }}</span>
                    <span class="subscription-dates">
                      Since {{ sub.startDate | date: 'MMM dd, yyyy' }}
                    </span>
                  </div>
                }
                @if (subscriptions.length > 5) {
                  <div class="subscription-item more">
                    <span>+ {{ subscriptions.length - 5 }} more</span>
                  </div>
                }
              </div>
            </div>

            <div class="security-note">
              <h4>Why can't this be deleted?</h4>
              <ul>
                <li><strong>Data Integrity:</strong> Deleting a plan with active subscriptions would break user records</li>
                <li><strong>Security:</strong> Prevents accidental loss of subscription history and user data</li>
                <li><strong>Billing:</strong> Active subscriptions need their plan definition for billing calculations</li>
              </ul>
            </div>

            <div class="recommendations">
              <h4>Recommended Actions</h4>
              <ul>
                <li><strong>Deactivate Instead:</strong> Disable this plan instead of deleting it (users keep subscriptions, new subscriptions are prevented)</li>
                <li><strong>Cancel Subscriptions:</strong> Manually cancel all subscriptions, then delete the plan</li>
                <li><strong>Wait:</strong> Let subscriptions expire naturally before deleting the plan</li>
              </ul>
            </div>
          </div>

          <div class="dialog-footer">
            <button type="button" class="btn-deactivate" (click)="onDeactivate()">
              Deactivate Plan Instead
            </button>
            <button type="button" class="btn-close" (click)="onCancel()">
              Close
            </button>
          </div>
        </div>
      </div>
    }
  `,
    styles: [`
    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .dialog-box {
      background: white;
      border-radius: 12px;
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      animation: slideUp 0.3s ease;
    }

    @keyframes slideUp {
      from {
        transform: translateY(30px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .dialog-header {
      background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 12px 12px 0 0;
    }

    .warning-icon {
      font-size: 3rem;
      display: block;
      margin-bottom: 10px;
    }

    .dialog-header h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
    }

    .dialog-content {
      padding: 30px;
    }

    .main-message {
      font-size: 1.1rem;
      color: #2c3e50;
      margin: 0 0 25px 0;
      line-height: 1.6;
      font-weight: 500;
    }

    .subscription-info {
      background: #f8f9fa;
      border-left: 4px solid #3498db;
      padding: 20px;
      border-radius: 6px;
      margin-bottom: 20px;
    }

    .subscription-info h3 {
      margin: 0 0 10px 0;
      color: #2c3e50;
      font-size: 1rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .count {
      color: #e74c3c;
      font-weight: 600;
      margin: 0 0 15px 0;
      font-size: 0.95rem;
    }

    .subscription-list {
      background: white;
      border: 1px solid #ecf0f1;
      border-radius: 6px;
      max-height: 200px;
      overflow-y: auto;
    }

    .subscription-item {
      padding: 12px 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #ecf0f1;
      font-size: 0.9rem;
    }

    .subscription-item:last-child {
      border-bottom: none;
    }

    .subscription-item.more {
      background: #f8f9fa;
      justify-content: center;
      color: #7f8c8d;
      font-style: italic;
    }

    .user-name {
      font-weight: 600;
      color: #2c3e50;
    }

    .subscription-dates {
      color: #95a5a6;
      font-size: 0.85rem;
    }

    .security-note,
    .recommendations {
      margin-bottom: 20px;
      padding: 15px;
      background: #fef5e7;
      border-left: 4px solid #f39c12;
      border-radius: 6px;
    }

    .security-note h4,
    .recommendations h4 {
      margin: 0 0 10px 0;
      color: #2c3e50;
      font-size: 0.95rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .security-note ul,
    .recommendations ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .security-note li,
    .recommendations li {
      padding: 8px 0;
      color: #555;
      font-size: 0.9rem;
      line-height: 1.5;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    }

    .security-note li:last-child,
    .recommendations li:last-child {
      border-bottom: none;
    }

    .security-note li:before {
      content: "• ";
      color: #f39c12;
      font-weight: 600;
      margin-right: 8px;
    }

    .recommendations {
      background: #e8f4f8;
      border-left-color: #3498db;
    }

    .recommendations li:before {
      content: "→ ";
      color: #3498db;
      font-weight: 600;
      margin-right: 8px;
    }

    .dialog-footer {
      padding: 20px 30px;
      background: #f8f9fa;
      border-top: 1px solid #ecf0f1;
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      border-radius: 0 0 12px 12px;
    }

    .btn-deactivate,
    .btn-close {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-deactivate {
      background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
      color: white;
    }

    .btn-deactivate:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(243, 156, 18, 0.4);
    }

    .btn-close {
      background: #ecf0f1;
      color: #2c3e50;
    }

    .btn-close:hover {
      background: #bdc3c7;
    }

    @media (max-width: 600px) {
      .dialog-box {
        width: 95%;
      }

      .dialog-footer {
        flex-direction: column;
      }

      .btn-deactivate,
      .btn-close {
        width: 100%;
      }
    }
  `]
})
export class PlanDeletionWarningDialogComponent {
    @Input() isVisible = false;
    @Input() planName = '';
    @Input() planType = '';
    @Input() subscriptions: AdminSubscriptionRecord[] = [];

    @Output() closed = new EventEmitter<void>();
    @Output() deactivate = new EventEmitter<void>();

    onOverlayInteraction(event: MouseEvent): void {
        if (event.target === event.currentTarget) {
            this.onCancel();
        }
    }

    onCancel(): void {
        this.closed.emit();
    }

    onDeactivate(): void {
        this.deactivate.emit();
    }
}
