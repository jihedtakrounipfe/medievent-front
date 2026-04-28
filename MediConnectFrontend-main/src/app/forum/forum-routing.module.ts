import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ForumHomeComponent } from './pages/forum-home/forum-home.component';
import { ForumListComponent } from './pages/forum-list/forum-list.component';
import { ForumDetailComponent } from './pages/forum-detail/forum-detail.component';
import { ForumCreateComponent } from './pages/forum-create/forum-create.component';
import { ForumEditComponent } from './pages/forum-edit/forum-edit.component';
import { NotificationCenterComponent } from './pages/notifications/notification-center.component';

const routes: Routes = [
  { path: '', component: ForumHomeComponent },
  { path: 'liste', component: ForumListComponent },
  { path: 'post/:id', component: ForumDetailComponent },
  { path: 'create', redirectTo: 'nouveau', pathMatch: 'full' },
  { path: 'nouveau', component: ForumCreateComponent },
  { path: 'edit/:id', component: ForumEditComponent },
  { path: 'notifications', component: NotificationCenterComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ForumRoutingModule { }
