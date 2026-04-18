import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent {
  currentYear = new Date().getFullYear();

  footerLinks = {
    platform: [
      { label: 'Accueil',         path: '/'              },
      { label: 'Discussions',     path: '/forum'         },
      { label: 'Trouver un médecin', path: '/doctors'   },
      { label: 'Rendez-vous',     path: '/appointments'  },
      { label: 'Téléconsultation',path: '/teleconsult'   },
    ],
    account: [
      { label: 'Mon profil',      path: '/profile'       },
      { label: 'Dossier médical', path: '/medical-record'},
      { label: 'Mes rappels',     path: '/reminders'     },
      { label: 'Paramètres',      path: '/settings'      },
    ],
    legal: [
      { label: 'Politique de confidentialité', path: '/privacy'  },
      { label: 'Conditions d\'utilisation',    path: '/terms'    },
      { label: 'Mentions légales',             path: '/legal'    },
      { label: 'RGPD',                         path: '/rgpd'     },
    ],
    support: [
      { label: 'Aide & FAQ',      path: '/help'          },
      { label: 'Contact',         path: '/contact'       },
      { label: 'Accessibilité',   path: '/accessibility' },
    ],
  };

  socials = [
    { name: 'Facebook',  icon: 'fb',  url: '#' },
    { name: 'Twitter/X', icon: 'tw',  url: '#' },
    { name: 'LinkedIn',  icon: 'li',  url: '#' },
    { name: 'Instagram', icon: 'ig',  url: '#' },
  ];
}