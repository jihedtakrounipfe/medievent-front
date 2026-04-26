import { Routes } from '@angular/router';
import { UserListComponent } from '../features/users/user-list.component'; // ← add this
import { authGuard, roleGuard } from '../core/guards/auth.guard';
import { UserType } from '../core/user';


export const routes: Routes = [

  // ── Front-office ──────────────────────────────────────
  {
    path: '',
    loadComponent: () =>
      import('../features/landing/landing.component')
        .then(m => m.LandingComponent),
  },
  {
    path: 'events',
    loadComponent: () => import('../features/public/events/event-public-list.component').then(m => m.EventPublicListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'events/:id',
    loadComponent: () => import('../features/public/events/event-detail.component').then(m => m.EventDetailComponent),
    canActivate: [authGuard]
  },
  {
    path: 'auth/login',
    loadComponent: () =>
      import('../features/auth/login-page/login-page.component')
        .then(m => m.LoginPageComponent),
  },
  {
    path: 'auth/signup',
    loadComponent: () =>
      import('../features/auth/signup-page/signup-page.component')
        .then(m => m.SignupPageComponent),
  },
  {
    path: 'auth/forgot-password',
    loadComponent: () =>
      import('../features/auth/login-page/login-page.component')
        .then(m => m.LoginPageComponent),
  },
  {
    path: 'patient/profile',
    loadComponent: () =>
      import('../features/profile/profile.component')
        .then(m => m.ProfileComponent),
    canActivate: [authGuard],
  },
  {
    path: 'doctor/profile',
    loadComponent: () =>
      import('../features/profile/profile.component')
        .then(m => m.ProfileComponent),
    canActivate: [authGuard],
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('../features/profile/profile.component')
        .then(m => m.ProfileComponent),
    canActivate: [authGuard],
  },
  {
    path: 'doctor/events/my',
    loadComponent: () => import('../features/doctor/events/event-my-list.component').then(m => m.EventMyListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'events/:id/room',
    loadComponent: () => import('../features/doctor/events/event-room.component').then(m => m.VirtualRoomComponent),
    canActivate: [authGuard]
  },
  {
    path: 'doctor/events/create',
    loadComponent: () => import('../features/doctor/events/event-create.component').then(m => m.EventCreateComponent),
    canActivate: [authGuard]
  },
  {
    path: 'doctor/events/edit/:id',
    loadComponent: () => import('../features/doctor/events/event-create.component').then(m => m.EventCreateComponent),
    canActivate: [authGuard]
  },
  {
    path: 'doctor/pending-approval',
    loadComponent: () =>
      import('../features/doctor-approval/pending-approval.component')
        .then(m => m.PendingApprovalComponent),
    canActivate: [authGuard],
  },
  {
    path: 'doctor/rejected',
    loadComponent: () =>
      import('../features/doctor-approval/rejected.component')
        .then(m => m.RejectedComponent),
    canActivate: [authGuard],
  },

  // ── Admin Portal ─────────────────────────────────────
  {
    path: 'admin/login',
    loadComponent: () =>
      import('../features/admin/login/admin-login.component')
        .then(m => m.AdminLoginComponent),
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('../features/admin/admin-layout/admin-layout.component')
        .then(m => m.AdminLayoutComponent),
    canActivate: [authGuard, roleGuard(UserType.ADMINISTRATOR)],
    children: [
      { path: 'dashboard', loadComponent: () => import('../features/admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent) },
      { path: 'patients', loadComponent: () => import('../features/admin/patients/admin-patients.component').then(m => m.AdminPatientsComponent) },
      { path: 'doctors', loadComponent: () => import('../features/admin/doctors/admin-doctors.component').then(m => m.AdminDoctorsComponent) },
      { path: 'events', loadComponent: () => import('../features/admin/events/admin-events.component').then(m => m.AdminEventsComponent) },
      { path: 'users', component: UserListComponent },
      { path: 'users/:id', loadComponent: () => import('../features/admin/user-detail/admin-user-detail.component').then(m => m.AdminUserDetailComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
//   {
//     path: 'forum',
//     loadComponent: () =>
//       import('./features/forum/forum.component')
//         .then(m => m.ForumComponent),
//   },
//   {
//     path: 'forum/create',
//     loadComponent: () =>
//       import('./features/forum/create-post/create-post.component')
//         .then(m => m.CreatePostComponent),
//   },

  // ── Back-office (Admin) ───────────────────────────────
  // Admin uses its own layout (different navbar/footer)
  // so we wrap it in a layout component
//   {
//     path: 'admin',
//     loadComponent: () =>
//       import('./features/admin/admin-layout/admin-layout.component')
//         .then(m => m.AdminLayoutComponent),
//     // canActivate: [AdminGuard],   ← uncomment when guard is ready
//     children: [
//       {
//         path: '',
//         loadComponent: () =>
//           import('./features/admin/dashboard/dashboard.component')
//             .then(m => m.DashboardComponent),
//       },
//       {
//         path: 'doctors',
//         loadComponent: () =>
//           import('./features/admin/doctors/doctors.component')
//             .then(m => m.DoctorsComponent),
//       },
//       {
//         path: 'patients',
//         loadComponent: () =>
//           import('./features/admin/patients/patients.component')
//             .then(m => m.PatientsComponent),
//       },
//       {
//         path: 'pending',
//         loadComponent: () =>
//           import('./features/admin/pending/pending.component')
//             .then(m => m.PendingComponent),
//       },
//       {
//         path: 'audit',
//         loadComponent: () =>
//           import('../features/admin/audit/audit.component')
//             .then(m => m.AuditComponent),
//       },
//     ]
//   },

  // ── Catch-all ─────────────────────────────────────────
  { path: '**', redirectTo: '' },
];
