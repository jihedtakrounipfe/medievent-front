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

  // ── Admin ─────────────────────────────────────────────
  {
    path: 'admin/dashboard',
    loadComponent: () =>
      import('../features/admin/dashboard/admin-dashboard.component')
        .then(m => m.AdminDashboardComponent),
    canActivate: [authGuard, roleGuard(UserType.ADMINISTRATOR)],
  },
  {
    path: 'admin/patients',
    loadComponent: () =>
      import('../features/admin/patients/admin-patients.component')
        .then(m => m.AdminPatientsComponent),
    canActivate: [authGuard, roleGuard(UserType.ADMINISTRATOR)],
  },
  {
    path: 'admin/doctors',
    loadComponent: () =>
      import('../features/admin/doctors/admin-doctors.component')
        .then(m => m.AdminDoctorsComponent),
    canActivate: [authGuard, roleGuard(UserType.ADMINISTRATOR)],
  },
  {
    path: 'admin/users',
    component: UserListComponent,
    canActivate: [authGuard, roleGuard(UserType.ADMINISTRATOR)],
  },
  {
    path: 'admin/users/:id',
    loadComponent: () =>
      import('../features/admin/user-detail/admin-user-detail.component')
        .then(m => m.AdminUserDetailComponent),
    canActivate: [authGuard, roleGuard(UserType.ADMINISTRATOR)],
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
