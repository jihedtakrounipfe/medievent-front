import { Pipe, PipeTransform } from '@angular/core';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

@Pipe({
  name: 'marked',
  standalone: true
})
export class MarkedPipe implements PipeTransform {
  
  constructor() {
    // Configuration de marked - Version compatible
    marked.setOptions({
      gfm: true,
      breaks: true,
      pedantic: false,
      smartLists: true,
      smartypants: true
    } as any); // Utilisation de 'as any' pour éviter les erreurs de type
  }

  transform(value: string): string {
    if (!value) return '';
    
    try {
      const html = marked.parse(value) as string;
      const cleanHtml = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
          'b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'ol', 'li',
          'br', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'code', 'pre', 'blockquote', 'hr'
        ],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
      });
      
      return cleanHtml;
    } catch (error) {
      console.error('Erreur de parsing markdown:', error);
      return value;
    }
  }
}