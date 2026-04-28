import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AiContentService {

  constructor() {
    console.log('🤖 AI Service initialisé (Mode Fallback uniquement)');
  }

  // ===== GÉNÉRATION DE CONTENU - Fallback uniquement =====
  generateContent(title: string, category: string): Observable<string> {
    console.log('📝 Génération de contenu via fallback local');
    return of(this.generateFallback(title, category));
  }

  // ===== AMÉLIORATION DE CONTENU - Amélioration simple =====
  improveContent(content: string, category: string): Observable<string> {
    console.log('🪄 Amélioration simple du contenu');
    return of(this.simpleImprove(content));
  }

  // Amélioration simple sans IA
  private simpleImprove(content: string): string {
    let improved = content;
    
    // Ajoute des émoticônes si manquantes
    if (!improved.includes('📌') && !improved.includes('💡') && !improved.includes('⚠️')) {
      improved = '📌 ' + improved;
    }
    
    // Structure en paragraphes
    if (improved.length > 300 && !improved.includes('\n\n')) {
      const midPoint = Math.floor(improved.length / 2);
      const firstBreak = improved.indexOf('. ', midPoint);
      if (firstBreak > 0) {
        improved = improved.substring(0, firstBreak + 1) + '\n\n' + improved.substring(firstBreak + 2);
      }
    }
    
    // Met la première lettre en majuscule
    if (improved.length > 0) {
      improved = improved.charAt(0).toUpperCase() + improved.slice(1);
    }
    
    return improved;
  }

  // ===== FALLBACK LOCAL =====
  private generateFallback(title: string, category: string): string {
    const topic = title.substring(0, 50);

    const fallbacks: Record<string, string> = {
      'QUESTION': `Je me pose des questions concernant "${topic}".\n\n` +
        `Pourriez-vous m'aider à comprendre les aspects importants de ce sujet ?\n\n` +
        `Quels signes doivent alerter et quand est-il conseillé de consulter un médecin ?`,

      'ADVICE': `Voici quelques conseils concernant "${topic}" :\n\n` +
        `1. Informez-vous auprès de sources fiables (HAS, OMS)\n` +
        `2. Consultez un professionnel de santé pour un avis personnalisé\n` +
        `3. Adoptez une routine adaptée à votre situation\n\n` +
        `⚠️ N'hésitez pas à demander un second avis si nécessaire.`,

      'AWARENESS': `📢 Il est important de parler de "${topic}".\n\n` +
        `Cette thématique concerne de nombreuses personnes et un diagnostic précoce peut faire toute la différence.\n\n` +
        `🎯 Partagez cette information autour de vous et consultez régulièrement un professionnel de santé.`,

      'DOCUMENT': `Je partage cette ressource concernant "${topic}".\n\n` +
        `Ce document contient des informations essentielles et des recommandations pratiques.\n\n` +
        `N'hésitez pas à poser vos questions en commentaire.`
    };

    return fallbacks[category] || fallbacks['QUESTION'];
  }
}