import { Pipe, PipeTransform } from '@angular/core';
import { formatDate } from '@angular/common';

@Pipe({
  name: 'safeDate'
})
export class SafeDatePipe implements PipeTransform {
  transform(value: any, format: string = 'mediumDate', timezone?: string, locale?: string): string {
    try {
      if (!value) {
        return ''; // Retourner vide si pas de date
      }

      const date = new Date(value);
      
      // Vérifier si la date est valide
      if (isNaN(date.getTime())) {
        console.warn(`⚠️ Date invalide: ${value}`);
        return '--'; // Retourner un placeholder si impossible à parser
      }

      return formatDate(date, format, locale || 'fr-FR', timezone);
    } catch (error) {
      console.error('❌ Erreur SafeDatePipe:', error);
      return '--'; // Retourner un placeholder en cas d'erreur
    }
  }
}
