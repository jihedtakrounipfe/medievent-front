import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of, BehaviorSubject } from 'rxjs';
import { map, catchError, timeout, shareReplay, tap } from 'rxjs/operators';

export type Language = 'fr' | 'en' | 'ar';

interface TranslationCache {
  [key: string]: {
    text: string;
    timestamp: number;
  };
}

interface TranslationProgress {
  current: number;
  total: number;
  status: 'idle' | 'translating' | 'completed' | 'error';
}

@Injectable({ providedIn: 'root' })
export class TranslateService {

  // MyMemory API (gratuit, sans clé)
  private readonly MYMEMORY_API = 'https://api.mymemory.translated.net/get';
  
  // Cache pour éviter les appels répétés
  private cache: TranslationCache = {};
  private cacheExpiry = 3600000; // 1 heure
  
  // Suivi de la progression
  private progressSubject = new BehaviorSubject<TranslationProgress>({
    current: 0,
    total: 0,
    status: 'idle'
  });
  progress$ = this.progressSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadCache();
    console.log('🌐 Service de traduction initialisé (MyMemory)');
  }

  // ==================== MÉTHODES PUBLIQUES ====================

  // Traduction d'un texte unique
  translate(text: string, targetLang: Language, sourceLang: Language = 'fr'): Observable<string> {
    if (targetLang === 'fr' || !text?.trim()) {
      return of(text);
    }
    
    const cacheKey = this.getCacheKey(text, targetLang);
    
    // Vérifier le cache
    if (this.isCacheValid(cacheKey)) {
      return of(this.cache[cacheKey].text);
    }
    
    return from(this.translateWithMyMemory(text, targetLang, sourceLang)).pipe(
      tap(translated => this.updateCache(cacheKey, translated)),
      catchError(() => of(text))
    );
  }

  // Traduction batch avec progression
  translatePosts(posts: any[], targetLang: Language, sourceLang: Language = 'fr'): Observable<any[]> {
    if (!posts?.length) return of([]);
    if (targetLang === 'fr') return of(posts);
    
    // Réinitialiser la progression
    this.progressSubject.next({
      current: 0,
      total: posts.length,
      status: 'translating'
    });
    
    return from(this.translatePostsBatch(posts, targetLang, sourceLang)).pipe(
      tap(() => {
        this.progressSubject.next({
          current: posts.length,
          total: posts.length,
          status: 'completed'
        });
        setTimeout(() => {
          this.progressSubject.next({
            current: 0,
            total: 0,
            status: 'idle'
          });
        }, 2000);
      }),
      catchError(error => {
        console.error('❌ Erreur traduction batch:', error);
        this.progressSubject.next({
          current: 0,
          total: posts.length,
          status: 'error'
        });
        return of(posts);
      }),
      shareReplay(1)
    );
  }

  // Traduction d'un seul post
  translatePost(post: any, targetLang: Language, sourceLang: Language = 'fr'): Observable<any> {
    if (targetLang === 'fr') return of(post);
    
    return from(
      Promise.all([
        this.translateWithMyMemory(post.title || '', targetLang, sourceLang),
        this.translateWithMyMemory((post.content || '').substring(0, 1000), targetLang, sourceLang)
      ]).then(([translatedTitle, translatedContent]) => ({
        ...post,
        translatedTitle,
        translatedContent,
        language: targetLang
      }))
    ).pipe(
      catchError(() => of(post))
    );
  }

  // Traduction avec fallback local (dictionnaire médical)
  translateMedical(text: string, targetLang: Language): Observable<string> {
    if (targetLang === 'fr') return of(text);
    
    // Dictionnaire médical pour fallback rapide
    const medicalTerms: Record<string, Record<Language, string>> = {
      'diabète': { fr: 'diabète', en: 'diabetes', ar: 'السكري' },
      'symptômes': { fr: 'symptômes', en: 'symptoms', ar: 'الأعراض' },
      'traitement': { fr: 'traitement', en: 'treatment', ar: 'العلاج' },
      'médecin': { fr: 'médecin', en: 'doctor', ar: 'طبيب' },
      'consultation': { fr: 'consultation', en: 'consultation', ar: 'استشارة' },
      'urgence': { fr: 'urgence', en: 'emergency', ar: 'طوارئ' },
      'médicament': { fr: 'médicament', en: 'medication', ar: 'دواء' },
      'douleur': { fr: 'douleur', en: 'pain', ar: 'ألم' },
      'fièvre': { fr: 'fièvre', en: 'fever', ar: 'حمى' },
      'fatigue': { fr: 'fatigue', en: 'fatigue', ar: 'تعب' },
      'infection': { fr: 'infection', en: 'infection', ar: 'عدوى' },
      'inflammation': { fr: 'inflammation', en: 'inflammation', ar: 'التهاب' },
      'chronique': { fr: 'chronique', en: 'chronic', ar: 'مزمن' },
      'aigu': { fr: 'aigu', en: 'acute', ar: 'حاد' },
      'allergie': { fr: 'allergie', en: 'allergy', ar: 'حساسية' },
      'vaccin': { fr: 'vaccin', en: 'vaccine', ar: 'لقاح' },
      'prévention': { fr: 'prévention', en: 'prevention', ar: 'وقاية' },
      'dépistage': { fr: 'dépistage', en: 'screening', ar: 'فحص' }
    };
    
    let result = text;
    for (const [fr, translations] of Object.entries(medicalTerms)) {
      if (text.toLowerCase().includes(fr.toLowerCase())) {
        const regex = new RegExp(fr, 'gi');
        result = result.replace(regex, translations[targetLang] || fr);
      }
    }
    
    return this.translate(result, targetLang);
  }

  // Vider le cache
  clearCache(): void {
    this.cache = {};
    this.saveCache();
    console.log('🧹 Cache de traduction vidé');
  }

  // Obtenir les statistiques du cache
  getCacheStats(): { size: number; keys: string[] } {
    const keys = Object.keys(this.cache);
    return { size: keys.length, keys };
  }

  // Vérifier le statut de l'API
  checkApiStatus(): Observable<boolean> {
    return from(
      this.http.get<any>(`${this.MYMEMORY_API}?q=test&langpair=fr|en`).toPromise()
        .then(response => response?.responseStatus === 200)
        .catch(() => false)
    );
  }

  // ==================== MÉTHODES PRIVÉES ====================

  private async translateWithMyMemory(
    text: string, 
    targetLang: Language, 
    sourceLang: Language = 'fr'
  ): Promise<string> {
    if (!text?.trim()) return text;
    if (targetLang === 'fr') return text;
    
    const langPair = `${sourceLang}|${targetLang}`;
    const url = `${this.MYMEMORY_API}?q=${encodeURIComponent(text)}&langpair=${langPair}`;

    try {
      const response = await this.http.get<any>(url).pipe(
        timeout(10000),
        catchError(() => of(null))
      ).toPromise();
      
      if (response?.responseStatus === 200 && response?.responseData?.translatedText) {
        let translated = response.responseData.translatedText;
        // Nettoyer le résultat (supprimer les balises HTML)
        translated = translated.replace(/<[^>]*>/g, '');
        return translated !== text ? translated : text;
      }
      return text;
    } catch (error) {
      console.error('❌ Erreur API MyMemory:', error);
      return text;
    }
  }

  private async translatePostsBatch(
    posts: any[], 
    targetLang: Language, 
    sourceLang: Language
  ): Promise<any[]> {
    if (!posts.length) return [];
    
    const results = posts.map(p => ({ ...p }));
    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
    
    for (let i = 0; i < posts.length; i++) {
      try {
        // Vérifier le cache pour chaque traduction
        const titleCacheKey = this.getCacheKey(posts[i].title || '', targetLang);
        const contentCacheKey = this.getCacheKey((posts[i].content || '').substring(0, 1000), targetLang);
        
        let translatedTitle: string;
        let translatedContent: string;
        
        // Utiliser le cache si disponible
        if (this.isCacheValid(titleCacheKey)) {
          translatedTitle = this.cache[titleCacheKey].text;
        } else {
          translatedTitle = await this.translateWithMyMemory(posts[i].title || '', targetLang, sourceLang);
          this.updateCache(titleCacheKey, translatedTitle);
        }
        
        if (this.isCacheValid(contentCacheKey)) {
          translatedContent = this.cache[contentCacheKey].text;
        } else {
          translatedContent = await this.translateWithMyMemory(
            (posts[i].content || '').substring(0, 1000), 
            targetLang, 
            sourceLang
          );
          this.updateCache(contentCacheKey, translatedContent);
        }
        
        results[i].translatedTitle = translatedTitle;
        results[i].translatedContent = translatedContent;
        results[i].language = targetLang;
        
        // Mettre à jour la progression
        this.progressSubject.next({
          current: i + 1,
          total: posts.length,
          status: 'translating'
        });
        
        // Délai pour éviter le rate-limit
        if (i < posts.length - 1) await delay(150);
        
      } catch (error) {
        console.error(`❌ Erreur traduction post ${i}:`, error);
        results[i].translatedTitle = posts[i].title;
        results[i].translatedContent = posts[i].content;
      }
    }
    
    this.saveCache();
    return results;
  }

  private getCacheKey(text: string, targetLang: Language): string {
    return `${text}_${targetLang}`;
  }

  private isCacheValid(key: string): boolean {
    return this.cache[key] && (Date.now() - this.cache[key].timestamp) < this.cacheExpiry;
  }

  private updateCache(key: string, text: string): void {
    this.cache[key] = {
      text,
      timestamp: Date.now()
    };
    this.saveCache();
  }

  private loadCache(): void {
    try {
      const savedCache = localStorage.getItem('translation_cache');
      if (savedCache) {
        const parsed = JSON.parse(savedCache);
        const now = Date.now();
        
        // Nettoyer les entrées expirées
        Object.keys(parsed).forEach(key => {
          if (now - parsed[key].timestamp < this.cacheExpiry) {
            this.cache[key] = parsed[key];
          }
        });
        
        console.log(`📦 Cache chargé: ${Object.keys(this.cache).length} entrées`);
      }
    } catch (e) {
      console.error('Erreur chargement cache:', e);
    }
  }

  private saveCache(): void {
    try {
      localStorage.setItem('translation_cache', JSON.stringify(this.cache));
    } catch (e) {
      console.error('Erreur sauvegarde cache:', e);
    }
  }
}