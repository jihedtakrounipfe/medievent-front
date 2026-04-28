import { Component, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthFacade } from '../../../core/services/auth.facade';
import { SubscriptionService } from '../services/subscription.service';
import { ChatMessage, PlanChatResponse } from '../models/subscription.models';

@Component({
  selector: 'app-plan-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './plan-chat.component.html',
})
export class PlanChatComponent {
  private subscriptionService = inject(SubscriptionService);
  private authFacade = inject(AuthFacade);


  // Emits the recommended plan name to the parent (plans page)
  planRecommended = output<string>();

  messages: ChatMessage[] = [];
  userInput = '';
  loading = false;
  isOpen = false;
  recommendation: PlanChatResponse | null = null;

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen && this.messages.length === 0) {
      this.addModelMessage("Hi! 👋 I'm your MediConnect advisor. Tell me about your health needs and I'll recommend the best plan for you.");
    }
  }

  sendMessage(): void {
    const content = this.userInput.trim();
    if (!content || this.loading) return;

    const user = this.authFacade.currentUser;
    if (!user) return;

    this.messages.push({ role: 'user', content });
    this.userInput = '';
    this.loading = true;

    this.subscriptionService.chat({
      userId: user.id,
      messages: this.messages
    }).subscribe({
      next: (res) => {
        this.addModelMessage(res.message);
        this.loading = false;

        if (res.recommendationReady && res.recommendedPlan) {
          this.recommendation = res;
          this.planRecommended.emit(res.recommendedPlan);
        }
      },
      error: () => {
        this.addModelMessage('Sorry, something went wrong. Please try again.');
        this.loading = false;
      }
    });
  }

  private addModelMessage(content: string): void {
    this.messages.push({ role: 'model', content });
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}

