import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';

export interface MedicalQuote {
  text: string;
  author: string;
  category?: string;
}

export interface MedicalJoke {
  text: string;
  category?: string;
  type?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MedicalQuoteService {
  
  // Citations médicales (fallback local si API indisponible)
  private fallbackQuotes: MedicalQuote[] = [
    { text: "La santé est un état de complet bien-être physique, mental et social.", author: "OMS" },
    { text: "Le meilleur médecin est celui qui rend le patient acteur de sa santé.", author: "Dr Philippe Roure" },
    { text: "La médecine est l'art d'accompagner le corps vers son propre équilibre.", author: "Hippocrate" },
    { text: "Prendre soin de sa santé, c'est s'aimer soi-même.", author: "Proverbe" },
    { text: "Une once de prévention vaut une livre de soins.", author: "Benjamin Franklin" },
    { text: "Le sommeil est le meilleur médicament.", author: "Proverbe" },
    { text: "L'hydratation est la clé d'une bonne santé.", author: "Conseil médical" },
    { text: "Le rire est un puissant anti-inflammatoire naturel.", author: "Science" }
  ];

  // Blagues médicales (fallback local)
  private fallbackJokes: MedicalJoke[] = [
    { text: "Pourquoi les médecins sont-ils mauvais en dessin ? Parce qu'ils font toujours des ordonnances illisibles !" },
    { text: "Que dit un médecin à un patient qui lui demande s'il peut courir un marathon ? - Bien sûr, j'ai des médicaments pour tout !" },
    { text: "Pourquoi les infirmières sont-elles toujours calmes ? Parce qu'elles ont des nerfs d'acier !" },
    { text: "Quel est le comble pour un médecin ? De ne pas trouver le remède à sa propre fatigue !" },
    { text: "Pourquoi les dentistes sont-ils de bons boxeurs ? Parce qu'ils savent bien donner des coups de mâchoire !" }
  ];

  constructor(private http: HttpClient) {}

  // Récupérer une citation médicale aléatoire
  getRandomQuote(): Observable<MedicalQuote> {
    // API gratuite sans clé (API Ninjas Quotes)
    return this.http.get<any>('https://api.api-ninjas.com/v1/quotes?category=health')
      .pipe(
        timeout(5000),
        map(response => {
          if (response && response.length > 0) {
            return {
              text: response[0].quote,
              author: response[0].author,
              category: response[0].category
            };
          }
          return this.getRandomFallbackQuote();
        }),
        catchError(() => {
          console.log('Utilisation des citations locales');
          return of(this.getRandomFallbackQuote());
        })
      );
  }

  // Récupérer une blague médicale aléatoire
  getRandomJoke(): Observable<MedicalJoke> {
    // API gratuite (JokeAPI)
    return this.http.get<any>('https://v2.jokeapi.dev/joke/Any?contains=medical&type=twopart')
      .pipe(
        timeout(5000),
        map(response => {
          if (response && response.joke) {
            return { text: response.joke };
          } else if (response && response.setup && response.delivery) {
            return { text: `${response.setup} ${response.delivery}` };
          }
          return this.getRandomFallbackJoke();
        }),
        catchError(() => {
          console.log('Utilisation des blagues locales');
          return of(this.getRandomFallbackJoke());
        })
      );
  }

  private getRandomFallbackQuote(): MedicalQuote {
    const randomIndex = Math.floor(Math.random() * this.fallbackQuotes.length);
    return this.fallbackQuotes[randomIndex];
  }

  private getRandomFallbackJoke(): MedicalJoke {
    const randomIndex = Math.floor(Math.random() * this.fallbackJokes.length);
    return this.fallbackJokes[randomIndex];
  }
}