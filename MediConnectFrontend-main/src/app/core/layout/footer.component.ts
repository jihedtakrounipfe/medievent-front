import { Component, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-footer',
  template: `
    <footer [ngClass]="{'footer-visible': isVisible}" class="footer-container">
      <div style="max-width: 1200px; margin: 0 auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <p style="margin: 0; font-weight: 500;">
              <span style="color: #14b8a6;">MediConnect</span> © {{ currentYear }}
            </p>
            <p style="margin: 0.5rem 0 0 0; font-size: 0.8rem;">
              Plateforme de discussion médicale
            </p>
          </div>
          <div style="display: flex; gap: 2rem; flex-wrap: wrap; justify-content: center;">
            <a href="#" style="color: #94a3b8; text-decoration: none; transition: color 0.2s;" onmouseover="this.style.color='#14b8a6'" onmouseout="this.style.color='#94a3b8'">
              À propos
            </a>
            <a href="#" style="color: #94a3b8; text-decoration: none; transition: color 0.2s;" onmouseover="this.style.color='#14b8a6'" onmouseout="this.style.color='#94a3b8'">
              Conditions
            </a>
            <a href="#" style="color: #94a3b8; text-decoration: none; transition: color 0.2s;" onmouseover="this.style.color='#14b8a6'" onmouseout="this.style.color='#94a3b8'">
              Confidentialité
            </a>
            <a href="#" style="color: #94a3b8; text-decoration: none; transition: color 0.2s;" onmouseover="this.style.color='#14b8a6'" onmouseout="this.style.color='#14b8a6'">
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
    <style>
      .footer-container {
        background: linear-gradient(180deg, #0d1b2a 0%, #1a2b3a 100%);
        border-top: 1px solid rgba(20, 184, 166, 0.2);
        color: #94a3b8;
        padding: 2rem;
        text-align: center;
        font-size: 0.875rem;
        line-height: 1.6;
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 10;
        width: 100%;
        transform: translateY(100%);
        opacity: 0;
        transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        pointer-events: none;
      }

      .footer-visible {
        transform: translateY(0);
        opacity: 1;
        pointer-events: auto;
      }
    </style>
  `,
  standalone: false
})
export class FooterComponent implements OnInit, OnDestroy {
  currentYear = new Date().getFullYear();
  isVisible = false;
  private scrollListener: (() => void) | null = null;

  ngOnInit() {
    const mainElement = document.querySelector('.app-main');
    if (mainElement) {
      this.scrollListener = () => this.onScroll(mainElement);
      mainElement.addEventListener('scroll', this.scrollListener);
    }
  }

  ngOnDestroy() {
    const mainElement = document.querySelector('.app-main');
    if (mainElement && this.scrollListener) {
      mainElement.removeEventListener('scroll', this.scrollListener);
    }
  }

  private onScroll(element: Element) {
    const scrollPosition = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    
    // Afficher le footer si on a scrollé au moins 200px
    this.isVisible = scrollPosition > 200;
    
    // Ou si on est proche du bas
    if (scrollHeight - scrollPosition - clientHeight < 500) {
      this.isVisible = true;
    }
  }
}
