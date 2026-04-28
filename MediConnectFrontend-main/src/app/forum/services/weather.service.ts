import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';

export interface WeatherData {
  city: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  description: string;
  icon: string;
  windSpeed: number;
  advice: string;
}

@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  
  private apiUrl = 'https://api.open-meteo.com/v1/forecast';
  
  private defaultCity = 'Paris';
  private defaultLat = 48.8566;
  private defaultLon = 2.3522;

  constructor(private http: HttpClient) {}

  // ✅ VERSION SIMPLIFIÉE - Pas de géocodage, utiliser directement les coordonnées
  getWeatherByCity(city: string): Observable<WeatherData | null> {
    // Convertir le nom de ville en coordonnées approximatives
    const coords = this.getCityCoordinates(city);
    return this.getWeatherData(coords.lat, coords.lon, coords.name);
  }

  // Coordonnées des villes françaises
  private getCityCoordinates(city: string): { lat: number; lon: number; name: string } {
    const cities: Record<string, { lat: number; lon: number }> = {
      'paris': { lat: 48.8566, lon: 2.3522 },
      'lyon': { lat: 45.7640, lon: 4.8357 },
      'marseille': { lat: 43.2965, lon: 5.3698 },
      'bordeaux': { lat: 44.8378, lon: -0.5792 },
      'lille': { lat: 50.6292, lon: 3.0573 },
      'nice': { lat: 43.7102, lon: 7.2620 },
      'toulouse': { lat: 43.6047, lon: 1.4442 },
      'nantes': { lat: 47.2184, lon: -1.5536 },
      'strasbourg': { lat: 48.5734, lon: 7.7521 },
      'montpellier': { lat: 43.6108, lon: 3.8767 }
    };
    
    const key = city.toLowerCase();
    if (cities[key]) {
      return { lat: cities[key].lat, lon: cities[key].lon, name: city };
    }
    return { lat: this.defaultLat, lon: this.defaultLon, name: this.defaultCity };
  }

  // Obtenir les données météo
  private getWeatherData(lat: number, lon: number, cityName: string): Observable<WeatherData> {
    const params = new HttpParams()
      .set('latitude', lat.toString())
      .set('longitude', lon.toString())
      .set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m')
      .set('timezone', 'Europe/Paris');

    return this.http.get<any>(this.apiUrl, { params })
      .pipe(
        timeout(5000),
        map(response => this.extractWeatherData(response, cityName)),
        catchError(() => of(this.getFallbackWeather(cityName)))
      );
  }

  // Extraire les données météo
  private extractWeatherData(data: any, cityName: string): WeatherData {
    const current = data.current;
    const weatherCode = current.weather_code;
    
    const weatherInfo = this.getWeatherDescription(weatherCode);
    const advice = this.generateAdvice(current.temperature_2m, weatherCode);
    
    return {
      city: cityName,
      temperature: Math.round(current.temperature_2m),
      feelsLike: Math.round(current.apparent_temperature),
      humidity: current.relative_humidity_2m,
      description: weatherInfo.description,
      icon: weatherInfo.icon,
      windSpeed: current.wind_speed_10m,
      advice: advice
    };
  }

  // Traduire le code météo
  private getWeatherDescription(code: number): { description: string; icon: string } {
    const weatherMap: Record<number, { description: string; icon: string }> = {
      0: { description: 'Ciel dégagé', icon: '☀️' },
      1: { description: 'Principalement dégagé', icon: '🌤️' },
      2: { description: 'Partiellement nuageux', icon: '⛅' },
      3: { description: 'Nuageux', icon: '☁️' },
      45: { description: 'Brouillard', icon: '🌫️' },
      48: { description: 'Brouillard givrant', icon: '🌫️' },
      51: { description: 'Bruine légère', icon: '🌧️' },
      53: { description: 'Bruine modérée', icon: '🌧️' },
      55: { description: 'Bruine dense', icon: '🌧️' },
      61: { description: 'Pluie légère', icon: '🌧️' },
      63: { description: 'Pluie modérée', icon: '🌧️' },
      65: { description: 'Pluie forte', icon: '🌧️' },
      71: { description: 'Neige légère', icon: '❄️' },
      73: { description: 'Neige modérée', icon: '❄️' },
      75: { description: 'Neige forte', icon: '❄️' },
      80: { description: 'Averses légères', icon: '🌦️' },
      81: { description: 'Averses modérées', icon: '🌦️' },
      82: { description: 'Averses violentes', icon: '🌧️' },
      95: { description: 'Orage', icon: '⛈️' }
    };
    
    return weatherMap[code] || { description: 'Météo variable', icon: '🌥️' };
  }

  // Générer un conseil personnalisé
  private generateAdvice(temp: number, weatherCode: number): string {
    if (temp > 30) {
      return '🌡️ Forte chaleur ! Restez hydraté, évitez le soleil entre 12h-16h.';
    } else if (temp > 25) {
      return '☀️ Il fait chaud. Pensez à boire de l\'eau.';
    } else if (temp < 5) {
      return '❄️ Il fait froid ! Couvrez-vous bien.';
    } else if (temp < 10) {
      return '🍂 Il fait frais. Une petite veste est recommandée.';
    }
    
    if (weatherCode === 95) {
      return '⚡ Orage ! Restez à l\'abri.';
    } else if ([61, 63, 65, 80, 81, 82].includes(weatherCode)) {
      return '☔ Pluie annoncée. Pensez au parapluie.';
    } else if ([71, 73, 75].includes(weatherCode)) {
      return '❄️ Neige annoncée ! Attention aux déplacements.';
    }
    
    return '🌿 Conditions idéales pour sortir prendre l\'air !';
  }

  // Données de secours
  private getFallbackWeather(cityName: string): WeatherData {
    return {
      city: cityName,
      temperature: 18,
      feelsLike: 17,
      humidity: 65,
      description: 'Météo modérée',
      icon: '🌥️',
      windSpeed: 10,
      advice: '🌿 Profitez de cette belle journée pour prendre soin de votre santé !'
    };
  }
}