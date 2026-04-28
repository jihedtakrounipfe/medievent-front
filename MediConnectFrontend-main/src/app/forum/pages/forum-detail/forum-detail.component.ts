import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ForumPost } from '../../models/forum-post';
import { ForumComment } from '../../models/forum-comment';
import { ForumPostService } from '../../services/forum-post.service';
import { ForumCommentService } from '../../services/forum-comment.service';
import { OpenFdaService, DrugInfo } from '../../services/openfda.service';
import { VoiceRecognitionService } from '../../services/voice-recognition.service';
import { containsBadWords, getBadWordsFound, censorBadWords } from '../../utils/bad-words';
import { AiServiceService, SentimentResult, PostSummary, RelatedPost } from '../../services/ai-service.service';

@Component({
  selector: 'app-forum-detail',
  templateUrl: './forum-detail.component.html',
  styleUrls: ['./forum-detail.component.css'],
  standalone: false
})
export class ForumDetailComponent implements OnInit, OnDestroy {

  post: ForumPost | null = null;
  comments: ForumComment[] = [];
  threadedComments: ForumComment[] = [];
  rankedComments: ForumComment[] = [];
  newComment = '';
  replyingToId: string | null = null;
  isLoading = true;
  isAdmin = false;
  isLoadingComments = false;
  isSubmitting = false;
  errorMessage = '';
  showDeleteConfirm = false;
  sortBy: 'ranked' | 'recent' | 'threaded' = 'ranked';
  showSentiment = false;
currentSentiment: SentimentResult | null = null;
showSummary = false;
postSummary: PostSummary | null = null;
relatedPosts: RelatedPost[] = [];
showWritingAssistant = false;
writingImprovement: any = null;
isAnalyzing = false;
  // 📄 PAGINATION
  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  totalComments = 0;
  isLoadingMoreComments = false;
  allCommentsLoaded = false;
  
  // Pour la modification de commentaire
  editingCommentId: string | null = null;
  editingCommentContent: string = '';

  // Variables pour les modales
  showDeleteCommentModal = false;
  showCancelEditModal = false;
  commentToDelete: ForumComment | null = null;

  // NOTIFICATION D'ÉPINGLAGE
  showPinNotification = false;
  pinNotificationMessage = '';
  pinNotificationType: 'success' | 'error' = 'success';
  pinNotificationTimeout: any = null;

  // Contrôle de saisie
  commentError = '';
  commentCharCount = 0;
  commentMinLength = 3;
  commentMaxLength = 1000;
  badWordsFound: string[] = [];
  isVoting = false;

  // ID de l'utilisateur connecté
  currentUserId = 1;

  // URL de base du backend
  private backendUrl = 'http://localhost:8080';

  // Variables pour les réactions emoji
  reactionEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡'];
  reactionCounts: Record<string, number> = {};
  userReaction: string | null = null;
  isReacting = false;

  // Variables pour la sauvegarde
  isSaved = false;
  isSaving = false;
  private reactionSyncSubscription: Subscription | null = null;

  // Reconnaissance vocale
  isListening = false;
  private voiceSubscription: Subscription | null = null;
  private voiceErrorSubscription: Subscription | null = null;
 // Variables OpenFDA
  drugSearchResults: DrugInfo[] = [];
  showDrugSearch = false;
  drugSearchQuery = '';
  isSearchingDrug = false;
  selectedDrug: DrugInfo | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private postService: ForumPostService,
    private commentService: ForumCommentService,
    private voiceService: VoiceRecognitionService,
    private openFdaService: OpenFdaService,
    private aiService: AiServiceService

  ) {}

  ngOnInit(): void {
    this.isAdmin = true;
    this.initVoiceRecognition();
    this.watchReactionSync();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadPost(id);
      this.loadComments(id);
    } else {
      this.errorMessage = 'ID de post manquant';
      this.isLoading = false;
    }
  }
// 1. ANALYSE DE SENTIMENT
analyzeSentiment(): void {
  if (!this.post) return;
  this.isAnalyzing = true;
  this.currentSentiment = this.aiService.analyzeSentiment(this.post.content);
  this.showSentiment = true;
  this.isAnalyzing = false;
  
  // Afficher une notification
  const emoji = this.currentSentiment.sentiment === 'positif' ? '😊' : 
                this.currentSentiment.sentiment === 'negatif' ? '😟' : '😐';
  this.showToast(`Sentiment détecté : ${emoji} ${this.currentSentiment.sentiment}`, 'info');
}

// 2. RÉSUMÉ AUTOMATIQUE
generateSummary(): void {
  if (!this.post) return;
  this.isAnalyzing = true;
  this.postSummary = this.aiService.summarizeText(this.post.content);
  this.showSummary = true;
  this.isAnalyzing = false;
}

// 3. RECOMMANDATIONS
loadRelatedPosts(): void {
  if (!this.post) return;
  // Pour l'instant, désactivé car nécessite une liste de tous les posts
  console.log('🔍 Fonctionnalité de recommandation à venir');
  // this.relatedPosts = this.aiService.findSimilarPosts(this.post, this.allPosts, 3);
}

// 4. ASSISTANT RÉDACTION (pour le formulaire de commentaire)
improveComment(): void {
  if (!this.newComment) return;
  this.writingImprovement = this.aiService.improveWriting(this.newComment);
  this.showWritingAssistant = true;
}

applyImprovement(): void {
  if (this.writingImprovement) {
    this.newComment = this.writingImprovement.improved;
    this.showWritingAssistant = false;
    this.showToast('Votre commentaire a été amélioré !', 'success');
  }
}
  ngOnDestroy(): void {
    if (this.voiceSubscription) {
      this.voiceSubscription.unsubscribe();
    }
    if (this.voiceErrorSubscription) {
      this.voiceErrorSubscription.unsubscribe();
    }
    if (this.reactionSyncSubscription) {
      this.reactionSyncSubscription.unsubscribe();
    }
    this.voiceService.stopListening();
  }

  private watchReactionSync(): void {
    this.reactionSyncSubscription = this.postService.reactionSync$.subscribe(sync => {
      if (!sync || !this.post || sync.postId !== this.post.id) {
        return;
      }

      this.reactionCounts = sync.counts;
      this.userReaction = sync.userReaction;
    });
  }

  // ==================== RECONNAISSANCE VOCALE ====================
  initVoiceRecognition(): void {
    if (!this.voiceService.isSupportedBrowser()) {
      console.log('Reconnaissance vocale non supportée');
      return;
    }

    this.voiceSubscription = this.voiceService.getVoiceResult().subscribe({
      next: (transcript: string) => {
        if (this.newComment) {
          this.newComment += ' ' + transcript;
        } else {
          this.newComment = transcript;
        }
        this.validateCommentOnInput();
        this.isListening = false;
      },
      error: (err: any) => {
        console.error('Erreur transcription:', err);
        this.isListening = false;
      }
    });

    this.voiceErrorSubscription = this.voiceService.getVoiceError().subscribe({
      next: (error: string) => {
        this.showToast(error, 'error');
        this.isListening = false;
      }
    });
  }

  toggleVoiceInput(): void {
    if (this.isListening) {
      this.voiceService.stopListening();
      this.isListening = false;
      this.showToast('Dictée arrêtée', 'info');
    } else {
      this.voiceService.startListening();
      this.isListening = true;
      this.showToast('🎤 Parlez maintenant...', 'info');
      
      setTimeout(() => {
        if (this.isListening) {
          this.voiceService.stopListening();
          this.isListening = false;
          this.showToast('Dictée terminée', 'info');
        }
      }, 15000);
    }
  }

  // ==================== VALIDATION DES COMMENTAIRES ====================
  validateCommentOnInput(): void {
    this.commentCharCount = this.newComment.length;
    this.commentError = '';
    this.badWordsFound = [];

    if (this.newComment.trim().length > 0) {
      this.badWordsFound = getBadWordsFound(this.newComment);
      if (this.badWordsFound.length > 0) {
        const uniqueBadWords = [...new Set(this.badWordsFound)];
        this.commentError = `⚠️ Mots inappropriés : ${uniqueBadWords.join(', ')}`;
        return;
      }
    }
    
    if (this.newComment.trim().length > 0 && this.newComment.trim().length < this.commentMinLength) {
      this.commentError = `📝 Minimum ${this.commentMinLength} caractères (${this.newComment.trim().length}/${this.commentMinLength})`;
      return;
    }
    
    if (this.newComment.length > this.commentMaxLength) {
      this.commentError = `📏 Maximum ${this.commentMaxLength} caractères (${this.newComment.length}/${this.commentMaxLength})`;
      this.newComment = this.newComment.substring(0, this.commentMaxLength);
      this.commentCharCount = this.commentMaxLength;
    }
  }

  validateEditOnInput(): void {
    if (this.editingCommentContent.trim().length > 0 && this.editingCommentContent.trim().length < this.commentMinLength) {
      this.commentError = `Minimum ${this.commentMinLength} caractères`;
    } else {
      const badWords = getBadWordsFound(this.editingCommentContent);
      if (badWords.length > 0) {
        this.commentError = `⚠️ Mots inappropriés : ${[...new Set(badWords)].join(', ')}`;
      } else {
        this.commentError = '';
      }
    }
  }

  // ==================== MÉTHODES PRINCIPALES ====================
  
  formatDate(date: any): string {
    if (!date) return 'Date inconnue';
    let d: Date;
    if (date instanceof Date) {
      d = date;
    } else {
      d = new Date(date);
    }
    if (isNaN(d.getTime())) {
      return 'Date inconnue';
    }
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDateOnly(date: any): string {
    if (!date) return 'Date inconnue';
    let d: Date;
    if (date instanceof Date) {
      d = date;
    } else {
      d = new Date(date);
    }
    if (isNaN(d.getTime())) {
      return 'Date inconnue';
    }
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#0d9488'};
      color: white;
      padding: 10px 20px;
      border-radius: 8px;
      z-index: 9999;
      font-size: 14px;
      animation: fadeOut 2s ease forwards;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }

  private normalizePost(post: any): ForumPost {
    let createdAt: Date;
    try {
      createdAt = post.createdAt ? new Date(post.createdAt) : new Date();
      if (isNaN(createdAt.getTime())) {
        createdAt = new Date();
      }
    } catch (e) {
      createdAt = new Date();
    }

    const images: string[] = [];
    const videos: string[] = [];
    const pdfs: { url: string; name: string }[] = [];

    if (post.attachments && Array.isArray(post.attachments)) {
      post.attachments.forEach((att: any) => {
        let fullUrl = att.url;
        if (fullUrl && fullUrl.startsWith('/uploads')) {
          fullUrl = this.backendUrl + fullUrl;
        }
        
        if (att.category === 'image' || att.category === 'gif') {
          images.push(fullUrl);
        } else if (att.category === 'video') {
          videos.push(fullUrl);
        } else if (att.category === 'pdf') {
          pdfs.push({ url: fullUrl, name: att.name || 'Document PDF' });
        }
      });
    }

    return {
      id: post.id,
      title: post.title,
      content: post.content,
      category: post.category,
      isVerifiedByDoctor: post.isVerifiedByDoctor || false,
      viewCount: post.viewCount || 0,
      commentCount: post.commentCount || 0,
      pinned: post.pinned || false,
      tags: post.tags || [],
      createdAt: createdAt,
      author: post.author || { id: 1, initials: '??', fullName: 'Anonyme', role: 'PATIENT' },
      attachments: post.attachments,
      images: images,
      videos: videos,
      pdfs: pdfs
    };
  }

  private normalizeComment(comment: any, postId: string): ForumComment {
    const parseDate = (dateStr: any): Date => {
      if (!dateStr) return new Date();
      try {
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? new Date() : date;
      } catch (e) {
        return new Date();
      }
    };

    const commentId = comment.id || comment.commentId || comment.comment_id;

    if (!commentId) {
      console.error('❌ Pas d\'ID pour le commentaire:', comment);
      return null as any;
    }

    return {
      id: commentId,
      content: comment.content || '',
      replyToId: comment.replyToId || comment.parentId || undefined,
      postId: postId,
      author: comment.author || { 
        id: 1, 
        initials: '??', 
        fullName: 'Anonyme', 
        role: 'PATIENT' 
      },
      authorId: comment.author?.id || 1,
      upvotes: comment.upvotes || 0,
      downvotes: comment.downvotes || 0,
      isAnswer: comment.isAnswer || false,
      hasUserVoted: comment.hasUserVoted || false,
      createdAt: parseDate(comment.createdAt),
      updatedAt: comment.updatedAt ? parseDate(comment.updatedAt) : undefined
    };
  }
// Rechercher un médicament
searchDrug(): void {
  if (!this.drugSearchQuery.trim()) {
    return;
  }

  this.isSearchingDrug = true;
  this.drugSearchResults = [];

  this.openFdaService.searchDrug(this.drugSearchQuery).subscribe({
    next: (results) => {
      this.drugSearchResults = results;
      this.isSearchingDrug = false;
      if (results.length === 0) {
        this.showToast('Aucun médicament trouvé', 'info');
      }
    },
    error: (err) => {
      console.error('Erreur recherche médicament:', err);
      this.isSearchingDrug = false;
      this.showToast('Erreur lors de la recherche', 'error');
    }
  });
}

// Rechercher par symptôme
searchBySymptom(symptom: string): void {
  this.isSearchingDrug = true;
  this.openFdaService.searchByKeyword(symptom).subscribe({
    next: (results) => {
      this.drugSearchResults = results;
      this.isSearchingDrug = false;
    },
    error: (err) => {
      console.error('Erreur:', err);
      this.isSearchingDrug = false;
    }
  });
}

// Sélectionner un médicament
selectDrug(drug: DrugInfo): void {
  this.selectedDrug = drug;
  // Option: ajouter une mention dans le commentaire
  this.newComment += `\n\n💊 [Médicament: ${drug.name}] - ${drug.indications[0] || ''}`;
  this.drugSearchResults = [];
  this.drugSearchQuery = '';
  this.showDrugSearch = false;
  this.validateCommentOnInput();
}

// Fermer la recherche
closeDrugSearch(): void {
  this.showDrugSearch = false;
  this.drugSearchResults = [];
  this.drugSearchQuery = '';
}
  loadPost(id: string): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.postService.getById(id).subscribe({
      next: (post) => {
        this.post = this.normalizePost(post);
        this.loadReactions(id);
        this.loadSaveStatus(id);
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('❌ Erreur chargement post:', err);
        this.errorMessage = 'Impossible de charger le post. Veuillez réessayer.';
        this.isLoading = false;
      }
    });
  }

  loadComments(postId: string): void {
    this.isLoadingComments = true;
    this.currentPage = 0;
    
    this.commentService.getByPostPaginated(postId, this.currentPage, this.pageSize, this.post?.author?.id).subscribe({
      next: (response) => {
        this.threadedComments = response.content.map(comment => this.normalizeComment(comment, postId)).filter(c => c !== null);
        this.comments = this.threadedComments;
        
        this.totalComments = response.totalElements;
        this.totalPages = response.totalPages;
        this.allCommentsLoaded = this.currentPage >= this.totalPages - 1;
        
        this.rankedComments = this.commentService.rankComments(this.threadedComments);
        
        this.isLoadingComments = false;
      },
      error: (err: any) => {
        console.error('❌ Erreur chargement commentaires:', err);
        this.isLoadingComments = false;
      }
    });
  }

  loadMoreComments(): void {
    if (!this.post || this.allCommentsLoaded || this.isLoadingMoreComments) {
      return;
    }

    this.isLoadingMoreComments = true;
    this.currentPage++;

    this.commentService.getByPostPaginated(this.post.id, this.currentPage, this.pageSize, this.post?.author?.id).subscribe({
      next: (response) => {
        const newComments = response.content.map(comment => this.normalizeComment(comment, this.post!.id)).filter(c => c !== null);
        this.threadedComments = [...this.threadedComments, ...newComments];
        this.comments = this.threadedComments;
        
        this.rankedComments = this.commentService.rankComments(this.threadedComments);
        
        this.allCommentsLoaded = this.currentPage >= response.totalPages - 1;
        
        this.isLoadingMoreComments = false;
      },
      error: (err: any) => {
        console.error('❌ Erreur chargement more commentaires:', err);
        this.currentPage--;
        this.isLoadingMoreComments = false;
      }
    });
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages || !this.post) {
      return;
    }

    this.currentPage = page;
    this.loadComments(this.post.id);
  }

  getCurrentPageDisplay(): number {
    return this.currentPage + 1;
  }

  goBack(): void {
    this.router.navigate(['/forum']);
  }

  submitComment(): void {
    this.commentError = '';
    this.badWordsFound = [];
    const trimmedComment = this.newComment.trim();
    
    if (!trimmedComment) {
      this.commentError = 'Le commentaire ne peut pas être vide';
      this.showToast('Le commentaire ne peut pas être vide', 'error');
      return;
    }
    
    const badWords = getBadWordsFound(trimmedComment);
    if (badWords.length > 0) {
      const uniqueBadWords = [...new Set(badWords)];
      this.commentError = `Mots inappropriés détectés : ${uniqueBadWords.join(', ')}`;
      this.showToast(this.commentError, 'error');
      return;
    }
    
    if (trimmedComment.length < this.commentMinLength) {
      this.commentError = `Le commentaire doit contenir au moins ${this.commentMinLength} caractères`;
      this.showToast(this.commentError, 'error');
      return;
    }
    
    if (trimmedComment.length > this.commentMaxLength) {
      this.commentError = `Le commentaire ne doit pas dépasser ${this.commentMaxLength} caractères`;
      this.showToast(this.commentError, 'error');
      return;
    }

    if (!this.post) return;

    this.isSubmitting = true;
    const censoredComment = censorBadWords(trimmedComment);
    
    const request = {
      content: censoredComment,
      replyToId: this.replyingToId || undefined
    };
    
    this.commentService.add(this.post.id, request, this.currentUserId).subscribe({
      next: (comment) => {
        const normalized = this.normalizeComment(comment, this.post!.id);
        if (!normalized) {
          this.commentError = 'Erreur lors de l\'ajout du commentaire';
          this.isSubmitting = false;
          return;
        }
        
        if (this.replyingToId) {
          this.addReplyToComment(this.replyingToId, normalized);
        } else {
          this.threadedComments.unshift(normalized);
          this.comments = this.threadedComments;
        }
        
        this.rankedComments = this.commentService.rankComments(this.threadedComments);
        
        this.newComment = '';
        this.commentCharCount = 0;
        this.replyingToId = null;
        this.commentError = '';
        this.badWordsFound = [];
        this.isSubmitting = false;
        this.showToast('Commentaire ajouté avec succès', 'success');
      },
      error: (err: any) => {
        console.error('❌ Erreur ajout commentaire:', err);
        this.commentError = 'Erreur lors de l\'ajout du commentaire. Veuillez réessayer.';
        this.isSubmitting = false;
        this.showToast(this.commentError, 'error');
      }
    });
  }

  private findCommentRecursive(comments: ForumComment[], id: string): ForumComment | null {
    for (const comment of comments) {
      if (comment.id === id) return comment;
      if (comment.replies) {
        const found = this.findCommentRecursive(comment.replies, id);
        if (found) return found;
      }
    }
    return null;
  }

  private addReplyToComment(parentId: string, reply: ForumComment): void {
    const parent = this.findCommentRecursive(this.threadedComments, parentId);
    if (parent) {
      if (!parent.replies) {
        parent.replies = [];
      }
      parent.replies.push(reply);
    }
  }

  setReplyingTo(commentId: string): void {
    this.replyingToId = commentId;
    const inputElement = document.querySelector('.comment-input-area');
    if (inputElement) {
      inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  cancelReply(): void {
    this.replyingToId = null;
  }

  upvote(comment: ForumComment): void {
    if (!this.post) return;
    if (this.isVoting) return;
    
    if (comment.id.startsWith('local_') || comment.id.startsWith('temp_')) {
      console.warn('⚠️ Impossible de voter pour un commentaire non enregistré');
      return;
    }
    
    if (comment.hasUserVoted) {
      return;
    }

    this.isVoting = true;
    const originalUpvotes = comment.upvotes;
    comment.upvotes += 1;
    comment.hasUserVoted = true;

    this.commentService.upvote(this.post.id, comment.id, this.currentUserId).subscribe({
      next: (updated) => {
        const index = this.comments.findIndex(c => c.id === comment.id);
        if (index !== -1) {
          this.comments[index] = this.normalizeComment(updated, this.post!.id);
        }
        this.isVoting = false;
      },
      error: (err: any) => {
        console.error('❌ Erreur upvote:', err);
        comment.upvotes = originalUpvotes;
        comment.hasUserVoted = false;
        this.isVoting = false;
      }
    });
  }

  startEdit(comment: ForumComment): void {
    this.editingCommentId = comment.id;
    this.editingCommentContent = comment.content;
    this.commentError = '';
  }

  cancelEdit(): void {
    if (this.editingCommentContent !== this.getOriginalContent()) {
      this.showCancelEditModal = true;
    } else {
      this.editingCommentId = null;
      this.editingCommentContent = '';
      this.commentError = '';
    }
  }

  getOriginalContent(): string {
    const comment = this.comments.find(c => c.id === this.editingCommentId);
    return comment ? comment.content : '';
  }

  continueWithoutSaving(): void {
    this.editingCommentId = null;
    this.editingCommentContent = '';
    this.showCancelEditModal = false;
    this.commentError = '';
  }

  closeCancelEditModal(): void {
    this.showCancelEditModal = false;
  }

  saveEdit(comment: ForumComment): void {
    if (!this.post) return;
    
    const trimmedContent = this.editingCommentContent.trim();
    
    const badWords = getBadWordsFound(trimmedContent);
    if (badWords.length > 0) {
      this.showToast(`Mots inappropriés détectés : ${[...new Set(badWords)].join(', ')}`, 'error');
      return;
    }
    
    if (trimmedContent.length < this.commentMinLength) {
      this.showToast(`Le commentaire doit contenir au moins ${this.commentMinLength} caractères`, 'error');
      return;
    }
    
    if (!trimmedContent) {
      this.showToast('Le commentaire ne peut pas être vide', 'error');
      return;
    }

    const originalContent = comment.content;
    const censoredContent = censorBadWords(trimmedContent);
    comment.content = censoredContent;

    this.commentService.update(this.post.id, comment.id, censoredContent).subscribe({
      next: (updated) => {
        const index = this.comments.findIndex(c => c.id === comment.id);
        if (index !== -1) {
          this.comments[index] = this.normalizeComment(updated, this.post!.id);
        }
        this.editingCommentId = null;
        this.editingCommentContent = '';
        this.commentError = '';
        this.showToast('Commentaire modifié avec succès', 'success');
      },
      error: (err: any) => {
        console.error('❌ Erreur modification commentaire:', err);
        comment.content = originalContent;
        this.showToast('Erreur lors de la modification', 'error');
        this.editingCommentId = null;
      }
    });
  }

  openDeleteCommentModal(comment: ForumComment): void {
    this.commentToDelete = comment;
    this.showDeleteCommentModal = true;
  }

  closeDeleteCommentModal(): void {
    this.showDeleteCommentModal = false;
    this.commentToDelete = null;
  }

  confirmDeleteComment(): void {
    if (this.commentToDelete) {
      this.deleteComment(this.commentToDelete);
    }
    this.closeDeleteCommentModal();
  }

  deleteComment(comment: ForumComment): void {
    if (!this.post) return;
    
    this.commentService.delete(this.post.id, comment.id).subscribe({
      next: () => {
        this.comments = this.comments.filter(c => c.id !== comment.id);
        this.showToast('Commentaire supprimé avec succès', 'success');
      },
      error: (err: any) => {
        console.error('❌ Erreur suppression commentaire:', err);
        this.showToast('Erreur lors de la suppression', 'error');
      }
    });
  }

  reportComment(comment: ForumComment): void {
    if (confirm('Signaler ce commentaire comme inapproprié ?')) {
      this.showToast('Commentaire signalé. Merci pour votre vigilance.', 'success');
    }
  }

  markAsAnswer(comment: ForumComment): void {
    if (!this.post) return;
    
    this.commentService.markAsAnswer(this.post.id, comment.id).subscribe({
      next: (updated) => {
        const index = this.comments.findIndex(c => c.id === comment.id);
        if (index !== -1) {
          this.comments[index] = this.normalizeComment(updated, this.post!.id);
        }
        this.showToast('Commentaire marqué comme solution', 'success');
      },
      error: (err: any) => {
        console.error('❌ Erreur marquage réponse:', err);
        this.showToast('Erreur lors du marquage', 'error');
      }
    });
  }

  canModifyPost(): boolean {
    if (!this.post) return false;
    return this.post.author?.id === this.currentUserId || this.isAdmin;
  }

  canModifyComment(comment: ForumComment): boolean {
    return comment.author?.id === this.currentUserId || this.isAdmin;
  }

  editPost(): void {
    if (this.post) {
      this.router.navigate(['/forum/edit', this.post.id]);
    }
  }

  deletePost(): void {
    if (!this.post) return;
    this.showDeleteConfirm = true;
  }

  confirmDelete(): void {
    if (!this.post) return;
    
    this.postService.delete(this.post.id).subscribe({
      next: () => {
        this.router.navigate(['/forum']);
      },
      error: (err: any) => {
        console.error('❌ Erreur suppression:', err);
        this.showToast('Erreur lors de la suppression', 'error');
        this.showDeleteConfirm = false;
      }
    });
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
  }

  togglePin(): void {
    if (!this.post) return;
    
    const isPinning = !this.post.pinned;
    const action = isPinning ? this.postService.pin(this.post.id) : this.postService.unpin(this.post.id);
    
    action.subscribe({
      next: () => {
        if (this.post) {
          this.post.pinned = !this.post.pinned;
          this.showPinNotificationMessage(
            isPinning ? '📌 Post épinglé avec succès !' : '📍 Post désépinglé avec succès !',
            'success'
          );
          setTimeout(() => {
            this.router.navigate(['/forum']);
          }, 1500);
        }
      },
      error: (err: any) => {
        console.error('Erreur pin/unpin', err);
        this.showPinNotificationMessage(
          isPinning ? '❌ Erreur lors de l\'épinglage du post' : '❌ Erreur lors du désépinglage du post',
          'error'
        );
      }
    });
  }

  showPinNotificationMessage(message: string, type: 'success' | 'error' = 'success'): void {
    this.pinNotificationMessage = message;
    this.pinNotificationType = type;
    this.showPinNotification = true;
    
    if (this.pinNotificationTimeout) {
      clearTimeout(this.pinNotificationTimeout);
    }
    
    this.pinNotificationTimeout = setTimeout(() => {
      this.showPinNotification = false;
      this.pinNotificationTimeout = null;
    }, 3000);
  }

  loadReactions(postId: string): void {
    this.postService.getReactions(postId, this.currentUserId).subscribe({
      next: (data) => {
        this.reactionCounts = data.counts || {};
        this.userReaction = data.userReaction || null;
      },
      error: (err: any) => {
        console.error('❌ Erreur chargement réactions:', err);
      }
    });
  }

  loadSaveStatus(postId: string): void {
    this.postService.getSaveStatus(postId, this.currentUserId).subscribe({
      next: (data) => {
        this.isSaved = !!data.saved;
      },
      error: (err: any) => {
        console.error('❌ Erreur chargement sauvegarde:', err);
      }
    });
  }

  toggleSave(): void {
    if (!this.post || this.isSaving) return;

    this.isSaving = true;
    const action = this.isSaved
      ? this.postService.unsavePost(this.post.id, this.currentUserId)
      : this.postService.savePost(this.post.id, this.currentUserId);

    action.subscribe({
      next: (data) => {
        this.isSaved = !!data.saved;
        this.isSaving = false;
      },
      error: (err: any) => {
        console.error('❌ Erreur sauvegarde:', err);
        this.isSaving = false;
      }
    });
  }

  toggleReaction(emoji: string): void {
    if (!this.post || this.isReacting) return;

    const postId = this.post.id;
    this.isReacting = true;
    const isClearing = this.userReaction === emoji;
    
    const optimisticCounts = { ...this.reactionCounts };
    
    if (isClearing) {
      if (optimisticCounts[emoji]) {
        optimisticCounts[emoji]--;
        if (optimisticCounts[emoji] <= 0) delete optimisticCounts[emoji];
      }
    } else {
      if (this.userReaction && this.userReaction !== emoji) {
        const oldEmoji = this.userReaction;
        if (optimisticCounts[oldEmoji]) {
          optimisticCounts[oldEmoji]--;
          if (optimisticCounts[oldEmoji] <= 0) delete optimisticCounts[oldEmoji];
        }
      }
      optimisticCounts[emoji] = (optimisticCounts[emoji] || 0) + 1;
    }

    this.reactionCounts = optimisticCounts;
    this.userReaction = isClearing ? null : emoji;

    const action = isClearing
      ? this.postService.clearReaction(postId, this.currentUserId)
      : this.postService.setReaction(postId, this.currentUserId, emoji);

    action.subscribe({
      next: (data) => {
        this.reactionCounts = data.counts || {};
        this.userReaction = data.userReaction || null;
        this.postService.syncReactionState(postId, data);
        this.isReacting = false;
      },
      error: (err: any) => {
        console.error('❌ Erreur réaction:', err);
        this.isReacting = false;
      }
    });
  }

  getReactionCount(emoji: string): number {
    return this.reactionCounts[emoji] || 0;
  }

  getTotalReactions(): number {
    return Object.values(this.reactionCounts).reduce((sum, value) => sum + value, 0);
  }

  openImageGallery(post: ForumPost, imageUrl: string): void {
    window.open(imageUrl, '_blank');
  }

  openPdf(url: string): void {
    window.open(url, '_blank');
  }

  getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      'QUESTION': '❓',
      'ADVICE': '💬',
      'AWARENESS': '📢',
      'DOCUMENT': '📄'
    };
    return icons[category] || '📝';
  }

  getCategoryBg(category: string): string {
    const colors: Record<string, string> = {
      'QUESTION': '#3b82f6',
      'ADVICE': '#10b981',
      'AWARENESS': '#f97316',
      'DOCUMENT': '#8b5cf6'
    };
    return colors[category] || '#6b7280';
  }

  getCategoryGradient(category: string): string {
    const gradients: Record<string, string> = {
      'QUESTION': 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      'ADVICE': 'linear-gradient(135deg, #10b981, #059669)',
      'AWARENESS': 'linear-gradient(135deg, #f97316, #ea580c)',
      'DOCUMENT': 'linear-gradient(135deg, #8b5cf6, #6d28d9)'
    };
    return gradients[category] || 'linear-gradient(135deg, #6366f1, #4f46e5)';
  }

  getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      'QUESTION': 'bg-blue-100 text-blue-800 border-blue-200',
      'ADVICE': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'AWARENESS': 'bg-orange-100 text-orange-800 border-orange-200',
      'DOCUMENT': 'bg-violet-100 text-violet-800 border-violet-200'
    };
    return colors[category] || 'bg-slate-100 text-slate-800 border-slate-200';
  }

  markCommentUtility(data: { commentId: string; utilityType: 'helpful' | 'solution' | 'irrelevant' }): void {
    if (!this.post) return;

    this.commentService.markCommentUtility(
      this.post.id,
      data.commentId,
      data.utilityType
    ).subscribe({
      next: (updated) => {
        const index = this.comments.findIndex(c => c.id === data.commentId);
        if (index !== -1) {
          this.comments[index] = this.normalizeComment(updated, this.post!.id);
        }
        this.showToast('Utilité marquée avec succès', 'success');
      },
error: (err: any) => {
        console.error('❌ Erreur marquage utilité:', err);
        this.showToast('Erreur lors du marquage', 'error');
      }
    });
  }

  pinCommentToggle(comment: ForumComment): void {
    if (!this.post) return;

    if (comment.isPinned) {
      this.commentService.unpinComment(this.post.id, comment.id);
      comment.isPinned = false;
    } else {
      this.commentService.pinComment(this.post.id, comment.id);
      comment.isPinned = true;
    }

    this.threadedComments = [...this.threadedComments];
    this.rankedComments = this.commentService.rankComments(this.threadedComments);
  }

  getUserReputation(userId: number): number {
    return this.commentService.getUserReputation(userId)?.totalScore || 0;
  }

  getPinnedComments(): ForumComment[] {
    if (!this.post) return [];
    return this.commentService.getPinnedComments(this.threadedComments, this.post.id);
  }

  getDisplayedComments(): ForumComment[] {
    if (this.sortBy === 'ranked') {
      return this.rankedComments;
    }

    if (this.sortBy === 'threaded') {
      return this.threadedComments;
    }

    return this.comments;
  }

  getReplyCount(): number {
    return this.comments.filter(comment => !!comment.replyToId).length;
  }

  getPinnedCommentsCount(): number {
    return this.getPinnedComments().length;
  }

  getTopRankedComment(): ForumComment | null {
    return this.rankedComments.length > 0 ? this.rankedComments[0] : null;
  }

  getSortLabel(): string {
    const labels: Record<string, string> = {
      ranked: 'Pertinence',
      recent: 'Récents',
      threaded: 'Arborescence'
    };

    return labels[this.sortBy] || 'Pertinence';
  }
}