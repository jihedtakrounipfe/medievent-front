import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../core/components/navbar/navbar.component';
import { FooterComponent } from '../core/components/footer/footer.component';
import { ToastComponent } from "../features/auth/toast/toast.component";
import { AdminNavbarComponent } from '../core/components/admin-navbar/admin-navbar.component';
import { AdminFooterComponent } from '../core/components/admin-footer/admin-footer.component';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    NavbarComponent,
    FooterComponent,
    ToastComponent,
    AdminNavbarComponent,
    AdminFooterComponent,
],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'medi-connect-frontend';
  private router = inject(Router);
  isAdminRoute = signal(false);

  constructor() {
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
    ).subscribe(e => {
      this.isAdminRoute.set(e.urlAfterRedirects.startsWith('/admin'));
    });
    this.isAdminRoute.set(this.router.url.startsWith('/admin'));
  }
}
