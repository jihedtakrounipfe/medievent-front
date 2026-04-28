import { Component, OnInit, HostListener, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { ForumPostService } from '../../services/forum-post.service';
import { PostCategory } from '../../models/forum-post';

export interface CanComponentDeactivate {
  canDeactivate: () => Observable<boolean> | Promise<boolean> | boolean;
}

@Component({
  selector: 'app-forum-edit',
  templateUrl: './forum-edit.component.html',
  styleUrls: ['./forum-edit.component.css'],
  standalone: false
})
export class ForumEditComponent implements OnInit, CanComponentDeactivate {

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  postId: string = '';
  isSubmitting = false;
  errorMessage = '';
  isLoading = true;

  showUnsavedModal = false;
  private deactivateSubject = new Subject<boolean>();
  private initialForm: string = '';

  form = {
    title: '',
    content: '',
    category: '' as PostCategory | '',
    tags: [] as string[]
  };

  touchedFields = {
    title: false,
    content: false,
    category: false
  };

  categories = [
    { value: 'QUESTION',   icon: '❓', label: 'Question',       desc: 'Posez une question' },
    { value: 'ADVICE',     icon: '💬', label: 'Conseil',        desc: 'Partagez un conseil' },
    { value: 'AWARENESS',  icon: '📢', label: 'Sensibilisation', desc: 'Informez la communauté' },
    { value: 'DOCUMENT',   icon: '📄', label: 'Document',       desc: 'Partagez un document' }
  ];

  existingImages: any[] = [];
  existingVideos: any[] = [];
  existingPdfs: any[] = [];
  
  newImages: any[] = [];
  newVideos: any[] = [];
  newPdfs: any[] = [];
  
  filesToDelete: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private postService: ForumPostService
  ) {}

  ngOnInit(): void {
    this.postId = this.route.snapshot.paramMap.get('id')!;
    this.loadPost();
  }

  loadPost(): void {
    this.postService.getById(this.postId).subscribe({
      next: (post) => {
        console.log('📦 POST COMPLET REÇU DU BACKEND:', post);
        
        this.form = {
          title: post.title,
          content: post.content,
          category: post.category,
          tags: post.tags || []
        };
        
        this.extractFilesFromPost(post);
        this.initialForm = JSON.stringify(this.form);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('❌ Erreur chargement post:', err);
        this.isLoading = false;
        this.errorMessage = 'Impossible de charger le post';
      }
    });
  }

  extractFilesFromPost(post: any): void {
    this.existingImages = [];
    this.existingVideos = [];
    this.existingPdfs = [];
    
    console.log('🔍 Extraction des fichiers du post...');
    
    if (post.attachments && Array.isArray(post.attachments) && post.attachments.length > 0) {
      console.log('📎 Attachments trouvés:', post.attachments.length);
      post.attachments.forEach((att: any) => {
        let fullUrl = att.url;
        if (fullUrl && fullUrl.startsWith('/uploads')) {
          fullUrl = 'http://localhost:8080' + fullUrl;
        }
        
        const fileInfo = {
          id: att.id,
          url: fullUrl,
          name: att.name,
          size: att.size || 0,
          type: att.type,
          category: att.category,
          isExisting: true
        };
        
        if (att.category === 'image' || att.category === 'gif') {
          this.existingImages.push(fileInfo);
        } else if (att.category === 'video') {
          this.existingVideos.push(fileInfo);
        } else if (att.category === 'pdf') {
          this.existingPdfs.push(fileInfo);
        }
      });
    }
    
    console.log('✅ Fichiers extraits:', {
      images: this.existingImages.length,
      videos: this.existingVideos.length,
      pdfs: this.existingPdfs.length
    });
  }

  get postImages(): any[] {
    return [...this.existingImages, ...this.newImages];
  }

  get postVideos(): any[] {
    return [...this.existingVideos, ...this.newVideos];
  }

  get postPdfs(): any[] {
    return [...this.existingPdfs, ...this.newPdfs];
  }

  openFileSelector(): void {
    console.log('🖱️ Ouverture du sélecteur de fichiers');
    if (this.fileInput) {
      this.fileInput.nativeElement.click();
    }
  }

  onFilesSelected(event: any): void {
    const files = Array.from(event.target.files) as File[];
    console.log('📁 Fichiers sélectionnés:', files.length);
    
    if (files.length === 0) return;
    
    files.forEach(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const fileInfo = {
        file: file,
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file),
        category: '',
        isExisting: false
      };
      
      if (ext === 'pdf') {
        fileInfo.category = 'pdf';
        this.newPdfs.push(fileInfo);
        console.log('📄 PDF ajouté:', file.name);
      } 
      else if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext || '')) {
        fileInfo.category = 'video';
        this.newVideos.push(fileInfo);
        console.log('🎬 Vidéo ajoutée:', file.name);
      } 
      else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
        fileInfo.category = 'image';
        this.newImages.push(fileInfo);
        console.log('🖼️ Image ajoutée:', file.name);
      }
    });
    
    event.target.value = '';
  }

  removeFile(type: 'image' | 'video' | 'pdf', index: number): void {
    if (type === 'image') {
      const file = this.postImages[index];
      if (file.isExisting) {
        const existingIndex = this.existingImages.findIndex(f => f.id === file.id);
        if (existingIndex !== -1) {
          this.filesToDelete.push(file);
          this.existingImages.splice(existingIndex, 1);
        }
      } else {
        const newIndex = this.newImages.findIndex(f => f.file === file.file);
        if (newIndex !== -1) {
          URL.revokeObjectURL(this.newImages[newIndex].url);
          this.newImages.splice(newIndex, 1);
        }
      }
    } 
    else if (type === 'video') {
      const file = this.postVideos[index];
      if (file.isExisting) {
        const existingIndex = this.existingVideos.findIndex(f => f.id === file.id);
        if (existingIndex !== -1) {
          this.filesToDelete.push(file);
          this.existingVideos.splice(existingIndex, 1);
        }
      } else {
        const newIndex = this.newVideos.findIndex(f => f.file === file.file);
        if (newIndex !== -1) {
          URL.revokeObjectURL(this.newVideos[newIndex].url);
          this.newVideos.splice(newIndex, 1);
        }
      }
    } 
    else {
      const file = this.postPdfs[index];
      if (file.isExisting) {
        const existingIndex = this.existingPdfs.findIndex(f => f.id === file.id);
        if (existingIndex !== -1) {
          this.filesToDelete.push(file);
          this.existingPdfs.splice(existingIndex, 1);
        }
      } else {
        const newIndex = this.newPdfs.findIndex(f => f.file === file.file);
        if (newIndex !== -1) {
          URL.revokeObjectURL(this.newPdfs[newIndex].url);
          this.newPdfs.splice(newIndex, 1);
        }
      }
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  get hasUnsavedChanges(): boolean {
    const formChanged = JSON.stringify(this.form) !== this.initialForm;
    const hasNewFiles = this.newImages.length > 0 || this.newVideos.length > 0 || this.newPdfs.length > 0;
    const hasFilesToDelete = this.filesToDelete.length > 0;
    return formChanged || hasNewFiles || hasFilesToDelete;
  }

  canDeactivate(): Observable<boolean> | boolean {
    if (!this.hasUnsavedChanges) return true;
    this.deactivateSubject = new Subject<boolean>();
    this.showUnsavedModal = true;
    return this.deactivateSubject.asObservable();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  confirmLeave(): void {
    this.showUnsavedModal = false;
    this.deactivateSubject.next(true);
    this.deactivateSubject.complete();
  }

  stayOnPage(): void {
    this.showUnsavedModal = false;
    this.deactivateSubject.next(false);
    this.deactivateSubject.complete();
  }

  selectCategory(value: string): void {
    this.form.category = value as PostCategory;
    this.validateField('category');
  }

  validateField(field: string): void {
    this.touchedFields[field as keyof typeof this.touchedFields] = true;
  }

  addTag(value: string): void {
    const tag = value.trim().replace(/^#/, '');
    if (tag && !this.form.tags.includes(tag)) {
      this.form.tags.push(tag);
    }
  }

  removeTag(tag: string): void {
    this.form.tags = this.form.tags.filter(t => t !== tag);
  }

  isFieldInvalid(field: string): boolean {
    if (!this.touchedFields[field as keyof typeof this.touchedFields]) return false;
    switch (field) {
      case 'category': return !this.form.category;
      case 'title':    return !this.form.title.trim() || this.form.title.length < 10;
      case 'content':  return !this.form.content.trim() || this.form.content.length < 20;
      default:         return false;
    }
  }

  isFormValid(): boolean {
    return !!(
      this.form.category &&
      this.form.title.trim() &&
      this.form.title.length >= 10 &&
      this.form.content.trim() &&
      this.form.content.length >= 20
    );
  }

  // ✅ Version corrigée - Pas de modal si pas de modifications
  goBack(): void {
    if (!this.hasUnsavedChanges) {
      this.router.navigate(['/forum/post', this.postId]);
    } else {
      this.deactivateSubject = new Subject<boolean>();
      this.showUnsavedModal = true;
      this.deactivateSubject.subscribe(confirmed => {
        if (confirmed) {
          this.router.navigate(['/forum/post', this.postId]);
        }
      });
    }
  }

  submit(): void {
    this.touchedFields = { category: true, title: true, content: true };
    this.errorMessage = '';

    if (!this.isFormValid()) {
      this.errorMessage = 'Veuillez remplir tous les champs correctement.';
      return;
    }

    this.isSubmitting = true;

    if (!this.form.category) {
      this.errorMessage = 'Veuillez sélectionner une catégorie.';
      this.isSubmitting = false;
      return;
    }

    const updateData = {
      title: this.form.title.trim(),
      content: this.form.content.trim(),
      category: this.form.category,
      tags: this.form.tags
    };

    console.log('📤 Envoi des données:', updateData);

    this.postService.update(this.postId, updateData).subscribe({
      next: (response) => {
        console.log('✅ Réponse du serveur:', response);
        console.log('✅ Post texte mis à jour');
        this.handleFiles();
      },
      error: (err: any) => {
        console.error('❌ Erreur mise à jour texte:', err);
        console.error('Détails:', err.error);
        this.errorMessage = `Erreur: ${err.status} - ${err.statusText || 'Erreur lors de la mise à jour'}`;
        this.isSubmitting = false;
      }
    });
  }

  handleFiles(): void {
    if (this.filesToDelete.length > 0) {
      this.deleteFiles(0);
    } 
    else if (this.newImages.length > 0 || this.newVideos.length > 0 || this.newPdfs.length > 0) {
      this.uploadFiles(0);
    } 
    else {
      this.isSubmitting = false;
      this.router.navigate(['/forum/post', this.postId]);
    }
  }

  deleteFiles(index: number): void {
    if (index >= this.filesToDelete.length) {
      if (this.newImages.length > 0 || this.newVideos.length > 0 || this.newPdfs.length > 0) {
        this.uploadFiles(0);
      } else {
        this.isSubmitting = false;
        this.router.navigate(['/forum/post', this.postId]);
      }
      return;
    }

    const file = this.filesToDelete[index];
    this.postService.deleteAttachment(this.postId, file.id).subscribe({
      next: () => {
        console.log(`✅ Fichier supprimé: ${file.name}`);
        this.deleteFiles(index + 1);
      },
      error: (err: any) => {
        console.error(`❌ Erreur suppression fichier: ${file.name}`, err);
        this.errorMessage = `Erreur lors de la suppression de ${file.name}`;
        this.isSubmitting = false;
      }
    });
  }

  uploadFiles(index: number): void {
    const allNewFiles = [...this.newImages, ...this.newVideos, ...this.newPdfs];
    
    if (index >= allNewFiles.length) {
      console.log('✅ Tous les fichiers uploadés');
      this.isSubmitting = false;
      this.router.navigate(['/forum/post', this.postId]);
      return;
    }

    const fileInfo = allNewFiles[index];
    const formData = new FormData();
    formData.append('file', fileInfo.file);
    formData.append('postId', this.postId);
    formData.append('category', fileInfo.category);

    this.postService.uploadAttachment(formData).subscribe({
      next: () => {
        console.log(`✅ Fichier uploadé: ${fileInfo.file.name}`);
        this.uploadFiles(index + 1);
      },
      error: (err: any) => {
        console.error(`❌ Erreur upload: ${fileInfo.file.name}`, err);
        this.errorMessage = `Erreur lors de l'upload de ${fileInfo.file.name}`;
        this.isSubmitting = false;
      }
    });
  }
}