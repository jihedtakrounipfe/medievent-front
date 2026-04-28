import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';

export interface SentimentResult {
  sentiment: 'positif' | 'negatif' | 'neutre';
  score: number;
  confidence: number;
}

export interface AdvancedSentimentResult {
  sentiment: 'positif' | 'negatif' | 'neutre' | 'mixte';
  score: number;
  confidence: number;
  intensity: 'faible' | 'moderee' | 'forte';
  emotion: 'espoir' | 'anxiete' | 'colere' | 'tristesse' | 'calme' | 'mixed';
  urgency: 'faible' | 'moyenne' | 'elevee';
  toxicity: boolean;
  keySignals: string[];
  recommendation: string;
}

export interface SentimentDashboard {
  averageScore: number;
  averageConfidence: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  mixedCount: number;
  urgentCount: number;
  dominantEmotion: string;
}

export interface PostSummary {
  original: string;
  summary: string;
  keyPoints: string[];
  readingTime: number;
}

export interface RelatedPost {
  id: string;
  title: string;
  similarity: number;
}

@Injectable({
  providedIn: 'root'
})
export class AiServiceService {
  
  // Mots positifs et négatifs pour l'analyse de sentiment
  private positiveWords: string[] = [
    'bon', 'bien', 'super', 'excellent', 'parfait', 'utile', 'intéressant', 'merci', 'bravo',
    'génial', 'formidable', 'content', 'heureux', 'satisfait', 'recommandé', 'efficace'
  ];
  
  private negativeWords: string[] = [
    'mauvais', 'mal', 'horrible', 'terrible', 'déçu', 'inutile', 'dangereux', 'erreur', 'problème',
    'difficile', 'grave', 'inquiétant', 'stressant', 'douloureux', 'fatiguant'
  ];

  private positiveIntensifiers: string[] = ['très', 'vraiment', 'super', 'extrêmement', 'tellement'];
  private negativeIntensifiers: string[] = ['pas', 'jamais', 'aucun', 'rien', 'plus', 'sans'];
  private urgentSignals: string[] = ['urgent', 'urgence', 'immédiat', 'immédiatement', 'douleur intense', 'difficulté à respirer', 'saignement', 'fièvre'];
  private anxietySignals: string[] = ['inquiet', 'angoisse', 'angoissé', 'stress', 'peur', 'craint', 'panique'];
  private hopeSignals: string[] = ['merci', 'espoir', 'rassuré', 'amélioration', 'mieux', 'guéri', 'soulagement'];

  constructor(private http: HttpClient) {}

 // ==================== 1. ANALYSE DE SENTIMENT ====================
analyzeSentiment(text: string): SentimentResult {
  console.log('🔍 Texte à analyser:', text);
  
  const lowerText = text.toLowerCase();
  let positiveCount = 0;
  let negativeCount = 0;
  
  // Version simplifiée SANS regex (plus fiable)
  this.positiveWords.forEach(word => {
    if (lowerText.includes(word)) {
      positiveCount++;
      console.log(`✅ Mot positif trouvé: ${word}`);
    }
  });
  
  this.negativeWords.forEach(word => {
    if (lowerText.includes(word)) {
      negativeCount++;
      console.log(`❌ Mot négatif trouvé: ${word}`);
    }
  });
  
  console.log(`📊 Résultat: Positif=${positiveCount}, Négatif=${negativeCount}`);
  
  let sentiment: 'positif' | 'negatif' | 'neutre' = 'neutre';
  let score = 0;
  
  if (positiveCount > negativeCount) {
    sentiment = 'positif';
    score = Math.min(0.95, positiveCount / 5);
    console.log('🎉 Résultat: POSITIF');
  } else if (negativeCount > positiveCount) {
    sentiment = 'negatif';
    score = Math.min(0.95, negativeCount / 5);
    console.log('😞 Résultat: NÉGATIF');
  } else {
    console.log('😐 Résultat: NEUTRE');
  }
  
  return { 
    sentiment, 
    score, 
    confidence: Math.min(0.9, (positiveCount + negativeCount) / 10 + 0.3)
  };
}

  analyzeAdvancedSentiment(text: string): AdvancedSentimentResult {
    const lowerText = this.normalizeText(text);
    const positiveHits = this.countLexiconHits(lowerText, this.positiveWords);
    const negativeHits = this.countLexiconHits(lowerText, this.negativeWords);
    const urgentHits = this.countLexiconHits(lowerText, this.urgentSignals);
    const anxietyHits = this.countLexiconHits(lowerText, this.anxietySignals);
    const hopeHits = this.countLexiconHits(lowerText, this.hopeSignals);

    const exclamationBoost = (text.match(/!/g) || []).length > 0 ? 0.1 : 0;
    const questionBoost = text.includes('?') ? 0.05 : 0;
    const intensifierBoost = this.containsAny(lowerText, this.positiveIntensifiers) || this.containsAny(lowerText, this.negativeIntensifiers) ? 0.1 : 0;

    const rawScore = (positiveHits - negativeHits) + hopeHits * 0.75 - anxietyHits * 0.5;
    const normalizedScore = Math.max(-1, Math.min(1, rawScore / 4 + exclamationBoost - questionBoost));

    let sentiment: 'positif' | 'negatif' | 'neutre' | 'mixte' = 'neutre';
    if (positiveHits > 0 && negativeHits > 0) {
      sentiment = 'mixte';
    } else if (normalizedScore > 0.2) {
      sentiment = 'positif';
    } else if (normalizedScore < -0.2) {
      sentiment = 'negatif';
    }

    const intensityValue = Math.abs(normalizedScore) + intensifierBoost;
    const intensity: 'faible' | 'moderee' | 'forte' = intensityValue > 0.7 ? 'forte' : intensityValue > 0.35 ? 'moderee' : 'faible';

    let emotion: 'espoir' | 'anxiete' | 'colere' | 'tristesse' | 'calme' | 'mixed' = 'calme';
    if (sentiment === 'positif') {
      emotion = hopeHits > 0 ? 'espoir' : 'calme';
    } else if (sentiment === 'negatif') {
      emotion = anxietyHits > 0 ? 'anxiete' : 'tristesse';
      if (this.containsAny(lowerText, ['énervé', 'colère', 'furieux', 'agacé'])) {
        emotion = 'colere';
      }
    } else if (sentiment === 'mixte') {
      emotion = 'mixed';
    }

    const toxicity = this.detectToxicity(text).isToxic;
    const urgencyScore = urgentHits + (normalizedScore < -0.45 ? 1 : 0) + (text.length > 200 ? 0 : 0.2);
    const urgency: 'faible' | 'moyenne' | 'elevee' = urgencyScore >= 2 ? 'elevee' : urgencyScore >= 1 ? 'moyenne' : 'faible';

    const keySignals = this.collectSignals(lowerText, positiveHits, negativeHits, urgentHits, anxietyHits, hopeHits);

    return {
      sentiment,
      score: Number(normalizedScore.toFixed(2)),
      confidence: Number(Math.min(0.98, 0.45 + (positiveHits + negativeHits + urgentHits + anxietyHits + hopeHits) * 0.08).toFixed(2)),
      intensity,
      emotion,
      urgency,
      toxicity,
      keySignals,
      recommendation: this.buildRecommendation(sentiment, urgency, toxicity)
    };
  }
  // ==================== 2. RÉSUMÉ AUTOMATIQUE ====================
  summarizeText(text: string, maxLength: number = 200): PostSummary {
    // Nettoyer le texte
    const cleanText = text.replace(/\s+/g, ' ').trim();
    const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
    
    // Calculer le score pour chaque phrase
    const sentenceScores = sentences.map(sentence => {
      let score = 0;
      // Les phrases plus longues ont plus de poids
      score += sentence.length / cleanText.length;
      // Mots importants
      const importantWords = ['important', 'attention', 'danger', 'urgent', 'conseil', 'recommandation'];
      importantWords.forEach(word => {
        if (sentence.toLowerCase().includes(word)) score += 0.2;
      });
      return { sentence, score };
    });
    
    // Trier par score et prendre les meilleures phrases
    const sorted = [...sentenceScores].sort((a, b) => b.score - a.score);
    let summary = '';
    let currentLength = 0;
    
    for (const item of sorted) {
      if (currentLength + item.sentence.length <= maxLength) {
        summary += item.sentence + ' ';
        currentLength += item.sentence.length;
      } else {
        break;
      }
    }
    
    // Si le résumé est vide, prendre le début
    if (!summary.trim()) {
      summary = cleanText.substring(0, maxLength) + '...';
    }
    
    // Extraire les points clés
    const keyPoints = this.extractKeyPoints(cleanText);
    
    return {
      original: cleanText,
      summary: summary.trim(),
      keyPoints: keyPoints.slice(0, 3),
      readingTime: Math.ceil(cleanText.length / 500)
    };
  }

  private extractKeyPoints(text: string): string[] {
    const points: string[] = [];
    const sentences = text.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if ((lowerSentence.includes('conseil') || 
           lowerSentence.includes('important') || 
           lowerSentence.includes('attention') ||
           lowerSentence.includes('recommandation')) && 
          sentence.length > 20 && sentence.length < 150) {
        points.push(sentence.trim());
      }
    }
    
    if (points.length === 0 && sentences.length > 0) {
      points.push(sentences[0].trim().substring(0, 100));
    }
    
    return points;
  }

  // ==================== 3. RECOMMANDATION DE POSTS SIMILAIRES ====================
  findSimilarPosts(currentPost: any, allPosts: any[], limit: number = 3): RelatedPost[] {
    const currentKeywords = this.extractKeywords(currentPost.title + ' ' + currentPost.content);
    const similarities: RelatedPost[] = [];
    
    for (const post of allPosts) {
      if (post.id === currentPost.id) continue;
      
      const postKeywords = this.extractKeywords(post.title + ' ' + post.content);
      const similarity = this.calculateSimilarity(currentKeywords, postKeywords);
      
      if (similarity > 0.1) {
        similarities.push({
          id: post.id,
          title: post.title,
          similarity: Math.round(similarity * 100)
        });
      }
    }
    
    return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
  }

  private extractKeywords(text: string): Set<string> {
    const stopWords = ['le', 'la', 'les', 'un', 'une', 'des', 'et', 'ou', 'mais', 'donc', 'car', 
                       'pour', 'dans', 'avec', 'sans', 'par', 'sur', 'sous', 'chez', 'entre',
                       'est', 'sont', 'a', 'ont', 'ce', 'cet', 'cette', 'ces'];
    
    const words = text.toLowerCase().split(/\s+/);
    const keywords = new Set<string>();
    
    for (const word of words) {
      if (word.length > 3 && !stopWords.includes(word)) {
        keywords.add(word);
      }
    }
    
    return keywords;
  }

  private calculateSimilarity(set1: Set<string>, set2: Set<string>): number {
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
  }

  // ==================== 4. ASSISTANT RÉDACTION ====================
  improveWriting(text: string): { original: string; improved: string; suggestions: string[] } {
    let improved = text;
    const suggestions: string[] = [];
    
    // Vérifier la longueur
    if (text.length < 50) {
      suggestions.push('Ajoutez plus de détails pour mieux expliquer votre situation');
    }
    
    // Vérifier les fautes courantes
    const commonMistakes = [
      { wrong: 'se que', correct: 'ce que', suggestion: 'Utilisez "ce que" au lieu de "se que"' },
      { wrong: 'savoir', correct: 'savez-vous', suggestion: 'Pour une question, utilisez "savez-vous"' }
    ];
    
    for (const mistake of commonMistakes) {
      if (text.toLowerCase().includes(mistake.wrong)) {
        improved = improved.replace(new RegExp(mistake.wrong, 'gi'), mistake.correct);
        suggestions.push(mistake.suggestion);
      }
    }
    
    // Suggestions de structure
    if (!text.includes('?') && !text.includes('merci')) {
      suggestions.push('Posez une question claire pour obtenir des réponses pertinentes');
    }
    
    if (!text.toLowerCase().includes('merci')) {
      suggestions.push('N\'oubliez pas de remercier ceux qui vous aideront');
    }
    
    return {
      original: text,
      improved: improved !== text ? improved : text,
      suggestions: suggestions.slice(0, 3)
    };
  }

  // ==================== 5. DÉTECTION DE TOXICITÉ (complément) ====================
  detectToxicity(text: string): { isToxic: boolean; reasons: string[] } {
    const toxicWords = ['idiot', 'stupide', 'con', 'connard', 'merde', 'pute', 'salope'];
    const toxicPhrases = ['ta gueule', 'ferme la', 't\'es nul'];
    
    const lowerText = text.toLowerCase();
    const reasons: string[] = [];
    
    for (const word of toxicWords) {
      if (lowerText.includes(word)) {
        reasons.push(`Contient le mot inapproprié : "${word}"`);
      }
    }
    
    for (const phrase of toxicPhrases) {
      if (lowerText.includes(phrase)) {
        reasons.push(`Contient la phrase : "${phrase}"`);
      }
    }
    
    return {
      isToxic: reasons.length > 0,
      reasons: reasons
    };
  }

  buildSentimentDashboard(results: AdvancedSentimentResult[]): SentimentDashboard {
    const totals = results.reduce((acc, result) => {
      acc.sumScore += result.score;
      acc.sumConfidence += result.confidence;

      if (result.sentiment === 'positif') acc.positiveCount += 1;
      if (result.sentiment === 'neutre') acc.neutralCount += 1;
      if (result.sentiment === 'negatif') acc.negativeCount += 1;
      if (result.sentiment === 'mixte') acc.mixedCount += 1;

      if (result.urgency === 'elevee') {
        acc.urgentCount += 1;
      }

      acc.emotions[result.emotion] = (acc.emotions[result.emotion] || 0) + 1;
      return acc;
    }, {
      sumScore: 0,
      sumConfidence: 0,
      positiveCount: 0,
      neutralCount: 0,
      negativeCount: 0,
      mixedCount: 0,
      urgentCount: 0,
      emotions: {} as Record<string, number>
    });

    const dominantEmotion = Object.entries(totals.emotions).sort((a, b) => b[1] - a[1])[0]?.[0] || 'calme';

    return {
      averageScore: results.length ? Number((totals.sumScore / results.length).toFixed(2)) : 0,
      averageConfidence: results.length ? Number((totals.sumConfidence / results.length).toFixed(2)) : 0,
      positiveCount: totals.positiveCount,
      neutralCount: totals.neutralCount,
      negativeCount: totals.negativeCount,
      mixedCount: totals.mixedCount,
      urgentCount: totals.urgentCount,
      dominantEmotion
    };
  }

  private normalizeText(text: string): string {
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  private countLexiconHits(text: string, lexicon: string[]): number {
    return lexicon.reduce((count, word) => count + (text.includes(this.normalizeText(word)) ? 1 : 0), 0);
  }

  private containsAny(text: string, words: string[]): boolean {
    return words.some(word => text.includes(this.normalizeText(word)));
  }

  private collectSignals(
    text: string,
    positiveHits: number,
    negativeHits: number,
    urgentHits: number,
    anxietyHits: number,
    hopeHits: number
  ): string[] {
    const signals: string[] = [];

    if (positiveHits > 0) signals.push('Tonalité favorable');
    if (negativeHits > 0) signals.push('Tonalité préoccupante');
    if (urgentHits > 0) signals.push('Signal d\'urgence');
    if (anxietyHits > 0) signals.push('Indice d\'anxiété');
    if (hopeHits > 0) signals.push('Signal d\'espoir');
    if (text.includes('?')) signals.push('Forme interrogative');
    if ((text.match(/!/g) || []).length > 0) signals.push('Intensité émotionnelle');

    return signals.slice(0, 4);
  }

  private buildRecommendation(sentiment: 'positif' | 'negatif' | 'neutre' | 'mixte', urgency: 'faible' | 'moyenne' | 'elevee', toxicity: boolean): string {
    if (toxicity) {
      return 'Modérez le ton et recentrez la discussion sur des faits ou des besoins précis.';
    }

    if (urgency === 'elevee') {
      return 'Le contenu semble urgent. Une réponse rapide ou un avis médical direct est recommandé.';
    }

    if (sentiment === 'negatif') {
      return 'Le message exprime une difficulté. Reformuler le contexte et préciser les symptômes aidera à obtenir une meilleure réponse.';
    }

    if (sentiment === 'positif') {
      return 'Le message est constructif. Ajoutez si besoin des détails médicaux utiles pour guider les réponses.';
    }

    return 'Le ton est équilibré. Quelques détails supplémentaires pourraient enrichir l’analyse.';
  }
}