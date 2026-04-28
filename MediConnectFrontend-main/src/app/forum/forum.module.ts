import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ForumRoutingModule } from './forum-routing.module';
import { ForumHomeComponent } from './pages/forum-home/forum-home.component';
import { ForumListComponent } from './pages/forum-list/forum-list.component';
import { ForumCreateComponent } from './pages/forum-create/forum-create.component';
import { ForumEditComponent } from './pages/forum-edit/forum-edit.component';
import { NotificationCenterComponent } from './pages/notifications/notification-center.component';

import { CoreModule } from '../core/core.module';
import { ThemeToggleComponent } from './pages/theme-toggle/theme-toggle.component';
import { SafeDatePipe } from './pipes/safe-date.pipe';
import { ForumDetailComponent } from './pages/forum-detail/forum-detail.component';
import { VoiceRecognitionService } from './services/voice-recognition.service';
import { OpenFdaService } from './services/openfda.service';
import { MedicalQuoteService } from './services/medical-quote.service';
import { AiServiceService } from './services/ai-service.service';
import { WeatherService } from './services/weather.service';

@NgModule({
  declarations: [
    ForumHomeComponent,
    ForumListComponent,
    ForumCreateComponent,
    ForumEditComponent,
    NotificationCenterComponent,
    ThemeToggleComponent,
    ForumDetailComponent ],
  imports: [
    CommonModule,
    FormsModule,
    ForumRoutingModule,
    CoreModule
  ],
  providers: [
    VoiceRecognitionService,
    OpenFdaService,
    MedicalQuoteService ,
     AiServiceService ,
     WeatherService 
  ]
})
export class ForumModule { }
