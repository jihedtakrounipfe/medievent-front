import { Component, OnInit, OnDestroy, NgZone, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { ForumPostService } from '../../services/forum-post.service';
import { PostCategory } from '../../models/forum-post';
import { Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { AiContentService } from '../../services/ai-content.service';

// Interface améliorée pour les fichiers
interface FileWithPreview {
  file: File;
  name: string;
  size: number;
  type: string;
  preview?: string;
  uploadProgress: number;
  isUploading: boolean;
  fileType: 'image' | 'video' | 'pdf';
  dimensions?: { width: number; height: number };
  duration?: number;
  pages?: number;
}

@Component({
  selector: 'app-forum-create',
  templateUrl: './forum-create.component.html',
  styleUrls: ['./forum-create.component.css'],
  standalone: false
})
export class ForumCreateComponent implements OnInit, OnDestroy {
  
  @ViewChild('tagInput') tagInput!: ElementRef;
  @ViewChild('titleInput') titleInput!: ElementRef;
  @ViewChild('contentInput') contentInput!: ElementRef;
  @ViewChild('imageInput') imageInput!: ElementRef;
  @ViewChild('videoInput') videoInput!: ElementRef;
  @ViewChild('pdfInput') pdfInput!: ElementRef;
  
  onTagInputKeyDown($event: Event): void {
    $event.preventDefault();
    const input = $event.target as HTMLInputElement;
    this.addTag(input.value);
    input.value = '';
  }

  isSubmitting = false;
  errorMessage = '';
  currentUserId = 1;

  // ===== GÉNÉRATION IA AMÉLIORÉE =====
  isGeneratingContent = false;
  isImprovingContent = false;
  showAiSuggestions = true;

  form = {
    title: '',
    content: '',
    category: '' as PostCategory | '',
    tags: [] as string[]
  };

  // ===== 3 CHAMPS D'UPLOAD SÉPARÉS =====
  imageFiles: FileWithPreview[] = [];
  videoFiles: FileWithPreview[] = [];
  pdfFiles: FileWithPreview[] = [];

  imageError = '';
  videoError = '';
  pdfError = '';
  fileError = '';

  uploadProgress: number = 0;
  isUploading: boolean = false;

  // Limites de fichiers configurables
  fileLimits = {
    image: { maxSize: 20 * 1024 * 1024, maxFiles: 10, formats: ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'] },
    video: { maxSize: 100 * 1024 * 1024, maxFiles: 5, formats: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'] },
    pdf: { maxSize: 20 * 1024 * 1024, maxFiles: 10, formats: ['pdf'] }
  };

  // Propriétés pour les statistiques
  stats = {
    words: 0,
    characters: 0,
    sentences: 0,
    readingTime: 0,
    medicalTerms: 0,
    paragraphs: 0
  };

  touchedFields = {
    category: false,
    title: false,
    content: false
  };

  categories = [
    { value: 'QUESTION', icon: '❓', label: 'Question', desc: 'Posez une question', color: '#3b82f6' },
    { value: 'ADVICE', icon: '💬', label: 'Conseil', desc: 'Partagez un conseil', color: '#10b981' },
    { value: 'AWARENESS', icon: '📢', label: 'Sensibilisation', desc: 'Informez la communauté', color: '#f97316' },
    { value: 'DOCUMENT', icon: '📄', label: 'Document', desc: 'Partagez un document', color: '#8b5cf6' },
  ];

  // Speech recognition
  isListeningFor: 'title' | 'content' | null = null;
  recognition: any;
  isSpeechSupported = true;
  private recognitionTimeout: any;

  private medicalTermsList = [
    'diagnostic', 'traitement', 'symptôme', 'maladie', 'infection',
    'inflammation', 'chronique', 'aigu', 'pathologie', 'syndrome',
    'médicament', 'douleur', 'fièvre', 'toux', 'respiration',
    'cardiaque', 'diabète', 'hypertension', 'allergie', 'virus',
    'bactérie', 'antibiotique', 'vaccin', 'prévention', 'dépistage'
  ];

  constructor(
    private router: Router,
    private postService: ForumPostService,
    private ngZone: NgZone,
    private aiContentService: AiContentService
  ) {}

  ngOnInit() {
    this.initSpeechRecognition();
  }

  ngOnDestroy() {
    this.cleanupSpeechRecognition();
  }

  // ===== GÉNÉRATION IA AMÉLIORÉE =====
  async generateContentFromTitle(): Promise<void> {
    if (!this.form.title.trim()) {
      this.errorMessage = 'Veuillez d\'abord saisir un titre';
      setTimeout(() => this.errorMessage = '', 3000);
      return;
    }

    if (!this.form.category) {
      this.errorMessage = 'Veuillez d\'abord sélectionner une catégorie';
      setTimeout(() => this.errorMessage = '', 3000);
      return;
    }

    this.isGeneratingContent = true;
    this.errorMessage = '';

    this.aiContentService.generateContent(this.form.title, this.getCurrentCategoryLabel()).subscribe({
      next: (generated) => {
        if (generated) {
          this.form.content = generated;
          this.updateStats();
          this.validateField('content');
        }
        this.isGeneratingContent = false;
      },
      error: (err) => {
        this.errorMessage = 'Erreur lors de la génération du contenu. Réessayez.';
        this.isGeneratingContent = false;
        setTimeout(() => this.errorMessage = '', 3000);
      }
    });
  }

  async improveContent(): Promise<void> {
    if (!this.form.content.trim()) {
      this.errorMessage = 'Veuillez d\'abord saisir du contenu à améliorer';
      setTimeout(() => this.errorMessage = '', 3000);
      return;
    }

    this.isImprovingContent = true;
    this.errorMessage = '';

    this.aiContentService.improveContent(this.form.content, this.getCurrentCategoryLabel()).subscribe({
      next: (improved) => {
        if (improved && improved !== this.form.content) {
          this.form.content = improved;
          this.updateStats();
          this.validateField('content');
        }
        this.isImprovingContent = false;
      },
      error: (err) => {
        this.errorMessage = 'Erreur lors de l\'amélioration du contenu';
        this.isImprovingContent = false;
        setTimeout(() => this.errorMessage = '', 3000);
      }
    });
  }

  getCurrentCategoryLabel(): string {
    const category = this.categories.find(c => c.value === this.form.category);
    return category?.label || '';
  }

  // ===== VALIDATION GÉNÉRIQUE POUR LES FICHIERS =====
  validateFile(file: File, type: 'image' | 'video' | 'pdf'): { valid: boolean; error?: string } {
    const limits = this.fileLimits[type];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    
    // Vérifier le format
    if (!limits.formats.includes(ext)) {
      return { valid: false, error: `Format non autorisé. Formats acceptés: ${limits.formats.join(', ').toUpperCase()}` };
    }
    
    // Vérifier la taille
    if (file.size > limits.maxSize) {
      const maxSizeMB = limits.maxSize / (1024 * 1024);
      return { valid: false, error: `Le fichier dépasse ${maxSizeMB} Mo` };
    }
    
    return { valid: true };
  }

  // ===== IMAGES AMÉLIORÉES =====
  async onImageSelected(event: any): Promise<void> {
    const files = Array.from(event.target.files) as File[];
    this.imageError = '';
    
    // Vérifier le nombre maximum de fichiers
    if (this.imageFiles.length + files.length > this.fileLimits.image.maxFiles) {
      this.imageError = `Maximum ${this.fileLimits.image.maxFiles} images autorisées`;
      event.target.value = '';
      return;
    }
    
    for (const file of files) {
      const validation = this.validateFile(file, 'image');
      if (!validation.valid) {
        this.imageError = validation.error || 'Erreur de validation';
        continue;
      }
      
      const fileObj: FileWithPreview = {
        file: file,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadProgress: 0,
        isUploading: false,
        fileType: 'image'
      };
      
      // Créer la prévisualisation avec métadonnées
      const reader = new FileReader();
      reader.onload = async (e: any) => {
        fileObj.preview = e.target.result;
        
        // Extraire les dimensions de l'image
        const img = new Image();
        img.onload = () => {
          fileObj.dimensions = { width: img.width, height: img.height };
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
      
      this.imageFiles.push(fileObj);
    }
    
    event.target.value = '';
  }

  // ===== VIDÉOS AMÉLIORÉES =====
  async onVideoSelected(event: any): Promise<void> {
    const files = Array.from(event.target.files) as File[];
    this.videoError = '';
    
    // Vérifier le nombre maximum de fichiers
    if (this.videoFiles.length + files.length > this.fileLimits.video.maxFiles) {
      this.videoError = `Maximum ${this.fileLimits.video.maxFiles} vidéos autorisées`;
      event.target.value = '';
      return;
    }
    
    for (const file of files) {
      const validation = this.validateFile(file, 'video');
      if (!validation.valid) {
        this.videoError = validation.error || 'Erreur de validation';
        continue;
      }
      
      const fileObj: FileWithPreview = {
        file: file,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadProgress: 0,
        isUploading: false,
        fileType: 'video'
      };
      
      // Extraire la durée et une miniature de la vidéo
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        fileObj.duration = video.duration;
        
        // Créer une miniature
        video.currentTime = 1;
        video.onseeked = () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
          fileObj.preview = canvas.toDataURL();
        };
      };
      video.src = URL.createObjectURL(file);
      
      this.videoFiles.push(fileObj);
    }
    
    event.target.value = '';
  }

  // ===== PDFs AMÉLIORÉS =====
  async onPdfSelected(event: any): Promise<void> {
    const files = Array.from(event.target.files) as File[];
    this.pdfError = '';
    
    // Vérifier le nombre maximum de fichiers
    if (this.pdfFiles.length + files.length > this.fileLimits.pdf.maxFiles) {
      this.pdfError = `Maximum ${this.fileLimits.pdf.maxFiles} PDFs autorisées`;
      event.target.value = '';
      return;
    }
    
    for (const file of files) {
      const validation = this.validateFile(file, 'pdf');
      if (!validation.valid) {
        this.pdfError = validation.error || 'Erreur de validation';
        continue;
      }
      
      const fileObj: FileWithPreview = {
        file: file,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadProgress: 0,
        isUploading: false,
        fileType: 'pdf'
      };
      
      // Icône PDF par défaut (pas de preview réelle pour PDF)
      fileObj.preview = 'pdf-icon';
      
      this.pdfFiles.push(fileObj);
    }
    
    event.target.value = '';
  }

  removeImageFile(index: number): void {
    this.imageFiles.splice(index, 1);
  }

  removeVideoFile(index: number): void {
    this.videoFiles.splice(index, 1);
  }

  removePdfFile(index: number): void {
    this.pdfFiles.splice(index, 1);
  }

  getAllFiles(): FileWithPreview[] {
    return [...this.imageFiles, ...this.videoFiles, ...this.pdfFiles];
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getTotalFilesSize(): number {
    return this.getAllFiles().reduce((total, file) => total + file.size, 0);
  }

  getFileTypeIcon(fileType: string): string {
    switch(fileType) {
      case 'image': return '🖼️';
      case 'video': return '🎬';
      case 'pdf': return '📄';
      default: return '📎';
    }
  }

  // ===== MÉTHODES DE VALIDATION =====
  selectCategory(value: string): void {
    this.form.category = value as PostCategory;
    this.validateField('category');
  }

  validateField(field: string): void {
    if (field in this.touchedFields) {
      this.touchedFields[field as keyof typeof this.touchedFields] = true;
    }
  }

  addTag(value: string): void {
    const tag = value.trim().replace(/^#/, '');
    if (tag && !this.form.tags.includes(tag) && this.form.tags.length < 5) {
      this.form.tags.push(tag);
    }
  }

  removeTag(tag: string): void {
    this.form.tags = this.form.tags.filter(t => t !== tag);
  }

  // ===== CONTENU ET STATISTIQUES =====
  onContentChange(): void {
    this.validateField('content');
    this.updateStats();
  }

  updateStats(): void {
    const text = this.form.content;
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const medicalTerms = this.countMedicalTerms(text);
    
    this.stats = {
      words: words.length,
      characters: text.length,
      sentences: sentences.length,
      readingTime: Math.ceil(words.length / 200),
      medicalTerms: medicalTerms,
      paragraphs: paragraphs.length || 1
    };
  }

  private countMedicalTerms(text: string): number {
    const lowerText = text.toLowerCase();
    let count = 0;
    for (const term of this.medicalTermsList) {
      const regex = new RegExp(term, 'gi');
      const matches = lowerText.match(regex);
      if (matches) count += matches.length;
    }
    return count;
  }

  getContentWarning(): { type: string; message: string } | null {
    const length = this.form.content.length;
    
    if (length < 20) {
      return { type: 'error', message: 'Minimum 20 caractères requis' };
    } else if (length < 50) {
      return { type: 'warning', message: 'Plus de détails seraient utiles' };
    } else if (length > 4500) {
      return { type: 'warning', message: 'Approche de la limite (5000)' };
    } else if (length > 1000) {
      return { type: 'info', message: 'Post très détaillé !' };
    }
    return null;
  }

  // ===== RECONNAISSANCE VOCALE =====
  private cleanupSpeechRecognition() {
    if (this.recognitionTimeout) {
      clearTimeout(this.recognitionTimeout);
    }
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (e) {
        console.error('Erreur nettoyage:', e);
      }
    }
  }

  initSpeechRecognition() {
    const w: any = window;
    
    if (!w.webkitSpeechRecognition && !w.SpeechRecognition) {
      console.warn('Reconnaissance vocale non supportée');
      this.isSpeechSupported = false;
      return;
    }

    try {
      const SpeechRecognition = w.webkitSpeechRecognition || w.SpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'fr-FR';
      this.recognition.maxAlternatives = 1;

      this.recognition.onresult = (event: any) => {
        this.ngZone.run(() => {
          const text = event.results[0][0].transcript;
          
          if (this.isListeningFor === 'title') {
            this.form.title = text;
            this.validateField('title');
          } else if (this.isListeningFor === 'content') {
            this.form.content = text;
            this.validateField('content');
            this.updateStats();
          }
          
          this.isListeningFor = null;
        });
      };

      this.recognition.onend = () => {
        this.ngZone.run(() => {
          this.isListeningFor = null;
        });
      };

      this.recognition.onerror = (event: any) => {
        this.ngZone.run(() => {
          if (event.error === 'not-allowed') {
            alert('Veuillez autoriser l\'accès au microphone.');
          } else if (event.error === 'no-speech') {
            alert('Aucune parole détectée.');
          }
          this.isListeningFor = null;
        });
      };
    } catch (e) {
      console.error('Erreur initialisation:', e);
      this.isSpeechSupported = false;
    }
  }

  toggleListening(field: 'title' | 'content') {
    if (!this.isSpeechSupported) {
      alert('Reconnaissance vocale non supportée.');
      return;
    }

    if (this.isListeningFor === field) {
      this.stopListening();
      return;
    }

    this.startListening(field);
  }

  startListening(field: 'title' | 'content') {
    try {
      this.isListeningFor = field;
      this.recognition.start();
      
      this.recognitionTimeout = setTimeout(() => {
        if (this.isListeningFor === field) {
          this.stopListening();
          alert('Délai dépassé.');
        }
      }, 10000);
      
    } catch (e) {
      this.isListeningFor = null;
      alert('Impossible de démarrer la reconnaissance vocale.');
    }
  }

  stopListening() {
    if (this.recognitionTimeout) {
      clearTimeout(this.recognitionTimeout);
    }
    
    if (this.recognition && this.isListeningFor) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
    this.isListeningFor = null;
  }

  // ===== VALIDATION =====
  isFieldInvalid(field: string): boolean {
    if (!this.touchedFields[field as keyof typeof this.touchedFields]) return false;
    switch(field) {
      case 'category': return !this.form.category;
      case 'title': return !this.form.title.trim() || this.form.title.length < 3;
      case 'content': return !this.form.content.trim() || this.form.content.length < 20;
      default: return false;
    }
  }

  isFormValid(): boolean {
    return !!(
      this.form.category &&
      this.form.title.trim() &&
      this.form.title.length >= 3 &&
      this.form.content.trim() &&
      this.form.content.length >= 20
    );
  }

  getCompletionPercentage(): number {
    let total = 0;
    if (this.form.category) total += 33.33;
    if (this.form.title.trim() && this.form.title.length >= 3) total += 33.33;
    if (this.form.content.trim() && this.form.content.length >= 20) total += 33.34;
    return Math.min(100, Math.round(total));
  }

  formatDuration(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  goBack(): void {
    this.router.navigate(['/forum']);
  }

  submit(): void {
    this.touchedFields = { category: true, title: true, content: true };
    this.errorMessage = '';

    if (!this.form.category) {
      this.errorMessage = 'Veuillez sélectionner une catégorie.';
      return;
    }
    if (!this.form.title.trim() || this.form.title.length < 3) {
      this.errorMessage = 'Le titre doit contenir au moins 3 caractères.';
      return;
    }
    if (!this.form.content.trim() || this.form.content.length < 20) {
      this.errorMessage = 'Le contenu doit contenir au moins 20 caractères.';
      return;
    }

    // Vérifier que la catégorie est valide pour le backend
    const validCategories = ['QUESTION', 'ADVICE', 'AWARENESS', 'DOCUMENT'];
    if (!validCategories.includes(this.form.category)) {
      this.errorMessage = `Catégorie invalide: ${this.form.category}. Utilisez QUESTION, ADVICE, AWARENESS ou DOCUMENT.`;
      return;
    }

    this.isSubmitting = true;

    const allFiles = this.getAllFiles();

    if (allFiles.length > 0) {
      this.isUploading = true;

      const formData = new FormData();
      formData.append('title', this.form.title.trim());
      formData.append('content', this.form.content.trim());
      formData.append('category', this.form.category);
      formData.append('authorId', String(this.currentUserId));
      if (this.form.tags.length > 0) {
        formData.append('tags', this.form.tags.join(','));
      }

      allFiles.forEach((file) => {
        formData.append('files', file.file, file.name);
      });

      this.postService.createWithAttachment(formData).subscribe({
        next: () => {
          this.isUploading = false;
          this.router.navigate(['/forum']);
        },
        error: (err) => {
          console.error('Erreur upload:', err);
          let backendMessage = 'Erreur lors de l\'upload.';
          if (err.error && typeof err.error === 'string') {
            backendMessage = err.error;
          } else if (err.error && err.error.message) {
            backendMessage = err.error.message;
          } else if (err.message) {
            backendMessage = err.message;
          }
          this.errorMessage = backendMessage;
          this.isSubmitting = false;
          this.isUploading = false;
        }
      });
    } else {
      // Cas sans fichier : n'envoyer que les champs attendus par le backend
      const postData = {
        title: this.form.title.trim(),
        content: this.form.content.trim(),
        category: this.form.category
      };

      console.log('Données envoyées (JSON) :', postData);

      this.postService.create(postData).subscribe({
        next: () => {
          this.router.navigate(['/forum']);
        },
        error: (err) => {
          console.error('Erreur création post:', err);
          let backendMessage = 'Une erreur est survenue.';
          if (err.error && typeof err.error === 'string') {
            backendMessage = err.error;
          } else if (err.error && err.error.message) {
            backendMessage = err.error.message;
          } else if (err.message) {
            backendMessage = err.message;
          }
          this.errorMessage = backendMessage;
          this.isSubmitting = false;
        }
      });
    }
  }
}