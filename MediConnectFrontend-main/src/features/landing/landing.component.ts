import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent implements OnInit, OnDestroy {

  // Stats counter animation
  stats = [
    { value: 0, target: 1200, label: 'Patients inscrits', suffix: '+', icon: '🧑' },
    { value: 0, target: 150,  label: 'Médecins vérifiés', suffix: '+', icon: '👨‍⚕️' },
    { value: 0, target: 98,   label: 'Satisfaction',       suffix: '%', icon: '⭐' },
    { value: 0, target: 24,   label: 'Disponible 24h/7j',  suffix: 'h', icon: '🕐' },
  ];

  features = [
    {
      icon: '📅',
      title: 'Prise de rendez-vous',
      description: 'Réservez en quelques secondes avec n\'importe quel médecin, à toute heure.',
      color: 'teal',
    },
    {
      icon: '📋',
      title: 'Dossier médical numérique',
      description: 'Votre historique médical complet, sécurisé et accessible partout.',
      color: 'blue',
    },
    {
      icon: '💊',
      title: 'Rappels médicaments',
      description: 'Ne manquez plus jamais votre traitement grâce aux rappels personnalisés.',
      color: 'purple',
    },
    {
      icon: '📱',
      title: 'Téléconsultation',
      description: 'Consultez votre médecin en vidéo depuis chez vous, sans déplacement.',
      color: 'green',
    },
    {
      icon: '💬',
      title: 'Messagerie sécurisée',
      description: 'Communiquez directement et en toute confidentialité avec votre médecin.',
      color: 'orange',
    },
    {
      icon: '🤖',
      title: 'Assistant IA',
      description: 'Obtenez des informations générales et soyez orienté vers le bon spécialiste.',
      color: 'pink',
    },
  ];

  steps = [
    { number: '01', title: 'Créez votre compte', description: 'Inscription rapide avec vérification email en moins de 2 minutes.' },
    { number: '02', title: 'Complétez votre profil', description: 'Renseignez vos informations médicales pour un suivi personnalisé.' },
    { number: '03', title: 'Trouvez votre médecin', description: 'Recherchez par spécialité, localisation ou disponibilité.' },
    { number: '04', title: 'Commencez votre suivi', description: 'Prenez rendez-vous, échangez, et accédez à votre dossier en temps réel.' },
  ];

  testimonials = [
    {
      name: 'Sonia Belkhir',
      role: 'Patiente',
      text: 'Enfin une plateforme qui simplifie vraiment le parcours de santé. Je n\'oublie plus jamais mes rendez-vous !',
      avatar: 'SB',
    },
    {
      name: 'Dr. Mehdi Trabelsi',
      role: 'Médecin Généraliste',
      text: 'MediConnect a transformé ma pratique. La gestion de l\'agenda et des dossiers patients est un vrai gain de temps.',
      avatar: 'MT',
    },
    {
      name: 'Amira Chaouachi',
      role: 'Patiente chronique',
      text: 'Grâce aux rappels médicaments et à l\'accès à mon dossier, je gère mieux ma maladie au quotidien.',
      avatar: 'AC',
    },
  ];

  private animationFrame?: number;
  animationStarted = false;

  ngOnInit(): void {
    // Start counter animation after a small delay
    setTimeout(() => this.animateCounters(), 800);
  }

  ngOnDestroy(): void {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
  }

  animateCounters(): void {
    const duration = 2000;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      this.stats.forEach(s => { s.value = Math.round(s.target * ease); });
      if (progress < 1) {
        this.animationFrame = requestAnimationFrame(animate);
      }
    };
    this.animationFrame = requestAnimationFrame(animate);
  }
}