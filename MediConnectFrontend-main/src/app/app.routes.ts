import { Routes } from '@angular/router';
import { authGuard, roleGuard } from '../core/guards/auth.guard';
import { UserType } from '../core/user';
import { AppointmentComponent } from './components/appointment/appointment.component';
import { DoctorappointmentComponent } from './components/doctorappointment/doctorappointment.component';
import { DoctorCalendarComponent } from './components/doctor-calendar/doctor-calendar.component';
import { DashboardComponent } from './components/doctor-dashboard/doctor-dashboard.component';
import { appointmentRedirectGuard } from './core/guards/appointment-redirect.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../features/landing/landing.component').then(m => m.LandingComponent),
  },
  {
    path: 'auth/login',
    loadComponent: () =>
      import('../features/auth/login-page/login-page.component').then(m => m.LoginPageComponent),
  },
  {
    path: 'auth/signup',
    loadComponent: () =>
      import('../features/auth/signup-page/signup-page.component').then(m => m.SignupPageComponent),
  },
  {
    path: 'auth/forgot-password',
    loadComponent: () =>
      import('../features/auth/login-page/login-page.component').then(m => m.LoginPageComponent),
  },
  {
    path: 'auth/google-register',
    loadComponent: () =>
      import('../features/auth/google-register/google-register.component').then(m => m.GoogleRegisterComponent),
  },
  {
    path: 'patient/profile',
    loadComponent: () =>
      import('../features/profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [authGuard],
  },
  {
    path: 'doctor/profile',
    loadComponent: () =>
      import('../features/profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [authGuard],
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('../features/profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [authGuard],
  },
  {
    path: 'doctor/pending-approval',
    loadComponent: () =>
      import('../features/doctor-approval/pending-approval.component').then(m => m.PendingApprovalComponent),
    canActivate: [authGuard],
  },
  {
    path: 'doctor/rejected',
    loadComponent: () =>
      import('../features/doctor-approval/rejected.component').then(m => m.RejectedComponent),
    canActivate: [authGuard],
  },
  {
    path: 'admin/dashboard',
    loadComponent: () =>
      import('../features/admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
    canActivate: [authGuard, roleGuard(UserType.ADMINISTRATOR)],
  },
  {
    path: 'admin/patients',
    loadComponent: () =>
      import('../features/admin/patients/admin-patients.component').then(m => m.AdminPatientsComponent),
    canActivate: [authGuard, roleGuard(UserType.ADMINISTRATOR)],
  },
  {
    path: 'admin/patients/:id',
    loadComponent: () =>
      import('../features/admin/user-detail/admin-user-detail.component').then(m => m.AdminUserDetailComponent),
    canActivate: [authGuard, roleGuard(UserType.ADMINISTRATOR)],
  },
  {
    path: 'admin/doctors',
    loadComponent: () =>
      import('../features/admin/doctors/admin-doctors.component').then(m => m.AdminDoctorsComponent),
    canActivate: [authGuard, roleGuard(UserType.ADMINISTRATOR)],
  },
  {
    path: 'admin/doctors/:id',
    loadComponent: () =>
      import('../features/admin/doctors/doctor-profile-view.component').then(m => m.DoctorProfileViewComponent),
    canActivate: [authGuard, roleGuard(UserType.ADMINISTRATOR)],
  },
  {
    path: 'admin/users/:id',
    loadComponent: () =>
      import('../features/admin/user-detail/admin-user-detail.component').then(m => m.AdminUserDetailComponent),
    canActivate: [authGuard, roleGuard(UserType.ADMINISTRATOR)],
  },
  {
    path: 'forum',
    loadChildren: () =>
      import('./forum/forum.module').then(m => m.ForumModule)
  },
  // ── Subscription ──────────────────────────────────────
  { path: 'plans', loadComponent: () => import('./subscription/plans/plans.component').then(m => m.PlansComponent), canActivate: [authGuard] },
  { path: 'checkout', loadComponent: () => import('./subscription/checkout/checkout.component').then(m => m.CheckoutComponent), canActivate: [authGuard] },
  { path: 'subscription', loadComponent: () => import('./subscription/active-subscription/active-subscription.component').then(m => m.ActiveSubscriptionComponent), canActivate: [authGuard] },
  { path: 'active', loadComponent: () => import('./subscription/active-subscription/active-subscription.component').then(m => m.ActiveSubscriptionComponent), canActivate: [authGuard] },
  { path: 'history', loadComponent: () => import('./subscription/subscription-history/subscription-history.component').then(m => m.SubscriptionHistoryComponent), canActivate: [authGuard] },
  { path: 'credit', loadComponent: () => import('./subscription/user-credit-page/user-credit-page.component').then(m => m.UserCreditPageComponent), canActivate: [authGuard] },
  { path: 'subscription/student-verification', loadComponent: () => import('./subscription/student-verification-request/student-verification-request.component').then(m => m.StudentVerificationRequestComponent), canActivate: [authGuard] },
  { path: 'subscription/student-verification/apply', loadComponent: () => import('./subscription/student-verification-apply/student-verification-apply.component').then(m => m.StudentVerificationApplyComponent), canActivate: [authGuard] },
  { path: 'success', loadComponent: () => import('./subscription/success/success.component').then(m => m.SuccessComponent) },
  { path: 'subscription/cancel', loadComponent: () => import('./subscription/subscription-cancellation-request/subscription-cancellation-request.component').then(m => m.SubscriptionCancellationRequestComponent) },
  { path: 'subscription/cancelled', loadComponent: () => import('./subscription/subscription-cancelled/subscription-cancelled.component').then(m => m.SubscriptionCancelledComponent) },
  { path: 'upgrade-downgrade', loadComponent: () => import('./subscription/upgrade-downgrade/upgrade-downgrade.component').then(m => m.UpgradeDowngradeComponent), canActivate: [authGuard] },
  { path: 'upgrade-downgrade/success', loadComponent: () => import('./subscription/upgrade-downgrade-success/upgrade-downgrade-success.component').then(m => m.UpgradeDowngradeSuccessComponent) },

  // ── Sub-Admin (Subscriptions) ─────────────────────────
  {
  path: 'admin/sub',
  loadComponent: () =>
    import('./sub-admin/layout/sub-admin-layout.component')
      .then(m => m.SubAdminLayoutComponent),
  canActivate: [authGuard, roleGuard(UserType.ADMINISTRATOR)],
  children: [
    { path: 'statistics', loadComponent: () => import('./sub-admin/dashboard/sub-admin-dashboard.component').then(m => m.SubAdminDashboardComponent) },
    { path: 'plans', loadComponent: () => import('./sub-admin/plans/sub-admin-plans.component').then(m => m.SubAdminPlansComponent) },
    { path: 'promo-codes', loadComponent: () => import('./sub-admin/promo-codes/sub-admin-promo-codes.component').then(m => m.SubAdminPromoCodesComponent) },
    { path: 'subscriptions', loadComponent: () => import('./sub-admin/subscriptions/sub-admin-subscriptions.component').then(m => m.SubAdminSubscriptionsComponent) },
    { path: 'payments', loadComponent: () => import('./sub-admin/payments/sub-admin-payments.component').then(m => m.SubAdminPaymentsComponent) },
  ]
},
  // {
  //   path: 'forum',
  //   loadComponent: () =>
  //     import('./features/forum/forum.component')
  //       .then(m => m.ForumComponent),
  // },
  // {
  //   path: 'forum/create',
  //   loadComponent: () =>
  //     import('./features/forum/create-post/create-post.component')
  //       .then(m => m.CreatePostComponent),
  // },

  // ── Back-office (Admin) ───────────────────────────────
  // Admin uses its own layout (different navbar/footer)
  // so we wrap it in a layout component
  // {
  //   path: 'admin',
  //   loadComponent: () =>
  //     import('./features/admin/admin-layout/admin-layout.component')
  //       .then(m => m.AdminLayoutComponent),
  //   // canActivate: [AdminGuard],   ← uncomment when guard is ready
  //   children: [
  //     {
  //       path: '',
  //       loadComponent: () =>
  //         import('./features/admin/dashboard/dashboard.component')
  //           .then(m => m.DashboardComponent),
  //     },
  //     {
  //       path: 'doctors',
  //       loadComponent: () =>
  //         import('./features/admin/doctors/doctors.component')
  //           .then(m => m.DoctorsComponent),
  //     },
  //     {
  //       path: 'patients',
  //       loadComponent: () =>
  //         import('./features/admin/patients/patients.component')
  //           .then(m => m.PatientsComponent),
  //     },
  //     {
  //       path: 'pending',
  //       loadComponent: () =>
  //         import('./features/admin/pending/pending.component')
  //           .then(m => m.PendingComponent),
  //     },
  //     {
  //       path: 'audit',
  //       loadComponent: () =>
  //         import('../features/admin/audit/audit.component')
  //           .then(m => m.AuditComponent),
  //     },
  //   ]
  // }

 
// ── Catch-all ─────────────────────────────────────────
{ path: 'appointment',        canActivate: [appointmentRedirectGuard], component: AppointmentComponent },
{ path: 'appointment',        component: AppointmentComponent },
{ path: 'doctorapp',          component: DoctorappointmentComponent },
{ path: 'medecin/calendrier', component: DoctorCalendarComponent },
{ path: 'medecin/dashboard',  component: DashboardComponent },
{ path: '**',                 redirectTo: '' }

];