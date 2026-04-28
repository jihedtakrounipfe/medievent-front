import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ForumPost } from '../../models/forum-post';
import { ForumPostService } from '../../services/forum-post.service';

@Component({
  selector: 'app-forum-list',
  templateUrl: './forum-list.component.html',
  styleUrls: ['./forum-list.component.css'],
  standalone: false
})
export class ForumListComponent implements OnInit {
  
  posts: ForumPost[] = [];
  filteredPosts: ForumPost[] = [];
  isLoading = true;
  
  // Filtres
  searchQuery = '';
  selectedCategory: string = 'all';
  tagFilter = '';
  
  categories = [
    { value: 'all', label: 'Tous', icon: '📋' },
    { value: 'QUESTION', label: 'Questions', icon: '❓' },
    { value: 'ADVICE', label: 'Conseils', icon: '💬' },
    { value: 'AWARENESS', label: 'Sensibilisation', icon: '📢' },
    { value: 'DOCUMENT', label: 'Documents', icon: '📄' }
  ];

  // Réactions et sauvegarde
  reactionEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡'];
  postReactions: Map<string, { counts: Record<string, number>; userReaction: string | null }> = new Map();
  postSaveStatus: Map<string, boolean> = new Map();
  currentUserId = 1;
  isPinningPostId: string | null = null;

  constructor(
    private postService: ForumPostService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPosts();
  }

  loadPosts(): void {
    this.isLoading = true;
    this.postService.getPinned().subscribe({
      next: (pinned) => {
        this.postService.getAll().subscribe({
          next: (page) => {
            const normal = page.content.filter(p => !p.pinned);
            this.posts = [...pinned, ...normal];
            this.filteredPosts = [...this.posts];
            this.loadReactionsForPosts();
            this.loadSaveStatusForPosts();
            this.isLoading = false;
          },
          error: (err) => {
            console.error('Erreur chargement posts:', err);
            this.isLoading = false;
          }
        });
      },
      error: (err) => {
        console.error('Erreur chargement épinglés:', err);
        this.postService.getAll().subscribe({
          next: (page) => {
            this.posts = page.content;
            this.filteredPosts = page.content;
            this.loadReactionsForPosts();
            this.loadSaveStatusForPosts();
            this.isLoading = false;
          },
          error: () => { this.isLoading = false; }
        });
      }
    });
  }

  filterPosts(): void {
    this.filteredPosts = this.posts.filter(post => {
      // Filtre par recherche
      const matchesSearch = this.searchQuery === '' ||
        post.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        post.content.toLowerCase().includes(this.searchQuery.toLowerCase());
      
      const matchesCategory = this.selectedCategory === 'all' || 
                             post.category === this.selectedCategory;
      
      const matchesTag = this.tagFilter === '' || post.tags?.some(t => t.toLowerCase().includes(this.tagFilter.toLowerCase()));
      
      return matchesSearch && matchesCategory && matchesTag;
    });
  }

  onSearch(): void {
    this.filterPosts();
  }

  onCategoryChange(category: string): void {
    this.selectedCategory = category;
    this.filterPosts();
  }

  viewPost(id: string): void {
    this.router.navigate(['/forum/post', id]);
  }

  createNewPost(): void {
    this.router.navigate(['/forum/nouveau']);
  }

  // ✅ Méthode pour les styles de catégorie (à utiliser avec [ngStyle])
  getCategoryStyle(category: string): any {
    const styles: Record<string, any> = {
      'QUESTION': {
        background: '#dbeafe',
        color: '#1e40af',
        borderColor: '#bfdbfe'
      },
      'ADVICE': {
        background: '#d1fae5',
        color: '#065f46',
        borderColor: '#a7f3d0'
      },
      'AWARENESS': {
        background: '#fed7aa',
        color: '#9a3412',
        borderColor: '#fdba74'
      },
      'DOCUMENT': {
        background: '#ede9fe',
        color: '#5b21b6',
        borderColor: '#ddd6fe'
      }
    };
    const style = styles[category] || {
      background: '#f1f5f9',
      color: '#334155',
      borderColor: '#e2e8f0'
    };
    return {
      'background': style.background,
      'color': style.color,
      'border-color': style.borderColor
    };
  }

  // Helpers pour les catégories
  getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      'QUESTION': '❓',
      'ADVICE': '💬',
      'AWARENESS': '📢',
      'DOCUMENT': '📄'
    };
    return icons[category] || '📝';
  }

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      'QUESTION': 'Question',
      'ADVICE': 'Conseil',
      'AWARENESS': 'Sensibilisation',
      'DOCUMENT': 'Document'
    };
    return labels[category] || category;
  }

  getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      'QUESTION': 'text-blue-600 bg-blue-100 border-blue-200',
      'ADVICE': 'text-emerald-600 bg-emerald-100 border-emerald-200',
      'AWARENESS': 'text-orange-600 bg-orange-100 border-orange-200',
      'DOCUMENT': 'text-violet-600 bg-violet-100 border-violet-200'
    };
    return colors[category] || 'text-slate-600 bg-slate-100 border-slate-200';
  }

  // Méthodes pour les réactions et la sauvegarde
  loadReactionsForPosts(): void {
    this.posts.forEach(post => {
      this.postService.getReactions(post.id, this.currentUserId).subscribe({
        next: (data) => {
          this.postReactions.set(post.id, { counts: data.counts || {}, userReaction: data.userReaction || null });
        },
        error: (err) => {
          console.error('Erreur chargement réactions pour post', post.id, err);
        }
      });
    });
  }

  loadSaveStatusForPosts(): void {
    this.posts.forEach(post => {
      this.postService.getSaveStatus(post.id, this.currentUserId).subscribe({
        next: (data) => {
          this.postSaveStatus.set(post.id, !!data.saved);
        },
        error: (err) => {
          console.error('Erreur chargement sauvegarde pour post', post.id, err);
        }
      });
    });
  }

  toggleReaction(post: ForumPost, emoji: string, event: Event): void {
    event.stopPropagation();

    const currentReaction = this.getUserReaction(post.id);
    const isClearing = currentReaction === emoji;
    
    // Optimistic update: update local state immediately
    const oldReactions = this.postReactions.get(post.id);
    const optimisticCounts = { ...(oldReactions?.counts || {}) };
    
    if (isClearing) {
      // Remove the reaction optimistically
      if (optimisticCounts[emoji]) {
        optimisticCounts[emoji]--;
        if (optimisticCounts[emoji] <= 0) delete optimisticCounts[emoji];
      }
    } else {
      // Add new reaction optimistically
      if (oldReactions?.userReaction && oldReactions.userReaction !== emoji) {
        const oldEmoji = oldReactions.userReaction;
        if (optimisticCounts[oldEmoji]) {
          optimisticCounts[oldEmoji]--;
          if (optimisticCounts[oldEmoji] <= 0) delete optimisticCounts[oldEmoji];
        }
      }
      optimisticCounts[emoji] = (optimisticCounts[emoji] || 0) + 1;
    }

    // Update UI immediately (optimistic)
    this.postReactions.set(post.id, { 
      counts: optimisticCounts, 
      userReaction: isClearing ? null : emoji 
    });

    // Try backend call
    const action = isClearing
      ? this.postService.clearReaction(post.id, this.currentUserId)
      : this.postService.setReaction(post.id, this.currentUserId, emoji);

    action.subscribe({
      next: (data) => {
        // Backend response confirmed - update with server data
        this.postReactions.set(post.id, { counts: data.counts || {}, userReaction: data.userReaction || null });
      },
      error: (err) => {
        console.error('Erreur réaction:', err);
        // Optionally restore old state on error, or keep optimistic state
        // For now, keep optimistic state as visual feedback
      }
    });
  }

  toggleSave(post: ForumPost, event: Event): void {
    event.stopPropagation();
    
    const isCurrentlySaved = this.postSaveStatus.get(post.id) || false;
    const action = isCurrentlySaved
      ? this.postService.unsavePost(post.id, this.currentUserId)
      : this.postService.savePost(post.id, this.currentUserId);

    action.subscribe({
      next: (data) => {
        this.postSaveStatus.set(post.id, !!data.saved);
      },
      error: (err) => {
        console.error('Erreur sauvegarde:', err);
      }
    });
  }

  togglePin(post: ForumPost, event: Event): void {
    event.stopPropagation();

    if (this.isPinningPostId) {
      return;
    }

    const wasPinned = !!post.pinned;
    this.isPinningPostId = post.id;
    const action = wasPinned
      ? this.postService.unpin(post.id)
      : this.postService.pin(post.id);

    action.subscribe({
      next: () => {
        this.isPinningPostId = null;
        this.loadPosts();
      },
      error: (err) => {
        console.error('Erreur pin/unpin:', err);
        this.isPinningPostId = null;
      }
    });
  }

  getReactionCount(postId: string, emoji: string): number {
    return this.postReactions.get(postId)?.counts[emoji] || 0;
  }

  getUserReaction(postId: string): string | null {
    return this.postReactions.get(postId)?.userReaction || null;
  }

  isPostSaved(postId: string): boolean {
    return this.postSaveStatus.get(postId) || false;
  }
}