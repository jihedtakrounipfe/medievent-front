import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-footer.component.html',
  styleUrls: ['./admin-footer.component.css']
})
export class AdminFooterComponent {
  currentYear = new Date().getFullYear();
  version = '1.1.0';

  quickLinks = [
    { label: 'Documentation API',  path: '/admin/docs'     },
    { label: 'Politique données',  path: '/admin/privacy'  },
    { label: 'Rapport de bug',     path: '/admin/bugs'     },
    { label: 'Changelog',          path: '/admin/changelog'},
  ];
}