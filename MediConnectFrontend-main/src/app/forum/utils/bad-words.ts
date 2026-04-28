// src/app/forum/utils/bad-words.ts

export const BAD_WORDS: string[] = [
  // Insultes courantes (pour tester facilement)
  'merde',
  'putain', 
  'connard',
  'connasse',
  'idiot',
  'imbécile',
  'crétin',
  'abruti',
  'con',
  'conne',
  'stupide',
  'sale',
  'gros',
  
  // Mots vulgaires
  'fuck',
  'shit',
  'bitch',
  'salope',
  'enculé',
  'nique',
  'bite',
  'pute',
  'batard',
  'salopard',
  'enfoiré',
  
  // Violence
  'mort',
  'tuer',
  'viol',
  'arme',
  'attentat',
  
  // Drogue
  'drogue',
  'cocaïne',
  'héroïne',
  
  // Abréviations
  'fdp',
  'pd',
  'ntm'
];

export function containsBadWords(text: string): boolean {
  const lowerText = text.toLowerCase();
  return BAD_WORDS.some(word => lowerText.includes(word));
}

export function getBadWordsFound(text: string): string[] {
  const lowerText = text.toLowerCase();
  return BAD_WORDS.filter(word => lowerText.includes(word));
}

export function censorBadWords(text: string): string {
  let result = text;
  BAD_WORDS.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    result = result.replace(regex, '*'.repeat(word.length));
  });
  return result;
}