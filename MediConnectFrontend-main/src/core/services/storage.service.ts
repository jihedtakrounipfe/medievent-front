// src/app/core/services/storage.service.ts
// Abstracts token persistence — swap implementation without touching AuthService
// (SOLID: D — depend on this abstraction, not localStorage directly)

import { Injectable } from '@angular/core';

const KEYS = {
  ACCESS_TOKEN:  'mc_access_token',
  REFRESH_TOKEN: 'mc_refresh_token',
  USER:          'mc_user',
} as const;

@Injectable({ providedIn: 'root' })
export class StorageService {

  // ── Access Token ────────────────────────────────────────────────────────────

  setAccessToken(token: string): void {
    localStorage.setItem(KEYS.ACCESS_TOKEN, token);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(KEYS.ACCESS_TOKEN);
  }

  removeAccessToken(): void {
    localStorage.removeItem(KEYS.ACCESS_TOKEN);
  }

  // ── Refresh Token ───────────────────────────────────────────────────────────

  setRefreshToken(token: string): void {
    localStorage.setItem(KEYS.REFRESH_TOKEN, token);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(KEYS.REFRESH_TOKEN);
  }

  removeRefreshToken(): void {
    localStorage.removeItem(KEYS.REFRESH_TOKEN);
  }

  // ── User snapshot ───────────────────────────────────────────────────────────

  setUser<T>(user: T): void {
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
  }

  getUser<T>(): T | null {
    const raw = localStorage.getItem(KEYS.USER);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  removeUser(): void {
    localStorage.removeItem(KEYS.USER);
  }

  // ── Nuke everything ─────────────────────────────────────────────────────────

  clearAll(): void {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  }
}