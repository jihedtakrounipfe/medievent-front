import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ForumComment, CommentUserReputation } from '../../models/forum-comment';
import { ForumCommentService } from '../../services/forum-comment.service';

/**
 * Composant pour afficher un commentaire en arborescence avec réponses imbriquées
 * Gère: collapse/expand, marques utility, réputation, historique, épinglage
 */
@Component({
  selector: 'app-forum-comment-thread',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- COMMENTAIRE PRINCIPAL -->
    <div class="comment-item" [class.pinned]="comment.isPinned" [class.author-op]="comment.isAuthorOp">
      
      <!-- Pin indicator -->
      <div *ngIf="comment.isPinned" class="pinned-badge">📌 Épinglé</div>

      <!-- HEADER: Avatar + Auteur + Infos -->
      <div class="comment-header">
        <div class="author-section">
          <div class="author-avatar" 
               [ngClass]="comment.author.role === 'DOCTOR' ? 'avatar-doctor' : 'avatar-patient'">
            {{ comment.author.initials || '??' }}
          </div>
          
          <div class="author-info">
            <div class="author-line">
              <span class="author-name">{{ comment.author.fullName || 'Anonyme' }}</span>
              
              <!-- Role Badge -->
              <span *ngIf="comment.author.role === 'DOCTOR'" class="role-badge">👨‍⚕️ Médecin</span>
              
              <!-- Author OP Badge -->
              <span *ngIf="comment.isAuthorOp" class="op-badge">🔵 A.O</span>
              
              <!-- Reputation Badge -->
              <span *ngIf="comment.reputation && comment.reputation >= 20" 
                    class="reputation-badge"
                    [ngClass]="'rep-' + getReputationLevel(comment.reputation)">
                ⭐ {{ getReputationLevelName(comment.reputation) }}
              </span>
            </div>
            
            <div class="timestamp-meta">
              <span class="timestamp">{{ comment.createdAt | date:'dd MMM HH:mm' }}</span>
              <span *ngIf="comment.updatedAt && comment.updatedAt !== comment.createdAt" 
                    class="edited-label">(modifié)</span>
            </div>
          </div>
        </div>

        <!-- Score Badge -->
        <div class="score-badge">
          <span class="score-value">{{ (comment.computedScore || 0) | number:'1.1-1' }}</span>
          <span class="score-label">pts</span>
        </div>
      </div>

      <!-- CONTENU -->
      <div class="comment-content">
        <p class="comment-text">{{ comment.content }}</p>
        
        <!-- Edit History -->
        <div *ngIf="comment.editHistory && comment.editHistory.length > 0" class="edit-history">
          <button type="button" class="edit-history-btn" (click)="toggleEditHistory(comment.id)">
            📝 {{ showEditHistory[comment.id] ? 'Masquer' : 'Voir' }} l'historique
          </button>
          <div *ngIf="showEditHistory[comment.id]" class="edit-history-list">
            <div *ngFor="let edit of comment.editHistory" class="edit-entry">
              <span class="edit-date">{{ edit.editedAt | date:'dd MMM HH:mm' }}</span>
              <span class="edit-by">par {{ edit.editedBy }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- MARQUES UTILITÉ -->
      <div class="utility-marks">
        <button type="button" 
                class="utility-btn"
                [class.active]="getUserUtility(comment.id) === 'helpful'"
                (click)="markUtility(comment.id, 'helpful')"
                title="Marquer comme utile">
          👍 Utile {{ getUserUtilityCount(comment.id, 'helpful') }}
        </button>
        <button type="button" 
                class="utility-btn solution"
                [class.active]="getUserUtility(comment.id) === 'solution'"
                (click)="markUtility(comment.id, 'solution')"
                title="Marquer comme solution">
          ✅ Solution {{ getUserUtilityCount(comment.id, 'solution') }}
        </button>
        <button type="button" 
                class="utility-btn negative"
                [class.active]="getUserUtility(comment.id) === 'irrelevant'"
                (click)="markUtility(comment.id, 'irrelevant')"
                title="Non pertinent">
          ❌ Impact
        </button>
      </div>

      <!-- ACTIONS -->
      <div class="comment-actions">
        <button type="button" class="action-btn" (click)="onUpvote.emit(comment.id)">
          👍 {{ comment.upvotes || 0 }}
        </button>
        <button type="button" class="action-btn" (click)="onReply.emit(comment.id)">
          💬 Répondre
        </button>
        <button type="button" 
                class="action-btn"
                [class.active]="comment.isPinned"
                (click)="togglePin(comment.id)">
          📌
        </button>
        <button type="button" class="action-btn" (click)="onEdit.emit(comment.id)">
          ✏️
        </button>
        <button type="button" class="action-btn delete" (click)="onDelete.emit(comment.id)">
          🗑️
        </button>
      </div>

      <!-- COLLAPSE/EXPAND REPLIES -->
      <div *ngIf="comment.replies && comment.replies.length > 0" class="replies-section">
        <button type="button" 
                class="toggle-replies-btn"
                (click)="toggleCollapse(comment.id)">
          {{ comment.collapsed ? '▶️' : '▼️' }} 
          {{ comment.collapsed ? 'Afficher' : 'Masquer' }} 
          {{ comment.replies!.length }} réponse{{ comment.replies!.length > 1 ? 's' : '' }}
        </button>

        <!-- NESTED REPLIES (Recursive) -->
        <div *ngIf="!comment.collapsed" class="replies-list">
          <app-forum-comment-thread
            *ngFor="let reply of comment.replies"
            [comment]="reply"
            [depth]="depth + 1"
            (onUpvote)="onUpvote.emit($event)"
            (onReply)="onReply.emit($event)"
            (onEdit)="onEdit.emit($event)"
            (onDelete)="onDelete.emit($event)"
            (onMarkUtility)="onMarkUtility.emit($event)"
            (onPin)="onPin.emit($event)">
          </app-forum-comment-thread>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .comment-item {
      padding: 1rem;
      margin: 0.75rem 0;
      border-left: 3px solid #e0e0e0;
      background: #fafafa;
      border-radius: 6px;
      transition: all 0.2s ease;
      margin-left: calc(var(--depth, 0) * 1.5rem);
    }

    .comment-item.pinned {
      background: #fffbf0;
      border-left-color: #ff9800;
      box-shadow: 0 0 0 1px #ffe0b2;
    }

    .comment-item.author-op {
      border-left-color: #2196f3;
      background: #f3f4fb;
    }

    .pinned-badge {
      display: inline-block;
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      background: #ff9800;
      color: white;
      border-radius: 3px;
      margin-bottom: 0.5rem;
    }

    .comment-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
    }

    .author-section {
      display: flex;
      gap: 0.75rem;
      flex: 1;
    }

    .author-avatar {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 0.85rem;
      background: #e3f2fd;
      color: #1976d2;
    }

    .author-avatar.avatar-doctor {
      background: #e8f5e9;
      color: #388e3c;
    }

    .author-info {
      flex: 1;
    }

    .author-line {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-bottom: 0.25rem;
    }

    .author-name {
      font-weight: 600;
      color: #333;
    }

    .role-badge, .op-badge, .reputation-badge {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      border-radius: 3px;
      background: #f0f0f0;
      color: #666;
    }

    .op-badge {
      background: #e3f2fd;
      color: #1976d2;
    }

    .reputation-badge {
      background: #fff3e0;
      color: #e65100;
    }

    .reputation-badge.rep-contributor {
      background: #e8f5e9;
      color: #388e3c;
    }

    .reputation-badge.rep-expert {
      background: #f3e5f5;
      color: #7b1fa2;
    }

    .reputation-badge.rep-trusted {
      background: #fce4ec;
      color: #c2185b;
    }

    .timestamp-meta {
      font-size: 0.8rem;
      color: #999;
    }

    .edited-label {
      font-style: italic;
      color: #666;
    }

    .score-badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0.5rem;
      background: #f0f0f0;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: bold;
      color: #666;
    }

    .comment-content {
      margin: 0.75rem 0;
      color: #333;
      line-height: 1.5;
    }

    .comment-text {
      margin: 0;
      word-wrap: break-word;
    }

    .edit-history {
      margin-top: 0.5rem;
      font-size: 0.8rem;
    }

    .edit-history-btn {
      background: none;
      border: none;
      color: #2196f3;
      cursor: pointer;
      text-decoration: underline;
      padding: 0;
      font-size: 0.8rem;
    }

    .edit-history-list {
      margin-top: 0.5rem;
      padding: 0.5rem;
      background: #f5f5f5;
      border-radius: 3px;
      font-size: 0.75rem;
    }

    .edit-entry {
      display: flex;
      gap: 0.5rem;
      color: #666;
      margin: 0.25rem 0;
    }

    .utility-marks {
      display: flex;
      gap: 0.5rem;
      margin: 0.75rem 0;
      flex-wrap: wrap;
    }

    .utility-btn {
      padding: 0.35rem 0.65rem;
      border: 1px solid #ddd;
      background: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8rem;
      transition: all 0.2s;
    }

    .utility-btn:hover {
      border-color: #2196f3;
      background: #f3f4fb;
    }

    .utility-btn.active {
      background: #2196f3;
      color: white;
      border-color: #2196f3;
    }

    .utility-btn.solution {
      border-color: #4caf50;
      color: #4caf50;
    }

    .utility-btn.solution.active {
      background: #4caf50;
      color: white;
    }

    .utility-btn.negative {
      border-color: #f44336;
      color: #f44336;
    }

    .utility-btn.negative.active {
      background: #f44336;
      color: white;
    }

    .comment-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.75rem;
      flex-wrap: wrap;
    }

    .action-btn {
      padding: 0.35rem 0.65rem;
      border: 1px solid #ddd;
      background: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8rem;
      transition: all 0.2s;
    }

    .action-btn:hover {
      background: #f5f5f5;
      border-color: #999;
    }

    .action-btn.active,
    .action-btn.delete:hover {
      background: #f44336;
      color: white;
      border-color: #f44336;
    }

    .replies-section {
      margin-top: 1rem;
      padding-top: 0.75rem;
      border-top: 1px solid #e0e0e0;
    }

    .toggle-replies-btn {
      background: none;
      border: none;
      color: #2196f3;
      cursor: pointer;
      font-size: 0.85rem;
      padding: 0;
      margin-bottom: 0.75rem;
    }

    .toggle-replies-btn:hover {
      text-decoration: underline;
    }

    .replies-list {
      margin-left: 1rem;
    }
  `]
})
export class ForumCommentThreadComponent {
  @Input() comment!: ForumComment;
  @Input() depth = 0;

  @Output() onUpvote = new EventEmitter<string>();
  @Output() onReply = new EventEmitter<string>();
  @Output() onEdit = new EventEmitter<string>();
  @Output() onDelete = new EventEmitter<string>();
  @Output() onMarkUtility = new EventEmitter<{ commentId: string; utilityType: 'helpful' | 'solution' | 'irrelevant' }>();
  @Output() onPin = new EventEmitter<string>();

  showEditHistory: Record<string, boolean> = {};
  userUtilityVotes: Map<string, 'helpful' | 'solution' | 'irrelevant'> = new Map();

  constructor(private commentService: ForumCommentService) {}

  toggleCollapse(commentId: string): void {
    // Trouvez et mettez à jour le commentaire
    if (this.comment.id === commentId) {
      this.comment.collapsed = !this.comment.collapsed;
    }
  }

  toggleEditHistory(commentId: string): void {
    this.showEditHistory[commentId] = !this.showEditHistory[commentId];
  }

  togglePin(commentId: string): void {
    this.onPin.emit(commentId);
  }

  markUtility(commentId: string, utilityType: 'helpful' | 'solution' | 'irrelevant'): void {
    this.userUtilityVotes.set(commentId, utilityType);
    this.onMarkUtility.emit({ commentId, utilityType });
  }

  getUserUtility(commentId: string): 'helpful' | 'solution' | 'irrelevant' | undefined {
    return this.userUtilityVotes.get(commentId);
  }

  getUserUtilityCount(commentId: string, utilityType: 'helpful' | 'solution' | 'irrelevant'): number {
    // À implémenter avec les données du backend
    return 0;
  }

  getReputationLevel(reputation: number): string {
    if (reputation >= 100) return 'trusted';
    if (reputation >= 50) return 'expert';
    if (reputation >= 20) return 'contributor';
    return 'novice';
  }

  getReputationLevelName(reputation: number): string {
    const levels: Record<string, string> = {
      'trusted': 'De confiance',
      'expert': 'Expert',
      'contributor': 'Contributeur',
      'novice': 'Novice'
    };
    return levels[this.getReputationLevel(reputation)];
  }
}
