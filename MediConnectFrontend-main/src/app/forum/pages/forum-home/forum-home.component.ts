import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ForumPost, PostCategory } from '../../models/forum-post';
import { ForumPostService } from '../../services/forum-post.service';
import { TranslateService, Language } from '../../services/translate.service';
import { OpenFdaService, DrugInfo } from '../../services/openfda.service';
import { MedicalQuoteService, MedicalQuote, MedicalJoke } from '../../services/medical-quote.service';
import { WeatherService, WeatherData } from '../../services/weather.service';
import { AiServiceService, AdvancedSentimentResult, SentimentDashboard } from '../../services/ai-service.service';

interface Category {
  value: PostCategory | 'all';
  icon: string;
  label: string;
  color: string;
  bg: string;
  border: string;
}

interface GalleryMedia {
  src: string;
  caption: string;
  type: 'image' | 'video';
  thumbnail?: string;
}

@Component({
  selector: 'app-forum-home',
  templateUrl: './forum-home.component.html',
  styleUrls: ['./forum-home.component.css'],
  standalone: false
})
export class ForumHomeComponent implements OnInit, OnDestroy {

  posts: ForumPost[] = [];
  filteredPosts: ForumPost[] = [];
  postSentiments: Map<string, AdvancedSentimentResult> = new Map();
  sentimentDashboard: SentimentDashboard | null = null;
  activeCategory: PostCategory | 'all' = 'all';
  searchQuery = '';
  tagFilter = '';
  isLoading = true;

  // 📄 PAGINATION
  currentPage = 0;
  pageSize = 6;
  totalPages = 0;
  totalPosts = 0;
  isLoadingMorePosts = false;
  allPostsLoaded = false;
  private reactionSyncSubscription: Subscription | null = null;

  // Propriétés pour la galerie
  galleryOpen = false;
  galleryMedia: GalleryMedia[] = [];
  galleryCurrentMedia = '';
  galleryCurrentCaption = '';
  galleryCurrentIndex = 0;
  galleryCurrentType: 'image' | 'video' = 'image';
  
  // Zoom et drag
  zoomLevel = 1;
  zoomOrigin = 'center center';
  isDragging = false;
  dragStart = { x: 0, y: 0 };


  weatherData: WeatherData | null = null;
isLoadingWeather = false;
selectedCity = 'Paris';
showWeatherSearch = false;

  // Réactions et sauvegarde
  reactionEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡'];
  postReactions: Map<string, { counts: Record<string, number>; userReaction: string | null }> = new Map();
  postSaveStatus: Map<string, boolean> = new Map();
  currentUserId = 1;
  public isPinningPostId: string | null = null;
  dragOffset = { x: 0, y: 0 };
  currentTransform = { x: 0, y: 0 };
  
  // Rotation
  rotationAngle = 0;
  
  // Diaporama
  slideshowActive = false;
  slideshowSpeed = 3;
  slideshowInterval: any = null;
  
  // Vidéo
  @ViewChild('galleryVideo') galleryVideo: ElementRef<HTMLVideoElement> | undefined;

  // Propriétés pour la traduction
  currentLanguage: Language = 'fr';
  availableLanguages: { code: Language; name: string; flag: string }[] = [
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' }
  ];
  showLanguageMenu = false;
  isTranslating = false;
  translatedPosts: any[] = [];
  
  // Progression de traduction
  translationProgress = 0;
  translationTotal = 0;

  // Sélection pour traduction
  selectionMode = false;
  selectedPostIds = new Set<string>();
  pendingTargetLanguage: Language = 'en';
  allPostsSelected = false;

  categories: Category[] = [
    { value: 'all', icon: '📋', label: 'Tous', color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/30' },
    { value: 'QUESTION', icon: '❓', label: 'Questions', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
    { value: 'ADVICE', icon: '💬', label: 'Conseils', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
    { value: 'AWARENESS', icon: '📢', label: 'Sensibilisation', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
    { value: 'DOCUMENT', icon: '📄', label: 'Documents', color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30' }
  ];

  private backendUrl = 'http://localhost:8080';

  // ==================== OPENFDA (RECHERCHE MÉDICAMENTS) ====================
  drugSearchResults: DrugInfo[] = [];
  drugSearchQuery = '';
  isSearchingDrug = false;

// ==================== CITATIONS ET BLAGUES MÉDICALES ====================
currentQuote: MedicalQuote | null = null;
currentJoke: MedicalJoke | null = null;
isLoadingQuote = false;
isLoadingJoke = false;
showQuote = true;
  constructor(
    private postService: ForumPostService,
    private router: Router,
    private translateService: TranslateService,
    private openFdaService: OpenFdaService,
    private medicalQuoteService: MedicalQuoteService,
    private weatherService: WeatherService,
    private aiService: AiServiceService

  ) {}

  ngOnInit(): void {
    this.loadPosts();
     this.loadQuote();   // ← AJOUTE CETTE LIGNE
  this.loadJoke(); 
  this.loadWeather();
  this.watchReactionSync();

  }

  ngOnDestroy(): void {
    if (this.reactionSyncSubscription) {
      this.reactionSyncSubscription.unsubscribe();
    }
  }

  private watchReactionSync(): void {
    this.reactionSyncSubscription = this.postService.reactionSync$.subscribe(sync => {
      if (!sync) {
        return;
      }

      if (this.postReactions.has(sync.postId)) {
        this.postReactions.set(sync.postId, {
          counts: sync.counts,
          userReaction: sync.userReaction
        });
      }
    });
  }
loadWeather(): void {
  this.isLoadingWeather = true;
  this.weatherService.getWeatherByCity(this.selectedCity).subscribe({
    next: (data) => {
      this.weatherData = data;
      this.isLoadingWeather = false;
    },
    error: (err) => {
      console.error('Erreur météo:', err);
      this.isLoadingWeather = false;
    }
  });
}

searchWeather(): void {
  if (this.selectedCity.trim()) {
    this.loadWeather();
    this.showWeatherSearch = false;
  }
}

getWeatherIcon(temp: number): string {
  if (temp > 25) return '☀️';
  if (temp > 15) return '🌤️';
  if (temp > 5) return '☁️';
  return '❄️';
}
  getPostsProgress(): number {
    return Math.min(100, this.posts.length * 2);
  }

  getMembersProgress(): number {
    return Math.min(100, (this.posts.length ? 47 / 60 * 100 : 0));
  }

  // ==================== RECHERCHE MÉDICAMENTS OPENFDA ====================
  
  searchDrug(): void {
    if (!this.drugSearchQuery.trim()) {
      this.showNotification('Entrez un nom de médicament', 'info');
      return;
    }

    this.isSearchingDrug = true;
    this.drugSearchResults = [];

    this.openFdaService.searchDrug(this.drugSearchQuery).subscribe({
      next: (results) => {
        this.drugSearchResults = results;
        this.isSearchingDrug = false;
        if (results.length === 0) {
          this.showNotification(`💊 "${this.drugSearchQuery}" non trouvé. Essayez Tylenol, Advil ou Aspirin.`, 'info');
        }
      },
      error: (err) => {
        console.error('Erreur recherche médicament:', err);
        this.isSearchingDrug = false;
        this.showNotification('Erreur lors de la recherche', 'error');
      }
    });
  }
// ==================== CITATIONS ET BLAGUES MÉDICALES ====================

loadQuote(): void {
  this.isLoadingQuote = true;
  this.medicalQuoteService.getRandomQuote().subscribe({
    next: (quote) => {
      this.currentQuote = quote;
      this.isLoadingQuote = false;
    },
    error: (err) => {
      console.error('Erreur chargement citation:', err);
      this.isLoadingQuote = false;
    }
  });
}

loadJoke(): void {
  this.isLoadingJoke = true;
  this.medicalQuoteService.getRandomJoke().subscribe({
    next: (joke) => {
      this.currentJoke = joke;
      this.isLoadingJoke = false;
    },
    error: (err) => {
      console.error('Erreur chargement blague:', err);
      this.isLoadingJoke = false;
    }
  });
}

refreshQuote(): void {
  this.loadQuote();
}

refreshJoke(): void {
  this.loadJoke();
}
  // ─── MÉTHODES DE LA GALERIE ───
  openMediaGallery(post: any, startIndex: number, type: 'image' | 'video'): void {
    const mediaList: GalleryMedia[] = [];
    
    if (type === 'image' && post.images) {
      post.images.forEach((img: string, idx: number) => {
        mediaList.push({
          src: img,
          caption: `${post.title} - Image ${idx + 1}`,
          type: 'image',
          thumbnail: img
        });
      });
    } else if (type === 'video' && post.videos) {
      post.videos.forEach((video: string, idx: number) => {
        mediaList.push({
          src: video,
          caption: `${post.title} - Vidéo ${idx + 1}`,
          type: 'video',
          thumbnail: ''
        });
      });
    }
    
    this.galleryMedia = mediaList;
    this.galleryCurrentIndex = startIndex;
    this.galleryCurrentMedia = mediaList[startIndex].src;
    this.galleryCurrentCaption = mediaList[startIndex].caption;
    this.galleryCurrentType = mediaList[startIndex].type;
    this.galleryOpen = true;
    document.body.style.overflow = 'hidden';
    
    this.resetZoomAndRotation();
  }

  closeGallery(): void {
    this.galleryOpen = false;
    this.galleryMedia = [];
    this.galleryCurrentMedia = '';
    this.galleryCurrentCaption = '';
    document.body.style.overflow = '';
    this.stopSlideshow();
    this.resetZoomAndRotation();
  }

  nextMedia(): void {
    if (this.galleryMedia.length === 0) return;
    this.galleryCurrentIndex = (this.galleryCurrentIndex + 1) % this.galleryMedia.length;
    this.updateCurrentMedia();
  }

  prevMedia(): void {
    if (this.galleryMedia.length === 0) return;
    this.galleryCurrentIndex = (this.galleryCurrentIndex - 1 + this.galleryMedia.length) % this.galleryMedia.length;
    this.updateCurrentMedia();
  }

  goToMedia(index: number): void {
    if (index < 0 || index >= this.galleryMedia.length) return;
    this.galleryCurrentIndex = index;
    this.updateCurrentMedia();
  }

  updateCurrentMedia(): void {
    this.galleryCurrentMedia = this.galleryMedia[this.galleryCurrentIndex].src;
    this.galleryCurrentCaption = this.galleryMedia[this.galleryCurrentIndex].caption;
    this.galleryCurrentType = this.galleryMedia[this.galleryCurrentIndex].type;
    this.resetZoomAndRotation();
    
    if (this.slideshowActive) {
      this.restartSlideshow();
    }
  }

  // ─── ZOOM ET DRAG ───
  onZoom(event: WheelEvent): void {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    this.zoomLevel = Math.min(Math.max(1, this.zoomLevel + delta), 4);
    
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    this.zoomOrigin = `${x}% ${y}%`;
    this.applyTransform();
  }

  onDragStart(event: MouseEvent): void {
    if (this.zoomLevel <= 1) return;
    this.isDragging = true;
    this.dragStart = { x: event.clientX - this.dragOffset.x, y: event.clientY - this.dragOffset.y };
    event.preventDefault();
  }

  onDragMove(event: MouseEvent): void {
    if (!this.isDragging || this.zoomLevel <= 1) return;
    this.dragOffset = {
      x: event.clientX - this.dragStart.x,
      y: event.clientY - this.dragStart.y
    };
    this.currentTransform = { ...this.dragOffset };
    this.applyTransform();
  }

  onDragEnd(): void {
    this.isDragging = false;
  }

  applyTransform(): void {
    const imgElement = document.querySelector('.gallery-image') as HTMLElement;
    if (imgElement) {
      imgElement.style.transform = `rotate(${this.rotationAngle}deg) scale(${this.zoomLevel}) translate(${this.currentTransform.x}px, ${this.currentTransform.y}px)`;
      imgElement.style.transformOrigin = this.zoomOrigin;
    }
  }

  resetZoomAndRotation(): void {
    this.zoomLevel = 1;
    this.rotationAngle = 0;
    this.dragOffset = { x: 0, y: 0 };
    this.currentTransform = { x: 0, y: 0 };
    this.zoomOrigin = 'center center';
    this.applyTransform();
  }

  rotateImage(): void {
    this.rotationAngle = (this.rotationAngle + 90) % 360;
    this.applyTransform();
  }

  downloadImage(): void {
    if (this.galleryCurrentType === 'image') {
      this.showNotification('Téléchargement en cours...', 'info');
      fetch(this.galleryCurrentMedia)
        .then(response => {
          if (!response.ok) throw new Error('Erreur de téléchargement');
          return response.blob();
        })
        .then(blob => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `image_${Date.now()}.jpg`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          this.showNotification('Image téléchargée avec succès !', 'success');
        })
        .catch(() => {
          window.open(this.galleryCurrentMedia, '_blank');
          this.showNotification('Ouverture dans un nouvel onglet', 'info');
        });
    } else if (this.galleryCurrentType === 'video') {
      window.open(this.galleryCurrentMedia, '_blank');
      this.showNotification('La vidéo s\'ouvre dans un nouvel onglet', 'info');
    }
  }

  shareImage(): void {
    const shareUrl = this.galleryCurrentMedia;
    const shareTitle = document.title;
    const shareText = 'Image partagée depuis MediConnect - Forum médical';
    
    if (navigator.share && this.galleryCurrentType === 'image') {
      fetch(shareUrl)
        .then(response => response.blob())
        .then(blob => {
          const file = new File([blob], `image_${Date.now()}.jpg`, { type: blob.type });
          navigator.share({
            title: shareTitle,
            text: shareText,
            files: [file]
          }).catch(() => {
            this.copyToClipboard(shareUrl);
          });
        })
        .catch(() => {
          this.copyToClipboard(shareUrl);
        });
    } else if (navigator.share) {
      navigator.share({
        title: shareTitle,
        text: shareText,
        url: shareUrl
      }).catch(() => {
        this.copyToClipboard(shareUrl);
      });
    } else {
      this.copyToClipboard(shareUrl);
    }
  }

  copyToClipboard(text: string): void {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.showNotification('Lien copié dans le presse-papier !', 'success');
      }).catch(() => {
        this.fallbackCopyToClipboard(text);
      });
    } else {
      this.fallbackCopyToClipboard(text);
    }
  }

  fallbackCopyToClipboard(text: string): void {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    
    if (success) {
      this.showNotification('Lien copié dans le presse-papier !', 'success');
    } else {
      prompt('Copiez ce lien manuellement :', text);
    }
  }

  showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const notification = document.createElement('div');
    notification.textContent = message;
    
    const colors = {
      success: 'rgba(5, 150, 105, 0.95)',
      error: 'rgba(220, 38, 38, 0.95)',
      info: 'rgba(13, 148, 136, 0.95)'
    };
    
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${colors[type]};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      z-index: 10000;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      animation: slideUpFadeOut 2.5s ease forwards;
      pointer-events: none;
    `;
    
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideUpFadeOut {
        0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
        15% { opacity: 1; transform: translateX(-50%) translateY(0); }
        85% { opacity: 1; transform: translateX(-50%) translateY(0); }
        100% { opacity: 0; transform: translateX(-50%) translateY(-20px); visibility: hidden; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
      style.remove();
    }, 2500);
  }

  toggleFullscreen(): void {
    const elem = document.querySelector('.gallery-container') as HTMLElement;
    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch(err => {
        console.error(`Erreur plein écran: ${err.message}`);
        this.showNotification('Impossible de passer en plein écran', 'error');
      });
    } else {
      document.exitFullscreen();
    }
  }

  toggleSlideshow(): void {
    if (this.slideshowActive) {
      this.stopSlideshow();
    } else {
      this.startSlideshow();
    }
  }

  startSlideshow(): void {
    if (this.galleryMedia.length <= 1) {
      this.showNotification('Diaporama disponible uniquement avec plusieurs images', 'info');
      return;
    }
    this.slideshowActive = true;
    this.slideshowInterval = setInterval(() => {
      this.nextMedia();
    }, this.slideshowSpeed * 1000);
  }

  stopSlideshow(): void {
    this.slideshowActive = false;
    if (this.slideshowInterval) {
      clearInterval(this.slideshowInterval);
      this.slideshowInterval = null;
    }
  }

  restartSlideshow(): void {
    if (this.slideshowActive) {
      this.stopSlideshow();
      this.startSlideshow();
    }
  }

  openPdf(url: string): void {
    window.open(url, '_blank');
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.galleryOpen) {
      this.closeGallery();
    }
  }

  @HostListener('document:keydown.arrowright')
  onArrowRight(): void {
    if (this.galleryOpen) {
      this.nextMedia();
    }
  }

  @HostListener('document:keydown.arrowleft')
  onArrowLeft(): void {
    if (this.galleryOpen) {
      this.prevMedia();
    }
  }

  @HostListener('document:keydown.f')
  onFullscreenKey(): void {
    if (this.galleryOpen) {
      this.toggleFullscreen();
    }
  }

  getCatClasses(category: string): string {
    const map: Record<string, string> = {
      'QUESTION': 'bg-blue-100 text-blue-800 border-blue-200',
      'ADVICE': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'AWARENESS': 'bg-orange-100 text-orange-800 border-orange-200',
      'DOCUMENT': 'bg-violet-100 text-violet-800 border-violet-200'
    };
    return map[category] || 'bg-slate-100 text-slate-800 border-slate-200';
  }

  getDisplayText(post: any, field: 'title' | 'content'): string {
    if (this.currentLanguage === 'fr') {
      return post[field];
    }
    const translatedField = field === 'title' ? 'translatedTitle' : 'translatedContent';
    return post[translatedField] || post[field];
  }

  hasTranslation(post: any, field: 'title' | 'content'): boolean {
    if (this.currentLanguage === 'fr') return false;
    const translatedField = field === 'title' ? 'translatedTitle' : 'translatedContent';
    return !!post[translatedField];
  }

  getCurrentLanguageFlag(): string {
    const lang = this.availableLanguages.find(l => l.code === this.currentLanguage);
    return lang ? lang.flag : '🇫🇷';
  }

  getCurrentLanguageName(): string {
    const lang = this.availableLanguages.find(l => l.code === this.currentLanguage);
    return lang ? lang.name : 'Français';
  }

  loadPosts(page: number = 0): void {
    this.isLoading = true;
    this.currentPage = page;
    this.allPostsLoaded = false;
    this.isLoadingMorePosts = false;
    
    this.postService.getAll(this.currentPage, this.pageSize).subscribe({
      next: (page) => {
        this.postService.getPinned().subscribe({
          next: (pinned) => {
            const normalizedNormal = page.content.map(post => this.normalizePost(post));
            const normalizedPinned = pinned.map(post => this.normalizePost(post));
            
            const postsMap = new Map<string, ForumPost>();
            
            normalizedNormal.forEach(post => {
              postsMap.set(post.id, { ...post, pinned: false });
            });
            
            normalizedPinned.forEach(pinnedPost => {
              const existingPost = postsMap.get(pinnedPost.id);
              if (existingPost) {
                postsMap.set(pinnedPost.id, { ...existingPost, pinned: true });
              } else {
                postsMap.set(pinnedPost.id, { ...pinnedPost, pinned: true });
              }
            });
            
            this.posts = Array.from(postsMap.values());
            
            this.posts.sort((a, b) => {
              if (a.pinned !== b.pinned) {
                return a.pinned ? -1 : 1;
              }
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });

            this.totalPosts = page.totalElements || page.content.length || 0;
            this.totalPages = this.getTotalPages(page.totalElements, page.totalPages);
            this.allPostsLoaded = this.currentPage >= this.totalPages - 1;
            
            this.filteredPosts = [...this.posts];
            this.analyzePostSentiments();
            this.loadReactionsForPosts();
            this.loadSaveStatusForPosts();
            this.refreshTranslatedPosts(() => {
              this.isLoading = false;
            });
          },
          error: (err) => {
            console.error('❌ Erreur chargement épinglés:', err);
            this.posts = page.content.map(post => this.normalizePost(post));
            this.totalPosts = page.totalElements || this.posts.length || 0;
            this.totalPages = this.getTotalPages(page.totalElements, page.totalPages);
            this.filteredPosts = [...this.posts];
            this.analyzePostSentiments();
            this.refreshTranslatedPosts(() => {
              this.isLoading = false;
            });
          }
        });
      },
      error: (err) => {
        console.error('❌ Erreur chargement posts:', err);
        this.isLoading = false;
        this.posts = []; 
        this.filteredPosts = [];
      }
    });
  }

  refreshPosts(): void {
    this.loadPosts(this.currentPage);
  }

  private normalizePost(post: any): ForumPost {
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
      createdAt: new Date(post.createdAt),
      author: {
        id: post.author?.id,
        initials: post.author?.initials || '??',
        fullName: post.author?.fullName || 'Anonyme',
        role: post.author?.role || 'USER'
      },
      attachments: post.attachments,
      images: images,
      videos: videos,
      pdfs: pdfs
    };
  }

  handleImageError(event: any): void {
    event.target.src = 'https://via.placeholder.com/80x80?text=Image+introuvable';
  }

  onVoiceSearch(query: string | Event): void {
    this.searchQuery = typeof query === 'string' ? query : this.searchQuery;
    this.onSearch();
  }

  filterByCategory(cat: PostCategory | 'all'): void {
    this.activeCategory = cat;
    this.applyFilters();
  }

  onSearch(): void {
    this.applyFilters();
  }

  changeLanguage(lang: Language): void {
    if (lang === this.currentLanguage) {
      this.showLanguageMenu = false;
      return;
    }

    this.isTranslating = true;
    this.translationProgress = 0;
    this.translationTotal = this.posts.length;
    this.currentLanguage = lang;

    if (lang === 'fr') {
      this.translatedPosts = this.posts;
      this.filteredPosts = this.posts;
      this.isTranslating = false;
      this.showLanguageMenu = false;
      return;
    }

    this.showNotification('Traduction en cours...', 'info');

    this.translateService.progress$.subscribe(progress => {
      if (progress.status === 'translating') {
        this.translationProgress = progress.current;
        this.translationTotal = progress.total;
      }
    });

    this.translateService.translatePosts(this.posts, lang).subscribe({
      next: (translated) => {
        this.translatedPosts = translated;
        this.applyFilters();
        this.isTranslating = false;
        this.showLanguageMenu = false;
        this.showNotification('Traduction terminée !', 'success');
        setTimeout(() => {
          this.translationProgress = 0;
          this.translationTotal = 0;
        }, 2000);
      },
      error: (err) => {
        console.error('Erreur de traduction:', err);
        this.isTranslating = false;
        this.showLanguageMenu = false;
        this.showNotification('Erreur lors de la traduction', 'error');
      }
    });
  }

  applyFilters(): void {
    const sourcePosts = this.currentLanguage === 'fr' ? this.posts : this.translatedPosts;
    
    this.filteredPosts = sourcePosts.filter(p => {
      const matchCat = this.activeCategory === 'all' || p.category === this.activeCategory;
      
      const titleToSearch = (p as any).translatedTitle || p.title;
      const contentToSearch = (p as any).translatedContent || p.content;
      
      const matchQ = !this.searchQuery ||
        titleToSearch.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        contentToSearch.toLowerCase().includes(this.searchQuery.toLowerCase());
      
      const matchTag = !this.tagFilter || p.tags?.some((tag: string) => 
        tag.toLowerCase().includes(this.tagFilter.toLowerCase())
      );
      
      return matchCat && matchQ && matchTag;
    });
  }

  toggleSelectionMode(): void {
    this.selectionMode = !this.selectionMode;
    if (!this.selectionMode) {
      this.selectedPostIds.clear();
      this.allPostsSelected = false;
    }
  }

  togglePostSelection(postId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    if (this.selectedPostIds.has(postId)) {
      this.selectedPostIds.delete(postId);
    } else {
      this.selectedPostIds.add(postId);
    }

    this.allPostsSelected = this.selectedPostIds.size === this.filteredPosts.length && this.filteredPosts.length > 0;
  }

  toggleSelectAll(): void {
    if (this.allPostsSelected) {
      this.selectedPostIds.clear();
      this.allPostsSelected = false;
      return;
    }

    this.filteredPosts.forEach(post => this.selectedPostIds.add(post.id));
    this.allPostsSelected = true;
  }

  translateSelected(): void {
    if (this.selectedPostIds.size === 0) {
      this.showNotification('Sélectionnez au moins un post pour traduire.', 'info');
      return;
    }

    this.executeTranslation(this.posts.filter(post => this.selectedPostIds.has(post.id)), this.pendingTargetLanguage, 'posts sélectionnés');
  }

  translateAllVisible(): void {
    if (this.filteredPosts.length === 0) {
      this.showNotification('Aucun post visible à traduire.', 'info');
      return;
    }

    this.executeTranslation(this.filteredPosts, this.pendingTargetLanguage, 'posts visibles');
  }

  private executeTranslation(posts: ForumPost[], targetLang: Language, label: string): void {
    if (targetLang === this.currentLanguage) {
      this.showNotification('La langue sélectionnée est déjà active.', 'info');
      return;
    }

    this.isTranslating = true;
    this.translationProgress = 0;
    this.translationTotal = posts.length;
    this.showNotification(`Traduction des ${label} en cours...`, 'info');

    this.translateService.progress$.subscribe(progress => {
      if (progress.status === 'translating') {
        this.translationProgress = progress.current;
        this.translationTotal = progress.total;
      }
    });

    this.translateService.translatePosts(posts, targetLang).subscribe({
      next: (translated) => {
        const translatedById = new Map<string, any>(translated.map((post: any) => [post.id, post]));
        this.translatedPosts = this.translatedPosts.map(post =>
          translatedById.has(post.id) ? { ...post, ...translatedById.get(post.id) } : post
        );

        this.currentLanguage = targetLang;
        this.applyFilters();
        this.isTranslating = false;
        this.selectionMode = false;
        this.selectedPostIds.clear();
        this.allPostsSelected = false;
        this.showNotification(`Traduction des ${label} terminée !`, 'success');
        setTimeout(() => {
          this.translationProgress = 0;
          this.translationTotal = 0;
        }, 2000);
      },
      error: (err) => {
        console.error('Erreur de traduction:', err);
        this.isTranslating = false;
        this.showNotification(`Erreur lors de la traduction des ${label}`, 'error');
      }
    });
  }

  openPost(id: string): void {
    this.router.navigate(['/forum/post', id]);
  }

  newPost(): void {
    this.router.navigate(['/forum/nouveau']);
  }

  getCatColor(cat: string): string {
    const map: Record<string, string> = {
      QUESTION: 'text-blue-400',
      ADVICE: 'text-emerald-400',
      AWARENESS: 'text-orange-400',
      DOCUMENT: 'text-violet-400'
    };
    return map[cat] || 'text-slate-400';
  }

  getCatBg(cat: string): string {
    const map: Record<string, string> = {
      QUESTION: 'bg-blue-500/10',
      ADVICE: 'bg-emerald-500/10',
      AWARENESS: 'bg-orange-500/10',
      DOCUMENT: 'bg-violet-500/10'
    };
    return map[cat] || 'bg-slate-500/10';
  }

  getCatIcon(cat: string): string {
    const map: Record<string, string> = {
      QUESTION: '❓',
      ADVICE: '💬',
      AWARENESS: '📢',
      DOCUMENT: '📄'
    };
    return map[cat] || '📝';
  }

  getCatLabel(cat: string): string {
    const map: Record<string, string> = {
      QUESTION: 'Question',
      ADVICE: 'Conseil',
      AWARENESS: 'Sensibilisation',
      DOCUMENT: 'Document'
    };
    return map[cat] || cat;
  }

  getAccentColor(cat: string): string {
    const map: Record<string, string> = {
      QUESTION: '#3b82f6',
      ADVICE: '#10b981',
      AWARENESS: '#f97316',
      DOCUMENT: '#8b5cf6'
    };
    return map[cat] || '#14b8a6';
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

  // 📄 PAGINATION METHODS
  loadMorePosts(): void {
    if (!this.allPostsLoaded && !this.isLoadingMorePosts && this.currentPage < this.totalPages - 1) {
      this.isLoadingMorePosts = true;
      this.currentPage++;

      this.postService.getAll(this.currentPage, this.pageSize).subscribe({
        next: (page) => {
          const newPosts = page.content.map(post => this.normalizePost(post));
          this.posts = [...this.posts, ...newPosts];
          
          this.totalPosts = page.totalElements || this.posts.length;
          this.totalPages = this.getTotalPages(page.totalElements, page.totalPages);
          this.allPostsLoaded = this.currentPage >= this.totalPages - 1;
          this.filteredPosts = [...this.posts];
          this.analyzePostSentiments();
          
          this.refreshTranslatedPosts(() => {
            this.isLoadingMorePosts = false;
          });
        },
        error: (err) => {
          console.error('❌ Erreur chargement more posts:', err);
          this.currentPage--;
          this.isLoadingMorePosts = false;
        }
      });
    }
  }

  private getTotalPages(totalElements: number | undefined, totalPages: number | undefined): number {
    if (typeof totalPages === 'number' && totalPages > 0) {
      return totalPages;
    }

    const totalItems = totalElements || 0;
    return Math.max(1, Math.ceil(totalItems / this.pageSize));
  }

  getVisiblePostPages(): number[] {
    const totalPages = this.totalPages;
    if (totalPages <= 0) {
      return [];
    }

    const windowSize = 5;
    const halfWindow = Math.floor(windowSize / 2);
    let start = Math.max(0, this.currentPage - halfWindow);
    let end = Math.min(totalPages - 1, start + windowSize - 1);

    if (end - start + 1 < windowSize) {
      start = Math.max(0, end - windowSize + 1);
    }

    const pages: number[] = [];
    for (let pageIndex = start; pageIndex <= end; pageIndex++) {
      pages.push(pageIndex);
    }

    return pages;
  }

  private analyzePostSentiments(): void {
    const analyses = this.posts.map(post => {
      const text = `${post.title}. ${post.content}`;
      return this.aiService.analyzeAdvancedSentiment(text);
    });

    this.postSentiments = new Map(
      this.posts.map((post, index) => [post.id, analyses[index]])
    );
    this.sentimentDashboard = this.aiService.buildSentimentDashboard(analyses);
  }

  private refreshTranslatedPosts(done?: () => void): void {
    if (this.currentLanguage === 'fr') {
      this.translatedPosts = [...this.posts];
      this.applyFilters();
      if (done) done();
      return;
    }

    this.translateService.translatePosts(this.posts, this.currentLanguage).subscribe({
      next: (translated) => {
        this.translatedPosts = translated;
        this.applyFilters();
        if (done) done();
      },
      error: (err) => {
        console.error('Erreur de synchronisation traduction:', err);
        this.translatedPosts = [...this.posts];
        this.applyFilters();
        if (done) done();
      }
    });
  }

  getPostSentiment(post: ForumPost): AdvancedSentimentResult {
    return this.postSentiments.get(post.id) || this.aiService.analyzeAdvancedSentiment(`${post.title}. ${post.content}`);
  }

  getSentimentLabel(post: ForumPost): string {
    const analysis = this.getPostSentiment(post);
    const labels: Record<string, string> = {
      positif: 'Positif',
      negatif: 'Préoccupant',
      neutre: 'Neutre',
      mixte: 'Mixte'
    };

    return labels[analysis.sentiment] || 'Neutre';
  }

  getSentimentIcon(post: ForumPost): string {
    const analysis = this.getPostSentiment(post);
    const icons: Record<string, string> = {
      positif: '😊',
      negatif: '⚠️',
      neutre: '⚪',
      mixte: '🟠'
    };

    return icons[analysis.sentiment] || '⚪';
  }

  getSentimentBadgeClass(post: ForumPost): string {
    const analysis = this.getPostSentiment(post);
    return `sentiment-${analysis.sentiment}`;
  }

  getSentimentScoreWidth(post: ForumPost): number {
    const analysis = this.getPostSentiment(post);
    return Math.round((analysis.score + 1) * 50);
  }

  getSentimentRecommendation(post: ForumPost): string {
    return this.getPostSentiment(post).recommendation;
  }

  getSentimentScoreClass(score: number): string {
    if (score > 0.2) {
      return 'sentiment-positive';
    }

    if (score < -0.2) {
      return 'sentiment-negative';
    }

    return 'sentiment-neutral';
  }

  goToPostPage(page: number): void {
    if (page < 0 || page >= this.totalPages) {
      return;
    }

    this.loadPosts(page);
  }

  getCurrentPostPageDisplay(): number {
    return this.currentPage + 1;
  }

  loadSaveStatusForPosts(): void {
    this.posts.forEach((post: ForumPost) => {
      this.postService.getSaveStatus(post.id, this.currentUserId).subscribe({
        next: (data: any) => {
          this.postSaveStatus.set(post.id, !!data.saved);
        },
        error: (err: any) => {
          console.error('Erreur chargement sauvegarde pour post', post.id, err);
        }
      });
    });
  }

  toggleReaction(post: ForumPost, emoji: string, event: Event): void {
    event.stopPropagation();

    const currentReaction = this.getUserReaction(post.id);
    const isClearing = currentReaction === emoji;
    
    const oldReactions = this.postReactions.get(post.id);
    const optimisticCounts = { ...(oldReactions?.counts || {}) };
    
    if (isClearing) {
      if (optimisticCounts[emoji]) {
        optimisticCounts[emoji]--;
        if (optimisticCounts[emoji] <= 0) delete optimisticCounts[emoji];
      }
    } else {
      if (oldReactions?.userReaction && oldReactions.userReaction !== emoji) {
        const oldEmoji = oldReactions.userReaction;
        if (optimisticCounts[oldEmoji]) {
          optimisticCounts[oldEmoji]--;
          if (optimisticCounts[oldEmoji] <= 0) delete optimisticCounts[oldEmoji];
        }
      }
      optimisticCounts[emoji] = (optimisticCounts[emoji] || 0) + 1;
    }

    this.postReactions.set(post.id, { 
      counts: optimisticCounts, 
      userReaction: isClearing ? null : emoji 
    });

    const action = isClearing
      ? this.postService.clearReaction(post.id, this.currentUserId)
      : this.postService.setReaction(post.id, this.currentUserId, emoji);

    action.subscribe({
      next: (data) => {
        this.postReactions.set(post.id, { counts: data.counts || {}, userReaction: data.userReaction || null });
        this.postService.syncReactionState(post.id, data);
      },
      error: (err) => {
        console.error('Erreur réaction:', err);
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

  public togglePin(post: ForumPost, event: Event): void {
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
        this.showNotification(
          wasPinned ? '📍 Post désépinglé avec succès !' : '📌 Post épinglé avec succès !',
          'success'
        );
        this.refreshPosts();
        this.isPinningPostId = null;
      },
      error: (err) => {
        console.error('Erreur pin/unpin:', err);
        this.showNotification(
          wasPinned ? 'Erreur lors du désépinglage' : 'Erreur lors de l’épinglage',
          'error'
        );
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