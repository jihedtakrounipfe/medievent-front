import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';

export interface DrugInfo {
  name: string;
  activeIngredient: string;
  purpose: string;
  indications: string[];
  warnings: string[];
  dosage: string;
  manufacturer: string;
  imageUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OpenFdaService {
  private baseUrl = 'https://api.fda.gov/drug/label.json';
  private imageBaseUrl = 'https://www.fda.gov/files';

  constructor(private http: HttpClient) {}

  // Rechercher un médicament par nom
  searchDrug(drugName: string): Observable<DrugInfo[]> {
    const params = new HttpParams()
      .set('search', `openfda.brand_name:"${drugName}" OR openfda.generic_name:"${drugName}"`)
      .set('limit', '5');

    return this.http.get<any>(this.baseUrl, { params })
      .pipe(
        timeout(10000),
        map(response => this.extractDrugInfo(response)),
        catchError(error => {
          console.error('Erreur API OpenFDA:', error);
          return of([]);
        })
      );
  }

  // Rechercher par mot-clé (symptôme, maladie)
  searchByKeyword(keyword: string): Observable<DrugInfo[]> {
    const params = new HttpParams()
      .set('search', `indications_and_usage:"${keyword}"`)
      .set('limit', '10');

    return this.http.get<any>(this.baseUrl, { params })
      .pipe(
        timeout(10000),
        map(response => this.extractDrugInfo(response)),
        catchError(error => {
          console.error('Erreur API OpenFDA:', error);
          return of([]);
        })
      );
  }

  // Extraire les informations pertinentes
  private extractDrugInfo(response: any): DrugInfo[] {
    if (!response.results || response.results.length === 0) {
      return [];
    }

    return response.results.map((result: any) => ({
      name: result.openfda?.brand_name?.[0] || result.openfda?.generic_name?.[0] || 'Nom inconnu',
      activeIngredient: result.active_ingredient?.[0] || 'Non spécifié',
      purpose: result.purpose?.[0] || 'Non spécifié',
      indications: result.indications_and_usage || [],
      warnings: result.warnings || [],
      dosage: result.dosage_and_administration?.[0] || 'Consulter votre médecin',
      manufacturer: result.openfda?.manufacturer_name?.[0] || 'Fabricant inconnu'
    }));
  }

  // Vérifier si un médicament existe
  checkDrugExists(drugName: string): Observable<boolean> {
    const params = new HttpParams()
      .set('search', `openfda.brand_name:"${drugName}"`)
      .set('limit', '1');

    return this.http.get<any>(this.baseUrl, { params })
      .pipe(
        map(response => response.results && response.results.length > 0),
        catchError(() => of(false))
      );
  }
}