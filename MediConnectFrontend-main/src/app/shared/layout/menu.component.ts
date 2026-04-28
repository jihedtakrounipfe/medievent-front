import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-menu',
  template: `
    <aside class="sidebar">

      <!-- LOGO (visible uniquement sur mobile) -->
      <div class="sidebar-logo-mobile">
        <div class="logo-mark">
          <svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
        </div>
        <span class="logo-text">MediConnect</span>
      </div>

      <!-- MENU PRINCIPAL -->
      <div class="sidebar-section">
        <p class="sidebar-section-title">Menu principal</p>
        <ul class="sidebar-list">
          <li>
            <a class="sidebar-link" [class.active]="router.url === '/forum'"
               (click)="goTo('/forum')">
              <span class="link-icon">
                <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                </svg>
              </span>
              <span>Accueil</span>
            </a>
          </li>
          <li>
            <a class="sidebar-link" [class.active]="router.url.startsWith('/forum/liste')"
               (click)="goTo('/forum/liste')">
              <span class="link-icon">
                <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
                </svg>
              </span>
              <span>Discussions</span>
            </a>
          </li>
          <li>
            <a class="sidebar-link sidebar-link-cta" (click)="goTo('/forum/nouveau')">
              <span class="link-icon-cta">
                <svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
                </svg>
              </span>
              <span>Nouveau Sujet</span>
            </a>
          </li>
        </ul>
      </div>

      <div class="sidebar-divider"></div>

      <!-- CATÉGORIES -->
      <div class="sidebar-section">
        <p class="sidebar-section-title">Catégories</p>
        <ul class="sidebar-list">
          <li>
            <a class="sidebar-link" (click)="filterByCategory('QUESTION')">
              <span class="link-icon">❓</span>
              <span>Questions</span>
              <span class="link-badge">12</span>
            </a>
          </li>
          <li>
            <a class="sidebar-link" (click)="filterByCategory('ADVICE')">
              <span class="link-icon">💬</span>
              <span>Conseils</span>
              <span class="link-badge">8</span>
            </a>
          </li>
          <li>
            <a class="sidebar-link" (click)="filterByCategory('AWARENESS')">
              <span class="link-icon">📢</span>
              <span>Sensibilisation</span>
              <span class="link-badge">5</span>
            </a>
          </li>
          <li>
            <a class="sidebar-link" (click)="filterByCategory('DOCUMENT')">
              <span class="link-icon">📄</span>
              <span>Documents</span>
              <span class="link-badge">3</span>
            </a>
          </li>
        </ul>
      </div>

      <div class="sidebar-divider"></div>

      <!-- STATS RAPIDES -->
      <div class="stats-card">
        <div class="stat-item">
          <span class="stat-value">47</span>
          <span class="stat-label">Membres</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">3</span>
          <span class="stat-label">Médecins</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">12</span>
          <span class="stat-label">Réponses</span>
        </div>
      </div>

      <div class="sidebar-divider"></div>

      <!-- INFORMATION -->
      <div class="sidebar-section">
        <p class="sidebar-section-title">Information</p>
        <ul class="sidebar-list">
          <li>
            <a class="sidebar-link" href="#" onclick="return false;">
              <span class="link-icon">
                <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </span>
              <span>Aide</span>
            </a>
          </li>
          <li>
            <a class="sidebar-link" href="#" onclick="return false;">
              <span class="link-icon">
                <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </span>
              <span>À propos</span>
            </a>
          </li>
        </ul>
      </div>

      <!-- DÉCONNEXION -->
      <div class="sidebar-footer">
        <div class="sidebar-divider"></div>
        <a class="sidebar-link sidebar-logout" (click)="goTo('/logout')">
          <span class="link-icon">
            <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
          </span>
          <span>Se déconnecter</span>
        </a>
      </div>

    </aside>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

    .sidebar {
      position: fixed;
      top: 64px;
      left: 0;
      bottom: 0;
      width: 260px;
      background: #ffffff;
      border-right: 1px solid rgba(226, 232, 240, 0.6);
      display: flex;
      flex-direction: column;
      padding: 24px 12px 20px;
      overflow-y: auto;
      font-family: 'DM Sans', sans-serif;
      box-shadow: 2px 0 8px rgba(0,0,0,0.02);
      z-index: 100;
    }

    .sidebar-logo-mobile {
      display: none;
      align-items: center;
      gap: 10px;
      padding: 0 8px 16px;
      margin-bottom: 8px;
      border-bottom: 1px solid #e5e2dd;
    }

    .logo-mark {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: linear-gradient(135deg, #0d9488, #0891b2);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .logo-mark svg { width: 16px; height: 16px; }
    .logo-text {
      font-weight: 600;
      font-size: 16px;
      color: #0d1117;
    }

    .sidebar-section {
      margin-bottom: 8px;
    }

    .sidebar-section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #94a3b8;
      padding: 0 10px;
      margin: 0 0 4px;
    }

    .sidebar-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .sidebar-link {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 500;
      color: #475569;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s ease;
      position: relative;
    }

    .sidebar-link:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    .sidebar-link.active {
      background: linear-gradient(135deg, #f0fdfa, #e6f7f5);
      color: #0d9488;
      font-weight: 600;
    }

    .sidebar-link.active::before {
      content: '';
      position: absolute;
      left: -2px;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 20px;
      background: #0d9488;
      border-radius: 0 4px 4px 0;
    }

    .link-icon {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .icon {
      width: 18px;
      height: 18px;
    }

    .link-badge {
      margin-left: auto;
      background: #e2e8f0;
      color: #475569;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 12px;
      min-width: 20px;
      text-align: center;
    }

    .sidebar-link-cta {
      background: #f0fdfa;
      color: #0d9488 !important;
      font-weight: 600;
      border: 1px solid #99f6e4;
      margin-top: 4px;
    }

    .sidebar-link-cta:hover {
      background: #0d9488 !important;
      color: white !important;
      border-color: transparent;
    }

    .link-icon-cta {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: inherit;
    }
    .link-icon-cta svg { width: 14px; height: 14px; }

    .stats-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px 12px;
      margin: 8px 0;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }

    .stat-item {
      text-align: center;
    }

    .stat-value {
      display: block;
      font-size: 18px;
      font-weight: 700;
      color: #0d9488;
      line-height: 1.2;
    }

    .stat-label {
      font-size: 10px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .sidebar-divider {
      height: 1px;
      background: linear-gradient(to right, #e2e8f0 20%, transparent);
      margin: 16px 10px;
    }

    .sidebar-footer {
      margin-top: auto;
      padding-top: 8px;
    }

    .sidebar-logout {
      color: #94a3b8 !important;
      margin-top: 8px;
    }

    .sidebar-logout:hover {
      background: #fee2e2 !important;
      color: #dc2626 !important;
    }

    .sidebar::-webkit-scrollbar {
      width: 4px;
    }
    .sidebar::-webkit-scrollbar-track {
      background: transparent;
    }
    .sidebar::-webkit-scrollbar-thumb {
      background: #d1d5db;
      border-radius: 4px;
    }
    .sidebar::-webkit-scrollbar-thumb:hover {
      background: #0d9488;
    }

    @media (max-width: 768px) {
      .sidebar {
        width: 100%;
        top: 0;
        z-index: 1000;
        transform: translateX(-100%);
        transition: transform 0.3s ease;
      }
      .sidebar.open {
        transform: translateX(0);
      }
      .sidebar-logo-mobile {
        display: flex;
      }
    }
  `],
  standalone: false
})
export class MenuComponent {
  constructor(public router: Router) {}

  goTo(path: string): void {
    this.router.navigate([path]);
  }

  filterByCategory(category: string): void {
    this.router.navigate(['/forum'], { queryParams: { category } });
  }
}